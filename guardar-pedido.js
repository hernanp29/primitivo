// api/guardar-pedido.js
// Guarda el pedido en Google Sheets cuando MercadoPago confirma el pago.
// Variables de entorno necesarias (agregar en Vercel → Settings → Env Variables):
//   GOOGLE_SA_KEY   → JSON completo de la Service Account (como string)
//   SHEET_ID        → ID de la Google Sheet (el string largo en la URL)
//   SITE_URL        → URL pública del sitio (ej: https://primitivo-ten.vercel.app)

export default async function handler(req, res) {
  // CORS para que el frontend pueda llamarla
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { codigo, fecha, items, total, paymentId, clienteEmail } = req.body;

  if (!codigo || !items || !total) {
    return res.status(400).json({ error: 'Faltan datos del pedido' });
  }

  const siteUrl   = process.env.SITE_URL || 'https://primitivo-ten.vercel.app';
  const urlVerif  = `${siteUrl}/api/verificar?codigo=${encodeURIComponent(codigo)}`;
  const fechaHora = fecha ? new Date(fecha).toLocaleString('es-AR') : new Date().toLocaleString('es-AR');
  const itemsStr  = items.map(i => `${i.cantidad}x ${i.nombre}`).join(' | ');

  try {
    // ── Obtener token de Google ──────────────────────────────
    const token = await getGoogleToken();

    // ── Append en Google Sheets ──────────────────────────────
    const sheetId = process.env.SHEET_ID;
    const range   = 'Pedidos!A:J';
    const valores = [[
      codigo,
      fechaHora,
      'PENDIENTE',
      itemsStr,
      total,
      paymentId || '',
      urlVerif,
      '',               // Fecha_Retiro (vacío hasta que retiren)
      '',               // Notas
      clienteEmail || ''
    ]];

    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: valores })
      }
    );

    if (!sheetRes.ok) {
      const err = await sheetRes.json();
      console.error('Sheets API error:', err);
      return res.status(500).json({ error: 'Error al guardar en Sheets', detalle: err });
    }

    return res.status(200).json({ ok: true, urlVerificacion: urlVerif });

  } catch (err) {
    console.error('guardar-pedido error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ── Genera un JWT y lo intercambia por un access token de Google ──
async function getGoogleToken() {
  const saKeyRaw = process.env.GOOGLE_SA_KEY;
  if (!saKeyRaw) throw new Error('GOOGLE_SA_KEY no está configurado');

  const sa = JSON.parse(saKeyRaw);

  const now    = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim  = {
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600
  };

  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(claim)}`;

  // Firmar con la clave privada RSA de la Service Account
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  // Intercambiar JWT por access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('No se pudo obtener token de Google: ' + JSON.stringify(tokenData));
  return tokenData.access_token;
}
