/* admin.js — UI de administração para validar registros do PostgreSQL (com aba Pescadores) */
(() => {
  const rowsEl = document.getElementById("rows");
  const headRow = document.getElementById("head-row");
  const statusFilter = document.getElementById("statusFilter");
  const search = document.getElementById("search");
  const exportJson = document.getElementById("exportJson");
  const exportCsv = document.getElementById("exportCsv");
  const refreshBtn = document.getElementById("refresh");
  const loadingEl = document.getElementById("loading");
  const errorEl = document.getElementById("error");
  const tabs = document.querySelectorAll(".tab-btn");

  const drawer = document.getElementById("drawer");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerBody = document.getElementById("drawerBody");
  const closeDrawer = document.getElementById("closeDrawer");
  const reviewNote = document.getElementById("reviewNote");
  const btnApprove = document.getElementById("btnApprove");
  const btnReject = document.getElementById("btnReject");

  const API_BASE = window.API_BASE || 'http://localhost:3000/api';
  const FILES_BASE = window.FILES_BASE || '/uploads/';

  let currentTab = "emb"; // 'emb' | 'des' | 'pes'
  let currentList = [];
  let selectedRecord = null;

  // Cabeçalhos da tabela
  const HEADERS = {
    emb: ["ID", "Status", "Data", "Nome", "RGP", "UF/Município", "Ações"],
    des: ["ID", "Status", "Data", "Embarcação", "Data Desembarque", "Local", "Ações"],
    pes: ["ID", "Status", "Data", "Nome", "UF/Município", "Local onde pesca", "Ações"],
  };

  const ENDPOINTS = {
    emb: "embarcacoes",
    des: "desembarques",
    pes: "pescadores",
  };

  function showLoading() {
    loadingEl.style.display = 'block';
    errorEl.classList.add('hidden');
    rowsEl.innerHTML = '';
  }
  function hideLoading() { loadingEl.style.display = 'none'; }
  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    hideLoading();
  }
  function setHeaders() {
    headRow.innerHTML = HEADERS[currentTab].map(h => `<th>${h}</th>`).join("");
  }

  function debounce(fn, ms=250){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

  async function fetchData() {
    showLoading();
    try {
      const endpoint = ENDPOINTS[currentTab];
      const res = await fetch(`${API_BASE}/${endpoint}`);
      if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Erro ao carregar dados');

      let all = result.data || [];

      // filtro por status
      let filtered = statusFilter.value
        ? all.filter(r => (r.status || 'pending') === statusFilter.value)
        : all;

      // busca textual
      const q = search.value.trim().toLowerCase();
      if (q) {
        filtered = filtered.filter((r) => {
          if (currentTab === "emb") {
            return (
              (r.nome_embarcacao || "").toLowerCase().includes(q) ||
              (r.rgp || "").toLowerCase().includes(q) ||
              (r.municipio || "").toLowerCase().includes(q) ||
              (r.uf || "").toLowerCase().includes(q) ||
              (r.responsavel || "").toLowerCase().includes(q)
            );
          } else if (currentTab === "des") {
            const embarcacaoNome = r.nome_embarcacao || (r.embarcacoes ? r.embarcacoes.nome_embarcacao : '') || '';
            return (
              embarcacaoNome.toLowerCase().includes(q) ||
              (r.local_desembarque || "").toLowerCase().includes(q) ||
              (r.data_desembarque || "").toLowerCase().includes(q) ||
              (r.destinacao || "").toLowerCase().includes(q) ||
              (r.arte_pesca || "").toLowerCase().includes(q) ||
              (r.observacoes || "").toLowerCase().includes(q)
            );
          } else {
            // pescadores
            return (
              (r.nomeCompleto || r.nome || "").toLowerCase().includes(q) ||
              (r.vulgo || r.apelido || "").toLowerCase().includes(q) ||
              (r.localOndePesca || "").toLowerCase().includes(q) ||
              (r.municipio || "").toLowerCase().includes(q) ||
              (r.uf || "").toLowerCase().includes(q) ||
              (r.observacoes || "").toLowerCase().includes(q)
            );
          }
        });
      }

      currentList = filtered;
      hideLoading();
      return filtered;
    } catch (error) {
      showError(`Erro ao carregar dados: ${error.message}`);
      currentList = [];
      return [];
    }
  }

  function statusBadge(status) {
    const s = status || 'pending';
    const cls = s === "approved" ? "status-approved" : s === "rejected" ? "status-rejected" : "status-pending";
    const label = s === "approved" ? "Aprovado" : s === "rejected" ? "Reprovado" : "Pendente";
    return `<span class="badge ${cls}">${label}</span>`;
  }

  async function render() {
    setHeaders();
    await fetchData();

    rowsEl.innerHTML = currentList.map((r) => {
      if (currentTab === "emb") {
        return `
          <tr>
            <td>${r.id}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${formatDateTime(r.created_at)}</td>
            <td>${r.nome_embarcacao || ""}</td>
            <td>${r.rgp || ""}</td>
            <td>${r.uf || ""}/${r.municipio || ""}</td>
            <td class="row-actions">
              <button class="btn btn-view" data-id="${r.id}" data-type="embarcacao">Ver</button>
            </td>
          </tr>`;
      } else if (currentTab === "des") {
        const embarcacaoNome = r.nome_embarcacao || (r.embarcacoes ? r.embarcacoes.nome_embarcacao : '') || 'N/A';
        const embarcacaoRgp = r.rgp || (r.embarcacoes ? r.embarcacoes.rgp : '') || 'N/A';
        return `
          <tr>
            <td>${r.id}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${formatDateTime(r.created_at)}</td>
            <td>${embarcacaoNome} (${embarcacaoRgp})</td>
            <td>${formatDate(r.data_desembarque)}</td>
            <td>${r.local_desembarque || ""}</td>
            <td class="row-actions">
              <button class="btn btn-view" data-id="${r.id}" data-type="desembarque">Ver</button>
            </td>
          </tr>`;
      } else {
        // pescadores
        return `
          <tr>
            <td>${r.id}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${formatDateTime(r.created_at)}</td>
            <td>${r.nomeCompleto || r.nome || ""}</td>
            <td>${r.uf || ""}/${r.municipio || ""}</td>
            <td>${r.localOndePesca || ""}</td>
            <td class="row-actions">
              <button class="btn btn-view" data-id="${r.id}" data-type="pescador">Ver</button>
            </td>
          </tr>`;
      }
    }).join("");

    // bind view buttons
    rowsEl.querySelectorAll(".btn-view").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const type = btn.getAttribute("data-type"); // 'embarcacao' | 'desembarque' | 'pescador'
        try {
          const endpoint = type === 'desembarque'
            ? 'desembarques'
            : type === 'pescador'
            ? 'pescadores'
            : 'embarcacoes';
          const response = await fetch(`${API_BASE}/${endpoint}/${id}`);
          const result = await response.json();
          if (result.success) {
            openDrawer(result.data, type);
          } else {
            alert('Erro ao carregar detalhes: ' + result.message);
          }
        } catch (error) {
          alert('Erro ao carregar detalhes: ' + error.message);
        }
      });
    });
  }

  function openDrawer(rec, coll) {
    selectedRecord = { rec, coll }; // coll: 'embarcacao' | 'desembarque' | 'pescador'

    if (coll === "embarcacao") {
      const rgp = rec.rgp ? ` (${rec.rgp})` : "";
      drawerTitle.textContent = `Embarcação — ${rec.nome_embarcacao || rec.id}${rgp}`;
    } else if (coll === "desembarque") {
      const embarcacaoNome = rec.nome_embarcacao || (rec.embarcacoes ? rec.embarcacoes.nome_embarcacao : '') || 'N/A';
      drawerTitle.textContent = `Desembarque — ${embarcacaoNome} (${formatDate(rec.data_desembarque)})`;
    } else {
      drawerTitle.textContent = `Pescador(a) — ${rec.nomeCompleto || rec.nome || rec.id}`;
    }

    const processedData = processRecordData(rec, coll);

    // Datas
    ["data_saida","data_retorno","data_inicio_pesca","data_fim_pesca","created_at","reviewed_at"].forEach(k=>{
      if(processedData[k]) processedData[k] = formatDateTime(processedData[k]);
    });
    if (processedData.data_desembarque) processedData.data_desembarque = formatDate(processedData.data_desembarque);

    // chave/valor
    const kvPairs = [];
    Object.keys(processedData).forEach((k) => {
      if (k.startsWith('outro_') || k.endsWith('_formatted')) return;
      let v = processedData[k];
      if (k === 'especies' && processedData.especies_formatted) v = processedData.especies_formatted;
      if (k === 'imagens' && processedData.imagens_formatted) v = processedData.imagens_formatted;
      if (k === 'anexos' && processedData.anexos_formatted) v = processedData.anexos_formatted;

      if (v === null || v === undefined) v = '';
      else if (Array.isArray(v)) v = v.join(", ");
      else if (typeof v === 'object' && !(v instanceof Date)) v = JSON.stringify(v, null, 2);

      kvPairs.push(`<b>${formatFieldName(k)}</b><div>${v.toString()}</div>`);
    });

    // Seções de midia
    let attachmentsSection = '';
    if (coll === 'embarcacao' && processedData.anexos && Array.isArray(processedData.anexos) && processedData.anexos.length > 0) {
      attachmentsSection = `
        <hr style="margin:12px 0;">
        <h4>Arquivos Anexados</h4>
        <div class="attachments-gallery">
          ${renderAttachmentsGallery(processedData.anexos)}
        </div>
      `;
    } else if (coll === 'desembarque' && processedData.imagens && Array.isArray(processedData.imagens) && processedData.imagens.length > 0) {
      attachmentsSection = `
        <hr style="margin:12px 0;">
        <h4>Imagens Anexadas</h4>
        <div class="images-gallery">
          ${renderImagesGallery(processedData.imagens)}
        </div>
      `;
    }

    // bloco espécies somente para desembarque
    const speciesBlock = coll === 'desembarque' ? `
      <hr style="margin:12px 0;">
      <h4>Detalhes da Captura</h4>
      <div class="species-details">
        ${renderSpeciesDetails(processedData.especies)}
      </div>` : '';

    drawerBody.innerHTML = `
      <div class="drawer-body-content">
        <div class="kv">
          <b>ID</b><div>${rec.id}</div>
          <b>Status</b><div>${rec.status || 'pending'}</div>
          <b>Enviado em</b><div>${formatDateTime(rec.created_at)}</div>
          ${rec.reviewed_at ? `<b>Revisado em</b><div>${formatDateTime(rec.reviewed_at)}</div>` : ""}
          ${rec.review_note ? `<b>Observação</b><div>${rec.review_note}</div>` : ""}
        </div>
        <hr style="margin:12px 0;">
        <h4>${
          coll === 'embarcacao' ? 'Dados da Embarcação' :
          coll === 'desembarque' ? 'Dados do Desembarque' :
          'Dados do Pescador(a)'
        }</h4>
        <div class="kv">${kvPairs.join("")}</div>
        ${speciesBlock}
        ${attachmentsSection}
        <hr style="margin:12px 0;">
        <details>
          <summary>JSON bruto</summary>
          <pre style="white-space:pre-wrap; word-break:break-word;">${JSON.stringify(rec, null, 2)}</pre>
        </details>
      </div>
    `;

    reviewNote.value = rec.review_note || "";
    drawer.classList.add("open");
    document.getElementById('drawerOverlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  // Galeria de anexos/imagens (mesmo do seu arquivo, com base configurável)
  function renderAttachmentsGallery(anexos) {
    if (!anexos || !Array.isArray(anexos) || anexos.length === 0) return '<p>Nenhum arquivo disponível</p>';
    const images = anexos.filter(a => a.tipo && a.tipo.startsWith('image/'));
    const otherFiles = anexos.filter(a => !a.tipo || !a.tipo.startsWith('image/'));
    let galleryHTML = '';

    if (images.length > 0) {
      galleryHTML += `
        <div style="margin-bottom: 20px;">
          <h5 style="margin-bottom: 10px; color: #2c3e50;">Imagens (${images.length})</h5>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
            ${images.map(img => {
              const fileName = img.nome || 'Arquivo';
              const filePath = img.caminho || '';
              const fileNameOnly = filePath.split('/').pop() || fileName;
              const imageUrl = `${FILES_BASE}${encodeURIComponent(fileNameOnly)}`;
              return `
                <div style="text-align:center;">
                  <a href="${imageUrl}" target="_blank" title="Abrir imagem em tamanho real">
                    <img src="${imageUrl}" alt="${fileName}"
                      style="width:100px;height:100px;object-fit:cover;border-radius:6px;border:2px solid #e0e0e0;cursor:pointer;transition:all .3s"
                      onerror="this.style.display='none'">
                  </a>
                  <div style="margin-top:5px;font-size:11px;word-break:break-all;">
                    <a href="${imageUrl}" target="_blank" style="color:#3498db;text-decoration:none;">${fileName.length>20?fileName.substring(0,20)+'...':fileName}</a>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }
    if (otherFiles.length > 0) {
      galleryHTML += `
        <div>
          <h5 style="margin-bottom: 10px; color: #2c3e50;">Outros Arquivos (${otherFiles.length})</h5>
          <ul style="list-style:none;padding:0;max-height:200px;overflow:auto;">
            ${otherFiles.map(file => {
              const fileName = file.nome || 'Arquivo';
              const filePath = file.caminho || '';
              const fileNameOnly = filePath.split('/').pop() || fileName;
              const fileUrl = `${FILES_BASE}${encodeURIComponent(fileNameOnly)}`;
              const fileIcon = getFileIcon(file.tipo);
              return `
                <li style="margin-bottom:8px;padding:8px;background:#f8f9fa;border-radius:4px;">
                  <a href="${fileUrl}" target="_blank"
                    style="color:#3498db;text-decoration:none;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">${fileIcon}</span>
                    <span>${fileName}</span>
                    <small style="color:#6c757d;margin-left:auto;">${formatFileSize(file.tamanho)}</small>
                  </a>
                </li>`;
            }).join('')}
          </ul>
        </div>`;
    }
    galleryHTML += `<div style="margin-top:15px;font-size:12px;color:#6c757d;padding:10px;background:#f8f9fa;border-radius:4px;">
      <strong>Total: ${anexos.length}</strong> arquivo(s) anexado(s).</div>`;
    return galleryHTML;
  }
  function getFileIcon(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    return '📄';
  }
  function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    const sizes = ['Bytes','KB','MB','GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes)/Math.log(1024)));
    return Math.round(bytes/Math.pow(1024,i)*100)/100 + ' ' + sizes[i];
  }
  function renderImagesGallery(imagens) {
    if (!imagens || !Array.isArray(imagens) || imagens.length === 0) return '<p>Nenhuma imagem disponível</p>';
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin:15px 0;">
        ${imagens.map(img=>{
          const fileName = img.nome || 'Arquivo';
          const filePath = img.caminho || '';
          const fileNameOnly = filePath.split('/').pop() || fileName;
          const imageUrl = `${FILES_BASE}${encodeURIComponent(fileNameOnly)}`;
          return `
            <div style="text-align:center;">
              <a href="${imageUrl}" target="_blank">
                <img src="${imageUrl}" alt="${fileName}"
                  style="width:100px;height:100px;object-fit:cover;border-radius:6px;border:2px solid #e0e0e0;cursor:pointer;transition:all .3s">
              </a>
              <div style="margin-top:5px;font-size:11px;word-break:break-all;">
                <a href="${imageUrl}" target="_blank" style="color:#3498db;text-decoration:none;">
                  ${fileName.length>20?fileName.substring(0,20)+'...':fileName}
                </a>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div style="margin-top:10px;font-size:12px;color:#6c757d;">
        <strong>${imagens.length}</strong> imagem(ns) anexada(s).
      </div>`;
  }
  function renderSpeciesDetails(especies) {
    if (!especies || !Array.isArray(especies) || especies.length === 0) return '<p>Nenhuma espécie registrada</p>';
    const total = especies.reduce((sum, esp) => sum + (parseFloat(esp.quantidade) || 0), 0);
    return `
      <div style="margin-bottom:15px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:8px;border:1px solid #dee2e6;text-align:left;">Espécie</th>
              <th style="padding:8px;border:1px solid #dee2e6;text-align:right;">Quantidade (kg)</th>
            </tr>
          </thead>
          <tbody>
            ${especies.map(esp => `
              <tr>
                <td style="padding:8px;border:1px solid #dee2e6;">${esp.nome || 'N/A'}</td>
                <td style="padding:8px;border:1px solid #dee2e6;text-align:right;">${parseFloat(esp.quantidade || 0).toFixed(2)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#e9ecef;font-weight:bold;">
              <td style="padding:8px;border:1px solid #dee2e6;">TOTAL</td>
              <td style="padding:8px;border:1px solid #dee2e6;text-align:right;">${total.toFixed(2)} kg</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  }

  function processRecordData(rec, coll) {
    const processed = {...rec};

    if (coll === "embarcacao") {
      const fieldMappings = { 'tipo_casco': 'outro_tipo_casco', 'tipo_propulsao': 'outro_tipo_propulsao' };
      Object.keys(fieldMappings).forEach(mainField => {
        const outroField = fieldMappings[mainField];
        if (processed[mainField] === 'Outro' && processed[outroField]) {
          processed[mainField] = `Outro (${processed[outroField]})`;
        }
      });
      if (processed.anexos && typeof processed.anexos === 'string') { try { processed.anexos = JSON.parse(processed.anexos); } catch {} }
      if (processed.anexos && Array.isArray(processed.anexos)) {
        processed.anexos_formatted = processed.anexos.map(anexo => {
          const fileName = anexo.nome || 'Arquivo';
          const filePath = anexo.caminho || '';
          const fileNameOnly = filePath.split('/').pop() || fileName;
          const fileUrl = `${FILES_BASE}${encodeURIComponent(fileNameOnly)}`;
          const isImage = anexo.tipo && anexo.tipo.startsWith('image/');
          const icon = isImage ? '🖼️' : '📄';
          return `${icon} <a href="${fileUrl}" target="_blank">${fileName}</a>`;
        }).join('<br>');
      } else {
        processed.anexos_formatted = 'Nenhum arquivo anexado';
      }

    } else if (coll === "desembarque") {
      const fieldMappings = { 'destinacao': 'outro_destinacao', 'arte_pesca': 'outro_arte_pesca' };
      Object.keys(fieldMappings).forEach(mainField => {
        const outroField = fieldMappings[mainField];
        if (processed[mainField] === 'Outro' && processed[outroField]) {
          processed[mainField] = `Outro (${processed[outroField]})`;
        }
      });
      if (processed.especies && typeof processed.especies === 'string') { try { processed.especies = JSON.parse(processed.especies); } catch {} }
      if (processed.imagens && typeof processed.imagens === 'string') { try { processed.imagens = JSON.parse(processed.imagens); } catch {} }
      if (processed.especies && Array.isArray(processed.especies)) {
        processed.especies_formatted = processed.especies.map(esp => `${esp.nome || 'N/A'}: ${esp.quantidade || 0}kg`).join('; ');
      } else {
        processed.especies_formatted = 'Nenhuma espécie registrada';
      }
      if (processed.imagens && Array.isArray(processed.imagens)) {
        processed.imagens_formatted = processed.imagens.map(img => {
          const fileName = img.nome || 'Arquivo';
          const filePath = img.caminho || '';
          const fileNameOnly = filePath.split('/').pop() || fileName;
          const imageUrl = `${FILES_BASE}${encodeURIComponent(fileNameOnly)}`;
          return `<a href="${imageUrl}" target="_blank">${fileName}</a>`;
        }).join(', ');
      } else {
        processed.imagens_formatted = 'Nenhuma imagem anexada';
      }

    } else {
      // pescador
      const fieldMappings = { 'genero': 'generoOutro', 'raca': 'racaOutro' };
      Object.keys(fieldMappings).forEach(mainField => {
        const outroField = fieldMappings[mainField];
        if (processed[mainField] === 'Outro' && processed[outroField]) {
          processed[mainField] = `Outro (${processed[outroField]})`;
        }
      });

      // Arrays/checkboxes
      if (processed.artes && typeof processed.artes === 'string') {
        try { processed.artes = JSON.parse(processed.artes); } catch {}
      }
      // Filiações (podem vir como flags + nomes)
      // Apenas garante legibilidade se vierem como boolean + campo nome
      const filiacao = [];
      if (processed.filSindicato) filiacao.push(`Sindicato${processed.filSindicatoNome?`: ${processed.filSindicatoNome}`:''}`);
      if (processed.filAssociacao) filiacao.push(`Associação${processed.filAssociacaoNome?`: ${processed.filAssociacaoNome}`:''}`);
      if (processed.filColonia) filiacao.push(`Colônia de pesca${processed.filColoniaNome?`: ${processed.filColoniaNome}`:''}`);
      if (filiacao.length) processed.filiacao = filiacao;

      // Normalize alguns rótulos ausentes do form
      if (processed.nomeCompleto && !processed.nome) processed.nome = processed.nomeCompleto;
    }

    return processed;
  }

  function formatFieldName(fieldName) {
    const names = {
      // Embarcações
      'nome_embarcacao': 'Nome da Embarcação',
      'rgp': 'RGP',
      'tipo_casco': 'Tipo de Casco',
      'arqueacao_bruta': 'Arqueação Bruta',
      'tipo_propulsao': 'Tipo de Propulsão',
      'porto_base': 'Porto Base',
      'uf': 'UF',
      'municipio': 'Município',
      'responsavel': 'Responsável',
      'contato': 'Contato',
      'observacoes': 'Observações',
      'created_at': 'Data de Criação',
      'status': 'Status',
      'review_note': 'Nota de Revisão',
      'reviewed_at': 'Data de Revisão',
      'anexos': 'Arquivos Anexados',
      'anexos_formatted': 'Arquivos Anexados',

      // Desembarques
      'data_desembarque': 'Data do Desembarque',
      'local_desembarque': 'Local do Desembarque',
      'destinacao': 'Destinação',
      'arte_pesca': 'Arte de Pesca',
      'data_saida': 'Data de Saída',
      'data_retorno': 'Data de Retorno',
      'data_inicio_pesca': 'Data de Início da Pesca',
      'data_fim_pesca': 'Data de Fim da Pesca',
      'esforco': 'Esforço de Pesca',
      'local_pesca': 'Local de Pesca (FAO)',
      'coordenadas': 'Coordenadas',
      'especies': 'Espécies Capturadas (Resumo)',
      'imagens': 'Imagens Anexadas',
      'embarcacao_id': 'ID da Embarcação',
      'especies_formatted': 'Espécies Capturadas',
      'imagens_formatted': 'Imagens Anexadas',

      // Pescadores
      'nome': 'Nome',
      'nomeCompleto': 'Nome Completo',
      'vulgo': 'Vulgo (Apelido)',
      'apelido': 'Vulgo (Apelido)',
      'genero': 'Gênero',
      'raca': 'Raça/Cor (IBGE)',
      'idade': 'Idade',
      'membrosFamilia': 'Qtde. de membros na família',
      'bairroComunidade': 'Bairro/Comunidade',
      'endereco': 'Endereço',
      'localOndePesca': 'Local onde pesca',
      'artes': 'Principais artes de pesca',
      'filiacao': 'Filiação',
      'filSindicatoNome': 'Sindicato',
      'filAssociacaoNome': 'Associação',
      'filColoniaNome': 'Colônia de pesca',
    };
    return names[fieldName] || fieldName;
  }

  // formatadores
  function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      const d = String(date.getDate()).padStart(2,'0');
      const m = String(date.getMonth()+1).padStart(2,'0');
      const y = date.getFullYear();
      const hh = String(date.getHours()).padStart(2,'0');
      const mm = String(date.getMinutes()).padStart(2,'0');
      return `${d}/${m}/${y}, ${hh}:${mm}`;
    } catch { return dateString; }
  }
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      const d = String(date.getDate()).padStart(2,'0');
      const m = String(date.getMonth()+1).padStart(2,'0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch { return dateString; }
  }

  function close() {
    drawer.classList.remove("open");
    document.getElementById('drawerOverlay').style.display = 'none';
    selectedRecord = null;
    reviewNote.value = "";
    document.body.style.overflow = '';
  }
  document.getElementById('drawerOverlay').addEventListener('click', close);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && drawer.classList.contains('open')) close(); });

  async function updateStatus(status) {
    if (!selectedRecord) return;
    const endpoint =
      selectedRecord.coll === 'desembarque' ? 'desembarques' :
      selectedRecord.coll === 'pescador' ? 'pescadores' :
      'embarcacoes';

    [btnApprove, btnReject].forEach(b=>b.disabled=true);
    try {
      const response = await fetch(`${API_BASE}/${endpoint}/${selectedRecord.rec.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, review_note: reviewNote.value.trim() })
      });
      const result = await response.json();
      if (result.success) {
        const tipo = selectedRecord.coll === 'embarcacao' ? 'Embarcação' : selectedRecord.coll === 'desembarque' ? 'Desembarque' : 'Pescador(a)';
        alert(`${tipo} ${status === 'approved' ? 'aprovado' : 'reprovado'} com sucesso!`);
        render(); close();
      } else {
        alert('Erro ao atualizar status: ' + result.message);
      }
    } catch (error) {
      alert('Erro ao atualizar status: ' + error.message);
    } finally {
      [btnApprove, btnReject].forEach(b=>b.disabled=false);
    }
  }

  // Troca de abas
  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tabs.forEach((x) => {
        x.classList.remove("active");
        x.setAttribute('aria-selected','false');
      });
      t.classList.add("active");
      t.setAttribute('aria-selected','true');
      currentTab = t.dataset.tab; // 'emb' | 'des' | 'pes'
      render();
    })
  );

  // Filtros e busca (com debounce)
  statusFilter.addEventListener("change", render);
  search.addEventListener("input", debounce(render, 250));
  refreshBtn.addEventListener("click", render);

  // Exportações
  exportJson.addEventListener("click", async () => {
    try {
      const endpoint = ENDPOINTS[currentTab];
      const response = await fetch(`${API_BASE}/${endpoint}`);
      const result = await response.json();
      if (result.success) {
        const tipo = endpoint;
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), {
          href: url, download: `${tipo}-export-${Date.now()}.json`,
        });
        a.click(); URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('Erro ao exportar: ' + error.message);
    }
  });

  exportCsv.addEventListener("click", async () => {
    try {
      const endpoint = ENDPOINTS[currentTab];
      const response = await fetch(`${API_BASE}/${endpoint}`);
      const result = await response.json();
      if (result.success) {
        const data = result.data || [];
        if (!data.length) { alert('Nenhum dado para exportar'); return; }

        // Flatten simples para objetos aninhados
        const flatten = (o,prefix='')=>Object.entries(o).reduce((acc,[k,v])=>{
          const key = prefix?`${prefix}.${k}`:k;
          if (v && typeof v==='object' && !Array.isArray(v)) Object.assign(acc, flatten(v,key));
          else acc[key]=Array.isArray(v)?JSON.stringify(v): (v ?? '');
          return acc;
        },{});
        const rows = data.map(flatten);
        const headers = [...new Set(rows.flatMap(r=>Object.keys(r)))];
        const csvRows = [headers.join(',')];

        rows.forEach(row=>{
          const values = headers.map(h=>{
            const value = row[h] ?? '';
            const s = String(value).replace(/"/g,'""');
            return `"${s}"`;
          });
          csvRows.push(values.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob(["\ufeff"+csvString], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), {
          href: url, download: `${endpoint}-export-${Date.now()}.csv`,
        });
        a.click(); URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('Erro ao exportar: ' + error.message);
    }
  });

  // Drawer actions
  closeDrawer.addEventListener("click", close);
  btnApprove.addEventListener("click", () => updateStatus('approved'));
  btnReject.addEventListener("click", () => updateStatus('rejected'));

  // init
  render();
})();
