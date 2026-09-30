const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const Stripe = require('stripe');
const { db, run, get, all, initDb } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
});

const TEQUIS_CENTER = { lat: 20.5222, lng: -99.8938 };
let otpStore = {};

function generatePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Inicializar la Base de Datos SQLite
initDb().catch(err => console.error('Error inicializando SQLite:', err));

// --- 1. AUTENTICACIÓN Y REGISTRO COMPRADOR ---
app.post('/api/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length < 10) return res.status(400).json({ error: 'Ingresa un celular de 10 dígitos' });
  const otpCode = generatePin();
  otpStore[phone] = otpCode;
  console.log(`📱 OTP para ${phone}: ${otpCode}`);
  res.json({ message: 'Código SMS enviado', phone, demoOtp: otpCode });
});

app.post('/api/auth/register-customer', async (req, res) => {
  const { phone, name, address, code } = req.body;
  if (!phone || !name || !code) return res.status(400).json({ error: 'Faltan datos obligatorios' });
  if (!otpStore[phone] || otpStore[phone] !== code) {
    return res.status(400).json({ error: 'Código de verificación de celular incorrecto' });
  }

  delete otpStore[phone];
  try {
    const existing = await get(`SELECT * FROM customers WHERE phone = ?`, [phone]);
    let customer;
    if (!existing) {
      customer = { phone, name, address: address || 'Tequisquiapan Centro', verified: 1 };
      await run(`INSERT INTO customers (phone, name, address, verified) VALUES (?, ?, ?, ?)`, [phone, name, customer.address, 1]);
    } else {
      customer = { ...existing, name, address: address || existing.address };
      await run(`UPDATE customers SET name = ?, address = ? WHERE phone = ?`, [name, customer.address, phone]);
    }
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Error registrando cliente en la base de datos' });
  }
});

app.post('/api/auth/login-customer', async (req, res) => {
  const { phone } = req.body;
  try {
    const customer = await get(`SELECT * FROM customers WHERE phone = ?`, [phone]);
    if (!customer) return res.status(404).json({ error: 'Teléfono no registrado. Por favor regístrate primero.' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar cliente' });
  }
});

// --- 2. REGISTRO Y AUTENTICACIÓN REPARTIDOR ---
app.post('/api/riders/register', async (req, res) => {
  const { name, vehicleType, phone, ine, curp, address, acceptTerms } = req.body;
  if (!name || !vehicleType || !phone || !ine) {
    return res.status(400).json({ error: 'Nombre, teléfono, INE y vehículo son requeridos' });
  }
  if (!acceptTerms) return res.status(400).json({ error: 'Debes aceptar la Carta Responsiva' });

  try {
    const existingRider = await get(`SELECT * FROM riders WHERE UPPER(ine) = ? OR phone = ?`, [ine.toUpperCase(), phone]);
    if (existingRider) {
      return res.json(existingRider);
    }

    const newRider = {
      id: `rider-${Date.now()}`,
      name,
      vehicleType: vehicleType || 'Bicicleta Normal',
      phone,
      ine: ine.toUpperCase(),
      curp: (curp || 'PENDIENTE').toUpperCase(),
      addressProof: address || 'Tequisquiapan',
      verifiedStatus: 'VERIFICADO',
      status: 'ONLINE',
      lat: TEQUIS_CENTER.lat,
      lng: TEQUIS_CENTER.lng
    };

    await run(
      `INSERT INTO riders (id, name, vehicleType, phone, ine, curp, addressProof, verifiedStatus, status, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newRider.id, newRider.name, newRider.vehicleType, newRider.phone, newRider.ine, newRider.curp, newRider.addressProof, newRider.verifiedStatus, newRider.status, newRider.lat, newRider.lng]
    );

    const allRiders = await all(`SELECT * FROM riders`);
    io.emit('riders_updated', allRiders);
    res.status(201).json(newRider);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar repartidor' });
  }
});

app.post('/api/auth/login-rider', async (req, res) => {
  const { ine, phone } = req.body;
  try {
    const rider = await get(`SELECT * FROM riders WHERE UPPER(ine) = ? OR phone = ?`, [(ine || '').toUpperCase(), phone]);
    if (!rider) return res.status(404).json({ error: 'Repartidor no encontrado con esa clave INE o teléfono.' });
    res.json(rider);
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión de repartidor' });
  }
});

app.get('/api/riders', async (req, res) => {
  try {
    const riders = await all(`SELECT * FROM riders`);
    const formatted = riders.map(r => ({
      ...r,
      currentLocation: { lat: r.lat, lng: r.lng }
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo repartidores' });
  }
});

// --- 3. REGISTRO Y GESTIÓN COMERCIO / MENÚ ---
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await all(`SELECT * FROM stores`);
    const products = await all(`SELECT * FROM products`);

    const result = stores.map(store => ({
      ...store,
      products: products.filter(p => p.storeId === store.id)
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener comercios' });
  }
});

app.post('/api/stores/register', async (req, res) => {
  const { name, category, address, ownerName, ownerIne, rfc, clabe } = req.body;
  if (!name || !ownerName || !ownerIne || !clabe) {
    return res.status(400).json({ error: 'Nombre, titular, INE y CLABE son requeridos' });
  }
  if (clabe.length !== 18) return res.status(400).json({ error: 'La CLABE debe tener 18 dígitos' });

  try {
    const newStore = {
      id: `store-${Date.now()}`,
      name,
      category: category || 'Cocina Económica & Fondas',
      address: address || 'Tequisquiapan Centro',
      ownerName,
      ownerIne: ownerIne.toUpperCase(),
      rfc: (rfc || 'PENDIENTE').toUpperCase(),
      clabe,
      verifiedStatus: 'VERIFICADO',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
      deliveryTime: '20-30 min',
      minOrder: 50,
      rating: 5.0
    };

    await run(
      `INSERT INTO stores (id, name, category, address, ownerName, ownerIne, rfc, clabe, verifiedStatus, image, deliveryTime, minOrder, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newStore.id, newStore.name, newStore.category, newStore.address, newStore.ownerName, newStore.ownerIne, newStore.rfc, newStore.clabe, newStore.verifiedStatus, newStore.image, newStore.deliveryTime, newStore.minOrder, newStore.rating]
    );

    const defaultProduct = {
      id: `p-${Date.now()}-1`,
      storeId: newStore.id,
      name: 'Platillo Principal de la Casa',
      price: 75,
      description: 'Especialidad hecha a mano'
    };

    await run(
      `INSERT INTO products (id, storeId, name, price, description) VALUES (?, ?, ?, ?, ?)`,
      [defaultProduct.id, defaultProduct.storeId, defaultProduct.name, defaultProduct.price, defaultProduct.description]
    );

    newStore.products = [defaultProduct];

    const allStores = await all(`SELECT * FROM stores`);
    const allProducts = await all(`SELECT * FROM products`);
    const formattedStores = allStores.map(s => ({
      ...s,
      products: allProducts.filter(p => p.storeId === s.id)
    }));

    io.emit('stores_updated', formattedStores);
    res.status(201).json(newStore);
  } catch (err) {
    res.status(500).json({ error: 'Error registrando comercio' });
  }
});

// Agregar producto al menú de la fonda
app.post('/api/stores/:id/products', async (req, res) => {
  const { id } = req.params;
  const { name, price, description, image } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Nombre y precio son requeridos' });

  try {
    const product = {
      id: `p-${Date.now()}`,
      storeId: id,
      name,
      price: parseFloat(price),
      description: description || '',
      image: image || null
    };

    await run(`INSERT INTO products (id, storeId, name, price, description, image) VALUES (?, ?, ?, ?, ?, ?)`, [product.id, product.storeId, product.name, product.price, product.description, product.image]);

    const allStores = await all(`SELECT * FROM stores`);
    const allProducts = await all(`SELECT * FROM products`);
    const formattedStores = allStores.map(s => ({ ...s, products: allProducts.filter(p => p.storeId === s.id) }));
    io.emit('stores_updated', formattedStores);

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error agregando producto' });
  }
});

// Eliminar producto del menú
app.delete('/api/stores/:storeId/products/:productId', async (req, res) => {
  const { storeId, productId } = req.params;
  try {
    await run(`DELETE FROM products WHERE id = ? AND storeId = ?`, [productId, storeId]);

    const allStores = await all(`SELECT * FROM stores`);
    const allProducts = await all(`SELECT * FROM products`);
    const formattedStores = allStores.map(s => ({ ...s, products: allProducts.filter(p => p.storeId === s.id) }));
    io.emit('stores_updated', formattedStores);

    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

// --- 4. CREACIÓN Y GESTIÓN DE PEDIDOS ---
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await all(`SELECT * FROM orders ORDER BY createdAt DESC`);
    const formatted = orders.map(o => ({
      ...o,
      items: JSON.parse(o.itemsJson || '[]'),
      assignedRider: o.assignedRiderJson ? JSON.parse(o.assignedRiderJson) : null
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Error consultando pedidos' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { storeId, items, customerName, customerAddress, customerPhone, paymentMethod } = req.body;
  if (!customerPhone || !customerName) {
    return res.status(401).json({ error: 'Acceso Denegado. Debes estar registrado e iniciar sesión para pedir.' });
  }

  try {
    const store = await get(`SELECT * FROM stores WHERE id = ?`, [storeId]);
    if (!store) return res.status(404).json({ error: 'Comercio no encontrado' });

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const pin = generatePin();

    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      storeId,
      storeName: store.name,
      itemsJson: JSON.stringify(items),
      total: subtotal + 25,
      deliveryFee: 25,
      customerName,
      customerAddress,
      customerPhone,
      paymentMethod: paymentMethod || 'Efectivo al entregar',
      status: 'PENDING',
      assignedRiderJson: null,
      deliveryPin: pin,
      createdAt: new Date().toISOString()
    };

    await run(
      `INSERT INTO orders (id, storeId, storeName, itemsJson, total, deliveryFee, customerName, customerAddress, customerPhone, paymentMethod, status, assignedRiderJson, deliveryPin, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newOrder.id, newOrder.storeId, newOrder.storeName, newOrder.itemsJson, newOrder.total, newOrder.deliveryFee, newOrder.customerName, newOrder.customerAddress, newOrder.customerPhone, newOrder.paymentMethod, newOrder.status, newOrder.assignedRiderJson, newOrder.deliveryPin, newOrder.createdAt]
    );

    const responseOrder = {
      ...newOrder,
      items,
      assignedRider: null
    };

    io.emit('new_order', responseOrder);
    res.status(201).json(responseOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error guardando pedido' });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, riderId, inputPin } = req.body;

  try {
    const orderRow = await get(`SELECT * FROM orders WHERE id = ?`, [id]);
    if (!orderRow) return res.status(404).json({ error: 'Pedido no encontrado' });

    let order = {
      ...orderRow,
      items: JSON.parse(orderRow.itemsJson || '[]'),
      assignedRider: orderRow.assignedRiderJson ? JSON.parse(orderRow.assignedRiderJson) : null
    };

    if (status === 'DELIVERED') {
      if (!inputPin || inputPin !== order.deliveryPin) {
        return res.status(400).json({ error: '❌ PIN de Entrega Incorrecto.' });
      }
    }

    let newStatus = status || order.status;
    let newAssignedRiderJson = orderRow.assignedRiderJson;

    if (riderId) {
      const rider = await get(`SELECT * FROM riders WHERE id = ?`, [riderId]);
      if (!rider || rider.verifiedStatus !== 'VERIFICADO') {
        return res.status(403).json({ error: 'Solo repartidores registrados y verificados pueden tomar entregas.' });
      }
      const riderObj = { id: rider.id, name: rider.name, vehicleType: rider.vehicleType };
      newAssignedRiderJson = JSON.stringify(riderObj);
      order.assignedRider = riderObj;
    }

    order.status = newStatus;
    await run(`UPDATE orders SET status = ?, assignedRiderJson = ? WHERE id = ?`, [newStatus, newAssignedRiderJson, id]);

    io.emit('order_updated', order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando pedido' });
  }
});

// --- 5. PASARELAS DE PAGO (MERCADOPAGO & STRIPE) ---
app.post('/api/payments/mercadopago/create-preference', async (req, res) => {
  const { items, title, total } = req.body;
  const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-DEMO-TOKEN-TEQUIS';

  try {
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const preference = new Preference(client);

    const preferenceData = {
      items: items ? items.map(i => ({
        title: i.name,
        unit_price: Number(i.price),
        quantity: Number(i.quantity),
        currency_id: 'MXN'
      })) : [{ title: title || 'Pedido TequisDelivery', unit_price: Number(total), quantity: 1, currency_id: 'MXN' }],
      back_urls: {
        success: 'http://localhost:3000/success',
        failure: 'http://localhost:3000/failure',
        pending: 'http://localhost:3000/pending'
      },
      auto_return: 'approved'
    };

    const response = await preference.create({ body: preferenceData });
    res.json({ id: response.id, init_point: response.init_point, sandbox_init_point: response.sandbox_init_point });
  } catch (err) {
    console.error('MercadoPago Error (Demo Mode Fallback):', err.message);
    res.json({
      id: `pref-demo-${Date.now()}`,
      init_point: 'https://www.mercadopago.com.mx',
      sandbox_init_point: 'https://sandbox.mercadopago.com.mx'
    });
  }
});

app.post('/api/payments/stripe/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_demo';

  try {
    const stripe = new Stripe(stripeSecretKey);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round((amount || 100) * 100), // en centavos MXN
      currency: 'mxn',
      payment_method_types: ['card']
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe Error (Demo Mode Fallback):', err.message);
    res.json({ clientSecret: `pi_demo_${Date.now()}_secret_demo` });
  }
});

// --- 7. CALIFICACIONES ---
app.post('/api/ratings', async (req, res) => {
  const { orderId, storeId, riderId, ratingStore, ratingRider, comment } = req.body;
  if (!orderId || !storeId || !ratingStore) {
    return res.status(400).json({ error: 'orderId, storeId y ratingStore son requeridos' });
  }

  try {
    const existing = await get(`SELECT id FROM ratings WHERE orderId = ?`, [orderId]);
    if (existing) return res.status(409).json({ error: 'Ya calificaste este pedido' });

    const id = `rating-${Date.now()}`;
    await run(
      `INSERT INTO ratings (id, orderId, storeId, riderId, ratingStore, ratingRider, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orderId, storeId, riderId || null, ratingStore, ratingRider || null, comment || '', new Date().toISOString()]
    );

    // Actualizar rating promedio del comercio
    const avgRow = await get(`SELECT AVG(ratingStore) as avg FROM ratings WHERE storeId = ?`, [storeId]);
    if (avgRow && avgRow.avg) {
      await run(`UPDATE stores SET rating = ? WHERE id = ?`, [Math.round(avgRow.avg * 10) / 10, storeId]);
    }

    res.status(201).json({ message: '¡Gracias por tu calificación!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error guardando calificación' });
  }
});

app.get('/api/ratings/order/:orderId', async (req, res) => {
  try {
    const rating = await get(`SELECT * FROM ratings WHERE orderId = ?`, [req.params.orderId]);
    res.json(rating || null);
  } catch (err) {
    res.status(500).json({ error: 'Error consultando calificación' });
  }
});

// --- 8. MÉTRICAS ADMIN ---
app.get('/api/admin/metrics', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const ordersToday = await all(`SELECT * FROM orders WHERE createdAt LIKE ?`, [`${today}%`]);
    const totalOrders = await get(`SELECT COUNT(*) as count FROM orders`);
    const totalRevenue = await get(`SELECT SUM(total) as sum FROM orders WHERE status = 'DELIVERED'`);
    const totalRiders = await get(`SELECT COUNT(*) as count FROM riders`);
    const totalStores = await get(`SELECT COUNT(*) as count FROM stores`);
    const recentOrders = await all(`SELECT * FROM orders ORDER BY createdAt DESC LIMIT 20`);
    const allRiders = await all(`SELECT * FROM riders`);
    const allStores = await all(`SELECT * FROM stores`);

    res.json({
      ordersToday: ordersToday.length,
      revenueToday: ordersToday.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + o.total, 0),
      totalOrders: totalOrders?.count || 0,
      totalRevenue: totalRevenue?.sum || 0,
      totalRiders: totalRiders?.count || 0,
      totalStores: totalStores?.count || 0,
      recentOrders: recentOrders.map(o => ({
        ...o,
        items: JSON.parse(o.itemsJson || '[]'),
        assignedRider: o.assignedRiderJson ? JSON.parse(o.assignedRiderJson) : null
      })),
      riders: allRiders,
      stores: allStores,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

// --- 6. SOCKET.IO UBICACIÓN GPS Y EVENTOS ---
io.on('connection', (socket) => {
  socket.on('update_location', async data => {
    try {
      await run(`UPDATE riders SET lat = ?, lng = ? WHERE id = ?`, [data.lat, data.lng, data.riderId]);
      io.emit('rider_location_changed', { riderId: data.riderId, location: { lat: data.lat, lng: data.lng } });
    } catch (err) {
      console.error('Error actualizando GPS:', err);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🔒 Backend TequisDelivery con SQLite Escuchando en http://localhost:${PORT}`);
});
