import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendMessage(
  baseUrl: string,
  instance: string,
  apiKey: string,
  phone: string,
  text: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = `${baseUrl}/message/sendText/${instance}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: JSON.stringify({ number: phone, text }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // message         — mensagem para o lojista (obrigatória, a menos que skipOwner=true)
    // customerPhone   — número do cliente, ex: "5581999990000" (opcional)
    // customerMessage — mensagem de confirmação para o cliente (opcional)
    // skipOwner       — se true, não envia para o lojista (usado em notificações de status)
    const { message, customerPhone, customerMessage, skipOwner } = await req.json();

    if (!skipOwner && !message) {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');
    const EVOLUTION_PHONE = Deno.env.get('EVOLUTION_PHONE');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE || !EVOLUTION_PHONE) {
      return new Response(JSON.stringify({ error: 'Missing Evolution API configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, '');

    // 1) Enviar para o lojista (apenas se skipOwner não for true)
    let ownerResult = null;
    if (!skipOwner && message) {
      ownerResult = await sendMessage(baseUrl, EVOLUTION_INSTANCE, EVOLUTION_API_KEY, EVOLUTION_PHONE, message);
      if (!ownerResult.ok) {
        console.error('Evolution API error (owner):', ownerResult.status, ownerResult.body);
        return new Response(JSON.stringify({ error: 'Evolution API error', details: ownerResult.body }), {
          status: ownerResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2) Enviar para o cliente (se número e mensagem fornecidos)
    let customerResult = null;
    if (customerPhone && customerMessage) {
      // Normaliza: remove tudo que não for dígito e garante código do país 55
      const digits = customerPhone.replace(/\D/g, '');
      const normalized = digits.startsWith('55') ? digits : `55${digits}`;

      try {
        customerResult = await sendMessage(baseUrl, EVOLUTION_INSTANCE, EVOLUTION_API_KEY, normalized, customerMessage);
        if (!customerResult.ok) {
          console.warn('Evolution API error (customer):', customerResult.status, customerResult.body);
        }
      } catch (e) {
        console.warn('Failed to send customer message:', e);
      }
    }

    return new Response(JSON.stringify({ success: true, customerNotified: customerResult?.ok ?? false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
