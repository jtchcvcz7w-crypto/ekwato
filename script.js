// VARIABLES GLOBALES
let productosGlobales = [];
let carrito = [];
let usuarioActivo = JSON.parse(localStorage.getItem('ekwato_usuario')) || null;

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
  actualizarBotonPerfil();
  obtenerProductos();
});

// ==========================================
// OPTIMIZACIÓN Y COMPRESIÓN DE IMÁGENES (C)
// ==========================================
function optimizarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(archivo);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        
        if (scaleSize < 1) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compresión al 70%
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// ==========================================
// GESTIÓN DE PRODUCTOS
// ==========================================
async function obtenerProductos() {
  try {
    const res = await fetch('/api/productos');
    productosGlobales = await res.json();
    renderizarProductos(productosGlobales);
  } catch (err) {
    console.error('Error cargando productos:', err);
  }
}

function renderizarProductos(lista) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  if (lista.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No hay productos disponibles.</p>';
    return;
  }

  lista.forEach(prod => {
    const precioFinal = Math.round(prod.precioBase * 1.10);
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${prod.imagenUrl || 'https://via.placeholder.com/200'}" style="width:100%; height:140px; object-fit:cover; border-radius:6px; margin-bottom:8px;">
      <h4 style="font-size:0.95rem; margin-bottom:4px;">${prod.nombre}</h4>
      <p style="font-weight:bold; color:var(--primary); font-size:1.1rem; margin-bottom:8px;">${precioFinal.toLocaleString()} FCFA</p>
      <button class="btn btn-outline" style="width:100%; font-size:0.8rem;" onclick="verDetalle(${prod.id})">Ver Detalles</button>
    `;
    grid.appendChild(card);
  });
}

async function guardarProductoConFoto(e) {
  e.preventDefault();

  if (!usuarioActivo) {
    alert('Debes configurar tu perfil antes de publicar.');
    abrirModalPerfil();
    return;
  }

  const fileInput = document.getElementById('imagenFile');
  let imagenBase64 = '';

  if (fileInput && fileInput.files[0]) {
    try {
      imagenBase64 = await optimizarImagen(fileInput.files[0]);
    } catch (err) {
      alert('Error procesando la imagen.');
      return;
    }
  }

  const nuevoProducto = {
    nombre: document.getElementById('nombre').value,
    precioBase: Number(document.getElementById('precio').value),
    vendedor: usuarioActivo.nombre,
    muniVendedor: usuarioActivo.muni,
    telefonoVendedor: usuarioActivo.telefono,
    categoria: document.getElementById('categoria').value,
    imagenUrl: imagenBase64,
    descripcion: document.getElementById('descripcion').value
  };

  try {
    const res = await fetch('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoProducto)
    });

    const data = await res.json();
    if (res.ok) {
      alert("¡Producto publicado!");
      document.getElementById('productoForm').reset();
      cerrarModalVenta();
      obtenerProductos();
    } else {
      alert(data.error || 'Error publicando producto.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

// ==========================================
// CARRITO Y PAGO
// ==========================================
function verDetalle(id) {
  const prod = productosGlobales.find(p => p.id === id);
  if (!prod) return;

  const precioFinal = Math.round(prod.precioBase * 1.10);
  document.getElementById('detNombre').innerText = prod.nombre;
  document.getElementById('detImagen').src = prod.imagenUrl || 'https://via.placeholder.com/200';
  document.getElementById('detPrecio').innerText = `${precioFinal.toLocaleString()} FCFA`;
  document.getElementById('detVendedor').innerText = `Vendedor: ${prod.vendedor}`;
  document.getElementById('detDescripcion').innerText = prod.descripcion || 'Sin descripción';
  
  const btn = document.getElementById('detBtnComprar');
  btn.onclick = () => {
    agregarAlCarrito(prod);
    cerrarModalDetalle();
  };

  document.getElementById('modalDetalle').classList.remove('hidden');
}

function agregarAlCarrito(prod) {
  const precioFinal = Math.round(prod.precioBase * 1.10);
  const existe = carrito.find(item => item.id === prod.id);

  if (existe) {
    existe.cantidad += 1;
  } else {
    carrito.push({ ...prod, precioFinal, cantidad: 1 });
  }

  actualizarContadorCarrito();
  alert('Producto añadido al carrito.');
}

function actualizarContadorCarrito() {
  const count = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  document.getElementById('cartCount').innerText = count;
}

function abrirModalCarrito() {
  const cont = document.getElementById('carritoItems');
  cont.innerHTML = '';
  let total = 0;

  carrito.forEach(item => {
    const subtotal = item.precioFinal * item.cantidad;
    total += subtotal;
    cont.innerHTML += `
      <div style="display:flex; justify-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:4px;">
        <div>
          <strong>${item.nombre}</strong> (x${item.cantidad})<br>
          <small>${subtotal.toLocaleString()} FCFA</small>
        </div>
      </div>
    `;
  });

  document.getElementById('carritoTotal').innerText = `${total.toLocaleString()} FCFA`;
  document.getElementById('modalCarrito').classList.remove('hidden');
}

async function confirmarPedido(e) {
  e.preventDefault();

  let totalCobrado = 0;
  let totalVendedores = 0;

  carrito.forEach(item => {
    totalCobrado += (item.precioFinal * item.cantidad);
    totalVendedores += (item.precioBase * item.cantidad);
  });

  const nuevoPedido = {
    id: 'ORD-' + Date.now().toString().slice(-4),
    fecha: new Date().toLocaleDateString(),
    cliente: document.getElementById('clienteNombre').value,
    telefono: document.getElementById('clienteTelefono').value,
    direccion: document.getElementById('clienteDireccion').value,
    referenciaSMS: document.getElementById('referenciaPago').value,
    totalCobrado: totalCobrado,
    totalVendedor: totalVendedores,
    gananciaEkwato: totalCobrado - totalVendedores,
    items: [...carrito]
  };

  try {
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoPedido)
    });

    if (res.ok) {
      alert('¡Pedido registrado! Verificaremos el SMS de pago.');
      carrito = [];
      actualizarContadorCarrito();
      document.getElementById('pagoForm').reset();
      cerrarModalPago();
      cerrarModalCarrito();
    } else {
      const errData = await res.json();
      alert(errData.error || 'Error al procesar pedido.');
    }
  } catch (err) {
    console.error('Error enviando pedido:', err);
  }
}

// ==========================================
// BACK-OFFICE (A)
// ==========================================
async function solicitarAccesoAdmin() {
  const pass = prompt('Introduce la contraseña de administrador:');
  if (!pass) return;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    });

    if (res.ok) {
      document.getElementById('modalAdmin').classList.remove('hidden');
      renderizarTablaPedidos();
    } else {
      alert('Contraseña incorrecta.');
    }
  } catch (err) {
    console.error('Error en login:', err);
  }
}

async function renderizarTablaPedidos() {
  const tbody = document.getElementById('tablaPedidosAdmin');
  tbody.innerHTML = '<tr><td colspan="8">Cargando datos...</td></tr>';

  try {
    const res = await fetch('/api/pedidos');
    const pedidos = await res.json();
    tbody.innerHTML = '';

    if (pedidos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay registros.</td></tr>';
      return;
    }

    pedidos.forEach(ped => {
      const tr = document.createElement('tr');
      const muni = ped.items[0]?.muniVendedor || 'N/A';

      tr.innerHTML = `
        <td><strong>${ped.id}</strong><br><small>${ped.cliente} (${ped.telefono})</small></td>
        <td><span style="background:#e0f2fe; color:#0369a1; padding:2px 4px; border-radius:4px; font-weight:bold;">${ped.referenciaSMS}</span></td>
        <td style="font-weight:bold;">${Number(ped.totalCobrado).toLocaleString()} FCFA</td>
        <td style="color:#0d9488; font-weight:bold;">${muni}</td>
        <td style="color:#2563eb; font-weight:bold;">${Number(ped.totalVendedor).toLocaleString()} FCFA</td>
        <td style="color:#16a34a; font-weight:bold;">${Number(ped.gananciaEkwato).toLocaleString()} FCFA</td>
        <td><span style="padding:2px 4px; border-radius:4px; ${ped.estado === 'Pendiente' ? 'background:#fee2e2; color:#dc2626;' : 'background:#dcfce7; color:#15803d;'}">${ped.estado}</span></td>
        <td>
          ${ped.estado === 'Pendiente' 
            ? `<button onclick="marcarComoLiquidadoAPI('${ped.id}')" style="background:#16a34a; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Liquidar</button>`
            : '✓ Liquidado'
          }
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error cargando pedidos:', err);
  }
}

async function marcarComoLiquidadoAPI(id) {
  if (!confirm('¿Marcar pedido como liquidado al vendedor?')) return;
  try {
    const res = await fetch(`/api/pedidos/${id}/liquidar`, { method: 'PUT' });
    if (res.ok) renderizarTablaPedidos();
  } catch (err) {
    console.error('Error al liquidar:', err);
  }
}

// ==========================================
// FUNCIONES AUXILIARES DE NAVEGACIÓN Y PERFIL
// ==========================================
function abrirModalPerfil() {
  if (usuarioActivo) {
    document.getElementById('perfilNombre').value = usuarioActivo.nombre;
    document.getElementById('perfilMuni').value = usuarioActivo.muni;
    document.getElementById('perfilTelefono').value = usuarioActivo.telefono;
  }
  document.getElementById('modalPerfil').classList.remove('hidden');
}
function cerrarModalPerfil() { document.getElementById('modalPerfil').classList.add('hidden'); }

function guardarPerfil(e) {
  e.preventDefault();
  usuarioActivo = {
    nombre: document.getElementById('perfilNombre').value,
    muni: document.getElementById('perfilMuni').value,
    telefono: document.getElementById('perfilTelefono').value
  };
  localStorage.setItem('ekwato_usuario', JSON.stringify(usuarioActivo));
  actualizarBotonPerfil();
  cerrarModalPerfil();
}

function actualizarBotonPerfil() {
  const btn = document.getElementById('btnPerfil');
  btn.innerText = usuarioActivo ? `👤 ${usuarioActivo.nombre}` : '👤 Perfil';
}

function abrirModalVenta() { document.getElementById('modalVenta').classList.remove('hidden'); }
function cerrarModalVenta() { document.getElementById('modalVenta').classList.add('hidden'); }
function cerrarModalDetalle() { document.getElementById('modalDetalle').classList.add('hidden'); }
function cerrarModalCarrito() { document.getElementById('modalCarrito').classList.add('hidden'); }
function abrirModalPago() { document.getElementById('modalPago').classList.remove('hidden'); }
function cerrarModalPago() { document.getElementById('modalPago').classList.add('hidden'); }
function cerrarModalAdmin() { document.getElementById('modalAdmin').classList.add('hidden'); }

function buscarProductos() {
  const texto = document.getElementById('searchInput').value.toLowerCase();
  const filtrados = productosGlobales.filter(p => p.nombre.toLowerCase().includes(texto));
  renderizarProductos(filtrados);
}

function filtrarCategoria(cat, btn) {
  if (btn) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  if (cat === 'Todas') {
    renderizarProductos(productosGlobales);
  } else {
    const filtrados = productosGlobales.filter(p => p.categoria === cat);
    renderizarProductos(filtrados);
  }
}






 

