document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');
    const btnLogin = document.getElementById('btn-login');

    // Comprobar si ya existe un token válido
    const token = localStorage.getItem('sqlens_token');
    if (token) {
        verifyToken(token).then(isValid => {
            if (isValid) {
                window.location.href = '/index.html';
            } else {
                localStorage.removeItem('sqlens_token');
            }
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = passwordInput.value;
        if (!password) return;

        btnLogin.disabled = true;
        btnLogin.textContent = 'Verificando...';
        errorDiv.style.opacity = '0';

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (data.success && data.data.token) {
                localStorage.setItem('sqlens_token', data.data.token);
                // Redirect immediately
                window.location.href = '/index.html';
            } else {
                showError(data.error || 'Contraseña incorrecta');
            }
        } catch (err) {
            console.error('Login error:', err);
            showError('Error de conexión al servidor');
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Ingresar al Sistema';
        }
    });

    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.style.opacity = '1';
        passwordInput.value = '';
        passwordInput.focus();
    }

    async function verifyToken(token) {
        try {
            const response = await fetch('/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            return data.success && data.valid;
        } catch (err) {
            return false;
        }
    }
});
