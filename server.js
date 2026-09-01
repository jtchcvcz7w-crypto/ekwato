const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de límites para peticiones (Validación C)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(express.static(__dirname));

// Base de Datos SQLite Persistente (Guardada en archivo real)
const db = new sqlite3.Database(path.join(__dirname, 'ekwato.db'), (err) => {
  if (err) console.error('Error al conectar con SQLite:', err.message);
  else console.log('Conectado a la base de datos "ekwato.db"');
});

// Inicialización de las tablas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precioBase REAL NOT NULL,
      vendedor TEXT NOT NULL,
      muniVendedor TEXT NOT NULL,
      telefonoVendedor TEXT NOT NULL,
      categoria TEXT,
      imagenUrl TEXT,
      descripcion TEXT,
      fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
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
});

// Middleware de Validación Server-Side (C)
function validarProducto(req, res, next) {
  const { nombre, precioBase, vendedor, muniVendedor, imagenUrl } = req.body;
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
  }
  if (!precioBase || isNaN(precioBase) || Number(precioBase) <= 0) {
    return res.status(400).json({ error: 'El precio debe ser un número positivo.' });
  }
  if (!vendedor || !muniVendedor) {
    return res.status(400).json({ error: 'Faltan datos obligatorios del vendedor.' });
  }
  if (imagenUrl && imagenUrl.length > 4 * 1024 * 1024) {
    return res.status(400).json({ error: 'La imagen subida supera el límite de 3MB.' });
  }
  next();
}

// ==========================================
// ENDPOINTS DE PRODUCTOS
// ==========================================
app.get('/api/productos', (req, res) => {
  db.all('SELECT * FROM productos ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/productos', validarProducto, (req, res) => {
  const { nombre, precioBase, vendedor, muniVendedor, telefonoVendedor, categoria, imagenUrl, descripcion } = req.body;
  const sql = `INSERT INTO productos (nombre, precioBase, vendedor, muniVendedor, telefonoVendedor, categoria, imagenUrl, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [nombre, precioBase, vendedor, muniVendedor, telefonoVendedor, categoria, imagenUrl, descripcion];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ exito: true, id: this.lastID });
  });
});

app.delete('/api/productos/:id', (req, res) => {
  db.run('DELETE FROM productos WHERE id = ?', req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ exito: true, eliminados: this.changes });
  });
});

// ==========================================
// ENDPOINTS DE PEDIDOS (BACK-OFFICE) (A)
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

  if (!referenciaSMS || referenciaSMS.trim() === '') {
    return res.status(400).json({ error: 'La referencia del SMS Muni es obligatoria.' });
  }

  const sql = `INSERT INTO pedidos (id, fecha, cliente, telefono, direccion, referenciaSMS, totalCobrado, totalVendedor, gananciaEkwato, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [id, fecha, cliente, telefono, direccion, referenciaSMS, totalCobrado, totalVendedor, gananciaEkwato, JSON.stringify(items)];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ exito: true });
  });
});

app.put('/api/pedidos/:id/liquidar', (req, res) => {
  db.run(`UPDATE pedidos SET estado = 'Completado' WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ exito: true });
  });
});

// ==========================================
// AUTENTICACIÓN ADMIN
// ==========================================
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === 'admin123') res.json({ exito: true });
  else res.status(401).json({ exito: false, mensaje: 'Contraseña incorrecta' });
});

app.listen(PORT, () => console.log(`Ekwato ejecutándose en http://localhost:${PORT}`));