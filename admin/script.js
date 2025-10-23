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
            return (
              (r.embarcacao || "").toLowerCase().includes(q) ||
              (r.local_desembarque || "").toLowerCase().includes(q) ||
              (r.data_desembarque || "").toLowerCase().includes(q) ||
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
              <td>${new Date(r.created_at).toLocaleString()}</td>
              <td>${r.nome_embarcacao || ""}</td>
              <td>${r.rgp || ""}</td>
              <td>${r.uf || ""}/${r.municipio || ""}</td>
              <td class="row-actions">
                <button class="btn btn-view" data-id="${r.id}">Ver</button>
              </td>
            </tr>
          `;
        } else {
          return `
            <tr>
              <td>${r.id}</td>
              <td>${statusBadge(r.status || 'pending')}</td>
              <td>${new Date(r.created_at).toLocaleString()}</td>
              <td>${r.embarcacao || ""}</td>
              <td>${r.data_desembarque || ""}</td>
              <td>${r.local_desembarque || ""}</td>
              <td class="row-actions">
                <button class="btn btn-view" data-id="${r.id}">Ver</button>
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
        try {
          const response = await fetch(`${API_BASE}/embarcacoes/${id}`);
          const result = await response.json();
          
          if (result.success) {
            openDrawer(result.data, 'embarcacao');
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

    drawerTitle.textContent =
      coll === "embarcacao"
        ? `Embarcação — ${rec.nome_embarcacao || rec.id}`
        : `Desembarque — ${rec.embarcacao || rec.id}`;

    // corpo — chave/valor legível
    const kvPairs = [];
    Object.keys(rec).forEach((k) => {
      let v = rec[k];
      if (v === null || v === undefined) v = '';
      if (Array.isArray(v)) v = v.join(", ");
      if (typeof v === 'object') v = JSON.stringify(v);
      kvPairs.push(`<b>${formatFieldName(k)}</b><div>${v.toString()}</div>`);
    });

    drawerBody.innerHTML = `
      <div class="drawer-body-content">
        <div class="kv">
          <b>ID</b><div>${rec.id}</div>
          <b>Status</b><div>${rec.status || 'pending'}</div>
          <b>Enviado em</b><div>${new Date(rec.created_at).toLocaleString()}</div>
          ${rec.reviewed_at ? `<b>Revisado em</b><div>${new Date(rec.reviewed_at).toLocaleString()}</div>` : ""}
          ${rec.review_note ? `<b>Observação</b><div>${rec.review_note}</div>` : ""}
        </div>
        <hr style="margin:12px 0;">
        <h4>Dados da Embarcação</h4>
        <div class="kv">${kvPairs.join("")}</div>
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

  function formatFieldName(fieldName) {
    const names = {
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
      'reviewed_at': 'Data de Revisão'
    };
    return names[fieldName] || fieldName;
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
      const response = await fetch(`${API_BASE}/embarcacoes/${selectedRecord.rec.id}/status`, {
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
        alert(`Embarcação ${status === 'approved' ? 'aprovada' : 'reprovada'} com sucesso!`);
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

  // Exportações (simplificadas - apenas embarcações por enquanto)
  exportJson.addEventListener("click", async () => {
    try {
      const response = await fetch(`${API_BASE}/embarcacoes`);
      const result = await response.json();
      
      if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), {
          href: url,
          download: `embarcacoes-export-${Date.now()}.json`,
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
      const response = await fetch(`${API_BASE}/embarcacoes`);
      const result = await response.json();
      
      if (result.success) {
        // Converter para CSV simples
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
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), {
          href: url,
          download: `embarcacoes-export-${Date.now()}.csv`,
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