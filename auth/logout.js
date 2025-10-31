const pagLogin = '../../auth/';

// Elementos do modal
let logoutModal, modalCancel, modalConfirm;
let logoutCallback = null;

// Inicializar elementos do modal quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    initModal();
    checkToken();
});

function initModal() {
    logoutModal = document.getElementById('logoutModal');
    modalCancel = document.getElementById('modalCancel');
    modalConfirm = document.getElementById('modalConfirm');
    
    if (modalCancel) {
        modalCancel.addEventListener('click', closeModal);
    }
    
    if (modalConfirm) {
        modalConfirm.addEventListener('click', function() {
            if (logoutCallback) {
                logoutCallback();
            }
            closeModal();
        });
    }
    
    // Fechar modal ao clicar fora
    if (logoutModal) {
        logoutModal.addEventListener('click', function(e) {
            if (e.target === logoutModal) {
                closeModal();
            }
        });
    }
    
    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && logoutModal && logoutModal.style.display === 'flex') {
            closeModal();
        }
    });
}

function showModal() {
    if (logoutModal) {
        logoutModal.style.display = 'flex';
        // Focar no botão cancelar por padrão (mais seguro)
        if (modalCancel) {
            modalCancel.focus();
        }
    }
}

function closeModal() {
    if (logoutModal) {
        logoutModal.style.display = 'none';
    }
    logoutCallback = null;
}

function obterAccessToken() {
    const accessToken = localStorage.getItem('accessToken');
    return accessToken;
}

// FUNÇÃO LOGOUT COM MODAL PERSONALIZADO
function deleteTokenAndRedirect() {
    showModal();
    
    // Configurar o callback para quando confirmar
    logoutCallback = function() {
        performLogout();
    };
}

// Função que executa o logout (separada da confirmação)
function performLogout() {
    // Remover o accessToken e dados do usuário do localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userData');
    
    // Função para remover um cookie pelo nome
    function deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }

    // Remover o accessToken dos cookies
    deleteCookie('accessToken');

    // Redirecionar para a página de login
    window.location.href = pagLogin;
}

/**********************************************************/
// INÍCIO CHECA JWT
// Função para verificar se um token JWT é válido
function isTokenValid(token) {
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp && payload.exp > currentTime;
    } catch {
        return false;
    }
}

// Função para obter um cookie pelo nome
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Função para remover um cookie pelo nome
function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// Função para verificar a existência e validade do JWT no localStorage e cookies
function checkToken() {
    let localStorageToken = localStorage.getItem('accessToken');
    let cookieToken = getCookie('accessToken');
    const userData = localStorage.getItem('userData');

    // Verifica se existe pelo menos um token válido
    if ((isTokenValid(localStorageToken) || isTokenValid(cookieToken)) && userData) {
        // Token válido encontrado, não faz nada (mantém na página atual)
        return;
    } else {
        // Caso nenhum token válido seja encontrado, remove e redireciona para a página de login
        if (localStorageToken) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userData');
        }
        if (cookieToken) {
            deleteCookie('accessToken');
        }
        window.location.href = pagLogin;
    }
}
// FIM CHECA JWT
/**********************************************************/