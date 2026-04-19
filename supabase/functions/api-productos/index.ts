// supabase/functions/api-productos/index.ts
// API REST propia de Medistock v1
// Endpoints:
//   GET /api-productos                  → todos los productos
//   GET /api-productos?id={id}          → producto por ID
//   GET /api-productos?categoria={id}   → por categoría
//   GET /api-productos/stock?id={id}    → stock por producto

const SUPABASE_URL = 'https://ikeebacmdyobisrcysvr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Yb5P2e5VTqikB0H6cifwoA_0nIOZh6S';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

async function query(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`DB error: ${res.status}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/functions/v1/api-productos', '');
  const params = url.searchParams;

  try {
    // GET /stock?id={id}
    if (path === '/stock') {
      const id = params.get('id');
      if (!id) return jsonError('Parámetro id requerido', 400);

      const data = await query('inventario_detalle',
        `?id_producto=eq.${id}&select=id_stock,cantidad_disponible,stock_critico,sucursales(id_sucursal,nombre,comuna)`
      );

      return jsonResponse({
        ok: true,
        version: 'v1',
        id_producto: parseInt(id),
        stock: data.map(s => ({
          sucursal: s.sucursales,
          cantidad_disponible: s.cantidad_disponible,
          stock_critico: s.stock_critico,
          estado: s.cantidad_disponible <= s.stock_critico ? 'CRITICO' : 'NORMAL',
        })),
        total_disponible: data.reduce((sum, s) => sum + s.cantidad_disponible, 0),
      });
    }

    // GET ?id={id}
    if (params.get('id')) {
      const data = await query('productos',
        `?id_producto=eq.${params.get('id')}&select=*,categorias(nombre_cat)&limit=1`
      );
      if (!data.length) return jsonError('Producto no encontrado', 404);
      return jsonResponse({ ok: true, version: 'v1', producto: formatProducto(data[0]) });
    }

    // GET ?categoria={id}
    if (params.get('categoria')) {
      const data = await query('productos',
        `?id_categoria=eq.${params.get('categoria')}&select=*,categorias(nombre_cat)&order=nombre`
      );
      return jsonResponse({
        ok: true, version: 'v1',
        total: data.length,
        productos: data.map(formatProducto),
      });
    }

    // GET todos
    const data = await query('productos', '?select=*,categorias(nombre_cat)&order=nombre');
    return jsonResponse({
      ok: true,
      version: 'v1',
      descripcion: 'API REST Medistock — Catálogo de productos',
      total: data.length,
      productos: data.map(formatProducto),
    });

  } catch (err) {
    return jsonError(err.message, 500);
  }
});

function formatProducto(p) {
  return {
    id: p.id_producto,
    sku: p.sku || `MS-${String(p.id_producto).padStart(4, '0')}`,
    nombre: p.nombre,
    descripcion: p.descripcion,
    categoria: p.categorias?.nombre_cat || null,
    precio: p.precio_venta_actual,
    moneda: 'CLP',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}