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
      success: "https://https://primitivo-ten.vercel.app//?pago=ok",
      failure: "https://https://primitivo-ten.vercel.app//?pago=error",
      pending: "https://https://primitivo-ten.vercel.app//?pago=pendiente"
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

  // 1. Escuchar clics en todo el documento
document.addEventListener('click', (event) => {
    
    // 2. Verificar si lo que se clickeó es un botón de agregar
    if (event.target.classList.contains('btn-agregar')) {
        // Obtenemos el ID que guardamos en el atributo 'data-id'
        const id = event.target.getAttribute('data-id');
        agregarAlCarrito(id);
    }

    // 3. Verificar si es el botón para abrir/cerrar el carrito
    // (Asegúrate de ponerle id="btn-carrito" a ese botón en tu HTML)
    if (event.target.id === 'btn-carrito' || event.target.closest('#btn-carrito')) {
        toggleCarrito();
    }
});
}