/* =========================================================
   Cadastro de Embarcação — script.js (com NAV embutido)
   - NAV global (mesmo comportamento da outra página)
   - Mostrar campos "Outro" (casco, propulsão)
   - UF -> Municípios (exemplos)
   - Upload + preview (imagens/outros)
   - Rascunho (localStorage)
   - Validação, incluindo associação (Sim/Não)
   - Envio opcional ao backend + gravação no Admin (DB.addEmbarcacao)
   ========================================================= */

// ====================== NAV GLOBAL ======================
function initGlobalNav(){
  const linksEl = document.getElementById('navLinks');
  const toggleEl = document.getElementById('navToggle');
  if (!linksEl) return; // página sem nav

  // Calcula raiz do projeto: .../<secao>/index.html -> remove 2 últimas partes
  const parts = location.pathname.split('/').filter(Boolean);
  const rootParts = parts.length >= 2 ? parts.slice(0, parts.length - 2) : [];
  const root = '/' + rootParts.join('/');

  const routes = {
    desembarque: root + '/desembarque/index.html',
    embarcacao: root + '/embarcacao/index.html',
    pescadores: root + '/pescadores/index.html',
  };

  const l1 = document.getElementById('linkDesembarque');
  const l2 = document.getElementById('linkEmbarcacao');
  const l3 = document.getElementById('linkPescadores');

  if (l1) l1.href = routes.desembarque;
  if (l2) l2.href = routes.embarcacao;
  if (l3) l3.href = routes.pescadores;

  const path = location.pathname;
  if (l1 && path.includes('/desembarque/')) l1.classList.add('active');
  if (l2 && path.includes('/embarcacao/')) l2.classList.add('active');
  if (l3 && path.includes('/pescadores/')) l3.classList.add('active');

  // Toggle mobile
  toggleEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    linksEl.classList.toggle('open');
    toggleEl.setAttribute('aria-expanded', linksEl.classList.contains('open') ? 'true' : 'false');
  });

  // Impede fechar ao clicar dentro do menu
  linksEl?.addEventListener('click', (e) => e.stopPropagation());

  // Fecha ao clicar fora
  document.addEventListener('click', (e) => {
    if (!linksEl.contains(e.target) && !toggleEl.contains(e.target)) {
      linksEl.classList.remove('open');
      toggleEl?.setAttribute('aria-expanded', 'false');
    }
  });
}

// ====================== FORM EMBARCAÇÃO ======================
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    // Inicializa NAV em todas as páginas
    initGlobalNav();

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

    // Associação
    const associado = document.getElementById("associado");
    const associacaoContainer = document.getElementById("associacaoContainer");
    const associacaoNome = document.getElementById("associacaoNome");

    // Anexos em memória
    let uploadedFiles = [];

    // ----- "Outro" -----
    function toggleOutro(selectEl, kind) {
      const container = kind === "casco" ? outroTipoCascoContainer : outroTipoPropulsaoContainer;
      container?.classList.toggle("hidden", selectEl.value !== "Outro");
    }
    tipoCasco?.addEventListener("change", () => toggleOutro(tipoCasco, "casco"));
    tipoPropulsao?.addEventListener("change", () => toggleOutro(tipoPropulsao, "prop"));

    // ----- UF -> Municípios (exemplos) -----
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

    // ----- Upload + Preview -----
    function handleFileUpload(event) {
      const files = event.target.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // evitar duplicados
        const isDuplicate = uploadedFiles.some(f => f.name === file.name && f.size === file.size);
        if (isDuplicate) continue;

        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFiles.push({
            id: Date.now() + i,
            name: file.name,
            size: file.size,
            type: file.type,
            data: e.target.result
          });
          updateFilePreview();
        };
        reader.readAsDataURL(file);
      }
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

    // ----- Máscara simples do RGP -----
    const rgp = document.getElementById("rgp");
    rgp?.addEventListener("input", () => {
      const digits = rgp.value.replace(/\D/g, "").slice(0, 7); // 6+1
      rgp.value = digits.length <= 6 ? digits : digits.slice(0, 6) + "-" + digits.slice(6);
    });

    // ----- Associação -----
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
    window.toggleAssociacao = toggleAssociacao; // para onchange inline
    associado?.addEventListener("change", toggleAssociacao);

    // ----- Validação -----
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

      if (associado) {
        if (!associado.value) return "Informe se está cadastrado em alguma associação (Sim/Não).";
        if (associado.value === "Sim") {
          const a = associacaoNome?.value.trim();
          if (!a) return "Informe o Nome da Associação.";
        }
      }

      return null;
    }

    // ----- Rascunho -----
    const DRAFT_KEY = "draft_embarcacao_v1";

    function salvarRascunho() {
      const data = new FormData(form);
      const obj = {};
      for (const [k, v] of data.entries()) {
        if (k === "anexos") continue;
        if (obj[k]) {
          if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
          obj[k].push(v);
        } else {
          obj[k] = v;
        }
      }
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

        if (obj.uploadedFilesInfo) {
          uploadedFiles = obj.uploadedFilesInfo;
          updateFilePreview();
        }

        toggleOutro(tipoCasco, "casco");
        toggleOutro(tipoPropulsao, "prop");
        toggleAssociacao();
      } catch { /* ignore */ }
    }

    // ----- Ações -----
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

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const erro = validarCampos();
      if (erro) {
        alert(erro);
        return;
      }

      // JSON “limpo” (sem binários) para Admin local
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
      json.anexosNomes = uploadedFiles.map(f => f.name);

      // 1) Grava no Admin local (se disponível)
      try {
        if (typeof DB?.addEmbarcacao === "function") {
          DB.addEmbarcacao(json);
        }
      } catch { /* ignore */ }

      // 2) (Opcional) envia ao backend real
      try {
        const formData = new FormData(form);
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

    // Init
    restaurarRascunho();
  });
})();
