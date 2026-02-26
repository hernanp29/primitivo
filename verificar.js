// api/verificar.js
// Esta URL es la que va DENTRO del QR.
// Cuando AppSheet (o cualquier escáner) la abre, muestra los datos del pedido
// y permite marcarlo como RETIRADO.
//
// Variables de entorno necesarias:
//   GOOGLE_SA_KEY  → JSON de la Service Account
//   SHEET_ID       → ID de la Google Sheet

export default async function handler(req, res) {
  const { codigo } = req.query;
  if (!codigo) {
    return res.status(400).send(paginaError('Código de retiro no especificado.'));
  }

  try {
    const token   = await getGoogleToken();
    const sheetId = process.env.SHEET_ID;

    // Leer toda la hoja
    const readRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Pedidos!A:J`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await readRes.json();
    const rows = data.values || [];

    // Buscar la fila con ese código (columna A, índice 0), saltando header (fila 0,1,2)
    const rowIndex = rows.findIndex((r, i) => i >= 3 && r[0] === codigo);

    if (rowIndex === -1) {
      return res.status(404).send(paginaError(`No se encontró el pedido con código <strong>${codigo}</strong>.`));
    }

    const row = rows[rowIndex];
    const pedido = {
      codigo:      row[0] || '',
      fecha:       row[1] || '',
      estado:      row[2] || 'PENDIENTE',
      items:       row[3] || '',
      total:       row[4] || '',
      paymentId:   row[5] || '',
      fechaRetiro: row[7] || '',
      notas:       row[8] || '',
    };

    // ── Acción: marcar como retirado ────────────────────────
    if (req.method === 'POST' && req.query.accion === 'retirar') {
      if (pedido.estado === 'RETIRADO') {
        return res.status(200).send(paginaError(`Este pedido ya fue retirado el ${pedido.fechaRetiro}.`, 'advertencia'));
      }

      // Actualizar columna C (Estado) y H (Fecha_Retiro)
      // rowIndex en la hoja real = rowIndex + 1 (Sheets es 1-based)
      const sheetRow = rowIndex + 1;
      const ahora    = new Date().toLocaleString('es-AR');

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Pedidos!C${sheetRow}:H${sheetRow}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [['RETIRADO', '', '', '', '', ahora]] })
        }
      );

      pedido.estado      = 'RETIRADO';
      pedido.fechaRetiro = ahora;
      return res.status(200).send(paginaPedido(pedido, true));
    }

    return res.status(200).send(paginaPedido(pedido, false));

  } catch (err) {
    console.error('verificar error:', err);
    return res.status(500).send(paginaError('Error interno: ' + err.message));
  }
}

// ── HTML de la página de verificación ───────────────────────
function paginaPedido(p, recienRetirado) {
  const yaRetirado    = p.estado === 'RETIRADO';
  const estadoColor   = yaRetirado  ? '#27ae60' : '#f1c40f';
  const estadoBg      = yaRetirado  ? '#0d2b1a' : '#1a1010';
  const botonHtml     = (!yaRetirado) ? `
    <form method="POST" action="/api/verificar?codigo=${encodeURIComponent(p.codigo)}&accion=retirar" style="margin-top:1.5rem;">
      <button type="submit" style="
        width:100%; padding:1rem 2rem;
        background:#c0392b; color:#f0ebe0;
        border:2px solid #e74c3c; cursor:pointer;
        font-family:monospace; font-size:1rem; font-weight:bold;
        letter-spacing:2px; transition:background .2s;
      " onclick="return confirm('¿Confirmás que el cliente retiró el pedido?')">
        ✅ MARCAR COMO RETIRADO
      </button>
    </form>` : '';

  const alertaHtml = recienRetirado ? `
    <div style="background:#0d2b1a;border:2px solid #27ae60;border-left:5px solid #27ae60;padding:1rem;margin-bottom:1.5rem;text-align:center;">
      <p style="color:#2ecc71;font-weight:bold;font-size:1.1rem;margin:0;">✅ ¡Pedido marcado como RETIRADO exitosamente!</p>
    </div>` : '';

  const itemsHtml = p.items.split('|').map(i => `
    <li style="padding:.3rem 0; border-bottom:1px solid #2c2c2c; color:#d4c9b0;">${i.trim()}</li>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Verificar Pedido — PRIMITIVO</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:#0d0d0d; color:#d4c9b0; font-family:monospace; min-height:100vh; display:flex; align-items:flex-start; justify-content:center; padding:2rem 1rem; }
    .card { background:#161616; border:1px solid rgba(192,57,43,.4); max-width:480px; width:100%; box-shadow:0 0 40px rgba(192,57,43,.15); }
    .card-top { height:4px; background:linear-gradient(to right,#c0392b,#e74c3c); }
    .card-body { padding:2rem; }
    h1 { font-family:sans-serif; font-size:1.4rem; color:#f0ebe0; margin-bottom:1.5rem; text-align:center; }
    .badge { display:inline-block; padding:.3rem 1rem; font-weight:bold; letter-spacing:3px; font-size:.85rem; border-radius:2px; }
    label { font-size:.7rem; letter-spacing:3px; color:#555; display:block; margin-bottom:.2rem; margin-top:1rem; }
    .val { font-size:.95rem; color:#f0ebe0; }
    ul { list-style:none; margin-top:.3rem; }
    .total { font-size:1.3rem; color:#f0ebe0; font-weight:bold; }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-top"></div>
    <div class="card-body">
      <h1>🏪 PRIMITIVO<br><small style="font-size:.7em;color:#555;letter-spacing:4px;">VERIFICACIÓN DE PEDIDO</small></h1>
      ${alertaHtml}
      <div style="text-align:center; margin-bottom:1.5rem;">
        <span class="badge" style="background:${estadoBg}; color:${estadoColor}; border:1px solid ${estadoColor};">${p.estado}</span>
      </div>
      <label>CÓDIGO DE RETIRO</label>
      <p class="val" style="color:#f1c40f; font-size:1.1rem; font-weight:bold;">${p.codigo}</p>
      <label>FECHA DE COMPRA</label>
      <p class="val">${p.fecha}</p>
      <label>PRODUCTOS</label>
      <ul>${itemsHtml}</ul>
      <label>TOTAL</label>
      <p class="total">$${Number(p.total).toLocaleString('es-AR')} ARS</p>
      ${p.paymentId ? `<label>ID MERCADOPAGO</label><p class="val" style="font-size:.8rem;color:#555;">${p.paymentId}</p>` : ''}
      ${yaRetirado && p.fechaRetiro ? `<label>FECHA DE RETIRO</label><p class="val" style="color:#27ae60;">${p.fechaRetiro}</p>` : ''}
      ${botonHtml}
      <p style="text-align:center; margin-top:1.5rem; font-size:.65rem; color:#333; letter-spacing:2px;">PRIMITIVO — TATTOO & PIERCING</p>
    </div>
  </div>
</body>
</html>`;
}

function paginaError(msg, tipo = 'error') {
  const color = tipo === 'advertencia' ? '#f1c40f' : '#e74c3c';
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Error — PRIMITIVO</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#0d0d0d;color:#d4c9b0;font-family:monospace;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;}</style>
</head>
<body>
  <div style="background:#161616;border:1px solid ${color};max-width:420px;width:100%;padding:2rem;text-align:center;">
    <div style="font-size:2.5rem;margin-bottom:1rem;">${tipo === 'advertencia' ? '⚠️' : '❌'}</div>
    <p style="color:${color};font-size:1rem;line-height:1.6;">${msg}</p>
    <p style="margin-top:1rem;font-size:.7rem;color:#555;letter-spacing:2px;">PRIMITIVO — TATTOO & PIERCING</p>
  </div>
</body>
</html>`;
}

// ── Helper: Google Auth (igual que en guardar-pedido.js) ─────
async function getGoogleToken() {
  const sa  = JSON.parse(process.env.GOOGLE_SA_KEY);
  const now = Math.floor(Date.now() / 1000);
  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64({ alg:'RS256', typ:'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  })}`;
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const jwt = `${unsigned}.${sign.sign(sa.private_key, 'base64url')}`;
  const r   = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(JSON.stringify(d));
  return d.access_token;
}
