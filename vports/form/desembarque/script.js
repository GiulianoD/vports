// =======================================
// Estado global
// =======================================
let embarcacoesList = [];      // lista de embarcações (API)

// =======================================
// Boot
// =======================================
document.addEventListener('DOMContentLoaded', function () {
  // Rodar apenas na página de desembarque (onde existe o formulário)
  const form = document.getElementById('desembarqueForm');
  if (form) {
    initForm();

    // Listeners de esforço
    const inicioEl = document.getElementById('dataInicioPesca');
    const fimEl = document.getElementById('dataFimPesca');
    if (inicioEl) inicioEl.addEventListener('change', calcularEsforco);
    if (fimEl) fimEl.addEventListener('change', calcularEsforco);

    // Envio do formulário
    form.addEventListener('submit', handleSubmit);

    // Carregar embarcações do backend
    carregarEmbarcacoes();

    // Despesas (toggle)
    initDespesasUI();

    // Mapa (Leaflet)
    initFishingMap();
  }
});

// =======================================
// Embarcações (API + preenchimento)
// =======================================
async function carregarEmbarcacoes() {
  const selectEmbarcacao = document.getElementById('embarcacao');
  if (!selectEmbarcacao) return;

  try {
    console.log('Carregando embarcações...');
    
    // Usar as URLs do arquivo de configuração
    const EMBARCACOES_ATIVAS_URL = window.URLS_CONFIG?.EMBARCACOES_ENDPOINTS?.BASE || '/api/embarcacoes-ativas';
    console.log(EMBARCACOES_ATIVAS_URL)
    
    const response = await fetch(EMBARCACOES_ATIVAS_URL);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

    const data = await response.json();

    if (data.success) {
      embarcacoesList = data.embarcacoes || [];
      console.log(`✅ ${embarcacoesList.length} embarcações carregadas`);
      preencherSelectEmbarcacoes();
    } else {
      console.error('❌ Erro ao carregar embarcações:', data.message);
      preencherEmbarcacoesFallback('Erro ao carregar embarcações');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar embarcações:', error);
    preencherEmbarcacoesFallback('Erro de conexão');
  }
}

function preencherSelectEmbarcacoes() {
  const selectEmbarcacao = document.getElementById('embarcacao');
  if (!selectEmbarcacao) return;

  selectEmbarcacao.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Selecione uma embarcação';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  selectEmbarcacao.appendChild(defaultOption);

  embarcacoesList.forEach((embarcacao) => {
    const option = document.createElement('option');
    option.value = embarcacao.id;
    option.textContent = `${embarcacao.nome_embarcacao} (${embarcacao.rgp})`;
    selectEmbarcacao.appendChild(option);
  });

  if (embarcacoesList.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Nenhuma embarcação cadastrada';
    option.disabled = true;
    selectEmbarcacao.appendChild(option);
  }
}

function preencherEmbarcacoesFallback(mensagemErro) {
  const selectEmbarcacao = document.getElementById('embarcacao');
  if (!selectEmbarcacao) return;

  selectEmbarcacao.innerHTML = '';

  const errorOption = document.createElement('option');
  errorOption.value = '';
  errorOption.textContent = `${mensagemErro} - Use opções estáticas`;
  errorOption.disabled = true;
  errorOption.selected = true;
  selectEmbarcacao.appendChild(errorOption);

  const opcoesEstaticas = [
    { id: 'fallback-1', nome_embarcacao: 'N/A', rgp: '000' }
  ];
  
  opcoesEstaticas.forEach((embarcacao) => {
    const option = document.createElement('option');
    option.value = embarcacao.id;
    option.textContent = `${embarcacao.nome_embarcacao} (${embarcacao.rgp})`;
    selectEmbarcacao.appendChild(option);
  });
}

// =======================================
// Inicialização de campos da página
// =======================================
function initForm() {
  const selectLocal = document.getElementById('localDesembarque');
  if (selectLocal) {
    const cidadesES = [
      'Itaparica','Itapoã','Praia do Ribeiro','Praia da costa','Prainha',
      'Praia do Suá/Canto','Enseada do Suá','Ilha das Caieiras','Santo Antônio','Grande Vitória',
    ];
    cidadesES.forEach((cidade) => {
      const option = document.createElement('option');
      option.value = cidade;
      option.textContent = cidade;
      selectLocal.appendChild(option);
    });
  }
}

// =======================================
// Tabela de espécies
// =======================================
function addRow() {
  const tbody = document.getElementById('especiesTable')?.getElementsByTagName('tbody')[0];
  if (!tbody) return;

  const newRow = tbody.insertRow();
  const cell1 = newRow.insertCell(0);
  const cell2 = newRow.insertCell(1);
  const cell3 = newRow.insertCell(2);
  const cell4 = newRow.insertCell(3);

  cell1.innerHTML = '<input type="text" name="especie[]" placeholder="Nome da espécie">';
  cell2.innerHTML = '<input type="number" name="quantidade[]" min="0" step="0.1" placeholder="Kg">';
  cell3.innerHTML = '<input type="number" name="valorKg[]" min="0" step="0.01" placeholder="0,00" inputmode="decimal">';
  cell4.innerHTML = '<button type="button" class="btn-remove" onclick="removeRow(this)">Remover</button>';
}

function removeRow(button) {
  const row = button?.closest('tr');
  const tbody = document.getElementById('especiesTable')?.getElementsByTagName('tbody')[0];
  if (!row || !tbody) return;

  if (tbody.rows.length > 1) {
    row.remove();
  } else {
    alert('A tabela deve ter pelo menos uma espécie.');
  }
}

// =======================================
// Campos condicionais
// =======================================
function toggleOutroDestinacao() {
  const select = document.getElementById('destinacao');
  const container = document.getElementById('outroDestinacaoContainer');
  if (!select || !container) return;
  if (select.value === 'Outro') container.classList.remove('hidden');
  else container.classList.add('hidden');
}

function toggleOutroArtePesca() {
  const select = document.getElementById('artePesca');
  const container = document.getElementById('outroArtePescaContainer');
  if (!select || !container) return;
  if (select.value === 'Outro') container.classList.remove('hidden');
  else container.classList.add('hidden');
}

// =======================================
// Esforço
// =======================================
function calcularEsforco() {
  const inicio = document.getElementById('dataInicioPesca')?.value;
  const fim = document.getElementById('dataFimPesca')?.value;
  const esforcoField = document.getElementById('esforco');
  if (!esforcoField) return;

  if (inicio && fim) {
    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);

    if (fimDate > inicioDate) {
      const diffMs = fimDate - inicioDate;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      esforcoField.value = `${diffHours} horas e ${diffMinutes} minutos`;
    } else {
      esforcoField.value = '';
      alert('A data de fim deve ser posterior à data de início.');
    }
  } else {
    esforcoField.value = '';
  }
}

// =======================================
// Limpar & Enviar formulário
// =======================================
function clearForm() {
  const form = document.getElementById('desembarqueForm');
  if (!form) return;

  if (confirm('Tem certeza que deseja limpar todos os campos?')) {
    form.reset();
    document.getElementById('outroDestinacaoContainer')?.classList.add('hidden');
    document.getElementById('outroArtePescaContainer')?.classList.add('hidden');

    // Manter apenas uma linha na tabela
    const tbody = document.getElementById('especiesTable')?.getElementsByTagName('tbody')[0];
    if (tbody) {
      while (tbody.rows.length > 1) tbody.deleteRow(1);
    }

    // Resetar select de embarcação
    preencherSelectEmbarcacoes();

    // Despesas
    const has = document.getElementById('hasDespesas');
    const cont = document.getElementById('despesasContainer');
    const val = document.getElementById('totalDespesas');
    if (has) has.checked = false;
    if (val) val.value = '';
    if (cont) cont.classList.add('hidden');

    // Mapa
    clearFishingPoint();
  }
}

function validarCamposObrigatorios() {
  const campos = [
    { id: 'embarcacao', nome: 'Embarcação' },
    { id: 'localDesembarque', nome: 'Local do Desembarque' }
  ];
  
  const camposFaltantes = [];
  
  for (const campo of campos) {
    const elemento = document.getElementById(campo.id);
    if (!elemento || !elemento.value) {
      camposFaltantes.push(campo.nome);
    }
  }
  
  if (camposFaltantes.length > 0) {
    alert(`❌ Campos obrigatórios não preenchidos:\n${camposFaltantes.join('\n')}`);
    return false;
  }
  
  return true;
}

async function handleSubmit(event) {
  event.preventDefault();

  // VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
  if (!validarCamposObrigatorios()) {
    return; // Impede o envio
  }

  const form = event.target;

  const submitBtn = form.querySelector('.btn-submit');
  const originalText = submitBtn ? submitBtn.textContent : null;

  try {
    if (submitBtn) {
      submitBtn.textContent = 'Enviando...';
      submitBtn.disabled = true;
    }

    const formData = new FormData(form);

    // Converter FormData para objeto JSON (mesmo padrão do embarcacao.js)
    const jsonData = {};
    
    // Processar campos do formulário
    for (const [key, value] of formData.entries()) {
      if (jsonData[key]) {
        // Se a chave já existe, transformar em array
        if (!Array.isArray(jsonData[key])) {
          jsonData[key] = [jsonData[key]];
        }
        jsonData[key].push(value);
      } else {
        jsonData[key] = value;
      }
    }

    // Estruturar as espécies em um array de objetos (organizar melhor os dados)
    const especies = [];
    if (jsonData['especie[]'] && jsonData['quantidade[]'] && jsonData['valorKg[]']) {
      const especiesArray = Array.isArray(jsonData['especie[]']) ? jsonData['especie[]'] : [jsonData['especie[]']];
      const quantidadesArray = Array.isArray(jsonData['quantidade[]']) ? jsonData['quantidade[]'] : [jsonData['quantidade[]']];
      const valoresArray = Array.isArray(jsonData['valorKg[]']) ? jsonData['valorKg[]'] : [jsonData['valorKg[]']];
      
      for (let i = 0; i < especiesArray.length; i++) {
        if (especiesArray[i] && quantidadesArray[i] && valoresArray[i]) {
          especies.push({
            especie: especiesArray[i],
            quantidade: quantidadesArray[i],
            valor_kg: valoresArray[i]
          });
        }
      }
      
      // Adicionar array estruturado ao JSON
      jsonData.especies = especies;
      
      // Remover arrays antigos
      delete jsonData['especie[]'];
      delete jsonData['quantidade[]'];
      delete jsonData['valorKg[]'];
    }

    // Processar campos condicionais
    if (jsonData.destinacao !== 'Outro') {
      jsonData.outroDestinacao = '';
    }
    if (jsonData.artePesca !== 'Outro') {
      jsonData.outroArtePesca = '';
    }

    // Processar despesas
    if (!jsonData.hasDespesas || jsonData.hasDespesas === 'off') {
      jsonData.totalDespesas = '';
    }

    // Obter informações do usuário logado (mesmo padrão do embarcacao.js)
    const usuario = obterInformacoesUsuario();
    if (!usuario) {
      alert("❌ Você precisa estar logado para registrar um desembarque!");
      window.location.href = '/login.html';
      return;
    }

    console.log(`👤 Usuário logado: ${usuario.nome} (ID: ${usuario.id})`);

    // IMPRIMIR JSON NO CONSOLE (mesmo padrão do embarcacao.js)
    console.log('📦 JSON enviado na requisição POST /desembarques:');
    console.log(JSON.stringify(jsonData, null, 2));
    console.log('👤 Usuário que está registrando:', usuario);
    console.log('--- Dados brutos:', jsonData);

    // Usar as URLs do arquivo de configuração
    const DESEMBARQUES_URL = window.URLS_CONFIG?.DESEMBARQUES_ENDPOINTS?.BASE || '/api/desembarques';

    console.log('🌐 Enviando dados para:', DESEMBARQUES_URL);
    console.log('🔐 Token de acesso:', obterAccessToken() ? 'Presente' : 'Ausente');

    // Enviar como JSON em vez de FormData (mesmo padrão do embarcacao.js)
    const response = await fetch(DESEMBARQUES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${obterAccessToken()}`
      },
      body: JSON.stringify(jsonData)
    });

    const result = await response.json();
    if (result.success) {
      alert('✅ Desembarque registrado com sucesso!');
      console.log('Dados salvos:', result.data);
      clearForm();
    } else {
      if (response.status === 401) {
        alert("🔐 Sessão expirada. Faça login novamente.");
        window.location.href = '/login.html';
      } else {
        throw new Error(result.message || 'Erro ao salvar desembarque');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao enviar formulário:', error);
    alert('❌ Erro ao enviar formulário: ' + error.message);
  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText || 'Enviar Registro';
      submitBtn.disabled = false;
    }
  }
}

// =======================================
// Despesas — toggle e máscara simples
// =======================================
function initDespesasUI(){
  const hasEl = document.getElementById('hasDespesas');
  const container = document.getElementById('despesasContainer');
  const input = document.getElementById('totalDespesas');

  if (!hasEl || !container || !input) return;

  const update = () => {
    container.classList.toggle('hidden', !hasEl.checked);
    if (!hasEl.checked) input.value = '';
  };
  hasEl.addEventListener('change', update);
  update();

  // (opcional) normalização de decimal com vírgula
  input.addEventListener('blur', () => {
    if (!input.value) return;
    const val = input.value.replace(',', '.');
    const num = Number(val);
    if (Number.isFinite(num)) input.value = num.toFixed(2);
  });
}

// =======================================
// MAPA — Marcação do local de pesca (Leaflet)
// =======================================
let mapPescaInstance = null;
let mapPescaMarker = null;

// limites aproximados da Grande Vitória
const GV_BOUNDS = L.latLngBounds(
  L.latLng(-20.55, -40.60),  // sudoeste
  L.latLng(-19.95, -40.00)   // nordeste
);

// ponto e zoom iniciais (Vitória/ES)
const GV_CENTER = [-20.3155, -40.3128];
const GV_ZOOM   = 11;

function initFishingMap(){
  const mapEl = document.getElementById('mapPesca');
  if (!mapEl || typeof L === 'undefined') return;

  // Cria mapa
  mapPescaInstance = L.map('mapPesca', {
    center: GV_CENTER,
    zoom: GV_ZOOM,
    maxBounds: GV_BOUNDS,
    maxBoundsViscosity: 0.7,
    tap: true
  });

  // Camada base (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapPescaInstance);

  // Clique/toque -> define marcador
  mapPescaInstance.on('click', (e) => {
    setFishingPoint(e.latlng.lat, e.latlng.lng);
  });

  // Botões
  const btnClear = document.getElementById('btnLimparMarcacao');
  const btnLocate = document.getElementById('btnMinhaPosicao');
  btnClear?.addEventListener('click', clearFishingPoint);
  btnLocate?.addEventListener('click', locateMeOnMap);
}

function setFishingPoint(lat, lng){
  const latEl = document.getElementById('latPesca');
  const lngEl = document.getElementById('lngPesca');
  if (!latEl || !lngEl) return;

  if (!mapPescaMarker) {
    mapPescaMarker = L.marker([lat, lng], { draggable: true }).addTo(mapPescaInstance);
    mapPescaMarker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      writeFishingPoint(lat, lng);
    });
  } else {
    mapPescaMarker.setLatLng([lat, lng]);
  }

  writeFishingPoint(lat, lng);
  mapPescaInstance.flyTo([lat, lng], Math.max(mapPescaInstance.getZoom(), 12));
}

function writeFishingPoint(lat, lng){
  const latEl = document.getElementById('latPesca');
  const lngEl = document.getElementById('lngPesca');
  const readout = document.getElementById('mapReadout');

  latEl.value = lat.toFixed(6);
  lngEl.value = lng.toFixed(6);
  if (readout) readout.textContent = `Ponto selecionado: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function clearFishingPoint(){
  const latEl = document.getElementById('latPesca');
  const lngEl = document.getElementById('lngPesca');
  const readout = document.getElementById('mapReadout');

  if (mapPescaMarker && mapPescaInstance) {
    mapPescaInstance.removeLayer(mapPescaMarker);
    mapPescaMarker = null;
  }
  if (latEl) latEl.value = '';
  if (lngEl) lngEl.value = '';
  if (readout) readout.textContent = 'Nenhum ponto selecionado';
}

function locateMeOnMap(){
  if (!navigator.geolocation) {
    alert('Geolocalização não suportada pelo navegador.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setFishingPoint(lat, lng);
    },
    (err) => {
      alert('Não foi possível obter sua localização.');
      console.warn(err);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}