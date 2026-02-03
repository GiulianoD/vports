const DASHBOARD_DESEMBARQUES_URL = window.URLS_CONFIG?.DASHBOARD_ENDPOINTS?.DESEMBARQUES;

function getAuthHeader() {
  try {
    if (typeof obterAccessToken === "function") {
      const t = obterAccessToken();
      if (t) return { Authorization: `Bearer ${t}` };
    }
  } catch (_) {}
  return {};
}

// Mapeamento para dropdown (igual backend)
const REGIOES = {
  "Vila Velha": ["Praia de Itaparica", "Praia de Itapoã", "Praia da Costa", "Praia do Ribeiro", "Prainha"],
  "Vitória Leste": ["Santo Antônio", "Grande Vitória", "Ilha das Caieiras"],
  "Vitória Oeste": ["Enseada do Suá", "Praia do Canto", "Praia do Suá/Canto"]
};

let chartKgPerDay = null;
let chartEspecies = null;
let rawSpeciesData = [];

function isoDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function setPreset(preset) {
  const startEl = document.getElementById("startDate");
  const endEl = document.getElementById("endDate");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "7d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    startEl.value = isoDate(start);
    endEl.value = isoDate(today);
    startEl.disabled = true;
    endEl.disabled = true;
  } else if (preset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    startEl.value = isoDate(start);
    endEl.value = isoDate(today);
    startEl.disabled = true;
    endEl.disabled = true;
  } else {
    startEl.disabled = false;
    endEl.disabled = false;
    if (!startEl.value) startEl.value = isoDate(today);
    if (!endEl.value) endEl.value = isoDate(today);
  }
}

function populateScopeValue() {
  const scopeType = document.getElementById("scopeType").value;
  const scopeValue = document.getElementById("scopeValue");
  scopeValue.innerHTML = `<option value="">Selecione</option>`;

  if (scopeType === "geral") {
    scopeValue.disabled = true;
    return;
  }

  scopeValue.disabled = false;

  if (scopeType === "regiao") {
    Object.keys(REGIOES).forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      scopeValue.appendChild(opt);
    });
  } else if (scopeType === "local") {
    const pontos = new Set();
    Object.values(REGIOES).forEach(arr => arr.forEach(p => pontos.add(p)));
    [...pontos].sort().forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      scopeValue.appendChild(opt);
    });
  }
}

function setKpis(kpis){
  document.getElementById("kpiAvgTrips").textContent = kpis.media_desembarques_dia?.toFixed(2) ?? 0;
  document.getElementById("kpiAvgKg").textContent = kpis.media_kg_dia?.toFixed(2) ?? 0;
  document.getElementById("kpiAvgEffort").textContent = kpis.media_esforco_horas_dia?.toFixed(2) ?? 0;
  document.getElementById("kpiEffortTotal").textContent = kpis.total_esforco_hhmm ?? "00:00";

  document.getElementById("kpiTotalKg").textContent = kpis.total_kg?.toFixed(2) ?? 0;

  let cpue = 0;
  if (kpis.total_kg > 0) {
    const totalHours = hhmmToHours(kpis.total_esforco_hhmm);
    if (totalHours > 0) cpue = kpis.total_kg / totalHours;
  }
  document.getElementById("kpiCpue").textContent = cpue.toFixed(2);
}

function renderKgPerDay(series){
  const ctx = document.getElementById("chartKgPerDay");
  const labels = series.map(x => x.day);
  const data = series.map(x => x.kg);

  if (chartKgPerDay) chartKgPerDay.destroy();
  chartKgPerDay = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Kg por dia", data }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function groupSpecies(items, limit) {
  if (limit === 0 || items.length <= limit) return items;

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, limit);
  const others = sorted.slice(limit);
  const othersSum = others.reduce((sum, item) => sum + item.value, 0);

  const result = [...top];
  if (othersSum > 0) {
    result.push({
      label: `Outras (${others.length} espécies)`,
      value: othersSum
    });
  }
  return result;
}

function renderEspeciesChart(items){
  const canvas = document.getElementById("chartEspecies");
  const caption = document.getElementById("speciesCaption");
  const legendBox = document.getElementById("speciesLegend");

  // Helper: renderiza legenda HTML em grid
 function renderHtmlLegend(labels, values, colors){
  if (!legendBox) return;

  if (!labels || labels.length === 0){
    legendBox.innerHTML = `<div class="legend-empty">Sem espécies para exibir</div>`;
    return;
  }

  const total = values.reduce((a,b) => a + b, 0) || 0;

  legendBox.innerHTML = labels.map((label, i) => {
    const v = values[i] ?? 0;
    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0.0";
    const color = colors[i] || "#999";

    return `
      <div class="legend-item" title="${label}">
        <div class="legend-row">
          <span class="legend-dot" style="background:${color}"></span>
          <span class="legend-name">${label}</span>
        </div>
        <span class="legend-meta">${v.toFixed(1)} kg • ${pct}%</span>
      </div>
    `;
  }).join("");
}

  if (!items || items.length === 0) {
    if (chartEspecies) {
      chartEspecies.destroy();
      chartEspecies = null;
    }

    // Limpa canvas
    const ctx2 = canvas.getContext("2d");
    ctx2.clearRect(0, 0, canvas.width, canvas.height);

    if (caption) caption.textContent = "Especies / Nome vulgar";
    renderHtmlLegend([], []);
    return null;
  }

  const labels = items.map(x => x.label);
  const data = items.map(x => x.value);

  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
    '#8AC926', '#1982C4', '#6A4C93', '#FF595E', '#6A994E', '#0077B6',
    '#FF7F11', '#118AB2', '#06D6A0', '#EF476F', '#FFD166', '#073B4C',
    '#7209B7', '#3A86FF', '#FB5607', '#8338EC', '#FF006E', '#8AC926',
    '#1982C4', '#6A4C93'
  ];

  if (chartEspecies) chartEspecies.destroy();

  chartEspecies = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, items.length),
        borderWidth: 1,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,

      // ✅ IMPORTANTE: deixa o canvas usar a altura do wrapper (.chart-wrap)
      maintainAspectRatio: false,

      plugins: {
        // ✅ Remove qualquer título interno (o que aparecia “em cinza”)
        title: { display: false },

        // ✅ Desliga a legenda do canvas (vamos usar HTML abaixo)
        legend: { display: false },

        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0) || 0;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value.toFixed(1)} kg (${percentage}%)`;
            }
          }
        }
      }
    }
  });

  // ✅ caption abaixo do gráfico
  if (caption) caption.textContent = "Especies / Nome vulgar";

  // ✅ legenda HTML em 3 colunas (sempre visível e com scroll)
  renderHtmlLegend(labels, data, colors.slice(0, items.length));
}


function setSummaryBox(payload){
  const box = document.getElementById("summaryBox");
  const f = payload.filters;
  const k = payload.kpis;

  box.innerHTML = `
    <div><b>Período:</b> ${f.start} até ${f.end}</div>
    <div><b>Filtro:</b> ${f.scope_type}${f.scope_value ? " — " + f.scope_value : ""}</div>
    <div style="margin-top:8px"><b>Total desembarques:</b> ${k.total_desembarques}</div>
    <div><b>Total capturado:</b> ${k.total_kg} kg</div>
    <div><b>Esforço total:</b> ${k.total_esforco_hhmm}</div>
  `;
}

function updateEspeciesChart() {
  const groupLimit = parseInt(document.getElementById("groupLimit").value) || 0;
  const groupedData = groupSpecies(rawSpeciesData, groupLimit);
  renderEspeciesChart(groupedData);
}

async function loadDashboard(){
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  const scopeType = document.getElementById("scopeType").value;
  const scopeValue = document.getElementById("scopeValue").value;

  const hint = document.getElementById("statusHint");
  hint.textContent = "Carregando dados...";

  const url = new URL(DASHBOARD_DESEMBARQUES_URL, window.location.origin);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  url.searchParams.set("scope_type", scopeType);
  if (scopeType !== "geral") url.searchParams.set("scope_value", scopeValue);

  try {
    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...getAuthHeader()
      }
    });

    const json = await resp.json();
    if (!json.success) throw new Error(json.error || "Falha ao carregar dashboard");

    // ✅ Definição correta: geral usa geral, qualquer filtro usa local (recorte)
    rawSpeciesData = (scopeType === 'geral')
      ? (json.pie_especies_geral || [])
      : (json.pie_especies_local || []);

    setKpis(json.kpis);
    renderKgPerDay(json.series_captura_dia || []);
    updateEspeciesChart();
    setSummaryBox(json);

    const speciesCount = rawSpeciesData.length;
    let cpueHint = "";
    if (json.kpis.total_kg > 0) {
      const totalHours = hhmmToHours(json.kpis.total_esforco_hhmm);
      if (totalHours > 0) {
        const cpue = json.kpis.total_kg / totalHours;
        cpueHint = ` | CPUE: ${cpue.toFixed(2)} kg/h`;
      }
    }

    hint.textContent = `OK — ${json.kpis.total_desembarques} desembarques aprovados. ${speciesCount} espécies capturadas.${cpueHint}`;

  } catch (e){
    console.error(e);
    hint.textContent = "Erro ao carregar dados do dashboard. Verifique o backend e a autenticação.";
  }
}

function hhmmToHours(hhmm) {
  if (!hhmm || hhmm === "00:00") return 0;
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours + (minutes / 60);
}

document.addEventListener("DOMContentLoaded", () => {
  const presetEl = document.getElementById("periodPreset");
  const scopeTypeEl = document.getElementById("scopeType");
  const groupLimitEl = document.getElementById("groupLimit");
  const btn = document.getElementById("btnApply");

  presetEl.addEventListener("change", () => setPreset(presetEl.value));

  scopeTypeEl.addEventListener("change", () => {
    populateScopeValue();
    if (scopeTypeEl.value === "geral") loadDashboard();
  });

  document.getElementById("scopeValue").addEventListener("change", () => {
    loadDashboard();
  });

  groupLimitEl.addEventListener("change", () => {
    if (rawSpeciesData.length > 0) updateEspeciesChart();
  });

  btn.addEventListener("click", loadDashboard);

  setPreset(presetEl.value);
  populateScopeValue();
  loadDashboard();
});
