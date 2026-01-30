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
  document.getElementById("kpiAvgTrips").textContent = kpis.media_desembarques_dia?.toFixed(2) ?? 0;
  document.getElementById("kpiAvgKg").textContent = kpis.media_kg_dia?.toFixed(2) ?? 0;
  document.getElementById("kpiAvgEffort").textContent = kpis.media_esforco_horas_dia?.toFixed(2) ?? 0;
  document.getElementById("kpiEffortTotal").textContent = kpis.total_esforco_hhmm ?? "00:00";
  
  // NOVOS KPIs
  document.getElementById("kpiTotalKg").textContent = kpis.total_kg?.toFixed(2) ?? 0;
  
  // Calcular CPUE (kg/h)
  let cpue = 0;
  if (kpis.total_kg > 0) {
    const totalHours = hhmmToHours(kpis.total_esforco_hhmm);
    if (totalHours > 0) {
      cpue = kpis.total_kg / totalHours;
    }
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

function renderEspeciesChart(items, title = 'Espécies Capturadas'){
  const ctx = document.getElementById("chartEspecies");
  
  if (!items || items.length === 0) {
    // Limpar canvas se não houver dados
    const context = ctx.getContext('2d');
    context.clearRect(0, 0, ctx.width, ctx.height);
    
    // Mostrar mensagem de "Sem dados"
    context.fillStyle = '#999';
    context.font = '14px Arial';
    context.textAlign = 'center';
    context.fillText('Sem dados disponíveis', ctx.width/2, ctx.height/2);
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
  
  if (chartEspecies) chartEspecies.destroy();
  
  chartEspecies = new Chart(ctx, {
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
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: {
              size: 11
            },
            padding: 10,
            boxWidth: 12,
            usePointStyle: true,
            generateLabels: function(chart) {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map(function(label, i) {
                  const value = data.datasets[0].data[i];
                  const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return {
                    text: `${label}: ${value.toFixed(1)} kg (${percentage}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
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
        },
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        }
      }
    }
  });
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
  const scopeType = document.getElementById("scopeType").value;
  const scopeValue = document.getElementById("scopeValue").value;
  
  // Definir título baseado no filtro
  let title = 'Espécies Capturadas';
  if (scopeType === 'local' && scopeValue) {
    title = `Espécies Capturadas - ${scopeValue}`;
  } else if (scopeType === 'regiao' && scopeValue) {
    title = `Espécies Capturadas - ${scopeValue}`;
  }
  
  // Usar dados locais se filtro for local, senão usar dados gerais
  let speciesData = rawSpeciesData;
  
  // Se quiser manter a lógica anterior de local/geral, ajuste aqui
  // Atualmente usando apenas os dados recebidos da API
  
  const groupedData = groupSpecies(speciesData, groupLimit);
  renderEspeciesChart(groupedData, title);
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
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwibm9tZSI6Im1lcnljaWFuZSIsImZ1bmNhbyI6IlZpbGEgVmVsaGEiLCJleHAiOjE3Njk3MjAxODcsImlhdCI6MTc2OTYzMzc4N30.nt5ssnIVspaanNj1AG19KmZ3BmAtUTjCC85lriTkdcg`
      }
    });
    const json = await resp.json();
    
    if (!json.success) throw new Error(json.error || "Falha ao carregar dashboard");

    // Armazenar os dados brutos das espécies
    // Usar dados locais ou gerais dependendo do filtro
    if (scopeType === 'geral' || scopeType === 'regiao') {
      rawSpeciesData = json.pie_especies_geral || [];
    } else {
      rawSpeciesData = json.pie_especies_local || [];
    }
    
    setKpis(json.kpis);
    renderKgPerDay(json.series_captura_dia || []);
    
    // Renderizar gráfico de espécies
    updateEspeciesChart();
    
    // Adicionar o resumo de volta
    setSummaryBox(json);

    // Atualizar hint
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

function hoursToHhmm(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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
    if (rawSpeciesData.length > 0) {
      updateEspeciesChart();
    }
  });
  
  // Adicionar listener para o filtro de escopo
  scopeTypeEl.addEventListener("change", () => {
    // Quando mudar o filtro, recarregar os dados
    if (document.getElementById("scopeValue").value || scopeTypeEl.value === "geral") {
      loadDashboard();
    }
  });
  
  document.getElementById("scopeValue").addEventListener("change", () => {
    // Quando mudar o valor do filtro, recarregar os dados
    loadDashboard();
  });
  
  btn.addEventListener("click", loadDashboard);

  setPreset(presetEl.value);
  populateScopeValue();
  loadDashboard();
});
