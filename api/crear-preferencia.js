export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { items } = req.body;

  const preferencia = {
    items: items.map(item => ({
      title: item.nombre,
      unit_price: parseFloat(item.precio),
      quantity: parseInt(item.cantidad),
      currency_id: "ARS"
    })),
    back_urls: {
      success: "https://primitivo-ten.vercel.app/?pago=ok",
      failure: "https://primitivo-ten.vercel.app/?pago=error",
      pending: "https://primitivo-ten.vercel.app/?pago=pendiente"
    },
    auto_return: "approved"
  };

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`
    },
    body: JSON.stringify(preferencia)
  });

  const data = await response.json();
  if (data.init_point) {
    res.status(200).json({ init_point: data.init_point });
  } else {
    res.status(500).json({ error: data });
  }
}
