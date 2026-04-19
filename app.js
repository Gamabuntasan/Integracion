import { supabase } from './supabaseClient.js';

// ── Si ya hay sesión activa, redirigir directo ──
(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('rol_id, nombre')
            .eq('email', session.user.email)
            .single();
        if (usuario) redirigirSegunRol(usuario.rol_id, usuario.nombre);
    }
})();

// ══════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════
const loginForm = document.getElementById('login-form');
const msgLogin = document.getElementById('message-login');
const btnLogin = document.getElementById('btn-login');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    btnLogin.disabled = true;
    btnLogin.innerHTML = '<span class="spinner"></span> Verificando...';
    msgLogin.innerHTML = '';
    msgLogin.className = '';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        mostrarMsg(msgLogin, 'Credenciales incorrectas. Verifica tu correo y contraseña.', 'error');
        btnLogin.disabled = false;
        btnLogin.innerHTML = 'Ingresar al Sistema';
        return;
    }

    const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('rol_id, nombre')
        .eq('email', email)
        .single();

    if (userError || !usuario) {
        mostrarMsg(msgLogin, 'No se encontró tu perfil. Contacta al administrador.', 'error');
        btnLogin.disabled = false;
        btnLogin.innerHTML = 'Ingresar al Sistema';
        return;
    }

    sessionStorage.setItem('usuario_nombre', usuario.nombre || email);
    sessionStorage.setItem('usuario_rol', usuario.rol_id);

    mostrarMsg(msgLogin, 'Acceso verificado. Redirigiendo...', 'success');
    setTimeout(() => redirigirSegunRol(usuario.rol_id, usuario.nombre), 1200);
});

// ══════════════════════════════════════════
// REGISTRO
// ══════════════════════════════════════════
const registerForm = document.getElementById('register-form');
const msgRegister = document.getElementById('message-register');
const btnRegister = document.getElementById('btn-register');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre   = document.getElementById('reg-nombre').value.trim();
    const apellido = document.getElementById('reg-apellido').value.trim();
    const rut      = document.getElementById('reg-rut').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    btnRegister.disabled = true;
    btnRegister.innerHTML = '<span class="spinner"></span> Creando cuenta...';
    msgRegister.innerHTML = '';

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + '/index.html' }
    });

    if (authError) {
        mostrarMsg(msgRegister, `Error: ${authError.message}`, 'error');
        btnRegister.disabled = false;
        btnRegister.innerHTML = 'Crear Cuenta';
        return;
    }

    // 2. Insertar en tabla usuarios con rol_id = 4 (Cliente por defecto)
    const { error: dbError } = await supabase
        .from('usuarios')
        .insert([{ rut, nombre, apellido, email, rol_id: 4 }]);

    if (dbError) {
        mostrarMsg(msgRegister, `Error al guardar perfil: ${dbError.message}`, 'error');
        btnRegister.disabled = false;
        btnRegister.innerHTML = 'Crear Cuenta';
        return;
    }

    mostrarMsg(msgRegister, '✅ Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.', 'success');
    btnRegister.innerHTML = 'Crear Cuenta';
    btnRegister.disabled = false;
    registerForm.reset();
});

// ══════════════════════════════════════════
// REDIRECCIÓN POR ROL
// Admin (1) y Ejecutivo (3) → verificacion → ejecutivo
// Logística (2)             → terminal-logistica
// Cliente (4) y CM (5)      → catalogo
// ══════════════════════════════════════════
function redirigirSegunRol(rolId, nombre) {
    if (rolId === 1 || rolId === 3) {
        window.location.href = 'verificacion.html';
    } else if (rolId === 2) {
        window.location.href = 'terminal-logistica.html';
    } else {
        // Cliente y CM van al catálogo
        window.location.href = 'catalogo.html';
    }
}

function mostrarMsg(el, texto, tipo) {
    const clases = { error: 'msg-error', success: 'msg-success', info: 'msg-info' };
    el.className = clases[tipo] || '';
    el.textContent = texto;
}