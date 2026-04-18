import { supabase } from './supabaseClient.js';
import { redirigirSegunRol } from './auth.js';

const loginForm = document.getElementById('login-form');
const messageArea = document.getElementById('message');
const btnLogin = document.getElementById('btn-login');

// Si ya hay sesión activa, redirigir directo
(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('rol_id')
            .eq('email', session.user.email)
            .single();
        if (usuario) redirigirSegunRol(usuario.rol_id);
    }
})();

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Estado de carga
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<span class="spinner"></span> Verificando...';
    messageArea.innerHTML = '';
    messageArea.className = '';

    // 1. Autenticar con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        mostrarMensaje('Credenciales incorrectas. Verifica tu correo y contraseña.', 'error');
        btnLogin.disabled = false;
        btnLogin.innerHTML = 'Ingresar al Sistema';
        return;
    }

    // 2. Obtener rol del usuario
    const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('rol_id, nombre')
        .eq('email', email)
        .single();

    if (userError || !usuario) {
        mostrarMensaje('No se encontró tu perfil en el sistema. Contacta al administrador.', 'error');
        btnLogin.disabled = false;
        btnLogin.innerHTML = 'Ingresar al Sistema';
        return;
    }

    // 3. Guardar nombre para mostrar en los paneles
    sessionStorage.setItem('usuario_nombre', usuario.nombre || email);
    sessionStorage.setItem('usuario_rol', usuario.rol_id);

    // 4. Redirigir según rol
    mostrarMensaje('Acceso verificado. Redirigiendo...', 'success');
    setTimeout(() => redirigirSegunRol(usuario.rol_id), 1200);
});

function mostrarMensaje(texto, tipo) {
    const clases = { error: 'msg-error', success: 'msg-success', info: 'msg-info' };
    messageArea.className = clases[tipo] || '';
    messageArea.textContent = texto;
}
