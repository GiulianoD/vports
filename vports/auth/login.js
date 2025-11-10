document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    // URL da API Flask - ajuste a porta se necessário
    const LOGIN_URL = 'https://oceanstream-8b3329b99e40.herokuapp.com/vports/login';
    const HEALTH_URL = 'https://oceanstream-8b3329b99e40.herokuapp.com/vports/health';

    // Verificar se a API está online
    checkAPIHealth();

    // Verificar se já está logado
    checkExistingAuth();

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value;
        const senha = document.getElementById('senha').value;

        // Limpar mensagens anteriores
        clearMessage();

        // Validação básica
        if (!nome || !senha) {
            showMessage('Por favor, preencha todos os campos', 'error');
            return;
        }

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
            showMessage('Erro de conexão com o servidor. Verifique se a API está rodando.', 'error');
        }
    });

    async function checkAPIHealth() {
        try {
            const response = await fetch(HEALTH_URL);
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ API está online');
            } else {
                console.warn('⚠️ API retornou erro no health check');
            }
        } catch (error) {
            console.error('❌ API offline:', error);
            showMessage('⚠️ A API parece estar offline. Verifique se o servidor Flask está rodando.', 'warning');
        }
    }

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