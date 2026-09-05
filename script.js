/* ==========================================
   EKWATO - LÓGICA DEL CLIENTE (V4 - PARTE 1)
   ========================================== */

let productosGlobal = [];
let carrito = [];
let productoActualDetalle = null;
let limiteProductosMostrados = 8;
let anunciosGlobal = [];
let indiceAnuncioActual = 0;

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
  cargarBannerPublicitario();
  actualizarContadorCarrito();

  const perfilGuardado = localStorage.getItem('ekwato_perfil');
  if (perfilGuardado) {
    try {
      const p = JSON.parse(perfilGuardado);
      if (document.getElementById('perfilNombre')) document.getElementById('perfilNombre').value = p.vendedor || '';
      if (document.getElementById('perfilMuniCiudad')) document.getElementById('perfilMuniCiudad').value = p.muniVendedor || 'Malabo';
      if (document.getElementById('perfilMuni')) document.getElementById('perfilMuni').value = p.muniDinero || '';
      if (document.getElementById('perfilTelefono')) document.getElementById('perfilTelefono').value = p.telefono || '';
    } catch(e) {}
  }
});

// ==========================================
// 1. CARGAR Y MOSTRAR PRODUCTOS
// ==========================================
async function cargarProductos() {
    try {
        const res = await fetch('/api/productos');
        const productos = await res.json();
        
        productosGlobal = obtenerProductosDinamicos(productos);
        limiteProductosMostrados = 8;
        renderizarGrillaProductos(productosGlobal);
    } catch (err) {
        console.error('Error al cargar productos:', err.message);
    }
}

function obtenerProductosDinamicos(productos) {
    if (!productos || productos.length === 0) return [];
    const ultimaBusqueda = localStorage.getItem('ekwato_ultima_busqueda') || '';
    let listaProcesada = [...productos];

    if (ultimaBusqueda) {
        const filtrados = listaProcesada.filter(p => 
            p.nombre.toLowerCase().includes(ultimaBusqueda.toLowerCase()) || 
            (p.categoria && p.categoria.toLowerCase().includes(ultimaBusqueda.toLowerCase()))
        );
        const resto = listaProcesada.filter(p => !filtrados.includes(p));
        listaProcesada = [...filtrados, ...resto.sort(() => Math.random() - 0.5)];
    } else {
        listaProcesada.sort(() => Math.random() - 0.5);
    }
    return listaProcesada;
}

function renderizarGrillaProductos(productos) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (productos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No hay productos disponibles.</p>';
        const btnVerMasContainer = document.getElementById('verMasContainer');
        if (btnVerMasContainer) btnVerMasContainer.classList.add('hidden');
        return;
    }

    const productosA_Mostrar = productos.slice(0, limiteProductosMostrados);

    productosA_Mostrar.forEach(prod => {
        const precioVentaCliente = Math.round((prod.precioBase || 0) * 1.10);
        const precioOriginalCliente = prod.precioOriginal ? Math.round(prod.precioOriginal * 1.10) : '';

        let descuentoHtml = '';
        if (prod.precioOriginal && prod.descuentoPorcentaje > 0) {
            descuentoHtml = `<span class="badge-descuento" style="position: absolute; top: 12px; left: 12px; background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">-${prod.descuentoPorcentaje}%</span>`;
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cssText = "background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; position: relative;";
        const perfilData = JSON.parse(localStorage.getItem('ekwato_perfil') || '{}');
        const esSuProducto = perfilData.vendedor && perfilData.vendedor === prod.vendedor;
        card.innerHTML = `
            <div class="card-imagen-container" onclick="abrirDetalleProducto(${prod.id})" style="position: relative; height: 160px; background: #f1f5f9; overflow: hidden; cursor: pointer;">
                <img src="${prod.imagenUrl || 'https://via.placeholder.com/200'}" alt="${prod.nombre}" style="width: 100%; height: 100%; object-fit: cover;">
                ${descuentoHtml}
            </div>
            <div class="card-info" style="padding: 12px; display: flex; flex-direction: column; flex-grow: 1;">
                <h3 onclick="abrirDetalleProducto(${prod.id})" style="font-size: 0.9rem; font-weight: 600; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">${prod.nombre}</h3>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-bottom: 8px;">
                    <span onclick="abrirTiendaVendedor('${prod.vendedor}')" style="color: #2563eb; cursor: pointer; font-weight: 500;">${prod.vendedor}</span>
                    <span>📍 ${prod.muniVendedor || 'Ciudad'}</span>
                </div>

                <div style="font-size: 0.75rem; color: #d97706; margin-bottom: 8px;" id="calificacion-${prod.id}">
                    ${
                        /* Lógica real basada en las ventas del vendedor */
                        (() => {
                            let ventasReal = prod.ventasTotales || 0; // O la cuenta real de sus pedidos
                            if (ventasReal === 0) {
                                return '<span style="color: #cbd5e1;">☆☆☆☆☆</span> (0 ventas)';
                            } else if (ventasReal < 20) {
                                return '⭐☆☆☆☆ (' + ventasReal + ' ventas)';
                            } else if (ventasReal < 50) {
                                return '⭐⭐☆☆☆ (' + ventasReal + ' ventas)';
                            } else if (ventasReal < 100) {
                                return '⭐⭐⭐☆☆ (' + ventasReal + ' ventas)';
                            } else {
                                return '⭐⭐⭐⭐⭐ (' + ventasReal + '+ ventas)';
                            }
                        })()
                    }
                </div>

                <div style="margin-top: auto; display: flex; align-items: flex-end; justify-content: space-between;">
                    <div style="font-size: 1rem; font-weight: 700; color: #2563eb; margin-bottom: 6px;">${precioVentaCliente} FCFA</div>
                    <button onclick="event.stopPropagation(); agregarAlCarritoRapido(${prod.id})" style="background: #2563eb; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.9rem;" title="Agregar al carrito">🛒</button>
                </div>
                ${esSuProducto ? `
            <div style="margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                <button onclick="event.stopPropagation(); modificarPrecioProducto(${prod.id}, ${prod.precioBase})" style="width: 100%; background: #f8fafc; border: 1px solid var(--accent); color: var(--primary); font-size: 0.75rem; font-weight: 600; padding: 6px; border-radius: 4px; cursor: pointer;">
                    ✏️ Modificar Precio
                </button>
            </div>
        ` : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

function filtrarCategoria(categoria, btnElement) {
  if (btnElement) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
  }
  if (categoria === 'Todas') {
    renderizarGrillaProductos(productosGlobal);
  } else {
    const filtrados = productosGlobal.filter(p => p.categoria === categoria);
    renderizarGrillaProductos(filtrados);
  }
}

function buscarProductos() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const filtrados = productosGlobal.filter(p => 
    p.nombre.toLowerCase().includes(query) || 
    (p.descripcion && p.descripcion.toLowerCase().includes(query)) || 
    p.vendedor.toLowerCase().includes(query)
  );
  renderizarGrillaProductos(filtrados);
}

// ==========================================
// 2. VISTA DETALLE Y MODALES
// ==========================================
// ==========================================
// 2. VISTA DETALLE Y MODALES (CON RESEÑAS AÑADIDAS)
// ==========================================
async function abrirDetalleProducto(id) {
    const prod = productosGlobal.find(p => p.id === id);
    if (!prod) return;
    productoActualDetalle = prod;

    let perfil = { fotoperfil: '', seguidores: 12, ventasTotales: 150, calificacionPromedio: 4.8 };
    try {
        const resPerfil = await fetch(`/api/perfil/${prod.vendedor}`);
        const dataP = await resPerfil.json();
        if (dataP) perfil = { ...perfil, ...dataP };
    } catch (e) {}

    const precioVentaCliente = Math.round((prod.precioBase || 0) * 1.10);
    const modal = document.getElementById('modalDetalle');
    if (!modal) return;

    let galeriaMiniaturasHtml = '';
    const imagenes = prod.imagenesExtra ? [prod.imagenUrl, ...prod.imagenesExtra] : [prod.imagenUrl];
    imagenes.forEach((img, index) => {
        galeriaMiniaturasHtml += `
            <img src="${img}" alt="Miniatura" onclick="cambiarImagenPrincipal('${img}')" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid ${index === 0 ? '#2563eb' : '#cbd5e1'};">
        `;
    });

    modal.innerHTML = `
        <div class="modal-contenido-temu" style="background: white; max-width: 950px; margin: 30px auto; border-radius: 12px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); position: relative; max-height: 90vh; overflow-y: auto;">
            <button type="button" onclick="cerrarModalDetalle()" style="position: absolute; top: 15px; right: 15px; background: #f1f5f9; border: none; border-radius: 50%; width: 35px; height: 35px; font-size: 1.2rem; font-weight: bold; cursor: pointer; color: #1e293b; display: flex; align-items: center; justify-content: center; z-index: 10;">✕</button>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <div style="height: 350px; background: #f1f5f9; border-radius: 8px; overflow: hidden; margin-bottom: 10px;">
                        <img id="imagenPrincipalDetalle" src="${prod.imagenUrl || 'https://via.placeholder.com/400'}" alt="${prod.nombre}" style="width: 100%; height: 100%; object-fit: contain;">
                    </div>
                    <div style="display: flex; gap: 10px; overflow-x: auto;">
                        ${galeriaMiniaturasHtml}
                    </div>
                </div>

                <div>
                    <h2 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 10px; color: #1e293b;">${prod.nombre}</h2>
                    <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 15px;">${prod.descripcion || 'Sin descripción detallada.'}</p>
                    
                    <div style="margin-bottom: 15px;">
                        <span style="font-size: 1.8rem; font-weight: 700; color: #2563eb;">${precioVentaCliente} FCFA</span>
                        
                    </div>

                    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="" alt="Logo Tienda" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <h4 style="font-size: 0.95rem; font-weight: 600; margin: 0; color: #1e293b;">${prod.vendedor}</h4>
                                <span style="font-size: 0.75rem; color: #64748b;">${perfil.seguidores} Seguidores | ${perfil.ventasTotales} Ventas | ⭐ ${perfil.calificacionPromedio}</span>
                            </div>
                        </div>
                        <div>
                            <button onclick="verTiendaVendedor()" style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">Ver tienda</button>
                        </div>
                    </div>

                    <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 10px 0; margin-bottom: 20px; font-size: 0.85rem; color: #334155;">
                        <strong>🛡️ Garantía de pedidos:</strong> Devoluciones y reembolso garantizado en Ekwato.
                    </div>

                    <button id="detBtnComprar" style="width: 100%; background: #f97316; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer; margin-bottom: 10px;">
                        🛒 ¡Agregar al carrito!
                    </button>
                    
                    <button id="detBtnEliminar" style="display:none; width: 100%; background: #ef4444; color: white; border: none; padding: 10px; border-radius: 8px; font-size: 0.9rem; cursor: pointer;">
                        🗑️ Eliminar Anuncio
                    </button>
                </div>
            </div>

            <!-- SECCIÓN DE RESEÑAS AÑADIDA -->
            <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 15px; color: #1e293b;">Opiniones y Reseñas del Producto</h3>
                
                <div id="listaReseñas" style="margin-bottom: 20px; max-height: 200px; overflow-y: auto;">
                    <p style="font-size: 0.85rem; color: #64748b;">Aún no hay reseñas para este producto. ¡Sé el primero en opinar!</p>
                </div>

                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 10px; color: #1e293b;">Escribe tu reseña</h4>
                    <input type="text" id="nombreReseña" placeholder="Tu nombre" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem;">
                    <select id="estrellasReseña" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem;">
                        <option value="5">⭐⭐⭐⭐⭐ (5 - Excelente)</option>
                        <option value="4">⭐⭐⭐⭐ (4 - Muy bueno)</option>
                        <option value="3">⭐⭐⭐ (3 - Bueno)</option>
                        <option value="2">⭐⭐ (2 - Regular)</option>
                        <option value="1">⭐ (1 - Malo)</option>
                    </select>
                    <textarea id="comentarioReseña" placeholder="Escribe tu comentario aquí..." style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; height: 60px;"></textarea>
                    <button onclick="enviarReseña(${prod.id})" style="background: #2563eb; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-size: 0.85rem; cursor: pointer; font-weight: 600;">Publicar Reseña</button>
                </div>
            </div>
        </div>
    `;

    const btnComprar = document.getElementById('detBtnComprar');
    if (btnComprar) {
        btnComprar.onclick = () => agregarAlCarritoDesdeDetalle(prod.id);
    }

    const btnEliminar = document.getElementById('detBtnEliminar');
    const perfilData = JSON.parse(localStorage.getItem('ekwato_perfil') || '{}');
    if (btnEliminar) {
        if (perfilData.vendedor === prod.vendedor) {
            btnEliminar.style.display = 'block';
            btnEliminar.onclick = () => eliminarAnuncio(prod.id);
        } else {
            btnEliminar.style.display = 'none';
        }
    }

    modal.classList.remove('hidden');
    modal.style.display = 'block';
}

// Función sencilla para simular el envío de reseñas de forma local o temporal
function enviarReseña(idProducto) {
    const nombre = document.getElementById('nombreReseña').value.trim();
    const estrellas = document.getElementById('estrellasReseña').value;
    const comentario = document.getElementById('comentarioReseña').value.trim();

    if (!nombre || !comentario) {
        alert("Por favor, rellena tu nombre y el comentario.");
        return;
    }

    const lista = document.getElementById('listaReseñas');
    if (lista.innerHTML.includes('Aún no hay reseñas')) {
        lista.innerHTML = '';
    }

    const estText = '⭐'.repeat(parseInt(estrellas));
    const nuevaReseña = document.createElement('div');
    nuevaReseña.style.cssText = "border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px; font-size: 0.85rem;";
    nuevaReseña.innerHTML = `<strong>${nombre}</strong> <span style="font-size:0.75rem; color:#d97706;">${estText}</span><p style="margin:4px 0 0 0; color:#334155;">${comentario}</p>`;
    
    lista.prepend(nuevaReseña);
    document.getElementById('nombreReseña').value = '';
    document.getElementById('comentarioReseña').value = '';
    alert("¡Reseña publicada con éxito!");
}

// ÚNICA función definitiva para cerrar el modal de detalles (resuelve el fallo de la X)
function cerrarModalDetalle() {
    const modal = document.getElementById('modalDetalle');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function cambiarImagenPrincipal(url) {
    const imgPrincipal = document.getElementById('imagenPrincipalDetalle');
    if (imgPrincipal) imgPrincipal.src = url;
}

function verTiendaVendedor() {
    if (!productoActualDetalle) return;
    const vendedor = productoActualDetalle.vendedor;
    cerrarModalDetalle();
    abrirTiendaVendedor(vendedor);
}

// ==========================================
// 3. VISTA TIENDA DEL VENDEDOR (ACTUALIZADA CON CÁLCULO AUTOMÁTICO)
// ==========================================
async function abrirTiendaVendedor(vendedor) {
    const modal = document.getElementById('modalTienda');
    const titulo = document.getElementById('tituloTiendaVendedor');
    const grid = document.getElementById('gridTiendaVendedor');
    if (!modal || !grid) return;

    // Buscamos los productos de este vendedor dentro de nuestra lista global
    const productosVendedor = productosGlobal.filter(p => p.vendedor === vendedor);
    
    // Calculamos las estadísticas automáticamente según sus productos o datos
    let telefonoTienda = "No especificado";
    let ciudadTienda = "Ciudad no especificada";
    
    if (productosVendedor.length > 0) {
        telefonoTienda = productosVendedor[0].telefonoVendedor || "No especificado";
        ciudadTienda = productosVendedor[0].muniVendedor || "Malabo";
    }

    // Datos reales obtenidos del perfil o de los registros de la tienda
    let perfilGuardado = JSON.parse(localStorage.getItem('ekwato_perfil') || '{}');
    let ventasTotales = perfilGuardado.ventasTotales || 0;
    let seguidores = perfilGuardado.seguidores || 0;

    // Lógica automática de calificación por estrellas según las ventas realizadas
    let estrellasHtml = '';
    let calificacionNumero = 0;

    if (ventasTotales === 0) {
        // Si no tiene ventas, las 5 estrellas están vacías (grises)
        estrellasHtml = '<span style="color: #cbd5e1;">☆☆☆☆☆</span> (0 ventas)';
    } else if (ventasTotales < 20) {
        estrellasHtml = '<span style="color: #d97706;">⭐☆☆☆☆</span> (1.0)';
        calificacionNumero = 1.0;
    } else if (ventasTotales < 50) {
        estrellasHtml = '<span style="color: #d97706;">⭐⭐☆☆☆</span> (2.0)';
        calificacionNumero = 2.0;
    } else if (ventasTotales < 100) {
        estrellasHtml = '<span style="color: #d97706;">⭐⭐⭐☆☆</span> (3.0)';
        calificacionNumero = 3.0;
    } else if (ventasTotales < 200) {
        estrellasHtml = '<span style="color: #d97706;">⭐⭐⭐⭐☆</span> (4.0)';
        calificacionNumero = 4.0;
    } else {
        estrellasHtml = '<span style="color: #d97706;">⭐⭐⭐⭐⭐</span> (5.0)';
        calificacionNumero = 5.0;
    }

    // Modificamos o inyectamos la cabecera con los datos de la tienda antes de la grilla
    if (titulo) {
        titulo.innerHTML = `
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                <h2 style="font-size: 1.2rem; font-weight: bold; color: #1e293b; margin-bottom: 5px;">🏪 Tienda de: ${vendedor}</h2>
                <p style="font-size: 0.85rem; color: #64748b; margin: 3px 0;">📍 <strong>Ciudad:</strong> ${ciudadTienda}</p>
                <p style="font-size: 0.85rem; color: #64748b; margin: 3px 0;">📞 <strong>Teléfono:</strong> ${telefonoTienda}</p>
                <p style="font-size: 0.85rem; color: #64748b; margin: 3px 0;">👥 <strong>Seguidores:</strong> ${seguidores} | 📦 <strong>Ventas realizadas:</strong> ${ventasTotales}</p>
                <p style="font-size: 0.85rem; margin: 5px 0 0 0;"><strong>Calificación de la página:</strong> ${estrellasHtml}</p>
            </div>
            <h3 style="font-size: 1rem; font-weight: 600; color: #334155; margin-bottom: 10px;">Productos de esta tienda:</h3>
        `;
    }

    grid.innerHTML = '<p style="text-align: center; padding: 20px;">Cargando productos...</p>';
    modal.classList.remove('hidden');
    modal.style.display = 'block';

    try {
        grid.innerHTML = '';
        
        if (productosVendedor.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Este vendedor no tiene productos disponibles actualmente.</p>';
            return;
        }

        productosVendedor.forEach(prod => {
            const precioVentaCliente = Math.round((prod.precioBase || 0) * 1.10);
            
            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.cssText = "background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; cursor: pointer;";
            card.onclick = () => { cerrarModalTienda(); abrirDetalleProducto(prod.id); };

            card.innerHTML = `
                <div style="position: relative; height: 160px; background: #f1f5f9; overflow: hidden;">
                    <img src="${prod.imagenUrl || 'https://via.placeholder.com/200'}" alt="${prod.nombre}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="padding: 10px; display: flex; flex-direction: column; flex-grow: 1;">
                    <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prod.nombre}</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                        <span style="font-size: 1rem; font-weight: 700; color: #2563eb;">${precioVentaCliente} FCFA</span>
                        <button onclick="event.stopPropagation(); agregarAlCarritoRapido(${prod.id})" style="background: #2563eb; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">🛒</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">Error al cargar la tienda.</p>';
    }
}

function cerrarModalTienda() {
    const modalTienda = document.getElementById('modalTienda');
    if (modalTienda) {
        modalTienda.classList.add('hidden');
        modalTienda.style.display = 'none';
    }
}
// ==========================================
// 3. PERFILES Y PUBLICACIONES
// ==========================================
function abrirModalPerfil() {
  const modal = document.getElementById('modalPerfil');
  if(modal) { modal.classList.remove('hidden'); modal.style.display = 'block'; }
}
function cerrarModalPerfil() {
  const modal = document.getElementById('modalPerfil');
  if(modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function abrirModalVenta() {
  const perfilData = JSON.parse(localStorage.getItem('ekwato_perfil') || '{}');
  if (!perfilData.vendedor) {
    alert('Por favor, configura primero tu perfil de vendedor.');
    abrirModalPerfil();
    return;
  }
  const modal = document.getElementById('modalVenta');
  if(modal) { modal.classList.remove('hidden'); modal.style.display = 'block'; }
}
function cerrarModalVenta() {
  const modal = document.getElementById('modalVenta');
  if(modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

async function guardarPerfil(e) {
  e.preventDefault();
  const vendedor = document.getElementById('perfilNombre').value;
  const muniVendedor = document.getElementById('perfilMuniCiudad').value;
  const muniDinero = document.getElementById('perfilMuni').value;
  const telefono = document.getElementById('perfilTelefono').value;

  const datosPerfil = { vendedor, muniVendedor, muniDinero, telefono, fotoPerfil: '' };
  localStorage.setItem('ekwato_perfil', JSON.stringify(datosPerfil));
  alert('¡Perfil guardado correctamente!');
  cerrarModalPerfil();
}

async function guardarProductoConFoto(e) {
  e.preventDefault();
  const perfilData = JSON.parse(localStorage.getItem('ekwato_perfil') || '{}');
  
  const nombre = document.getElementById('nombre').value;
  const precioBase = document.getElementById('precio').value;
  const stock = document.getElementById('stock').value;
  const muniVendedor = document.getElementById('pubCiudad').value;
  const categoria = document.getElementById('categoria').value;
  const descripcion = document.getElementById('descripcion').value;
  const fileInput = document.getElementById('imagenFile');

  let imagenUrl = 'https://via.placeholder.com/300';
  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = async function(uploadEvent) {
      imagenUrl = uploadEvent.target.result;
      await enviarRegistroProducto(nombre, precioBase, stock, muniVendedor, categoria, descripcion, imagenUrl, perfilData);
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    await enviarRegistroProducto(nombre, precioBase, stock, muniVendedor, categoria, descripcion, imagenUrl, perfilData);
  }
}

async function enviarRegistroProducto(nombre, precioBase, stock, muniVendedor, categoria, descripcion, imagenUrl, perfilData) {
  const vendedor = perfilData.vendedor || 'Anónimo';
  const telefonoVendedor = perfilData.telefono || '555000000';

  try {
    const res = await fetch('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre, precioBase, descuentoPorcentaje: 0, vendedor, muniVendedor,
        telefonoVendedor, categoria, imagenUrl, descripcion, stock, condicion: 'Primera mano'
      })
    });
    const data = await res.json();
    if (data.exito) {
      alert('¡Producto publicado con éxito!');
      cerrarModalVenta();
      document.getElementById('productoForm').reset();
      cargarProductos();
    } else {
      alert('Error al publicar el producto.');
    }
  } catch(err) {
    alert('Error de red al publicar.');
  }
}

async function enviarSolicitudAnuncio(e) {
    e.preventDefault();
    const perfilData = JSON.parse(localStorage.getItem('ekwato_perfil') || '{}');
    
    const titulo = document.getElementById('anuncioTituloInput').value;
    const desc = document.getElementById('anuncioDescInput').value;
    const referenciaPago = document.getElementById('anuncioRefPago').value;
    const diasDuracion = document.getElementById('anuncioDuracionInput').value; // <--- CAPTURAMOS LOS DÍAS SELECCIONADOS
    
    const vendedor = perfilData.vendedor || 'Anónimo';
    const telefono = perfilData.telefono || '555000000';

    try {
        const res = await fetch('/api/anuncios/solicitar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendedor, telefono, titulo, desc, referenciaPago, diasDuracion }) // <--- LO ENVIAMOS AL SERVIDOR
        });
        const data = await res.json();
        if (data.exito) {
            alert('¡Solicitud de anuncio enviada con éxito!');
            document.getElementById('formSolicitudAnuncio').reset();
            cerrarModalPerfil();
        } else {
            alert('Error al enviar la solicitud.');
        }
    } catch (err) {
        alert('Error de conexión.');
    }
}

// ==========================================
// 4. CARRITO Y COMPRAS
// ==========================================
function abrirModalCarrito() {
  renderizarItemsCarrito();
  const modal = document.getElementById('modalCarrito');
  if(modal) { modal.classList.remove('hidden'); modal.style.display = 'block'; }
}
function cerrarModalCarrito() {
  const modal = document.getElementById('modalCarrito');
  if(modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function abrirModalPago() {
  if (carrito.length === 0) {
    alert('Tu carrito está vacío.');
    return;
  }
  cerrarModalCarrito();
  const modal = document.getElementById('modalPago');
  if(modal) { modal.classList.remove('hidden'); modal.style.display = 'block'; }
}
function cerrarModalPago() {
  const modal = document.getElementById('modalPago');
  if(modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function agregarAlCarritoDesdeDetalle(id) {
  const prod = productosGlobal.find(p => p.id === id);
  if (!prod) return;

  const precioVentaCliente = Math.round(prod.precioBase * 1.10);
  const itemExistente = carrito.find(item => item.id === id);

  if (itemExistente) {
    itemExistente.cantidad++;
  } else {
    carrito.push({
      id: prod.id,
      nombre: prod.nombre,
      precio: precioVentaCliente,
      vendedor: prod.vendedor,
      cantidad: 1,
      imagenUrl: prod.imagenUrl
    });
  }

  actualizarContadorCarrito();
  alert('¡Producto añadido al carrito!');
  cerrarModalDetalle();
}

// CARRITO RÁPIDO CORREGIDO (Resuelve el fallo de productos no cargados)
window.agregarAlCarritoRapido = function(id) {
    let prod = productosGlobal.find(p => p.id === id);
    
    if (!prod) {
        alert("No se encontró la información de este producto.");
        return;
    }

    const precioVentaCliente = Math.round((prod.precioBase || 0) * 1.10);
    const itemExistente = carrito.find(item => item.id === id);

    if (itemExistente) {
        itemExistente.cantidad += 1;
    } else {
        carrito.push({
            id: prod.id,
            nombre: prod.nombre,
            precio: precioVentaCliente,
            vendedor: prod.vendedor,
            cantidad: 1,
            imagenUrl: prod.imagenUrl
        });
    }

    actualizarContadorCarrito();
    alert(`¡"${prod.nombre}" se ha añadido al carrito!`);
};

function actualizarContadorCarrito() {
  const badge = document.getElementById('cartCount');
  if (badge) {
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    badge.textContent = totalItems;
  }
}

function renderizarItemsCarrito() {
  const container = document.getElementById('carritoItems');
  const totalContainer = document.getElementById('carritoTotal');
  if (!container) return;

  container.innerHTML = '';
  if (carrito.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">El carrito está vacío.</p>';
    if (totalContainer) totalContainer.textContent = '0 FCFA';
    return;
  }

  let total = 0;
  carrito.forEach((item, index) => {
    total += item.precio * item.cantidad;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:8px; font-size:0.85rem;';
    div.innerHTML = `
      <div>
        <strong>${item.nombre}</strong><br>
        <span style="color:#64748b;">${item.precio} FCFA x ${item.cantidad}</span>
      </div>
      <button onclick="eliminarDelCarrito(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1rem;">🗑️</button>
    `;
    container.appendChild(div);
  });

  if (totalContainer) totalContainer.textContent = total + ' FCFA';
}

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  renderizarItemsCarrito();
  actualizarContadorCarrito();
}

async function confirmarPedido(e) {
  e.preventDefault();
  const cliente = document.getElementById('clienteNombre').value;
  const telefono = document.getElementById('clienteTelefono').value;
  const direccion = document.getElementById('clienteDireccion').value;
  const referenciaSMS = document.getElementById('referenciaPago').value;

  let totalCobrado = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  let totalVendedor = Math.round(totalCobrado / 1.10);
  let gananciaEkwato = totalCobrado - totalVendedor;

  const pedidoId = 'EKW-' + Math.floor(100000 + Math.random() * 900000);
  const fecha = new Date().toLocaleDateString();

  const payload = {
    id: pedidoId, fecha, cliente, telefono, direccion, referenciaSMS,
    totalCobrado, totalVendedor, gananciaEkwato, items: carrito
  };

  try {
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.exito) {
      alert('¡Pedido realizado con éxito! ID: ' + pedidoId);
      carrito = [];
      actualizarContadorCarrito();
      cerrarModalPago();
      cargarProductos();
    } else {
      alert('Error al registrar el pedido.');
    }
  } catch(err) {
    alert('Error de conexión.');
  }
}

async function cargarBannerPublicitario() {
  try {
    const res = await fetch('/api/anuncios/activos');
    anunciosGlobal = await res.json();
    mostrarAnuncioActual();
  } catch (e) {}
}

function mostrarAnuncioActual() {
  const bannerTitulo = document.getElementById('bannerTitulo');
  const bannerSub = document.getElementById('bannerSub');
  if (!bannerTitulo || !bannerSub) return;

  if (anunciosGlobal.length > 0) {
    const anuncio = anunciosGlobal[indiceAnuncioActual % anunciosGlobal.length];
    bannerTitulo.textContent = anuncio.titulo;
    bannerSub.textContent = `${anuncio.desc} (Contacto: ${anuncio.vendedor} - ${anuncio.telefono})`;
  } else {
    bannerTitulo.textContent = '¡Espacio Publicitario Ekwato!';
    bannerSub.textContent = 'Promociona tu tienda aquí y destaca tus ofertas con el 10%.';
  }
}

async function eliminarAnuncio(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) return;

    try {
        // CORREGIDO: Ahora apunta correctamente al servidor de productos
        const response = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            alert("Producto eliminado con éxito.");
            cerrarModalDetalle();
            cargarProductos();
        } else {
            alert("No se pudo eliminar el producto.");
        }
    } catch (err) {
        alert("Hubo un error al conectar con el servidor.");
    }
}
// ==========================================
// FUNCIONES PARA CAMBIAR LA FOTO DE PERFIL
// ==========================================
let nuevaFotoBase64Temp = '';

// 1. Abre la galería del teléfono/PC, lee la foto seleccionada y la muestra de manera previa
function previsualizarNuevaFoto(event) {
    const archivo = event.target.files[0];
    if (archivo) {
        const lector = new FileReader();
        lector.onload = function(e) {
            nuevaFotoBase64Temp = e.target.result;
            const preview = document.getElementById('previewPerfil');
            if (preview) {
                preview.src = nuevaFotoBase64Temp;
            }
        }
        lector.readAsDataURL(archivo);
    }
}

// ==========================================
// FUNCIÓN DEFINITIVA PARA GUARDAR Y MOSTRAR LA FOTO DE PERFIL
// ==========================================
function guardarNuevaFotoPerfil() {
    if (!nuevaFotoBase64Temp) {
        alert("Por favor, selecciona una imagen primero desde tu galería.");
        return;
    }

    // 1. Obtenemos el perfil y actualizamos la foto
    let perfilData = JSON.parse(localStorage.getItem('ekwato_perfil') || '{}');
    perfilData.fotoperfil = nuevaFotoBase64Temp;
    localStorage.setItem('ekwato_perfil', JSON.stringify(perfilData));

    alert("¡Foto de perfil actualizada con éxito!");

    // 2. Actualizamos automáticamente la imagen en cualquier parte de la interfaz si existe
    const avataresPerfil = document.querySelectorAll('#fotoPerfilVisual, .avatar-usuario-nav');
    avataresPerfil.forEach(img => {
        img.src = nuevaFotoBase64Temp;
    });

    // Cerramos el modal del perfil o recargamos para aplicar cambios limpios
    cerrarModalPerfil();
    location.reload();
}
// Cargar la foto de perfil guardada al iniciar la página
window.addEventListener('DOMContentLoaded', () => {
    let perfilData = JSON.parse(localStorage.getItem('ekwato_perfil') || '{}');
    if (perfilData.fotoperfil) {
        const fotoImg = document.getElementById('previewPerfil');
        if (fotoImg) {
            fotoImg.src = perfilData.fotoperfil;
        }
    }
});
// ==========================================
// CARRUSEL PUBLICITARIO AUTOMÁTICO
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const slides = document.querySelectorAll('.slider-banner img');
    if (slides.length === 0) return;

    let indexActual = 0;
    const intervaloTiempo = 4000; // Cambia de imagen cada 4 segundos

    function cambiarSlide() {
        slides[indexActual].classList.remove('slide-activo');
        indexActual = (indexActual + 1) % slides.length;
        slides[indexActual].classList.add('slide-activo');
    }

    setInterval(cambiarSlide, intervaloTiempo);
});

async function modificarPrecioProducto(idProducto, precioBaseActual) {
    let nuevoBaseStr = prompt("Introduce el nuevo precio base para tu artículo (en FCFA):", precioBaseActual);
    if (nuevoBaseStr === null) return;
    
    let nuevoPrecioBase = parseFloat(nuevoBaseStr);
    if (isNaN(nuevoPrecioBase) || nuevoPrecioBase <= 0) {
        alert("Por favor, introduce un número válido mayor que 0.");
        return;
    }

    try {
        const res = await fetch(`/api/productos/${idProducto}/precio`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevoPrecio: nuevoPrecioBase, descuento: 0 })
        });
        
        const data = await res.json();
        if (data.exito) {
            let nuevoPrecioFinal = Math.round(nuevoPrecioBase * 1.10);
            alert(`¡Precio actualizado! El nuevo precio con comisión es ${nuevoPrecioFinal} FCFA.`);
            cargarProductos();
        } else {
            alert("No se pudo actualizar el precio.");
        }
    } catch (err) {
        console.error("Error al modificar precio:", err);
        alert("Error de conexión con el servidor.");
    }
}

function cerrarSesionEkwato() {
    // Borramos los datos del perfil local
    localStorage.removeItem('ekwato_perfil');
    
    // Mostramos un aviso rápido o recargamos directamente
    alert('Has cerrado sesión correctamente.');
    
    // Recargamos la página para que vuelva al estado de inicio de sesión / sin perfil
    location.reload();
}

// ==========================================
//  PANEL DE ADMINISTRADOR (BACK-OFFICE)
// ==========================================

async function solicitarAccesoAdmin() {
    const password = prompt("Introduce la contraseña de administrador:");
    if (!password) return;

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (data.exito) {
            abrirModalAdmin();
            if (typeof cargarDatosAdmin === 'function') {
                cargarDatosAdmin();
            }
        } else {
            alert("Contraseña incorrecta.");
        }
    } catch (err) {
        console.error("Error de conexión al autenticar admin:", err);
        alert("Error al conectar con el servidor.");
    }
}

function abrirModalAdmin() {
    const modal = document.getElementById('modalAdmin');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'block';
    } else {
        alert("¡Acceso concedido! (Nota: No se encontró el elemento con id 'modalAdmin' en el HTML)");
    }
}

function cerrarModalAdmin() {
    const modal = document.getElementById('modalAdmin');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}






 

