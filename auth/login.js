document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    // Usar as URLs do arquivo de configuração
    const LOGIN_URL = window.URLS_CONFIG.AUTH_ENDPOINTS.LOGIN;

    // Verificar se já está logado
    checkExistingAuth();

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value;
        const senha = document.getElementById('senha').value;

        // Limpar mensagens anteriores
        clearMessage();

        try {
            const response = await fetch(LOGIN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nome, senha })
            });

            const data = await response.json();

            if (data.success) {
                // Salvar token no localStorage
                localStorage.setItem('accessToken', data.token);
                // Salvar dados do usuário também
                localStorage.setItem('userData', JSON.stringify(data.user));
                
                // Salvar token nos cookies também (para compatibilidade)
                document.cookie = `accessToken=${data.token}; path=/; max-age=86400`; // 24 horas
                
                showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                
                // Redirecionar conforme a função do usuário
                setTimeout(() => {
                    if (data.user.funcao === 'Admin') {
                        window.location.href = '../admin/';
                    } else {
                        window.location.href = '../form/desembarque/';
                    }
                }, 1000);
            } else {
                showMessage(data.message || 'Erro no login', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            showMessage('Erro de conexão com o servidor', 'error');
        }
    });

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }

    function clearMessage() {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
        messageDiv.style.display = 'none';
    }

    function checkExistingAuth() {
        const token = localStorage.getItem('accessToken') || getCookie('accessToken');
        const userData = localStorage.getItem('userData');
        
        if (token && isTokenValid(token) && userData) {
            // Se já tem token válido e dados do usuário, redireciona conforme a função
            const user = JSON.parse(userData);
            if (user.funcao === 'Admin') {
                window.location.href = '../admin/';
            } else {
                window.location.href = '../form/desembarque/';
            }
        }
    }

    // Funções auxiliares para cookies e validação de token
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

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
});