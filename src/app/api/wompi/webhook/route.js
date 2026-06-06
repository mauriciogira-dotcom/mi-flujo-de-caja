import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/wompi/webhook
 * Recibe eventos de Wompi y activa es_premium cuando el pago es APPROVED.
 *
 * Verificación de firma (signature.checksum):
 *   SHA-256( transactionId + status + amountInCents + currency + eventsSecret )
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const transaction  = body?.data?.transaction;
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;

  // ── Verificar integridad del evento ──────────────────────────────────────
  if (eventsSecret && body?.signature?.checksum) {
    const expected = createHash('sha256')
      .update(
        `${transaction?.id}` +
        `${transaction?.status}` +
        `${transaction?.amount_in_cents}` +
        `${transaction?.currency}` +
        `${eventsSecret}`
      )
      .digest('hex');

    if (expected !== body.signature.checksum) {
      console.error('Wompi webhook: firma inválida');
      return new Response('Invalid signature', { status: 401 });
    }
  }

  // ── Solo procesar transacciones APPROVED ─────────────────────────────────
  if (body?.event === 'transaction.updated' && transaction?.status === 'APPROVED') {
    const customerEmail = transaction?.customer_email;

    if (!customerEmail) {
      console.error('Wompi webhook: no hay email en la transacción');
      return new Response('No email', { status: 400 });
    }

    try {
      // Buscar user_id a partir del email
      const { data: { users: allUsers }, error: adminError } =
        await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

      if (adminError) throw adminError;

      const user = allUsers.find((u) => u.email === customerEmail);
      if (!user) {
        console.error('Wompi webhook: usuario no encontrado para', customerEmail);
        return new Response('User not found', { status: 404 });
      }

      // Marcar como premium en tabla perfiles
      const { error: upsertError } = await supabaseAdmin
        .from('perfiles')
        .upsert(
          {
            user_id:            user.id,
            es_premium:         true,
            stripe_customer_id: transaction.id, // reusamos el campo para el ID de Wompi
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) throw upsertError;

      console.log(`✅ Premium activado para ${customerEmail} (transacción Wompi: ${transaction.id})`);
    } catch (err) {
      console.error('Error procesando webhook Wompi:', err.message);
      return new Response('Internal error', { status: 500 });
    }
  }

  return new Response('OK', { status: 200 });
}
