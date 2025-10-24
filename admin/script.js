/* admin.js — UI de administração para validar registros do PostgreSQL */

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

  const API_BASE = 'http://localhost:3000/api';

  let currentTab = "emb"; // 'emb' ou 'des'
  let currentList = [];
  let selectedRecord = null;

  // Cabeçalhos da tabela
  const HEADERS = {
    emb: ["ID", "Status", "Data", "Nome", "RGP", "UF/Município", "Ações"],
    des: ["ID", "Status", "Data", "Embarcação", "Data Desembarque", "Local", "Ações"],
  };

  function showLoading() {
    loadingEl.style.display = 'block';
    errorEl.classList.add('hidden');
    rowsEl.innerHTML = '';
  }

  function hideLoading() {
    loadingEl.style.display = 'none';
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    hideLoading();
  }

  function setHeaders() {
    headRow.innerHTML = HEADERS[currentTab]
      .map((h) => `<th>${h}</th>`)
      .join("");
  }

  async function fetchData() {
    showLoading();
    
    try {
      let response;
      if (currentTab === "emb") {
        response = await fetch(`${API_BASE}/embarcacoes`);
      } else {
        response = await fetch(`${API_BASE}/desembarques`);
      }

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Erro ao carregar dados');
      }

      let all = result.data || [];

      // filtro por status (se implementado no backend)
      let filtered = statusFilter.value
        ? all.filter((r) => r.status === statusFilter.value)
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
          } else {
            // Busca para desembarques
            const embarcacaoNome = r.nome_embarcacao || (r.embarcacoes ? r.embarcacoes.nome_embarcacao : '') || '';
            return (
              embarcacaoNome.toLowerCase().includes(q) ||
              (r.local_desembarque || "").toLowerCase().includes(q) ||
              (r.data_desembarque || "").toLowerCase().includes(q) ||
              (r.destinacao || "").toLowerCase().includes(q) ||
              (r.arte_pesca || "").toLowerCase().includes(q) ||
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
    const cls =
      status === "approved"
        ? "status-approved"
        : status === "rejected"
        ? "status-rejected"
        : "status-pending";
    const label =
      status === "approved"
        ? "Aprovado"
        : status === "rejected"
        ? "Reprovado"
        : "Pendente";
    return `<span class="badge ${cls}">${label}</span>`;
  }

  async function render() {
    setHeaders();
    await fetchData();

    rowsEl.innerHTML = currentList
      .map((r) => {
        if (currentTab === "emb") {
          return `
            <tr>
              <td>${r.id}</td>
              <td>${statusBadge(r.status || 'pending')}</td>
              <td>${formatDateTime(r.created_at)}</td>
              <td>${r.nome_embarcacao || ""}</td>
              <td>${r.rgp || ""}</td>
              <td>${r.uf || ""}/${r.municipio || ""}</td>
              <td class="row-actions">
                <button class="btn btn-view" data-id="${r.id}">Ver</button>
              </td>
            </tr>
          `;
        } else {
          // Para desembarques
          const embarcacaoNome = r.nome_embarcacao || (r.embarcacoes ? r.embarcacoes.nome_embarcacao : '') || 'N/A';
          const embarcacaoRgp = r.rgp || (r.embarcacoes ? r.embarcacoes.rgp : '') || 'N/A';
          
          return `
            <tr>
              <td>${r.id}</td>
              <td>${statusBadge(r.status || 'pending')}</td>
              <td>${formatDateTime(r.created_at)}</td>
              <td>${embarcacaoNome} (${embarcacaoRgp})</td>
              <td>${formatDate(r.data_desembarque)}</td>
              <td>${r.local_desembarque || ""}</td>
              <td class="row-actions">
                <button class="btn btn-view" data-id="${r.id}" data-type="desembarque">Ver</button>
              </td>
            </tr>
          `;
        }
      })
      .join("");

    // bind view buttons
    rowsEl.querySelectorAll(".btn-view").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const type = btn.getAttribute("data-type") || 'embarcacao';
        
        try {
          let response;
          if (type === 'desembarque') {
            response = await fetch(`${API_BASE}/desembarques/${id}`);
          } else {
            response = await fetch(`${API_BASE}/embarcacoes/${id}`);
          }
          
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
    selectedRecord = { rec, coll };

    if (coll === "embarcacao") {
      drawerTitle.textContent = `Embarcação — ${rec.nome_embarcacao || rec.id}`;
    } else {
      const embarcacaoNome = rec.nome_embarcacao || (rec.embarcacoes ? rec.embarcacoes.nome_embarcacao : '') || 'N/A';
      drawerTitle.textContent = `Desembarque — ${embarcacaoNome} (${formatDate(rec.data_desembarque)})`;
    }

    // Processar os dados para agrupar campos "outro"
    const processedData = processRecordData(rec, coll);

    // Formatar campos de data específicos
    if (processedData.data_saida) processedData.data_saida = formatDateTime(processedData.data_saida);
    if (processedData.data_retorno) processedData.data_retorno = formatDateTime(processedData.data_retorno);
    if (processedData.data_inicio_pesca) processedData.data_inicio_pesca = formatDateTime(processedData.data_inicio_pesca);
    if (processedData.data_fim_pesca) processedData.data_fim_pesca = formatDateTime(processedData.data_fim_pesca);
    if (processedData.created_at) processedData.created_at = formatDateTime(processedData.created_at);
    if (processedData.reviewed_at) processedData.reviewed_at = formatDateTime(processedData.reviewed_at);
    if (processedData.data_desembarque) processedData.data_desembarque = formatDate(processedData.data_desembarque);

    // corpo — chave/valor legível
    const kvPairs = [];
    Object.keys(processedData).forEach((k) => {
      // Pular campos que começam com "outro_" e campos formatados internos
      if (k.startsWith('outro_') || k.endsWith('_formatted')) return;
      
      let v = processedData[k];
      
      // Usar campos formatados quando disponíveis
      if (k === 'especies' && processedData.especies_formatted) {
        v = processedData.especies_formatted;
      } else if (k === 'imagens' && processedData.imagens_formatted) {
        v = processedData.imagens_formatted;
      } else if (v === null || v === undefined) {
        v = '';
      } else if (Array.isArray(v)) {
        v = v.join(", ");
      } else if (typeof v === 'object' && !(v instanceof Date)) {
        v = JSON.stringify(v, null, 2);
      }
      
      kvPairs.push(`<b>${formatFieldName(k)}</b><div>${v.toString()}</div>`);
    });

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
        <h4>${coll === 'embarcacao' ? 'Dados da Embarcação' : 'Dados do Desembarque'}</h4>
        <div class="kv">${kvPairs.join("")}</div>
        
        ${coll === 'desembarque' ? `
          <hr style="margin:12px 0;">
          <h4>Detalhes da Captura</h4>
          <div class="species-details">
            ${renderSpeciesDetails(processedData.especies)}
          </div>
        ` : ''}
        
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

    // Prevenir scroll do body quando drawer estiver aberto
    document.body.style.overflow = 'hidden';
  }

  // Função para renderizar detalhes das espécies em formato de tabela
  function renderSpeciesDetails(especies) {
    if (!especies || !Array.isArray(especies) || especies.length === 0) {
      return '<p>Nenhuma espécie registrada</p>';
    }

    const total = especies.reduce((sum, esp) => sum + (parseFloat(esp.quantidade) || 0), 0);
    
    return `
      <div style="margin-bottom: 15px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Espécie</th>
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Quantidade (kg)</th>
            </tr>
          </thead>
          <tbody>
            ${especies.map(esp => `
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${esp.nome || 'N/A'}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${parseFloat(esp.quantidade || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #e9ecef; font-weight: bold;">
              <td style="padding: 8px; border: 1px solid #dee2e6;">TOTAL</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${total.toFixed(2)} kg</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  function processRecordData(rec, coll) {
    const processed = {...rec};

    if (coll === "embarcacao") {
      // Mapeamento para embarcações
      const fieldMappings = {
        'tipo_casco': 'outro_tipo_casco',
        'tipo_propulsao': 'outro_tipo_propulsao'
      };

      Object.keys(fieldMappings).forEach(mainField => {
        const outroField = fieldMappings[mainField];
        if (processed[mainField] === 'Outro' && processed[outroField]) {
          processed[mainField] = `Outro (${processed[outroField]})`;
        }
      });
    } else {
      // Mapeamento para desembarques
      const fieldMappings = {
        'destinacao': 'outro_destinacao',
        'arte_pesca': 'outro_arte_pesca'
      };

      Object.keys(fieldMappings).forEach(mainField => {
        const outroField = fieldMappings[mainField];
        if (processed[mainField] === 'Outro' && processed[outroField]) {
          processed[mainField] = `Outro (${processed[outroField]})`;
        }
      });

      // Processar espécies se existirem
      if (processed.especies && typeof processed.especies === 'string') {
        try {
          processed.especies = JSON.parse(processed.especies);
        } catch (e) {
          console.warn('Erro ao parsear espécies:', e);
        }
      }

      // Processar imagens se existirem
      if (processed.imagens && typeof processed.imagens === 'string') {
        try {
          processed.imagens = JSON.parse(processed.imagens);
        } catch (e) {
          console.warn('Erro ao parsear imagens:', e);
        }
      }

      // Formatar espécies para exibição
      if (processed.especies && Array.isArray(processed.especies)) {
        processed.especies_formatted = processed.especies
          .map(esp => `${esp.nome || 'N/A'}: ${esp.quantidade || 0}kg`)
          .join('; ');
      } else {
        processed.especies_formatted = 'Nenhuma espécie registrada';
      }

      // Formatar imagens para exibição
      if (processed.imagens && Array.isArray(processed.imagens)) {
        processed.imagens_formatted = processed.imagens
          .map(img => img.nome || 'Arquivo sem nome')
          .join(', ');
      } else {
        processed.imagens_formatted = 'Nenhuma imagem anexada';
      }
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
      'imagens_formatted': 'Imagens Anexadas'
    };
    return names[fieldName] || fieldName;
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch (e) {
      return dateString;
    }
  }

  // Função para formatar data/hora no formato brasileiro
  function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);

      // Verificar se a data é válida
      if (isNaN(date.getTime())) return 'Data inválida';

      // Formatar para DD/MM/YYYY, HH:MM
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch (e) {
      console.warn('Erro ao formatar data:', e);
      return dateString;
    }
  }

// Função para formatar apenas a data (sem hora)
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) return 'Data inválida';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (e) {
    console.warn('Erro ao formatar data:', e);
    return dateString;
  }
}

  function close() {
    drawer.classList.remove("open");
    document.getElementById('drawerOverlay').style.display = 'none';
    selectedRecord = null;
    reviewNote.value = "";
    
    // Restaurar scroll do body
    document.body.style.overflow = '';
  }

  // Fechar drawer ao clicar no overlay
  document.getElementById('drawerOverlay').addEventListener('click', close);

  async function updateStatus(status) {
    if (!selectedRecord) return;

    try {
      let endpoint;
      if (selectedRecord.coll === 'embarcacao') {
        endpoint = `${API_BASE}/embarcacoes/${selectedRecord.rec.id}/status`;
      } else {
        endpoint = `${API_BASE}/desembarques/${selectedRecord.rec.id}/status`;
      }

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status,
          review_note: reviewNote.value.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        const tipo = selectedRecord.coll === 'embarcacao' ? 'Embarcação' : 'Desembarque';
        alert(`${tipo} ${status === 'approved' ? 'aprovado' : 'reprovado'} com sucesso!`);
        render();
        close();
      } else {
        alert('Erro ao atualizar status: ' + result.message);
      }
    } catch (error) {
      alert('Erro ao atualizar status: ' + error.message);
    }
  }

  // Troca de abas
  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      currentTab = t.dataset.tab; // 'emb' | 'des'
      render();
    })
  );

  // Filtros e busca
  statusFilter.addEventListener("change", render);
  search.addEventListener("input", render);
  refreshBtn.addEventListener("click", render);

  // Exportações
  exportJson.addEventListener("click", async () => {
    try {
      const endpoint = currentTab === "emb" ? "embarcacoes" : "desembarques";
      const response = await fetch(`${API_BASE}/${endpoint}`);
      const result = await response.json();
      
      if (result.success) {
        const tipo = currentTab === "emb" ? "embarcacoes" : "desembarques";
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), {
          href: url,
          download: `${tipo}-export-${Date.now()}.json`,
        });
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('Erro ao exportar: ' + error.message);
    }
  });

  exportCsv.addEventListener("click", async () => {
    try {
      const endpoint = currentTab === "emb" ? "embarcacoes" : "desembarques";
      const response = await fetch(`${API_BASE}/${endpoint}`);
      const result = await response.json();
      
      if (result.success) {
        const data = result.data;
        if (data.length === 0) {
          alert('Nenhum dado para exportar');
          return;
        }

        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(','));
        });

        const csvString = csvRows.join('\n');
        const tipo = currentTab === "emb" ? "embarcacoes" : "desembarques";
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), {
          href: url,
          download: `${tipo}-export-${Date.now()}.csv`,
        });
        a.click();
        URL.revokeObjectURL(url);
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