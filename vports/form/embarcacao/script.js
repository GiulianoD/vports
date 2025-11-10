/* =========================================================
   Cadastro de Embarcação — script.js (com NAV embutido)
   - NAV global (mesmo comportamento da outra página)
   - Mostrar campos "Outro" (casco, propulsão)
   - UF -> Municípios (exemplos)
   - Upload + preview (imagens/outros)
   - Rascunho (localStorage)
   - Nenhum campo obrigatório
   - Envio usando URLs configuradas
   ========================================================= */

// ====================== FORM EMBARCAÇÃO ======================
(function () {
  document.addEventListener('DOMContentLoaded', () => {

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
        // Não é mais obrigatório
        associacaoNome.required = false;
      } else {
        associacaoContainer.classList.add("hidden");
        associacaoNome.required = false;
        associacaoNome.value = "";
      }
    }
    window.toggleAssociacao = toggleAssociacao; // para onchange inline
    associado?.addEventListener("change", toggleAssociacao);

    // ----- Validação REMOVIDA - nenhum campo é obrigatório -----
    function validarCampos() {
      // Não há validação, todos os campos são opcionais
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

      // Não há validação de campos obrigatórios
      // O formulário pode ser enviado vazio se o usuário quiser

      try {
        const formData = new FormData(form);
        
        // Adicionar arquivos uploadados ao FormData
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

        // USANDO URL CONFIGURADA DO urls.js
        const embarcacoesURL = window.URLS_CONFIG?.EMBARCACOES_ENDPOINTS?.BASE || 
                              'http://localhost:2002/embarcacoes';
        
        console.log('Enviando dados para:', embarcacoesURL);
        
        // O cookie accessToken será enviado automaticamente pelo navegador
        const resp = await fetch(embarcacoesURL, {
          method: 'POST',
          credentials: 'include', // Importante: inclui cookies na requisição
          body: formData
        });

        if (resp.ok) {
          const result = await resp.json();
          if (result.success) {
            alert("Embarcação cadastrada com sucesso!");
            
            // Limpar formulário após sucesso
            localStorage.removeItem(DRAFT_KEY);
            form.reset();
            municipio.innerHTML = '<option value="">Selecione a UF primeiro</option>';
            uploadedFiles = [];
            updateFilePreview();
            outroTipoCascoContainer?.classList.add("hidden");
            outroTipoPropulsaoContainer?.classList.add("hidden");
            toggleAssociacao();
          } else {
            alert("Erro ao cadastrar: " + (result.error || "Erro desconhecido"));
          }
        } else {
          if (resp.status === 401) {
            alert("Sessão expirada. Faça login novamente.");
            // Redirecionar para login
            window.location.href = '/login.html';
          } else {
            alert("Erro no servidor: " + resp.statusText);
          }
        }
      } catch (error) {
        console.error("Falha no envio:", error);
        alert("Erro de conexão. Verifique sua internet e tente novamente.");
      }
    });

    // Init
    restaurarRascunho();
  });
})();