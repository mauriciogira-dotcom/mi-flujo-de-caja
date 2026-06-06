import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Cliente Supabase con service_role para escritura privilegiada (solo servidor)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_email || session.customer_details?.email;
    const customerId    = session.customer;
    const subscriptionId = session.subscription;

    if (!customerEmail) {
      console.error('No email found in checkout session');
      return new Response('No email', { status: 400 });
    }

    try {
      // 1. Buscar el user_id a partir del email
      const { data: users, error: usersError } = await supabaseAdmin
        .from('auth.users')
        .select('id')
        .eq('email', customerEmail)
        .limit(1);

      // Supabase no permite SELECT en auth.users directamente desde el SDK;
      // usar la función rpc o buscar en la tabla perfiles si ya existe
      // Alternativa: usar supabaseAdmin.auth.admin.listUsers() y filtrar
      const { data: { users: allUsers }, error: adminError } =
        await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

      if (adminError) throw adminError;

      const user = allUsers.find((u) => u.email === customerEmail);
      if (!user) {
        console.error('Usuario no encontrado para email:', customerEmail);
        return new Response('User not found', { status: 404 });
      }

      // 2. Upsert en tabla perfiles — marcar como premium
      const { error: upsertError } = await supabaseAdmin
        .from('perfiles')
        .upsert(
          {
            user_id:               user.id,
            es_premium:            true,
            stripe_customer_id:    customerId,
            stripe_subscription_id: subscriptionId,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) throw upsertError;

      console.log(`✅ Premium activado para ${customerEmail}`);
    } catch (err) {
      console.error('Error procesando webhook:', err.message);
      return new Response('Internal error', { status: 500 });
    }
  }

  return new Response('OK', { status: 200 });
}
