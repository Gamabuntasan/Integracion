import { supabase } from './supabaseClient.js';

// ── Si ya hay sesión activa, redirigir directo ──
(async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: usuario } = await supabase
                .from('usuarios')
                .select('rol_id, nombre')
                .eq('id_usuario', session.user.id)
                .single();
            if (usuario) redirigirSegunRol(usuario.rol_id, usuario.nombre);
        }
    } catch (err) {
        console.error('Error al verificar sesión activa:', err);
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
        .eq('id_usuario', data.user.id)
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

    if (!nombre || !apellido || !rut || !email || !password) {
        mostrarMsg(msgRegister, 'Todos los campos son obligatorios.', 'error');
        return;
    }

    if (password.length < 6) {
        mostrarMsg(msgRegister, 'La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }

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
    // Usamos authData.user.id como id_usuario para mantener consistencia con Supabase Auth
    const { error: dbError } = await supabase
        .from('usuarios')
        .insert([{
            id_usuario: authData.user.id,
            rut,
            nombre,
            apellido,
            email,
            rol_id: 4
        }]);

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
// Finanzas (6)              → finanzas
// ══════════════════════════════════════════
function redirigirSegunRol(rolId, nombre) {
    const destinos = {
        1: 'verificacion.html',
        2: 'terminal-logistica.html',
        3: 'verificacion.html',
        4: 'catalogo.html',
        5: 'catalogo.html',
        6: 'finanzas.html',
    };
    window.location.href = destinos[rolId] || 'catalogo.html';
}

function mostrarMsg(el, texto, tipo) {
    const clases = { error: 'msg-error', success: 'msg-success', info: 'msg-info' };
    el.className = clases[tipo] || '';
    el.textContent = texto;
}
