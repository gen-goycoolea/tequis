import React, { useState, useEffect } from 'react';
import { Store, Check, ShoppingBag, Plus, ShieldCheck, CreditCard, FileText, Trash2, UtensilsCrossed } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(API_BASE);

export default function App() {
  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const [newStoreData, setNewStoreData] = useState({
    name: '',
    category: 'Cocina Económica & Fondas',
    address: '',
    ownerName: '',
    ownerIne: '',
    rfc: '',
    clabe: ''
  });

  const [newProductData, setNewProductData] = useState({
    name: '',
    price: '',
    description: ''
  });

  useEffect(() => {
    fetchStores();
    fetchOrders();

    socket.on('new_order', o => setOrders(prev => [o, ...prev]));
    socket.on('order_updated', o => setOrders(prev => prev.map(item => item.id === o.id ? o : item)));
    socket.on('stores_updated', s => {
      setStores(s);
      if (selectedStore) {
        const updated = s.find(item => item.id === selectedStore.id);
        if (updated) setSelectedStore(updated);
      }
    });

    return () => {
      socket.off('new_order');
      socket.off('order_updated');
      socket.off('stores_updated');
    };
  }, []);

  useEffect(() => {
    if (stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0]);
    }
  }, [stores]);

  const fetchStores = () => fetch(`${API_BASE}/api/stores`).then(r => r.json()).then(setStores);
  const fetchOrders = () => fetch(`${API_BASE}/api/orders`).then(r => r.json()).then(setOrders);

  const handleRegisterStore = async (e) => {
    e.preventDefault();
    if (!newStoreData.name || !newStoreData.ownerName || !newStoreData.ownerIne || !newStoreData.clabe) {
      alert('Ingresa el Nombre de la tienda, Titular, INE y CLABE de 18 dígitos');
      return;
    }

    if (newStoreData.clabe.length !== 18) {
      alert('La CLABE interbancaria debe ser exactamente de 18 dígitos');
      return;
    }

    const res = await fetch(`${API_BASE}/api/stores/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStoreData)
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error registrando comercio');
      return;
    }

    setStores(prev => [...prev, data]);
    setSelectedStore(data);
    setShowRegisterModal(false);
    alert(`¡Comercio "${data.name}" registrado y verificado correctamente!`);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!selectedStore) return;
    if (!newProductData.name || !newProductData.price) {
      alert('Ingresa Nombre y Precio del producto');
      return;
    }

    const res = await fetch(`${API_BASE}/api/stores/${selectedStore.id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProductData)
    });

    if (!res.ok) {
      alert('Error agregando platillo');
      return;
    }

    setNewProductData({ name: '', price: '', description: '' });
    setShowAddProductModal(false);
    fetchStores();
  };

  const handleDeleteProduct = async (productId) => {
    if (!selectedStore) return;
    if (!confirm('¿Seguro que deseas eliminar este platillo del menú?')) return;

    await fetch(`${API_BASE}/api/stores/${selectedStore.id}/products/${productId}`, {
      method: 'DELETE'
    });
    fetchStores();
  };

  const handleAcceptOrder = async (orderId) => {
    await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACCEPTED' })
    });
  };

  const storeOrders = orders.filter(o => o.storeId === selectedStore?.id);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 pb-20">
      <header className="bg-indigo-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo Comercio" className="w-10 h-10 rounded-xl shadow-md object-cover" />
            <div>
              <h1 className="font-black text-lg">TequisDelivery Negocios</h1>
              <p className="text-[10px] text-indigo-200">Panel Seguro para Fondas, Cocinas y Tiendas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStore?.id || ''}
              onChange={e => setSelectedStore(stores.find(s => s.id === e.target.value))}
              className="bg-indigo-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-700 outline-none"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowRegisterModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"
            >
              <Plus size={14} /> Registrar Fonda/Tienda
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {selectedStore && (
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{selectedStore.name}</h3>
                <p className="text-gray-500">{selectedStore.address} • Titular: <strong>{selectedStore.ownerName}</strong></p>
              </div>
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1 font-bold">
                <ShieldCheck size={16} className="text-emerald-600" /> Estatus: Verificado (RFC / INE Validado)
              </div>
            </div>

            {/* Menú de Productos del Negocio */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-800 text-xs flex items-center gap-1">
                  <UtensilsCrossed size={14} className="text-indigo-600" /> Menú de Productos ({selectedStore.products?.length || 0})
                </h4>
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1"
                >
                  <Plus size={12} /> Agregar Platillo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {selectedStore.products?.map(prod => (
                  <div key={prod.id} className="bg-gray-50 p-2.5 rounded-xl border flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">{prod.name}</p>
                      <p className="text-gray-500 text-[11px]">{prod.description}</p>
                      <p className="font-bold text-indigo-600 text-xs mt-0.5">${prod.price} MXN</p>
                    </div>
                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h2 className="font-black text-lg text-gray-900 flex items-center gap-2">
            <ShoppingBag size={20} className="text-indigo-600" /> Pedidos Recibidos ({storeOrders.length})
          </h2>
        </div>

        {storeOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center border border-gray-200 text-gray-500 text-sm">
            🍽️ No hay pedidos activos para este negocio en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storeOrders.map(order => (
              <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">#{order.id}</span>
                    <h4 className="font-bold text-gray-900 mt-1">{order.customerName}</h4>
                    <p className="text-xs text-gray-500">📍 {order.customerAddress}</p>
                  </div>
                  <span className="font-black text-emerald-600 text-base">${order.total} MXN</span>
                </div>

                <div className="space-y-1 text-xs text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <p className="font-bold text-gray-500 uppercase text-[10px]">Detalle de orden ({order.paymentMethod}):</p>
                  {order.items?.map(i => (
                    <div key={i.id} className="flex justify-between">
                      <span>• {i.quantity}x {i.name}</span>
                      <span className="font-semibold">${i.price * i.quantity} MXN</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-gray-500">Estatus:</span>
                  <span className="text-gray-900">{order.status}</span>
                </div>

                {order.status === 'PENDING' && (
                  <button
                    onClick={() => handleAcceptOrder(order.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Check size={16} /> Aceptar y Empezar a Preparar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Agregar Platillo / Producto */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-base text-gray-900">Nuevo Platillo al Menú</h3>
              <button onClick={() => setShowAddProductModal(false)} className="font-bold text-gray-400">✕</button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nombre del Platillo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cecina de Yecapixtla"
                  value={newProductData.name}
                  onChange={e => setNewProductData({ ...newProductData, name: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Precio MXN *</label>
                <input
                  type="number"
                  required
                  step="0.5"
                  placeholder="Ej. 120"
                  value={newProductData.price}
                  onChange={e => setNewProductData({ ...newProductData, price: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descripción / Ingredientes</label>
                <input
                  type="text"
                  placeholder="Ej. Con frijoles, nopales y crema"
                  value={newProductData.description}
                  onChange={e => setNewProductData({ ...newProductData, description: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl">
                Guardar en Menú 🍲
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registro Seguro de Tienda */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-base text-gray-900 flex items-center gap-1.5">
                <ShieldCheck className="text-indigo-600" /> Registro Seguro de Fonda o Tienda
              </h3>
              <button onClick={() => setShowRegisterModal(false)} className="font-bold text-gray-400">✕</button>
            </div>

            <form onSubmit={handleRegisterStore} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nombre Comercial de la Fonda/Tienda *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Fonda La Tequisquiapense"
                  value={newStoreData.name}
                  onChange={e => setNewStoreData({ ...newStoreData, name: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Categoría del Negocio *</label>
                <select
                  value={newStoreData.category}
                  onChange={e => setNewStoreData({ ...newStoreData, category: e.target.value })}
                  className="w-full p-2 border rounded-xl bg-white"
                >
                  <option value="Cocina Económica & Fondas">Cocina Económica & Fondas</option>
                  <option value="Restaurantes & Antojitos">Restaurantes & Antojitos</option>
                  <option value="Tiendas & Conveniencia">Tiendas & Conveniencia</option>
                  <option value="Panaderías & Postres">Panaderías & Postres</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Dirección Física en Tequisquiapan *</label>
                <input
                  type="text"
                  required
                  placeholder="Calle y Número, Colonia"
                  value={newStoreData.address}
                  onChange={e => setNewStoreData({ ...newStoreData, address: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nombre del Titular *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Elizondo"
                    value={newStoreData.ownerName}
                    onChange={e => setNewStoreData({ ...newStoreData, ownerName: e.target.value })}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Clave INE / ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="ELZC8209..."
                    value={newStoreData.ownerIne}
                    onChange={e => setNewStoreData({ ...newStoreData, ownerIne: e.target.value })}
                    className="w-full p-2 border rounded-xl uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">RFC / Constancia Fiscal (Opcional)</label>
                <input
                  type="text"
                  placeholder="ELZC820910XXX"
                  value={newStoreData.rfc}
                  onChange={e => setNewStoreData({ ...newStoreData, rfc: e.target.value })}
                  className="w-full p-2 border rounded-xl uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">CLABE Interbancaria (18 dígitos para depósitos) *</label>
                <input
                  type="text"
                  required
                  maxLength={18}
                  placeholder="012680001234567890"
                  value={newStoreData.clabe}
                  onChange={e => setNewStoreData({ ...newStoreData, clabe: e.target.value })}
                  className="w-full p-2 border rounded-xl font-mono text-xs"
                />
              </div>

              <div className="bg-indigo-50 p-2.5 rounded-xl text-[11px] text-indigo-900 border border-indigo-200">
                🔒 Tus datos fiscales y bancarios están protegidos. Las liquidaciones de ventas se transfieren directamente a tu cuenta bancaria.
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-md">
                Registrar Fonda/Tienda Segura 🏪
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
