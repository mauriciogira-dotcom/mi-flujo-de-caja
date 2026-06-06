import { createHash } from 'crypto';

/**
 * POST /api/wompi/checkout
 * Genera la URL del checkout hospedado de Wompi.
 * La firma de integridad se calcula en el servidor para no exponer WOMPI_INTEGRITY_SECRET.
 */
export async function POST(req) {
  try {
    const { userEmail } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'Email requerido' }, { status: 400 });
    }

    const publicKey       = process.env.WOMPI_PUBLIC_KEY;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    if (!publicKey || !integritySecret) {
      return Response.json({ error: 'Wompi no configurado' }, { status: 500 });
    }

    const amountInCents = 2900000;          // COP $29.000
    const currency      = 'COP';
    // Referencia única: prefijo + timestamp + email sanitizado (máx 50 chars)
    const reference = `mfc_${Date.now()}_${userEmail.replace(/[^a-z0-9]/gi, '').substring(0, 20)}`;

    const origin      = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectUrl = `${origin}/?upgraded=true`;

    // Firma de integridad: SHA-256(reference + amountInCents + currency + integritySecret)
    const signature = createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${integritySecret}`)
      .digest('hex');

    const params = new URLSearchParams({
      'public-key':          publicKey,
      currency,
      'amount-in-cents':     String(amountInCents),
      reference,
      'signature:integrity': signature,
      'redirect-url':        redirectUrl,
      'customer-data:email': userEmail,
    });

    const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;
    return Response.json({ url: checkoutUrl });

  } catch (error) {
    console.error('Wompi checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
