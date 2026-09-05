const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(__dirname));

const db = new sqlite3.Database(path.join(__dirname, 'ekwato.db'), (err) => {
  if (err) console.error('Error al conectar con SQLite:', err.message);
  else console.log('Conectado a la base de datos "ekwato.db"');
});

db.serialize(() => {
  // Tabla de productos actualizada (añadiendo condición: Primera/Segunda mano, descuento y múltiples imágenes si procede)
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precioBase REAL NOT NULL,
      precioOriginal REAL,
      descuentoPorcentaje INTEGER DEFAULT 0,
      vendedor TEXT NOT NULL,
      muniVendedor TEXT NOT NULL,
      telefonoVendedor TEXT NOT NULL,
      categoria TEXT,
      imagenUrl TEXT,
      imagenesExtra TEXT,
      descripcion TEXT,
      condicion TEXT DEFAULT 'Primera mano',
      stock INTEGER DEFAULT 1,
      fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de perfiles de usuario / vendedores (para foto de perfil, seguidores, etc.)
  db.run(`
    CREATE TABLE IF NOT EXISTS perfiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendedor TEXT UNIQUE NOT NULL,
      fotoPerfil TEXT,
      seguidores INTEGER DEFAULT 0,
      ventasTotales INTEGER DEFAULT 0,
      calificacionPromedio REAL DEFAULT 5.0,
      fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de reseñas y calificaciones a vendedores/productos
  db.run(`
    CREATE TABLE IF NOT EXISTS reseñas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendedor TEXT NOT NULL,
      comprador TEXT NOT NULL,
      estrellas INTEGER NOT NULL,
      comentario TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productoId INTEGER,
      vendedor TEXT,
      comprador TEXT,
      mensaje TEXT,
      remitente TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      cliente TEXT NOT NULL,
      telefono TEXT NOT NULL,
      direccion TEXT NOT NULL,
      referenciaSMS TEXT NOT NULL,
      totalCobrado REAL NOT NULL,
      totalVendedor REAL NOT NULL,
      gananciaEkwato REAL NOT NULL,
      estado TEXT DEFAULT 'Pendiente',
      items TEXT NOT NULL
    )
  `);

db.run(`
    CREATE TABLE IF NOT EXISTS anuncios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendedor TEXT NOT NULL,
      telefono TEXT NOT NULL,
      titulo TEXT NOT NULL,
      desc TEXT NOT NULL,
      referenciaPago TEXT NOT NULL,
      diasDuracion INTEGER DEFAULT 3, -- <--- NUEVA COLUMNA PARA GUARDAR LOS DÍAS
      estado TEXT DEFAULT 'Pendiente',
      fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// ==========================================
// API: PRODUCTOS (Con soporte para rebajas, edición de precio y condición)
// ==========================================
app.get('/api/productos', (req, res) => {
  db.all('SELECT * FROM productos ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/productos', (req, res) => {
  const { nombre, precioBase, vendedor, muniVendedor, telefonoVendedor, categoria, imagenUrl, descripcion, stock, condicion, descuentoPorcentaje } = req.body;
  
  let precioFinalBase = parseFloat(precioBase);
  let original = precioFinalBase;
  let desc = parseInt(descuentoPorcentaje) || 0;

  if (desc > 0) {
    // Si hay rebaja, calculamos el precio base con el descuento aplicado
    precioFinalBase = original - (original * desc / 100);
  }

  const sql = `INSERT INTO productos (nombre, precioBase, precioOriginal, descuentoPorcentaje, vendedor, muniVendedor, telefonoVendedor, categoria, imagenUrl, descripcion, condicion, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [nombre, precioFinalBase, original, desc, vendedor, muniVendedor, telefonoVendedor, categoria, imagenUrl, descripcion, condicion || 'Primera mano', stock || 1];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ exito: true, id: this.lastID });
  });
});

// Modificar precio o aplicar rebaja a un producto ya existente
app.put('/api/productos/:id/precio', (req, res) => {
  const { nuevoPrecio, descuento } = req.body;
  const id = req.params.id;

  let pBase = parseFloat(nuevoPrecio);
  let desc = parseInt(descuento) || 0;
  let original = pBase;

  if (desc > 0) {
    pBase = original - (original * desc / 100);
  }

  db.run(`UPDATE productos SET precioBase = ?, precioOriginal = ?, descuentoPorcentaje = ? WHERE id = ?`, 
    [pBase, original, desc, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ exito: true });
    });
});

app.delete('/api/productos/:id', (req, res) => {
  db.run('DELETE FROM productos WHERE id = ?', req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ exito: true, eliminados: this.changes });
  });
});

// ==========================================
// API: PERFILES Y FOTO DE PERFIL DE USUARIO
// ==========================================
app.get('/api/perfil/:vendedor', (req, res) => {
  const vendedor = req.params.vendedor;
  db.get(`SELECT * FROM perfiles WHERE vendedor = ?`, [vendedor], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) {
      // Si no existe perfil, devolvemos uno por defecto
      return res.json({ vendedor, fotoPerfil: '', seguidores: 0, ventasTotales: 0, calificacionPromedio: 5.0 });
    }
    res.json(row);
  });
});

app.post('/api/perfil/foto', (req, res) => {
  const { vendedor, fotoPerfil } = req.body;
  db.run(`INSERT INTO perfiles (vendedor, fotoPerfil) VALUES (?, ?) 
          ON CONFLICT(vendedor) DO UPDATE SET fotoPerfil = ?`, 
          [vendedor, fotoPerfil, fotoPerfil], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ exito: true });
  });
});

// ==========================================
// API: RESEÑAS Y CALIFICACIONES
// ==========================================
app.get('/api/reseñas/:vendedor', (req, res) => {
  db.all(`SELECT * FROM reseñas WHERE vendedor = ? ORDER BY id DESC`, [req.params.vendedor], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/reseñas', (req, res) => {
  const { vendedor, comprador, estrellas, comentario } = req.body;
  db.run(`INSERT INTO reseñas (vendedor, comprador, estrellas, comentario) VALUES (?, ?, ?, ?)`,
    [vendedor, comprador, estrellas, comentario], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Actualizar promedio de calificación en perfiles
      db.get(`SELECT AVG(estrellas) as promedio FROM reseñas WHERE vendedor = ?`, [vendedor], (err, row) => {
        if (!err && row) {
          db.run(`INSERT INTO perfiles (vendedor, calificacionPromedio) VALUES (?, ?) 
                  ON CONFLICT(vendedor) DO UPDATE SET calificacionPromedio = ?`, 
                  [vendedor, row.promedio, row.promedio]);
        }
      });

      res.status(201).json({ exito: true });
    });
});

// ==========================================
// API: PEDIDOS Y CHAT
// ==========================================
app.get('/api/pedidos', (req, res) => {
  db.all('SELECT * FROM pedidos ORDER BY rowid DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const pedidos = rows.map(p => ({ ...p, items: JSON.parse(p.items || '[]') }));
    res.json(pedidos);
  });
});

app.post('/api/pedidos', (req, res) => {
  const { id, fecha, cliente, telefono, direccion, referenciaSMS, totalCobrado, totalVendedor, gananciaEkwato, items } = req.body;
  const sql = `INSERT INTO pedidos (id, fecha, cliente, telefono, direccion, referenciaSMS, totalCobrado, totalVendedor, gananciaEkwato, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [id, fecha, cliente, telefono, direccion, referenciaSMS, totalCobrado, totalVendedor, gananciaEkwato, JSON.stringify(items)];

  db.serialize(() => {
    db.run(sql, params, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (items && Array.isArray(items)) {
        items.forEach(item => {
          db.run(`UPDATE productos SET stock = stock - ? WHERE id = ?`, [item.cantidad, item.id]);
          db.run(`DELETE FROM productos WHERE id = ? AND stock <= 0`, [item.id]);
        });
      }
      res.status(201).json({ exito: true });
    });
  });
});

app.put('/api/pedidos/:id/liquidar', (req, res) => {
  db.run(`UPDATE pedidos SET estado = 'Completado' WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ exito: true });
  });
});

app.post('/api/chat', (req, res) => {
  const { productoId, vendedor, comprador, mensaje, remitente } = req.body;
  db.run(`INSERT INTO chats (productoId, vendedor, comprador, mensaje, remitente) VALUES (?, ?, ?, ?, ?)`,
    [productoId, vendedor, comprador, mensaje, remitente], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ exito: true });
    });
});

app.get('/api/chat/:productoId', (req, res) => {
  db.all(`SELECT * FROM chats WHERE productoId = ? ORDER BY id ASC`, [req.params.productoId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === 'admin123') res.json({ exito: true });
  else res.status(401).json({ exito: false, mensaje: 'Contraseña incorrecta' });
});

app.post('/api/anuncios/solicitar', (req, res) => {
  const { vendedor, telefono, titulo, desc, referenciaPago, diasDuracion } = req.body;
  db.run(`INSERT INTO anuncios (vendedor, telefono, titulo, desc, referenciaPago, diasDuracion, estado) VALUES (?, ?, ?, ?, ?, ?, 'Pendiente')`,
    [vendedor, telefono, titulo, desc, referenciaPago, diasDuracion || 3], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ exito: true, id: this.lastID });
    });
});

app.get('/api/admin/anuncios', (req, res) => {
  db.all(`SELECT * FROM anuncios WHERE estado = 'Pendiente' ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/admin/anuncios/:id/aprobar', (req, res) => {
  db.run(`UPDATE anuncios SET estado = 'Aprobado' WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ exito: true });
  });
});

app.get('/api/anuncios/activos', (req, res) => {
  db.all(`SELECT * FROM anuncios WHERE estado = 'Aprobado' ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
// ==========================================
// API: ELIMINACIÓN Y EXPIRACIÓN DE ANUNCIOS
// ==========================================

// Ruta para eliminar un anuncio de forma manual (Admin o Vendedor)
app.delete('/api/admin/anuncios/:id', (req, res) => {
  const anuncioId = req.params.id;
  db.run(`DELETE FROM anuncios WHERE id = ?`, [anuncioId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ exito: true, eliminados: this.changes });
  });
});

// Función de limpieza automática de anuncios expirados (ej: más de 30 días de antigüedad)
function limpiarAnunciosExpirados() {
  // SQLite suma dinámicamente los días específicos de cada anuncio a su fecha de creación
  db.run(`DELETE FROM anuncios WHERE datetime(fechaCreacion, '+' || diasDuracion || ' days') < datetime('now')`, function (err) {
    if (err) {
      console.error("Error al limpiar anuncios expirados:", err.message);
    } else if (this.changes > 0) {
      console.log(`[Limpieza Automática] Se han eliminado ${this.changes} anuncios caducados.`);
    }
  });
}

// Ejecutar la limpieza al iniciar el servidor
limpiarAnunciosExpirados();

app.listen(PORT, () => console.log(`Ekwato ejecutándose en http://localhost:${PORT}`));