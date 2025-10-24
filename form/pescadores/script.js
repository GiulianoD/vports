/* =========================================================
   Cadastro de Pescadores — pescadores.js
   Padrões:
   - UF -> Municípios (exemplos)
   - Campos condicionais (gênero/raca "Outro", artes "Outro", filiações)
   - Validação básica
   - Rascunho (localStorage)
   - Salvar envio:
       * Se houver DB.addPescador -> usa
       * Caso contrário, salva em localStorage (db_pescadores)
   ========================================================= */

(function () {
  const form = document.getElementById("pescadorForm");
  if (!form) return;

  // --------- refs
  const genero = document.getElementById("genero");
  const generoOutroContainer = document.getElementById("generoOutroContainer");
  const raca = document.getElementById("raca");
  const racaOutroContainer = document.getElementById("racaOutroContainer");

  const uf = document.getElementById("uf");
  const municipio = document.getElementById("municipio");

  const arteOutroChk = document.getElementById("arteOutroChk");
  const arteOutroContainer = document.getElementById("arteOutroContainer");
  const arteOutro = document.getElementById("arteOutro");

  const filSindicato = document.getElementById("filSindicato");
  const filAssociacao = document.getElementById("filAssociacao");
  const filColonia = document.getElementById("filColonia");
  const filSindicatoContainer = document.getElementById("filSindicatoContainer");
  const filAssociacaoContainer = document.getElementById("filAssociacaoContainer");
  const filColoniaContainer = document.getElementById("filColoniaContainer");
  const filSindicatoNome = document.getElementById("filSindicatoNome");
  const filAssociacaoNome = document.getElementById("filAssociacaoNome");
  const filColoniaNome = document.getElementById("filColoniaNome");

  const btnLimpar = document.getElementById("btnLimpar");
  const btnRascunho = document.getElementById("btnRascunho");

  /* ---------- UF -> Municípios (exemplo) ---------- */
  const MUNICIPIOS = {
    ES: ["Vitória","Vila Velha","Serra","Cariacica","Guarapari","Linhares","Aracruz","São Mateus","Anchieta","Piúma"],
    BA: ["Salvador","Ilhéus","Itacaré","Porto Seguro","Valença","Itaparica"],
    PA: ["Belém","Santarém","Vigia","Bragança","Afuá","Curuçá"]
  };

  function popularMunicipios(ufSigla) {
    municipio.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = ufSigla ? "Selecione um município" : "Selecione a UF primeiro";
    municipio.appendChild(opt);

    (MUNICIPIOS[ufSigla] || []).forEach(m => {
      const op = document.createElement("option");
      op.value = m;
      op.textContent = m;
      municipio.appendChild(op);
    });
    municipio.disabled = false;
  }
  uf.addEventListener("change", () => popularMunicipios(uf.value));

  /* ---------- Condicionais ---------- */
  genero.addEventListener("change", () => {
    generoOutroContainer.classList.toggle("hidden", genero.value !== "Outro");
    if (genero.value !== "Outro") document.getElementById("generoOutro").value = "";
  });

  raca.addEventListener("change", () => {
    racaOutroContainer.classList.toggle("hidden", raca.value !== "Outro");
    if (raca.value !== "Outro") document.getElementById("racaOutro").value = "";
  });

  arteOutroChk.addEventListener("change", () => {
    arteOutroContainer.classList.toggle("hidden", !arteOutroChk.checked);
    if (!arteOutroChk.checked) arteOutro.value = "";
  });

  const toggleFil = () => {
    filSindicatoContainer.classList.toggle("hidden", !filSindicato.checked);
    filAssociacaoContainer.classList.toggle("hidden", !filAssociacao.checked);
    filColoniaContainer.classList.toggle("hidden", !filColonia.checked);
    if (!filSindicato.checked) filSindicatoNome.value = "";
    if (!filAssociacao.checked) filAssociacaoNome.value = "";
    if (!filColonia.checked) filColoniaNome.value = "";
  };
  filSindicato.addEventListener("change", toggleFil);
  filAssociacao.addEventListener("change", toggleFil);
  filColonia.addEventListener("change", toggleFil);

  /* ---------- Validação ---------- */
  function validar() {
    const nome = document.getElementById("nomeCompleto").value.trim();
    if (!nome) return "Informe o nome completo.";

    if (!genero.value) return "Informe o gênero.";
    if (genero.value === "Outro" && !document.getElementById("generoOutro").value.trim()) {
      return "Especifique o gênero (Outro).";
    }

    if (!raca.value) return "Informe a raça/cor.";
    if (raca.value === "Outro" && !document.getElementById("racaOutro").value.trim()) {
      return "Especifique a raça/cor (Outro).";
    }

    const idade = Number(document.getElementById("idade").value);
    if (!Number.isFinite(idade) || idade < 10 || idade > 120) return "Informe uma idade válida.";

    const fam = Number(document.getElementById("membrosFamilia").value);
    if (!Number.isFinite(fam) || fam < 1 || fam > 30) return "Informe a quantidade de membros da família (1–30).";

    if (!uf.value) return "Selecione a UF.";
    if (!municipio.value) return "Selecione o município.";

    const localPesca = document.getElementById("localOndePesca").value.trim();
    if (!localPesca) return "Informe o local onde pesca.";

    // artes: pelo menos uma? (opcional ajustar)
    const algumaArte = [...document.querySelectorAll('input[name="artes[]"]')].some(i => i.checked) || arteOutroChk.checked;
    if (!algumaArte) return "Selecione pelo menos uma arte de pesca.";

    if (arteOutroChk.checked && !arteOutro.value.trim()) {
      return "Especifique a outra arte de pesca.";
    }

    // filiação: se marcar, precisa nome
    if (filSindicato.checked && !filSindicatoNome.value.trim()) return "Informe o nome do sindicato.";
    if (filAssociacao.checked && !filAssociacaoNome.value.trim()) return "Informe o nome da associação.";
    if (filColonia.checked && !filColoniaNome.value.trim()) return "Informe o nome/identificação da colônia.";

    return null;
  }

  /* ---------- Rascunho ---------- */
  const DRAFT_KEY = "draft_pescador_v1";

  function salvarRascunho() {
    const data = new FormData(form);
    const obj = {};
    for (const [k, v] of data.entries()) {
      if (k.endsWith("[]")) {
        const base = k.slice(0, -2);
        if (!obj[base]) obj[base] = [];
        obj[base].push(v);
      } else if (obj[k]) {
        if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
        obj[k].push(v);
      } else obj[k] = v;
    }
    obj.filSindicato = filSindicato.checked;
    obj.filAssociacao = filAssociacao.checked;
    obj.filColonia = filColonia.checked;

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
        if (["filSindicato","filAssociacao","filColonia","artes"].includes(k)) return;
        const el = form.elements[k];
        if (el) el.value = v;
      });

      filSindicato.checked = !!obj.filSindicato;
      filAssociacao.checked = !!obj.filAssociacao;
      filColonia.checked = !!obj.filColonia;
      toggleFil();

      // restaura artes
      if (Array.isArray(obj.artes)) {
        obj.artes.forEach(val => {
          const box = [...document.querySelectorAll('input[name="artes[]"]')].find(b => b.value === val);
          if (box) box.checked = true;
        });
      }
      if (obj.arteOutro) {
        arteOutroChk.checked = true;
        arteOutroContainer.classList.remove("hidden");
        arteOutro.value = obj.arteOutro;
      }

      // condicionais
      genero.dispatchEvent(new Event("change"));
      raca.dispatchEvent(new Event("change"));
    } catch {}
  }

  btnRascunho.addEventListener("click", salvarRascunho);

  btnLimpar.addEventListener("click", () => {
    if (!confirm("Deseja limpar o formulário?")) return;
    form.reset();
    localStorage.removeItem(DRAFT_KEY);
    municipio.innerHTML = '<option value="">Selecione a UF primeiro</option>';
    arteOutroChk.checked = false;
    arteOutroContainer.classList.add("hidden");
    toggleFil();
    genero.dispatchEvent(new Event("change"));
    raca.dispatchEvent(new Event("change"));
  });

  /* ---------- Persistência do envio ---------- */
  function saveLocalPescador(json) {
    // fallback se não houver DB.addPescador
    const KEY = "db_pescadores";
    try {
      const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
      const rec = {
        id: "ID-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36),
        type: "pescador",
        status: "pending",
        createdAt: new Date().toISOString(),
        data: json
      };
      arr.unshift(rec);
      localStorage.setItem(KEY, JSON.stringify(arr));
      // dispara evento de storage para admin (em outras abas)
      try { localStorage.setItem("__touch__", Date.now().toString()); } catch {}
      return rec.id;
    } catch { return null; }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const erro = validar();
    if (erro) return alert(erro);

    // monta JSON simples
    const fd = new FormData(form);
    const json = {};
    fd.forEach((v, k) => {
      if (k.endsWith("[]")) {
        const base = k.slice(0, -2);
        if (!json[base]) json[base] = [];
        json[base].push(v);
      } else if (json[k]) {
        if (!Array.isArray(json[k])) json[k] = [json[k]];
        json[k].push(v);
      } else json[k] = v;
    });
    json.filiacoes = {
      sindicato: filSindicato.checked ? (filSindicatoNome.value.trim() || null) : null,
      associacao: filAssociacao.checked ? (filAssociacaoNome.value.trim() || null) : null,
      colonia: filColonia.checked ? (filColoniaNome.value.trim() || null) : null,
    };

    // salva no "DB" local se existir API
    let savedId = null;
    try {
      if (typeof DB?.addPescador === "function") {
        savedId = DB.addPescador(json);
      } else {
        savedId = saveLocalPescador(json);
      }
    } catch {}

    console.log("Pescador salvo:", json, "id:", savedId);
    alert("Cadastro enviado com sucesso!");

    // limpa
    localStorage.removeItem(DRAFT_KEY);
    form.reset();
    municipio.innerHTML = '<option value="">Selecione a UF primeiro</option>';
    arteOutroChk.checked = false;
    arteOutroContainer.classList.add("hidden");
    toggleFil();
    genero.dispatchEvent(new Event("change"));
    raca.dispatchEvent(new Event("change"));
  });

  /* ---------- Init ---------- */
  restaurarRascunho();
})();
