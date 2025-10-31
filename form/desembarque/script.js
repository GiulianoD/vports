// =======================================
// Estado global
// =======================================
let uploadedImages = [];       // imagens selecionadas
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

    // Preview de imagens
    const imagensEl = document.getElementById('imagens');
    if (imagensEl) imagensEl.addEventListener('change', handleImageUpload);

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
    const response = await fetch('/api/embarcacoes-ativas');
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

    const data = await response.json();

    if (data.success) {
      embarcacoesList = data.data || [];
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

  const opcoesEstaticas = [{ id: 'fallback-1', nome: 'N/A', rgp: '000' }];
  opcoesEstaticas.forEach((embarcacao) => {
    const option = document.createElement('option');
    option.value = embarcacao.id;
    option.textContent = `${embarcacao.nome} (${embarcacao.rgp})`;
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

  updateImagePreview();
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
// Upload de imagens (preview)
// =======================================
function handleImageUpload(event) {
  const files = event.target.files || [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.match('image.*')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      continue;
    }

    const isDuplicate = uploadedImages.some((img) => img.name === file.name && img.size === file.size);
    if (isDuplicate) continue;

    const reader = new FileReader();
    reader.onload = function (e) {
      uploadedImages.push({
        id: Date.now() + i,
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target.result,
      });
      updateImagePreview();
    };
    reader.readAsDataURL(file);
  }
  event.target.value = '';
}

function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function updateImagePreview() {
  const previewContainer = document.getElementById('previewContainer');
  if (!previewContainer) return;

  previewContainer.innerHTML = '';

  if (uploadedImages.length === 0) {
    previewContainer.innerHTML = '<div class="no-images">Nenhuma imagem selecionada</div>';
    return;
  }

  uploadedImages.forEach((image) => {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.dataset.id = image.id;

    previewItem.innerHTML = `
      <img src="${image.data}" alt="${image.name}" class="preview-image">
      <div class="preview-info">${image.name}</div>
      <button type="button" class="btn-delete-image" onclick="deleteImage(${image.id})" title="Remover imagem">×</button>
    `;
    previewContainer.appendChild(previewItem);
  });
}

function deleteImage(imageId) {
  uploadedImages = uploadedImages.filter((img) => img.id !== imageId);
  updateImagePreview();
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

    // Limpar imagens
    uploadedImages = [];
    updateImagePreview();

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

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;

  if (!validarFormulario()) return;

  const submitBtn = form.querySelector('.btn-submit');
  const originalText = submitBtn ? submitBtn.textContent : null;

  try {
    if (submitBtn) {
      submitBtn.textContent = 'Enviando...';
      submitBtn.disabled = true;
    }

    const formData = new FormData(form);

    // Anexa imagens convertidas
    uploadedImages.forEach((image) => {
      const blob = dataURLtoBlob(image.data);
      formData.append('imagens', blob, image.name);
    });

    console.log('Enviando formulário com', uploadedImages.length, 'imagens');

    const response = await fetch('/api/desembarques', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (result.success) {
      alert('Desembarque registrado com sucesso!');
      console.log('Dados salvos:', result.data);
      clearForm();
    } else {
      throw new Error(result.message || 'Erro ao salvar desembarque');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar formulário:', error);
    alert('Erro ao enviar formulário: ' + error.message);
  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText || 'Enviar Registro';
      submitBtn.disabled = false;
    }
  }
}

function validarFormulario() {
  // pelo menos uma espécie com nome e quantidade
  const especies = document.getElementsByName('especie[]');
  const quantidades = document.getElementsByName('quantidade[]');

  let especiesValidas = false;
  for (let i = 0; i < especies.length; i++) {
    if (especies[i].value.trim() !== '' && quantidades[i].value.trim() !== '') {
      especiesValidas = true;
      break;
    }
  }
  if (!especiesValidas) {
    alert('Por favor, adicione pelo menos uma espécie com nome e quantidade.');
    return false;
  }

  // "Outro" especificado
  const destinacao = document.getElementById('destinacao')?.value;
  const outroDestinacao = document.getElementById('outroDestinacao')?.value || '';
  if (destinacao === 'Outro' && outroDestinacao.trim() === '') {
    alert('Por favor, especifique a destinação.');
    return false;
  }

  const artePesca = document.getElementById('artePesca')?.value;
  const outroArtePesca = document.getElementById('outroArtePesca')?.value || '';
  if (artePesca === 'Outro' && outroArtePesca.trim() === '') {
    alert('Por favor, especifique a arte de pesca.');
    return false;
  }

  // Se marcar despesas, exige valor válido
  const has = document.getElementById('hasDespesas');
  const val = document.getElementById('totalDespesas');
  if (has?.checked) {
    const num = Number(val?.value);
    if (!Number.isFinite(num) || num < 0) {
      alert('Informe um valor válido para Total de Despesas.');
      return false;
    }
  }

  // Se usar mapa, opcional: exigir ponto marcado
  // const lat = document.getElementById('latPesca')?.value;
  // const lng = document.getElementById('lngPesca')?.value;
  // if (!lat || !lng) { alert('Marque o local da pesca no mapa.'); return false; }

  return true;
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
