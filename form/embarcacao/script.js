/* =========================================================
   Cadastro de Embarcação — embarcacao.js
   Recursos:
   - Mostrar campos "Outro" (casco, propulsão)
   - UF -> Municípios (lista demonstrativa, expanda conforme necessário)
   - Preview de anexos
   - Validação básica e envio simulado
   - Rascunho (localStorage)
   ========================================================= */

(function () {
  const form = document.getElementById("embarcacaoForm");
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

  // Array para armazenar os arquivos selecionados
  let uploadedFiles = [];

  /* ---------- Mostrar "Outro" ---------- */
  function toggleOutro(selectEl, containerId) {
    const container = containerId === "casco" ? outroTipoCascoContainer : outroTipoPropulsaoContainer;
    container.classList.toggle("hidden", selectEl.value !== "Outro");
  }
  tipoCasco.addEventListener("change", () => toggleOutro(tipoCasco, "casco"));
  tipoPropulsao.addEventListener("change", () => toggleOutro(tipoPropulsao, "prop"));

  /* ---------- UF -> Municípios (exemplos, expanda conforme necessidade) ---------- */
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

    // Se UF sem lista, habilita texto livre via prompt (opcional)
    municipio.disabled = false;
  }
  uf.addEventListener("change", () => popularMunicipios(uf.value));

  /* ---------- Preview de anexos ---------- */
  function handleFileUpload(event) {
    const files = event.target.files;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Verificar se o arquivo já foi adicionado
      const isDuplicate = uploadedFiles.some(f => 
        f.name === file.name && f.size === file.size
      );
      
      if (!isDuplicate) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
          uploadedFiles.push({
            id: Date.now() + i, // ID único
            name: file.name,
            size: file.size,
            type: file.type,
            data: e.target.result
          });
          
          updateFilePreview();
        };
        
        reader.readAsDataURL(file);
      }
    }
    
    // Limpar o input de arquivo para permitir selecionar os mesmos arquivos novamente
    event.target.value = '';
  }

  // Atualizar preview de arquivos
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
        // Para arquivos PDF ou outros documentos
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

  // Deletar arquivo
  window.deleteFile = function(fileId) {
    uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);
    updateFilePreview();
  };

  // Adicionar event listener para upload de arquivos
  anexos.addEventListener('change', handleFileUpload);

  /* ---------- Máscara/ajuste simples RGP (opcional leve) ---------- */
  const rgp = document.getElementById("rgp");
  rgp.addEventListener("input", () => {
    // Mantém dígitos e um hífen antes do último dígito
    const digits = rgp.value.replace(/\D/g, "").slice(0, 7); // 6+1
    if (digits.length <= 6) {
      rgp.value = digits;
    } else {
      rgp.value = digits.slice(0, 6) + "-" + digits.slice(6);
    }
  });

  /* ---------- Validação extra ---------- */
  function validarCampos() {
    const nome = document.getElementById("nomeEmbarcacao").value.trim();
    if (!nome) return "Informe o Nome da Embarcação.";
  
    const rgpVal = rgp.value.trim();
    if (!rgpVal || !/^\d{6}-?\d$/.test(rgpVal)) return "Informe um RGP válido (formato esperado: 6 dígitos + 1 dígito verificador, ex: 123456-7).";
  
    if (tipoCasco.value === "Outro") {
      const outro = document.getElementById("outroTipoCasco").value.trim();
      if (!outro) return "Especifique o Tipo de Casco (Outro).";
    }

    if (tipoPropulsao.value === "Outro") {
      const outro = document.getElementById("outroTipoPropulsao").value.trim();
      if (!outro) return "Especifique o Tipo de Propulsão (Outro).";
    }

    const ab = Number(document.getElementById("arqueacaoBruta").value);
    if (Number.isNaN(ab) || ab < 0) return "Arqueação Bruta deve ser um número válido (≥ 0).";
  
    if (!uf.value) return "Selecione a UF.";
    if (!municipio.value) return "Selecione o Município.";
  
    const resp = document.getElementById("responsavel").value.trim();
    if (!resp) return "Informe o Responsável pela Embarcação.";
  
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
    
    // Salvar informações básicas dos arquivos (sem os dados binários)
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
      // UF primeiro (para carregar municípios corretos)
      if (obj.uf) {
        uf.value = obj.uf;
        popularMunicipios(obj.uf);
      }
      // Demais campos
      Object.entries(obj).forEach(([k, v]) => {
        if (k === "uploadedFilesInfo") return; // Trataremos isso separadamente
        
        const el = form.elements[k];
        if (!el) return;
        el.value = v;
      });
  
      // Restaurar informações dos arquivos (apenas a lista, não os dados)
      if (obj.uploadedFilesInfo) {
        uploadedFiles = obj.uploadedFilesInfo;
        updateFilePreview();
      }
  
      // Mostrar campos "Outro" conforme seleção
      toggleOutro(tipoCasco, "casco");
      toggleOutro(tipoPropulsao, "prop");
    } catch { /* ignore */ }
  }

  /* ---------- Ações ---------- */
  btnRascunho.addEventListener("click", salvarRascunho);

  btnLimpar.addEventListener("click", () => {
    if (!confirm("Deseja limpar o formulário?")) return;
    form.reset();
    localStorage.removeItem(DRAFT_KEY);
    municipio.innerHTML = '<option value="">Selecione a UF primeiro</option>';
    uploadedFiles = [];
    updateFilePreview();
    outroTipoCascoContainer.classList.add("hidden");
    outroTipoPropulsaoContainer.classList.add("hidden");
  });

  /* ---------- Evento de Submit ATUALIZADO ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const erro = validarCampos();
    if (erro) {
      alert(erro);
      return;
    }

    try {
      // Criar FormData para enviar arquivos
      const formData = new FormData(form);
      
      // Adicionar arquivos selecionados
      uploadedFiles.forEach(file => {
        // Converter data URL para blob
        if (file.data.startsWith('data:')) {
          const byteString = atob(file.data.split(',')[1]);
          const mimeString = file.data.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          formData.append('anexos', blob, file.name);
        }
      });

      // Enviar para o backend
      const response = await fetch('http://localhost:3000/api/embarcacoes', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        alert("Embarcação cadastrada com sucesso!");
        
        // Limpar formulário
        localStorage.removeItem(DRAFT_KEY);
        form.reset();
        municipio.innerHTML = '<option value="">Selecione a UF primeiro</option>';
        uploadedFiles = [];
        updateFilePreview();
        outroTipoCascoContainer.classList.add("hidden");
        outroTipoPropulsaoContainer.classList.add("hidden");
      } else {
        alert("Erro ao cadastrar embarcação: " + result.message);
      }

    } catch (error) {
      console.error('Erro:', error);
      alert("Erro ao conectar com o servidor");
    }
  });

  /* ---------- Init ---------- */
  restaurarRascunho();
})();