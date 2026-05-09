// auth.js - Guardián de rutas para todas las páginas protegidas
import { supabase } from './supabaseClient.js';

/**
 * Verifica si hay sesión activa. Si no, redirige al login.
 * @param {number[]} rolesPermitidos - Array de rol_id permitidos. Vacío = cualquier rol.
 * @returns {Promise<{session, usuario}>}
 */
export async function requireAuth(rolesPermitidos = []) {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return null;
    }

    // Obtener datos del usuario en nuestra tabla
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('rol_id, nombre')
        .eq('email', session.user.email)
        .single();

    if (!usuario) {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
        return null;
    }

    // Verificar rol si se especificaron roles permitidos
    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario.rol_id)) {
        // Redirigir según el rol real del usuario
        redirigirSegunRol(usuario.rol_id);
        return null;
    }

    return { session, usuario };
}

/**
 * Redirige al panel correcto según el rol
 */
export function redirigirSegunRol(rolId) {
    const destinos = {
        1: 'verificacion.html',  // Admin
        2: 'terminal-logistica.html',  // Logística
        3: 'verificacion.html',  // Ejecutivo
    };
    window.location.href = destinos[rolId] || 'catalogo.html';
}

/**
 * Cierra sesión y redirige al login
 */
export async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

/**
 * Muestra un toast en pantalla
 */
export function showToast(msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
