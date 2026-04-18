import { supabase } from './supabaseClient.js';
import { requireAuth, cerrarSesion, showToast } from './auth.js';

const SUPABASE_URL = 'https://ikeebacmdyobisrcysvr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Yb5P2e5VTqikB0H6cifwoA_0nIOZh6S';

const auth = await requireAuth();
if (!auth) throw new Error('No session');

window.logout = () => cerrarSesion();

const nombre = sessionStorage.getItem('usuario_nombre') || auth.session.user.email;
document.getElementById('user-name').textContent = nombre;
document.getElementById('user-avatar').textContent = nombre.charAt(0).toUpperCase();

let carrito = JSON.parse(localStorage.getItem('ms_carrito') || '[]');
const statusEl = document.getElementById('pago-status');
const btnPagar = document.getElementById('btn-pagar');

// ── Renderizar resumen ──
function renderResumen() {
    const resumenEl = document.getElementById('resumen-productos');
    const totalEl = document.getElementById('total-monto');

    if (carrito.length === 0) {
        resumenEl.innerHTML = `
            <div class="empty-state">
                <div class="icon">🛒</div>
                <p>Tu pedido está vacío.<br>
                <a href="catalogo.html" style="color:var(--accent);">Ir al catálogo</a></p>
            </div>`;
        totalEl.textContent = '$0';
        btnPagar.disabled = true;
        return;
    }

    document.getElementById('items-count').textContent = `${carrito.reduce((s,i) => s+i.cantidad, 0)} productos`;

    resumenEl.innerHTML = carrito.map(item => `
        <div class="cart-item">
            <div>
                <div class="cart-item-name">${item.nombre}</div>
                <div class="cart-item-qty">Cantidad: ${item.cantidad}</div>
            </div>
            <div class="cart-item-price">
                $${(Number(item.precio_venta_actual) * item.cantidad).toLocaleString('es-CL')}
            </div>
        </div>
    `).join('');

    const total = carrito.reduce((s, i) => s + Number(i.precio_venta_actual) * i.cantidad, 0);
    totalEl.textContent = `$${total.toLocaleString('es-CL')}`;
}

renderResumen();

// ── Pagar con Webpay ──
btnPagar.addEventListener('click', async () => {
    if (carrito.length === 0) return;

    btnPagar.disabled = true;
    btnPagar.innerHTML = '<span class="spinner"></span> Conectando con Webpay...';
    statusEl.innerHTML = '';

    const total = carrito.reduce((s, i) => s + Number(i.precio_venta_actual) * i.cantidad, 0);
    const buyOrder = `ORD-${Date.now()}`;
    const sessionId = `SES-${auth.session.user.id.substring(0, 8)}`;
    const returnUrl = `${window.location.origin}/webpay-retorno.html`;

    // Guardar datos del pedido para después del pago
    sessionStorage.setItem('webpay_order', JSON.stringify({
        buyOrder, total, carrito,
        userId: auth.session.user.id,
        email: auth.session.user.email
    }));

    try {
        // Llamar a la Edge Function de Supabase → Transbank
        const response = await fetch(`${SUPABASE_URL}/functions/v1/transbank-webpay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                action: 'create',
                buyOrder,
                sessionId,
                amount: total,
                returnUrl,
            }),
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(JSON.stringify(data.error));
        }

        // Redirigir al formulario de Webpay
        statusEl.innerHTML = `<div class="msg-info" style="padding:0.75rem; border-radius:var(--radius);">Redirigiendo a Webpay...</div>`;

        // Crear formulario y enviar POST a Webpay (requerido por Transbank)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.url;

        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'token_ws';
        tokenInput.value = data.token;

        form.appendChild(tokenInput);
        document.body.appendChild(form);
        form.submit();

    } catch (err) {
        statusEl.innerHTML = `
            <div class="msg-error" style="padding:0.75rem; border-radius:var(--radius);">
                ✕ Error al conectar con Webpay: ${err.message}
            </div>`;
        btnPagar.disabled = false;
        btnPagar.innerHTML = '🔒 Pagar con Webpay';
        console.error(err);
    }
});