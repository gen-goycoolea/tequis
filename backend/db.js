const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'tequis_delivery.db');
const db = new sqlite3.Database(dbPath);

// Promisified database helpers
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function initDb() {
  try {
    // 1. Tabla Clientes
    await run(`
      CREATE TABLE IF NOT EXISTS customers (
        phone TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        verified INTEGER DEFAULT 1
      )
    `);

    // 2. Tabla Comercios / Fondas
    await run(`
      CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        address TEXT NOT NULL,
        ownerName TEXT NOT NULL,
        ownerIne TEXT NOT NULL,
        rfc TEXT,
        clabe TEXT NOT NULL,
        verifiedStatus TEXT DEFAULT 'VERIFICADO',
        image TEXT,
        deliveryTime TEXT DEFAULT '20-30 min',
        minOrder REAL DEFAULT 50,
        rating REAL DEFAULT 4.8
      )
    `);

    // 3. Tabla Productos por Comercio
    await run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        storeId TEXT NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        image TEXT,
        FOREIGN KEY (storeId) REFERENCES stores (id) ON DELETE CASCADE
      )
    `);

    // Agregar columna image a products si no existe (migración segura)
    await run(`ALTER TABLE products ADD COLUMN image TEXT`).catch(() => {});

    // 6. Tabla Calificaciones
    await run(`
      CREATE TABLE IF NOT EXISTS ratings (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        storeId TEXT NOT NULL,
        riderId TEXT,
        ratingStore INTEGER NOT NULL DEFAULT 5,
        ratingRider INTEGER DEFAULT 5,
        comment TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (orderId) REFERENCES orders (id)
      )
    `);

    // 4. Tabla Repartidores Bici
    await run(`
      CREATE TABLE IF NOT EXISTS riders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        vehicleType TEXT NOT NULL,
        phone TEXT NOT NULL,
        ine TEXT NOT NULL,
        curp TEXT,
        addressProof TEXT,
        verifiedStatus TEXT DEFAULT 'VERIFICADO',
        status TEXT DEFAULT 'ONLINE',
        lat REAL DEFAULT 20.5222,
        lng REAL DEFAULT -99.8938
      )
    `);

    // 5. Tabla Pedidos
    await run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        storeId TEXT NOT NULL,
        storeName TEXT NOT NULL,
        itemsJson TEXT NOT NULL,
        total REAL NOT NULL,
        deliveryFee REAL DEFAULT 25,
        customerName TEXT NOT NULL,
        customerAddress TEXT NOT NULL,
        customerPhone TEXT NOT NULL,
        paymentMethod TEXT DEFAULT 'Efectivo al entregar',
        status TEXT DEFAULT 'PENDING',
        assignedRiderJson TEXT,
        deliveryPin TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // Seed Data Inicial
    const storeCount = await get(`SELECT COUNT(*) as count FROM stores`);
    if (storeCount && storeCount.count === 0) {
      console.log('🌱 Poblando datos iniciales en la base de datos SQLite...');

      // Cliente Demo
      await run(
        `INSERT INTO customers (phone, name, address, verified) VALUES (?, ?, ?, ?)`,
        ['4411234567', 'María Elena Gómez', 'Calle Juárez #12, Centro, Tequisquiapan', 1]
      );

      // Tiendas Demo
      await run(
        `INSERT INTO stores (id, name, category, address, ownerName, ownerIne, rfc, clabe, verifiedStatus, image, deliveryTime, minOrder, rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'store-1',
          'Fonda Doña María 🍲',
          'Cocina Económica & Fondas',
          'Calle Morelos #14, Centro, Tequisquiapan',
          'María Elena Gómez',
          'GOMM75041215M00',
          'GOMM750412XXX',
          '012680001234567890',
          'VERIFICADO',
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
          '20-30 min',
          50,
          4.8
        ]
      );

      await run(
        `INSERT INTO products (id, storeId, name, price, description) VALUES (?, ?, ?, ?, ?)`,
        ['p1', 'store-1', 'Comida Corrida del Día (Sopa + Platillo + Agua)', 85, 'Sopa de fideos, guisado y agua']
      );
      await run(
        `INSERT INTO products (id, storeId, name, price, description) VALUES (?, ?, ?, ?, ?)`,
        ['p2', 'store-1', 'Enchiladas Queretanas (4 piezas)', 95, 'Con papas, zanahorias, queso fresco y crema']
      );
      await run(
        `INSERT INTO products (id, storeId, name, price, description) VALUES (?, ?, ?, ?, ?)`,
        ['p3', 'store-1', 'Gorditas de Maíz Quebrado', 25, 'Hechas a mano en comal']
      );

      await run(
        `INSERT INTO stores (id, name, category, address, ownerName, ownerIne, rfc, clabe, verifiedStatus, image, deliveryTime, minOrder, rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'store-2',
          'Taquería El Portal Tequis 🌮',
          'Restaurantes & Antojitos',
          'Plaza Miguel Hidalgo #5, Centro',
          'Roberto Elizondo',
          'ELZR82091015M00',
          'ELZR820910YYY',
          '012680009876543210',
          'VERIFICADO',
          'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80',
          '15-25 min',
          60,
          4.9
        ]
      );

      await run(
        `INSERT INTO products (id, storeId, name, price, description) VALUES (?, ?, ?, ?, ?)`,
        ['p4', 'store-2', 'Orden de Tacos al Pastor (5 pzas)', 70, 'Con piña, cilantro y cebolla']
      );
      await run(
        `INSERT INTO products (id, storeId, name, price, description) VALUES (?, ?, ?, ?, ?)`,
        ['p5', 'store-2', 'Gringa de Suadero con Queso', 55, 'Tortilla de harina de 25cm']
      );

      // Repartidor Demo
      await run(
        `INSERT INTO riders (id, name, vehicleType, phone, ine, curp, addressProof, verifiedStatus, status, lat, lng)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'rider-1',
          'Juan Pérez 🚴‍♂️',
          'Bicicleta Eléctrica',
          '4411234567',
          'PERJ88031215M00',
          'PERJ880312HDFRR09',
          'Verificado (San Nicolás)',
          'VERIFICADO',
          'ONLINE',
          20.5225,
          -99.8940
        ]
      );

      console.log('✅ Base de datos inicializada y sembrada con éxito.');
    }
  } catch (err) {
    console.error('Error inicializando tablas en SQLite:', err);
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
