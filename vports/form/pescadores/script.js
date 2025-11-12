/* =========================================================
   Cadastro de Pescadores — pescadores.js
   Padrões:
   - UF -> Municípios (exemplos)
   - Campos condicionais (gênero/raca "Outro", artes "Outro", filiações)
   - Rascunho (localStorage)
   - Salvar envio: POST /pescadores com Bearer Token
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
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

  /* ---------- Função para obter informações do usuário logado ---------- */
  function obterInformacoesUsuario() {
    try {
      const token = obterAccessToken();
      if (!token) {
        console.warn('⚠️ Token não encontrado');
        return null;
      }

      // Decodificar o token JWT para obter informações do usuário
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.id,
        nome: payload.nome,
        funcao: payload.funcao
      };
    } catch (error) {
      console.error('❌ Erro ao obter informações do usuário:', error);
      return null;
    }
  }

  /* ---------- Envio para API ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Verificar se o usuário está autenticado
    const usuario = obterInformacoesUsuario();
    if (!usuario) {
      alert("❌ Você precisa estar logado para cadastrar um pescador!");
      window.location.href = '/login.html';
      return;
    }

    console.log(`👤 Usuário logado: ${usuario.nome} (ID: ${usuario.id})`);

    // Montar JSON com os dados do formulário
    const fd = new FormData(form);
    const jsonData = {};
    
    // Converter FormData para objeto JSON
    fd.forEach((v, k) => {
      if (k.endsWith("[]")) {
        const base = k.slice(0, -2);
        if (!jsonData[base]) jsonData[base] = [];
        jsonData[base].push(v);
      } else if (jsonData[k]) {
        if (!Array.isArray(jsonData[k])) jsonData[k] = [jsonData[k]];
        jsonData[k].push(v);
      } else jsonData[k] = v;
    });

    // Adicionar informações de filiação
    jsonData.filiacoes = {
      sindicato: filSindicato.checked ? (filSindicatoNome.value.trim() || null) : null,
      associacao: filAssociacao.checked ? (filAssociacaoNome.value.trim() || null) : null,
      colonia: filColonia.checked ? (filColoniaNome.value.trim() || null) : null,
    };

    // IMPRIMIR JSON NO CONSOLE
    console.log('📦 JSON enviado na requisição:');
    console.log(JSON.stringify(jsonData, null, 2));
    console.log('👤 Usuário que está cadastrando:', usuario);
    console.log('--- Dados brutos:', jsonData);

    try {
      // USANDO URL CONFIGURADA DO urls.js
      const pescadoresURL = window.URLS_CONFIG?.PESCADORES_ENDPOINTS?.BASE || 
                           'http://localhost:2002/pescadores';

      console.log('🌐 Enviando dados para:', pescadoresURL);
      console.log('🔐 Token de acesso:', obterAccessToken() ? 'Presente' : 'Ausente');

      // Enviar como JSON
      const response = await fetch(pescadoresURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${obterAccessToken()}`
        },
        body: JSON.stringify(jsonData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert("✅ Pescador cadastrado com sucesso!");
          console.log(`📝 Pescador ID ${result.pescador_id} cadastrado pelo usuário ID ${result.adicionado_por}`);

          // Limpar formulário após sucesso
          localStorage.removeItem(DRAFT_KEY);
          form.reset();
          municipio.innerHTML = '<option value="">Selecione a UF primeiro</option>';
          arteOutroChk.checked = false;
          arteOutroContainer.classList.add("hidden");
          toggleFil();
          genero.dispatchEvent(new Event("change"));
          raca.dispatchEvent(new Event("change"));
        } else {
          alert("❌ Erro ao cadastrar: " + (result.error || "Erro desconhecido"));
        }
      } else {
        if (response.status === 401) {
          alert("🔐 Sessão expirada. Faça login novamente.");
          window.location.href = '/login.html';
        } else {
          const errorText = await response.text();
          console.error('❌ Erro do servidor:', errorText);
          alert("❌ Erro no servidor: " + errorText);
        }
      }
    } catch (error) {
      console.error("❌ Falha no envio:", error);
      alert("❌ Erro de conexão. Verifique sua internet e tente novamente.");
    }
  });

  /* ---------- Verificar autenticação ao carregar a página ---------- */
  function verificarAutenticacao() {
    const token = obterAccessToken();
    if (!token) {
      alert("🔐 Você precisa fazer login para acessar esta página!");
      window.location.href = '/login.html';
      return;
    }

    const usuario = obterInformacoesUsuario();
    if (usuario) {
      console.log(`✅ Usuário autenticado: ${usuario.nome} (${usuario.funcao})`);
    }
  }

  /* ---------- Init ---------- */
  verificarAutenticacao();
  restaurarRascunho();
});