import { supabase } from './supabaseClient.js';
import { requireAuth, cerrarSesion, showToast } from './auth.js';

const MOCKAPI_URL = 'https://69e5507bce4e908a155e08e1.mockapi.io';

const auth = await requireAuth();
if (!auth) throw new Error('No session');

window.logout = () => cerrarSesion();

const nombre = sessionStorage.getItem('usuario_nombre') || auth.session.user.email;
document.getElementById('user-name').textContent = nombre;
document.getElementById('user-avatar').textContent = nombre.charAt(0).toUpperCase();

let carrito = JSON.parse(localStorage.getItem('ms_carrito') || '[]');
let tipoDespacho = 'normal';
const COSTOS_DESPACHO = { normal: 2990, express: 5990 };

const btnPagar = document.getElementById('btn-pagar');
const statusEl = document.getElementById('pago-status');

// ── Selección de despacho ──
window.seleccionarDespacho = (tipo) => {
    tipoDespacho = tipo;
    document.getElementById('opt-normal').classList.toggle('selected', tipo === 'normal');
    document.getElementById('opt-express').classList.toggle('selected', tipo === 'express');
    renderResumen();
};

// ── Habilitar botón cuando hay dirección ──
document.getElementById('direccion').addEventListener('input', (e) => {
    btnPagar.disabled = !e.target.value.trim() || carrito.length === 0;
});

// ── Renderizar resumen ──
function renderResumen() {
    const resumenEl = document.getElementById('resumen-productos');
    const subtotalEl = document.getElementById('subtotal-monto');
    const totalEl = document.getElementById('total-monto');
    const costoEl = document.getElementById('costo-despacho');

    if (carrito.length === 0) {
        resumenEl.innerHTML = `
            <div class="empty-state">
                <div class="icon">🛒</div>
                <p>Tu pedido está vacío.<br>
                <a href="catalogo.html" style="color:var(--accent);">Ir al catálogo</a></p>
            </div>`;
        btnPagar.disabled = true;
        return;
    }

    document.getElementById('items-count').textContent =
        `${carrito.reduce((s, i) => s + i.cantidad, 0)} productos`;

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

    const subtotal = carrito.reduce((s, i) => s + Number(i.precio_venta_actual) * i.cantidad, 0);
    const costo = COSTOS_DESPACHO[tipoDespacho];
    const total = subtotal + costo;

    subtotalEl.textContent = `$${subtotal.toLocaleString('es-CL')}`;
    costoEl.textContent = `$${costo.toLocaleString('es-CL')}`;
    totalEl.textContent = `$${total.toLocaleString('es-CL')}`;
}

renderResumen();

// ── Validar stock antes de pagar ──
async function validarStock() {
    for (const item of carrito) {
        const { data, error } = await supabase
            .from('inventario_detalle')
            .select('cantidad_disponible')
            .eq('id_producto', item.id_producto)
            .single();

        if (error || !data || data.cantidad_disponible < item.cantidad) {
            showToast(`Stock insuficiente para: ${item.nombre}`, 'error');
            return false;
        }
    }
    return true;
}

// ── Generar número de tracking via MockAPI ──
async function generarTracking(idPedido, direccion) {
    try {
        const trackingNum = `MS-${Date.now().toString().slice(-8)}`;
        const estimado = tipoDespacho === 'express' ? '24 horas' : '3-5 días hábiles';

        const res = await fetch(`${MOCKAPI_URL}/envios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_pedido: idPedido,
                tracking: trackingNum,
                tipo: tipoDespacho,
                direccion,
                estado: 'Pendiente de retiro',
                estimado,
                creado: new Date().toISOString(),
            }),
        });

        if (res.ok) {
            const data = await res.json();
            return data.tracking || trackingNum;
        }
    } catch (e) {
        console.warn('MockAPI no disponible, usando tracking local:', e.message);
    }

    return `MS-${Date.now().toString().slice(-8)}`;
}

// ── Pagar con Webpay ──
btnPagar.addEventListener('click', async () => {
    const direccion = document.getElementById('direccion').value.trim();
    if (!direccion || carrito.length === 0) return;

    btnPagar.disabled = true;
    btnPagar.innerHTML = '<span class="spinner"></span> Verificando stock...';
    statusEl.innerHTML = '';

    // Validar stock antes de proceder
    const stockOk = await validarStock();
    if (!stockOk) {
        btnPagar.disabled = false;
        btnPagar.innerHTML = '🔒 Pagar con Webpay';
        return;
    }

    btnPagar.innerHTML = '<span class="spinner"></span> Conectando con Webpay...';

    const subtotal = carrito.reduce((s, i) => s + Number(i.precio_venta_actual) * i.cantidad, 0);
    const costo = COSTOS_DESPACHO[tipoDespacho];
    const total = subtotal + costo;

    const buyOrder = `ORD-${Date.now()}`;
    const sessionId = `SES-${auth.session.user.id.substring(0, 8)}`;
    const returnUrl = `${window.location.origin}/webpay-retorno.html`;

    // Guardar datos del pedido para después del pago
    sessionStorage.setItem('webpay_order', JSON.stringify({
        buyOrder, total, subtotal,
        carrito, tipoDespacho, direccion,
        costoDespacho: costo,
        userId: auth.session.user.id,
        email: auth.session.user.email,
    }));

    try {
        // Usar el token del usuario autenticado en vez de la anon key
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(
            'https://ikeebacmdyobisrcysvr.supabase.co/functions/v1/transbank-webpay',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    action: 'create',
                    buyOrder,
                    sessionId,
                    amount: total,
                    returnUrl,
                }),
            }
        );

        const data = await response.json();
        if (data.error) throw new Error(JSON.stringify(data.error));

        statusEl.innerHTML = `
            <div class="msg-info" style="padding:0.75rem; border-radius:var(--radius);">
                Redirigiendo a Webpay...
            </div>`;

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
                ✕ Error: ${err.message}
            </div>`;
        btnPagar.disabled = false;
        btnPagar.innerHTML = '🔒 Pagar con Webpay';
    }
});

window.generarTracking = generarTracking;
