// Se você já tem auth helpers, o dashboard usa
// obterAccessToken() se existir. Se não existir, segue sem Authorization.

// const DESEMBARQUES_URL = window.URLS_CONFIG?.DESEMBARQUES_ENDPOINTS?.BASE;
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

// Charts
let chartKgPerDay = null;
let chartPieLocal = null;
let chartPieGeral = null;
let rawSpeciesData = { local: [], geral: [] };

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
    // lista todos os pontos
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
  document.getElementById("kpiAvgTrips").textContent = kpis.media_desembarques_dia ?? 0;
  document.getElementById("kpiAvgKg").textContent = kpis.media_kg_dia ?? 0;
  document.getElementById("kpiAvgEffort").textContent = kpis.media_esforco_horas_dia ?? 0;
  document.getElementById("kpiEffortTotal").textContent = kpis.total_esforco_hhmm ?? "00:00";
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
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function groupSpecies(items, limit) {
  if (limit === 0 || items.length <= limit) {
    // Mostrar todas as espécies sem agrupar
    return items;
  }
  
  // Ordenar por valor (se já não estiver ordenado)
  const sorted = [...items].sort((a, b) => b.value - a.value);
  
  // Pegar as top N espécies
  const top = sorted.slice(0, limit);
  
  // Calcular o total das "outras" espécies
  const others = sorted.slice(limit);
  const othersSum = others.reduce((sum, item) => sum + item.value, 0);
  
  // Criar novo array com "Outras"
  const result = [...top];
  if (othersSum > 0) {
    result.push({
      label: `Outras (${others.length} espécies)`,
      value: othersSum
    });
  }
  
  return result;
}

function renderPie(canvasId, items, title = ''){
  const ctx = document.getElementById(canvasId);
  
  if (!items || items.length === 0) {
    // Limpar canvas se não houver dados
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    return null;
  }
  
  const labels = items.map(x => x.label);
  const data = items.map(x => x.value);

  // Gerar cores dinamicamente
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
    '#8AC926', '#1982C4', '#6A4C93', '#FF595E', '#6A994E', '#0077B6',
    '#FF7F11', '#118AB2', '#06D6A0', '#EF476F', '#FFD166', '#073B4C',
    '#7209B7', '#3A86FF', '#FB5607', '#8338EC', '#FF006E', '#8AC926',
    '#1982C4', '#6A4C93'
  ];
  
  return new Chart(ctx, {
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
      plugins: {
        legend: {
          position: "bottom",
          // position: "right",
          labels: {
            font: {
              size: 11
            },
            padding: 10,
            boxWidth: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value.toFixed(1)} kg (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function renderPies(localItems, geralItems, groupLimit = 0){
  if (chartPieLocal) chartPieLocal.destroy();
  if (chartPieGeral) chartPieGeral.destroy();
  
  // Aplicar agrupamento se necessário
  const localGrouped = groupSpecies(localItems || [], groupLimit);
  const geralGrouped = groupSpecies(geralItems || [], groupLimit);
  
  chartPieLocal = renderPie("chartPieLocal", localGrouped, "Principais espécies — Local");
  chartPieGeral = renderPie("chartPieGeral", geralGrouped, "Principais espécies — Geral");
}

function updateChartsWithGrouping() {
  const groupLimit = parseInt(document.getElementById("groupLimit").value) || 0;
  renderPies(rawSpeciesData.local, rawSpeciesData.geral, groupLimit);
}

async function loadDashboard(){
  const preset = document.getElementById("periodPreset").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  const scopeType = document.getElementById("scopeType").value;
  const scopeValue = document.getElementById("scopeValue").value;
  const groupLimit = parseInt(document.getElementById("groupLimit").value) || 0;

  const hint = document.getElementById("statusHint");
  hint.textContent = "Carregando dados...";

  const url = new URL(DASHBOARD_DESEMBARQUES_URL, window.location.origin);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  url.searchParams.set("scope_type", scopeType);
  if (scopeType !== "geral") url.searchParams.set("scope_value", scopeValue);

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${obterAccessToken()}`
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwibm9tZSI6Im1lcnljaWFuZSIsImZ1bmNhbyI6IlZpbGEgVmVsaGEiLCJleHAiOjE3Njk3MjAxODcsImlhdCI6MTc2OTYzMzc4N30.nt5ssnIVspaanNj1AG19KmZ3BmAtUTjCC85lriTkdcg`
      }
    });
    const json = await resp.json();
    
    if (!json.success) throw new Error(json.error || "Falha ao carregar dashboard");

    // Armazenar os dados brutos das espécies
    rawSpeciesData.local = json.pie_especies_local || [];
    rawSpeciesData.geral = json.pie_especies_geral || [];
    
    setKpis(json.kpis);
    renderKgPerDay(json.series_captura_dia || []);
    
    // Renderizar gráficos com o limite de agrupamento atual
    renderPies(rawSpeciesData.local, rawSpeciesData.geral, groupLimit);
    
    // setSummaryBox(json);

    // Atualizar hint com contagem de espécies
    const localCount = rawSpeciesData.local.length;
    const geralCount = rawSpeciesData.geral.length;
    hint.textContent = `OK — ${json.kpis.total_desembarques} desembarques aprovados no período. ${localCount} espécies (local) / ${geralCount} espécies (geral).`;
    
  } catch (e){
    console.error(e);
    hint.textContent = "Erro ao carregar dados do dashboard. Verifique o backend e a autenticação.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const presetEl = document.getElementById("periodPreset");
  const scopeTypeEl = document.getElementById("scopeType");
  const groupLimitEl = document.getElementById("groupLimit");
  const btn = document.getElementById("btnApply");

  presetEl.addEventListener("change", () => setPreset(presetEl.value));
  scopeTypeEl.addEventListener("change", () => populateScopeValue());
  
  // Adicionar listener para o seletor de agrupamento
  groupLimitEl.addEventListener("change", () => {
    if (rawSpeciesData.local.length > 0 || rawSpeciesData.geral.length > 0) {
      updateChartsWithGrouping();
    }
  });
  
  btn.addEventListener("click", loadDashboard);

  setPreset(presetEl.value);
  populateScopeValue();
  loadDashboard();
});
