// Se você já tem auth helpers, o dashboard usa
// obterAccessToken() se existir. Se não existir, segue sem Authorization.
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

function renderPie(canvasId, items){
  const ctx = document.getElementById(canvasId);
  const labels = items.map(x => x.label);
  const data = items.map(x => x.value);

  return new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{ data }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function renderPies(localItems, geralItems){
  if (chartPieLocal) chartPieLocal.destroy();
  if (chartPieGeral) chartPieGeral.destroy();

  chartPieLocal = renderPie("chartPieLocal", localItems || []);
  chartPieGeral = renderPie("chartPieGeral", geralItems || []);
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

async function loadDashboard(){
  const preset = document.getElementById("periodPreset").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  const scopeType = document.getElementById("scopeType").value;
  const scopeValue = document.getElementById("scopeValue").value;

  const hint = document.getElementById("statusHint");
  hint.textContent = "Carregando dados...";

  const url = new URL("/api/dashboard/desembarques", window.location.origin);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  url.searchParams.set("scope_type", scopeType);
  if (scopeType !== "geral") url.searchParams.set("scope_value", scopeValue);

  try {
    const resp = await fetch(url.toString(), { headers: { ...getAuthHeader() } });
    const json = await resp.json();
    if (!json.success) throw new Error(json.error || "Falha ao carregar dashboard");

    setKpis(json.kpis);
    renderKgPerDay(json.series_captura_dia || []);
    renderPies(json.pie_especies_local || [], json.pie_especies_geral || []);
    setSummaryBox(json);

    hint.textContent = `OK — ${json.kpis.total_desembarques} desembarques aprovados no período.`;
  } catch (e){
    console.error(e);
    hint.textContent = "Erro ao carregar dados do dashboard. Verifique o backend e a autenticação.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const presetEl = document.getElementById("periodPreset");
  const scopeTypeEl = document.getElementById("scopeType");
  const btn = document.getElementById("btnApply");

  presetEl.addEventListener("change", () => setPreset(presetEl.value));
  scopeTypeEl.addEventListener("change", () => populateScopeValue());
  btn.addEventListener("click", loadDashboard);

  setPreset(presetEl.value);
  populateScopeValue();
  loadDashboard();
});
