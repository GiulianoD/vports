document.addEventListener('DOMContentLoaded', function () {
  initGlobalNav();
});

function initGlobalNav() {
  const linksEl = document.getElementById('navLinks');
  const toggleEl = document.getElementById('navToggle');
  if (!linksEl) return; // página sem nav

  // CORREÇÃO: Usar caminhos absolutos baseados na estrutura do projeto
  const basePath = window.location.origin;
  
  // Se estamos em /form/desembarque/index.html, a base é /form/
  const currentPath = window.location.pathname;
  
  // Determinar a base correta baseado na estrutura do projeto
  let routes = {
    desembarque: '/form/desembarque/',
    embarcacao: '/form/embarcacao/',
    pescadores: '/form/pescadores/'
  };

  // Se estamos em uma subpasta diferente, ajustar os caminhos
  if (currentPath.includes('/form/')) {
    // Já está na estrutura correta
    routes = {
      desembarque: '/form/desembarque/',
      embarcacao: '/form/embarcacao/', 
      pescadores: '/form/pescadores/'
    };
  } else if (currentPath.includes('/admin/')) {
    // Se estamos na área admin, voltar para form
    routes = {
      desembarque: '../form/desembarque/',
      embarcacao: '../form/embarcacao/',
      pescadores: '../form/pescadores/'
    };
  }

  const l1 = document.getElementById('linkDesembarque');
  const l2 = document.getElementById('linkEmbarcacao');
  const l3 = document.getElementById('linkPescadores');

  // Aplicar os hrefs corretos
  if (l1) l1.href = routes.desembarque;
  if (l2) l2.href = routes.embarcacao;
  if (l3) l3.href = routes.pescadores;

  // Marcar ativo
  const path = window.location.pathname;
  if (l1 && path.includes('/desembarque/')) l1.classList.add('active');
  if (l2 && path.includes('/embarcacao/')) l2.classList.add('active');
  if (l3 && path.includes('/pescadores/')) l3.classList.add('active');

  // Toggle mobile
  toggleEl?.addEventListener('click', function (e) {
    e.stopPropagation();
    linksEl.classList.toggle('open');
    toggleEl.setAttribute('aria-expanded', linksEl.classList.contains('open') ? 'true' : 'false');
  });

  // Fecha ao clicar fora
  document.addEventListener('click', function (e) {
    if (!linksEl.contains(e.target) && !toggleEl.contains(e.target)) {
      linksEl.classList.remove('open');
      toggleEl?.setAttribute('aria-expanded', 'false');
    }
  });

  // Não fecha ao clicar dentro
  linksEl.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  // Adicionar listener para o botão de logout (se existir)
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof deleteTokenAndRedirect === 'function') {
        deleteTokenAndRedirect();
      } else {
        console.error('Função deleteTokenAndRedirect não encontrada');
        // Fallback: redirecionar manualmente
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userData');
        window.location.href = '/auth/index.html';
      }
    });
  }
}

// Adicionar listener para o botão de logout (se existir)
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof deleteTokenAndRedirect === 'function') {
            deleteTokenAndRedirect();
        } else {
            console.error('Função deleteTokenAndRedirect não encontrada');
            // Fallback: redirecionar manualmente
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userData');
            window.location.href = '/auth/index.html';
        }
    });
}