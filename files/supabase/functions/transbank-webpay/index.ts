// supabase/functions/transbank-webpay/index.ts
// Edge Function para integración con Transbank Webpay Plus (ambiente de integración)

const WEBPAY_API_URL = 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions';
const COMMERCE_CODE = '597055555532'; // Código de comercio de integración oficial Transbank
const API_KEY = '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C'; // API Key de integración oficial

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    // ── ACCIÓN 1: Crear transacción ──
    if (action === 'create') {
      const { buyOrder, sessionId, amount, returnUrl } = params;

      const response = await fetch(WEBPAY_API_URL, {
        method: 'POST',
        headers: {
          'Tbk-Api-Key-Id': COMMERCE_CODE,
          'Tbk-Api-Key-Secret': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buy_order: buyOrder,
          session_id: sessionId,
          amount: amount,
          return_url: returnUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({ error: data }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── ACCIÓN 2: Confirmar transacción ──
    if (action === 'confirm') {
      const { token } = params;

      const response = await fetch(`${WEBPAY_API_URL}/${token}`, {
        method: 'PUT',
        headers: {
          'Tbk-Api-Key-Id': COMMERCE_CODE,
          'Tbk-Api-Key-Secret': API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});