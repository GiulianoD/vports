/* =========================================================
   Cadastro de Embarcação — embarcacao.js (corrigido)
   Recursos:
   - Mostrar campos "Outro" (casco, propulsão)
   - UF -> Municípios (exemplos)
   - Upload + preview (imagens/outros)
   - Rascunho (localStorage)
   - Validação, incluindo associação (Sim/Não)
   - Envio para backend (opcional) + gravação no Admin (DB.addEmbarcacao)
   ========================================================= */

(function () {
  const form = document.getElementById("embarcacaoForm");
  if (!form) return;

  const tipoCasco = document.getElementById("tipoCasco");
  const outroTipoCascoContainer = document.getElementById("outroTipoCascoContainer");
  const tipoPropulsao = document.getElementById("tipoPropulsao");
  const outroTipoPropulsaoContainer = document.getElementById("outroTipoPropulsaoContainer");
  const uf = document.getElementById("uf");
  const municipio = document.getElementById("municipio");
  const anexos = document.getElementById("anexos");
  const anexosPreview = document.getElementById("anexosPreview");
  const btnLimpar = document.getElementById("btnLimpar");
  const btnRascunho = document.getElementById("btnRascunho");

  // Campos de associação (precisam existir no HTML):
  // <select id="associado" name="associado" onchange="toggleAssociacao()">
  // <div id="associacaoContainer" class="hidden"><input id="associacaoNome" ...>
  const associado = document.getElementById("associado");
  const associacaoContainer = document.getElementById("associacaoContainer");
  const associacaoNome = document.getElementById("associacaoNome");

  // Array para armazenar os arquivos selecionados
  let uploadedFiles = [];

  /* ---------- Mostrar "Outro" ---------- */
  function toggleOutro(selectEl, kind) {
    const container = kind === "casco" ? outroTipoCascoContainer : outroTipoPropulsaoContainer;
    container?.classList.toggle("hidden", selectEl.value !== "Outro");
  }
  tipoCasco?.addEventListener("change", () => toggleOutro(tipoCasco, "casco"));
  tipoPropulsao?.addEventListener("change", () => toggleOutro(tipoPropulsao, "prop"));

  /* ---------- UF -> Municípios (exemplos, expanda conforme necessário) ---------- */
  const MUNICIPIOS = {
    ES: ["Vitória", "Vila Velha", "Serra", "Cariacica", "Guarapari", "Linhares", "Aracruz", "São Mateus", "Anchieta", "Piúma"],
    BA: ["Salvador", "Ilhéus", "Itacaré", "Porto Seguro", "Valença", "Itaparica"],
    PA: ["Belém", "Santarém", "Vigia", "Bragança", "Afuá", "Curuçá"]
  };

  function popularMunicipios(ufSigla) {
    municipio.innerHTML = "";
    const optDefault = document.createElement("option");
    optDefault.value = "";
    optDefault.textContent = ufSigla ? "Selecione um município" : "Selecione a UF primeiro";
    municipio.appendChild(optDefault);

    const lista = MUNICIPIOS[ufSigla] || [];
    const frag = document.createDocumentFragment();
    lista.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      frag.appendChild(opt);
    });
    municipio.appendChild(frag);
    municipio.disabled = false;
  }
  uf?.addEventListener("change", () => popularMunicipios(uf.value));

  /* ---------- Upload + Preview de anexos ---------- */
  function handleFileUpload(event) {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // evita duplicados por nome+tamanho
      const isDuplicate = uploadedFiles.some(f => f.name === file.name && f.size === file.size);
      if (isDuplicate) continue;

      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedFiles.push({
          id: Date.now() + i, // ID simples
          name: file.name,
          size: file.size,
          type: file.type,
          data: e.target.result // dataURL
        });
        updateFilePreview();
      };
      reader.readAsDataURL(file);
    }
    // permite re-selecionar os mesmos arquivos
    event.target.value = '';
  }

  function updateFilePreview() {
    anexosPreview.innerHTML = '';
    if (uploadedFiles.length === 0) {
      anexosPreview.innerHTML = '<div class="no-images">Nenhum arquivo selecionado</div>';
      return;
    }
    uploadedFiles.forEach(file => {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      previewItem.dataset.id = file.id;

      let content = '';
      if (file.type.startsWith('image/')) {
        content = `
          <img src="${file.data}" alt="${file.name}" class="preview-image">
          <div class="preview-info">${file.name}</div>
        `;
      } else {
        content = `
          <div class="preview-document">
            <div class="document-icon">📄</div>
            <div class="preview-info">${file.name}</div>
          </div>
        `;
      }

      previewItem.innerHTML = content + `
        <button type="button" class="btn-delete-image" onclick="deleteFile(${file.id})" title="Remover arquivo">×</button>
      `;
      anexosPreview.appendChild(previewItem);
    });
  }

  window.deleteFile = function(fileId) {
    uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);
    updateFilePreview();
  };

  anexos?.addEventListener('change', handleFileUpload);

  /* ---------- Máscara simples do RGP ---------- */
  const rgp = document.getElementById("rgp");
  rgp?.addEventListener("input", () => {
    const digits = rgp.value.replace(/\D/g, "").slice(0, 7); // 6+1
    rgp.value = digits.length <= 6 ? digits : digits.slice(0, 6) + "-" + digits.slice(6);
  });

  /* ---------- Associação: mostrar/ocultar input ---------- */
  function toggleAssociacao() {
    if (!associado || !associacaoContainer || !associacaoNome) return;
    if (associado.value === "Sim") {
      associacaoContainer.classList.remove("hidden");
      associacaoNome.required = true;
    } else {
      associacaoContainer.classList.add("hidden");
      associacaoNome.required = false;
      associacaoNome.value = "";
    }
  }
  // expõe para o HTML (se usar onchange="toggleAssociacao()")
  window.toggleAssociacao = toggleAssociacao;
  // e também liga no change (para quem não usa inline)
  associado?.addEventListener("change", toggleAssociacao);

  /* ---------- Validação ---------- */
  function validarCampos() {
    const nome = document.getElementById("nomeEmbarcacao")?.value.trim();
    if (!nome) return "Informe o Nome da Embarcação.";

    const rgpVal = rgp?.value.trim();
    if (!rgpVal || !/^\d{6}-?\d$/.test(rgpVal)) return "Informe um RGP válido (ex: 123456-7).";

    if (tipoCasco?.value === "Outro") {
      const outro = document.getElementById("outroTipoCasco")?.value.trim();
      if (!outro) return "Especifique o Tipo de Casco (Outro).";
    }

    if (tipoPropulsao?.value === "Outro") {
      const outro = document.getElementById("outroTipoPropulsao")?.value.trim();
      if (!outro) return "Especifique o Tipo de Propulsão (Outro).";
    }

    const ab = Number(document.getElementById("arqueacaoBruta")?.value);
    if (Number.isNaN(ab) || ab < 0) return "Arqueação Bruta deve ser um número válido (≥ 0).";

    if (!uf?.value) return "Selecione a UF.";
    if (!municipio?.value) return "Selecione o Município.";

    // valida associação
    if (associado) {
      if (!associado.value) return "Informe se está cadastrado em alguma associação (Sim/Não).";
      if (associado.value === "Sim") {
        const a = associacaoNome?.value.trim();
        if (!a) return "Informe o Nome da Associação.";
      }
    }

    return null;
  }

  /* ---------- Rascunho ---------- */
  const DRAFT_KEY = "draft_embarcacao_v1";

  function salvarRascunho() {
    const data = new FormData(form);
    const obj = {};
    for (const [k, v] of data.entries()) {
      if (k === "anexos") continue; // não persistimos binários
      if (obj[k]) {
        if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
        obj[k].push(v);
      } else {
        obj[k] = v;
      }
    }
    // Metadados dos anexos (sem binário)
    obj.uploadedFilesInfo = uploadedFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
    alert("Rascunho salvo!");
  }

  function restaurarRascunho() {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      if (obj.uf) {
        uf.value = obj.uf;
        popularMunicipios(obj.uf);
      }
      Object.entries(obj).forEach(([k, v]) => {
        if (k === "uploadedFilesInfo") return;
        const el = form.elements[k];
        if (el) el.value = v;
      });

      // restaura anexos (apenas lista)
      if (obj.uploadedFilesInfo) {
        uploadedFiles = obj.uploadedFilesInfo;
        updateFilePreview();
      }

      // aplica visibilidades
      toggleOutro(tipoCasco, "casco");
      toggleOutro(tipoPropulsao, "prop");
      toggleAssociacao();
    } catch { /* ignore */ }
  }

  /* ---------- Ações ---------- */
  btnRascunho?.addEventListener("click", salvarRascunho);

  btnLimpar?.addEventListener("click", () => {
    if (!confirm("Deseja limpar o formulário?")) return;
    form.reset();
    localStorage.removeItem(DRAFT_KEY);
    municipio.innerHTML = '<option value="">Selecione a UF primeiro</option>';
    uploadedFiles = [];
    updateFilePreview();
    outroTipoCascoContainer?.classList.add("hidden");
    outroTipoPropulsaoContainer?.classList.add("hidden");
    toggleAssociacao();
  });

  /* ---------- Submit: backend (opcional) + Admin (local) ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const erro = validarCampos();
    if (erro) {
      alert(erro);
      return;
    }

    // JSON “limpo” (sem binários) para o Admin local
    const fd = new FormData(form);
    const json = {};
    fd.forEach((v, k) => {
      if (k === "anexos") return;
      if (json[k]) {
        if (!Array.isArray(json[k])) json[k] = [json[k]];
        json[k].push(v);
      } else {
        json[k] = v;
      }
    });
    // Inclui nomes dos arquivos no JSON salvo localmente
    json.anexosNomes = uploadedFiles.map(f => f.name);

    // 1) Grava no Admin (localStorage) — garante que admin.html veja o registro
    try {
      if (typeof DB?.addEmbarcacao === "function") {
        DB.addEmbarcacao(json);
      }
    } catch { /* ignore */ }

    // 2) (Opcional) Envia para backend se disponível
    try {
      const formData = new FormData(form);
      // anexa os blobs convertidos a partir do dataURL
      uploadedFiles.forEach(file => {
        if (file.data && file.data.startsWith('data:')) {
          const byteString = atob(file.data.split(',')[1]);
          const mimeString = file.data.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ab], { type: mimeString });
          formData.append('anexos', blob, file.name);
        }
      });

      // ajuste a URL conforme seu backend real (ou remova este bloco se não tiver backend)
      const resp = await fetch('http://localhost:3000/api/embarcacoes', {
        method: 'POST',
        body: formData
      }).catch(() => null);

      if (resp && resp.ok) {
        const result = await resp.json().catch(() => ({}));
        if (!result?.success) {
          console.warn("Backend respondeu sem success=true. Registro já foi salvo localmente no Admin.");
        }
      } else {
        console.warn("Backend indisponível. Registro já foi salvo localmente no Admin.");
      }
    } catch (error) {
      console.warn("Falha no envio ao backend:", error);
      // seguimos, pois já salvamos localmente
    }

    console.log("Payload salvo no Admin (sem anexos):", json);
    alert("Embarcação cadastrada com sucesso!");

    // Limpa rascunho e UI
    localStorage.removeItem(DRAFT_KEY);
    form.reset();
    municipio.innerHTML = '<option value="">Selecione a UF primeiro</option>';
    uploadedFiles = [];
    updateFilePreview();
    outroTipoCascoContainer?.classList.add("hidden");
    outroTipoPropulsaoContainer?.classList.add("hidden");
    toggleAssociacao();
  });

  /* ---------- Init ---------- */
  restaurarRascunho();
})();
