import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/wompi/verify
 * Verifica el estado de una transacción directamente con la API de Wompi
 * y activa es_premium en Supabase si fue APPROVED.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { transactionId, userId } = await req.json();

    if (!transactionId || !userId) {
      return Response.json({ error: 'transactionId y userId son requeridos' }, { status: 400 });
    }

    // Consultar la API de Wompi (sandbox vs producción según la llave pública)
    const isSandbox = process.env.WOMPI_PUBLIC_KEY?.startsWith('pub_test_');
    const apiBase  = isSandbox
      ? 'https://sandbox.wompi.co/v1'
      : 'https://production.wompi.co/v1';

    const wompiRes = await fetch(`${apiBase}/transactions/${transactionId}`);

    if (!wompiRes.ok) {
      return Response.json({ approved: false, error: 'Wompi API error' }, { status: 200 });
    }

    const wompiData = await wompiRes.json();
    const transaction = wompiData?.data;

    if (!transaction || transaction.status !== 'APPROVED') {
      return Response.json({ approved: false, status: transaction?.status ?? 'UNKNOWN' });
    }

    // Pago aprobado → marcar premium en Supabase
    const { error: upsertError } = await supabaseAdmin
      .from('perfiles')
      .upsert(
        {
          user_id:            userId,
          es_premium:         true,
          stripe_customer_id: transaction.id, // reutilizamos el campo para Wompi
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) throw upsertError;

    console.log(`✅ Premium activado para userId=${userId} (transacción Wompi: ${transaction.id})`);
    return Response.json({ approved: true });

  } catch (err) {
    console.error('Error en /api/wompi/verify:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
