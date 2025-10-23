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
  function previewArquivos(files) {
    anexosPreview.innerHTML = "";
    if (!files || !files.length) return;

    [...files].forEach(file => {
      const fig = document.createElement("figure");
      fig.className = "preview-thumb";

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = e => {
          const img = document.createElement("img");
          img.src = e.target.result;
          img.alt = file.name;
          fig.appendChild(img);
          const cap = document.createElement("figcaption");
          cap.textContent = file.name;
          fig.appendChild(cap);
          anexosPreview.appendChild(fig);
        };
        reader.readAsDataURL(file);
      } else {
        const cap = document.createElement("figcaption");
        cap.textContent = file.name;
        fig.appendChild(cap);
        anexosPreview.appendChild(fig);
      }
    });
  }
  anexos.addEventListener("change", e => previewArquivos(e.target.files));

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
        const el = form.elements[k];
        if (!el) return;
        el.value = v;
      });

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
    anexosPreview.innerHTML = "";
    outroTipoCascoContainer.classList.add("hidden");
    outroTipoPropulsaoContainer.classList.add("hidden");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const erro = validarCampos();
    if (erro) {
      alert(erro);
      return;
    }

    // Monta payload (JSON demonstrativo sem arquivos)
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

    console.log("Payload JSON (sem anexos):", json);
    // Exemplo POST real:
    // await fetch('/api/embarcacoes', { method: 'POST', body: fd });

    alert("Embarcação cadastrada com sucesso! (simulado)");

    localStorage.removeItem(DRAFT_KEY);
    form.reset();
    municipio.innerHTML = '<option value="">Selecione a UF primeiro</option>';
    anexosPreview.innerHTML = "";
    outroTipoCascoContainer.classList.add("hidden");
    outroTipoPropulsaoContainer.classList.add("hidden");
  });

  /* ---------- Init ---------- */
  restaurarRascunho();
})();
