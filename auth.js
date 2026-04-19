// auth.js - Guardián de rutas para todas las páginas protegidas
import { supabase } from './supabaseClient.js';

/**
 * Verifica si hay sesión activa. Si no, redirige al login.
 * @param {number[]} rolesPermitidos - Array de rol_id permitidos. Vacío = cualquier rol.
 */
export async function requireAuth(rolesPermitidos = []) {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return null;
    }

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

    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario.rol_id)) {
        redirigirSegunRol(usuario.rol_id);
        return null;
    }

    return { session, usuario };
}

/**
 * Redirige al panel correcto según el rol
 * 1 = Admin       → verificacion → ejecutivo
 * 2 = Logística   → terminal-logistica
 * 3 = Ejecutivo   → verificacion → ejecutivo
 * 4 = Cliente     → catalogo
 * 5 = CM          → catalogo
 * 6 = Finanzas    → finanzas
 */
export function redirigirSegunRol(rolId) {
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

export async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

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