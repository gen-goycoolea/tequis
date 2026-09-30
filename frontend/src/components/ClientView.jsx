import React, { useState } from 'react';
import {
  ShoppingBag, Star, Clock, MapPin, CheckCircle, Plus, Minus, ArrowRight,
  Bike, ShieldCheck, Key, Search, X, History, ChevronRight, Image
} from 'lucide-react';
import MapComponent from './MapComponent';
import { useToast } from './ToastProvider';

const API_BASE = 'http://localhost:4000';

// ─── StarRating Component ────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 28, readOnly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange && onChange(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={`transition-transform ${!readOnly ? 'hover:scale-110' : ''}`}
        >
          <Star
            size={size}
            className={`transition-colors ${
              star <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── RatingModal Component ───────────────────────────────────────────────────
function RatingModal({ order, onClose, onSubmit }) {
  const [ratingStore, setRatingStore] = useState(5);
  const [ratingRider, setRatingRider] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ orderId: order.id, storeId: order.storeId, riderId: order.assignedRider?.id, ratingStore, ratingRider, comment });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="text-amber-400 fill-amber-400" size={20} /> Calificar Pedido
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Califica al comercio: <span className="text-rose-600">{order.storeName}</span>
            </p>
            <StarRating value={ratingStore} onChange={setRatingStore} />
          </div>

          {order.assignedRider && (
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Califica al repartidor: <span className="text-emerald-600">{order.assignedRider.name}</span>
              </p>
              <StarRating value={ratingRider} onChange={setRatingRider} />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Comentario (opcional)</label>
            <textarea
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="¿Cómo fue tu experiencia?"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 resize-none focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-2xl shadow-lg text-sm flex justify-center items-center gap-2 disabled:opacity-60 transition-all"
          >
            <CheckCircle size={18} /> Enviar Calificación ⭐
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main ClientView ─────────────────────────────────────────────────────────
export default function ClientView({ stores, orders, riders, onCreateOrder }) {
  const toast = useToast();

  const [tab, setTab] = useState('TIENDAS'); // 'TIENDAS' | 'PEDIDOS'
  const [selectedStore, setSelectedStore] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [ratedOrderIds, setRatedOrderIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tequis_rated') || '[]'); } catch { return []; }
  });
  const [customerInfo, setCustomerInfo] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tequis_customer') || '{}');
      return {
        name: saved.name || '',
        address: saved.address || 'Calle Juárez #12, Centro, Tequisquiapan',
        phone: saved.phone || '',
        paymentMethod: 'Efectivo al entregar'
      };
    } catch {
      return { name: '', address: 'Calle Juárez #12, Centro, Tequisquiapan', phone: '', paymentMethod: 'Efectivo al entregar' };
    }
  });

  const categories = ['TODOS', 'Cocina Económica & Fondas', 'Restaurantes & Antojitos', 'Tiendas & Conveniencia'];

  const filteredStores = stores.filter(s => {
    const matchesCategory = activeCategory === 'TODOS' || s.category === activeCategory;
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Historial del cliente
  const myOrders = customerInfo.phone
    ? orders.filter(o => o.customerPhone === customerInfo.phone)
    : orders.filter(o => o.customerName && customerInfo.name && o.customerName === customerInfo.name);

  const addToCart = (product, store) => {
    if (cart.length > 0 && cart[0].storeId !== store.id) {
      if (!confirm('Tu carrito contiene productos de otro comercio. ¿Deseas vaciarlo?')) return;
      setCart([{ ...product, storeId: store.id, quantity: 1 }]);
      setSelectedStore(store);
      toast('Carrito actualizado', 'info');
      return;
    }
    setSelectedStore(store);
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, storeId: store.id, quantity: 1 }];
    });
    toast(`${product.name} agregado al carrito`, 'success', 2000);
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing.quantity === 1) return prev.filter(item => item.id !== productId);
      return prev.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 25;
  const grandTotal = subtotal + deliveryFee;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!customerInfo.name || !customerInfo.address) {
      toast('Por favor ingresa tu nombre y dirección', 'error');
      return;
    }
    localStorage.setItem('tequis_customer', JSON.stringify({ name: customerInfo.name, address: customerInfo.address, phone: customerInfo.phone }));

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStore.id,
          items: cart,
          customerName: customerInfo.name,
          customerAddress: customerInfo.address,
          customerPhone: customerInfo.phone,
          paymentMethod: customerInfo.paymentMethod
        })
      });
      const newOrder = await res.json();
      if (!res.ok) { toast(newOrder.error || 'Error creando pedido', 'error'); return; }
      onCreateOrder(newOrder);
      setCart([]);
      setShowCheckoutModal(false);
      toast(`¡Pedido ${newOrder.id} creado! Tu PIN: ${newOrder.deliveryPin}`, 'success', 6000);
      setTab('PEDIDOS');
    } catch {
      toast('Error de conexión al crear pedido', 'error');
    }
  };

  const handleSubmitRating = async (ratingData) => {
    try {
      const res = await fetch(`${API_BASE}/api/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ratingData)
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || 'Error al calificar', 'error'); return; }
      const updated = [...ratedOrderIds, ratingData.orderId];
      setRatedOrderIds(updated);
      localStorage.setItem('tequis_rated', JSON.stringify(updated));
      toast('¡Gracias por tu calificación! ⭐', 'success');
    } catch {
      toast('Error al enviar calificación', 'error');
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'DELIVERED');
  const STATUS_LABEL = {
    PENDING: { label: 'Esperando Comercio', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
    ACCEPTED: { label: '🔥 En Preparación', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    ON_THE_WAY: { label: '🚴‍♂️ En Camino en Bici', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
    DELIVERED: { label: '✅ Entregado', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  };

  return (
    <div className="space-y-6">

      {/* Banner */}
      <div className="bg-gradient-to-r from-rose-600 to-rose-700 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <MapPin size={14} /> Tequisquiapan, Qro. • Entrega Segura en Bici
          </div>
          <h2 className="text-2xl font-black tracking-tight">Pide en tus fondas y tiendas favoritas</h2>
          <p className="text-rose-100 text-sm mt-1">Repartidores verificados con INE y código PIN de entrega irrefutable.</p>
        </div>
        <div className="flex items-center gap-2 bg-white text-rose-700 px-4 py-2.5 rounded-xl font-bold shadow-md">
          <Bike size={20} />
          <span>Envío local $25 MXN</span>
        </div>
      </div>

      {/* Mapa */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base flex items-center gap-2">
            <Bike className="text-rose-600" size={18} /> Repartidores activos ({riders.length})
          </h3>
        </div>
        <MapComponent riders={riders} />
      </div>

      {/* Pedido Activo */}
      {activeOrders.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              Pedido en curso #{activeOrders[0].id}
            </h3>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${STATUS_LABEL[activeOrders[0].status]?.color}`}>
              {STATUS_LABEL[activeOrders[0].status]?.label}
            </span>
          </div>

          <div className="bg-gradient-to-r from-amber-500 to-rose-600 text-white p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="text-amber-200 animate-pulse" size={24} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-100">Tu PIN de Seguridad:</p>
                <p className="text-2xl font-black tracking-widest font-mono">{activeOrders[0].deliveryPin}</p>
              </div>
            </div>
            <div className="text-[11px] text-amber-100 max-w-[180px] text-right">
              🔒 Dáselo al ciclista <strong>SOLO al recibir tu paquete</strong>.
            </div>
          </div>

          <p className="text-xs text-amber-900 dark:text-amber-300">
            <strong>{activeOrders[0].storeName}</strong> • {activeOrders[0].items.length} productos • Total: ${activeOrders[0].total} MXN
          </p>

          {activeOrders[0].assignedRider && (
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-xs flex justify-between items-center">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Repartidor asignado:</span>
                <p className="font-bold text-gray-800 dark:text-gray-100">{activeOrders[0].assignedRider.name}</p>
                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={12} /> Verificado con INE
                </p>
              </div>
              <span className="text-rose-600 font-bold bg-rose-50 dark:bg-rose-950 px-2.5 py-1 rounded-lg">En camino 🚲</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('TIENDAS')}
          className={`pb-2 px-4 font-bold text-sm border-b-2 transition-colors ${tab === 'TIENDAS' ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          🏪 Tiendas
        </button>
        <button
          onClick={() => setTab('PEDIDOS')}
          className={`pb-2 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-1 ${tab === 'PEDIDOS' ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          <History size={15} /> Mis Pedidos {myOrders.length > 0 && <span className="bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-200 text-[10px] font-bold px-1.5 rounded-full">{myOrders.length}</span>}
        </button>
      </div>

      {/* ── TAB: TIENDAS ─────────────────────────────── */}
      {tab === 'TIENDAS' && (
        <>
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar comercio por nombre o categoría..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-rose-500 outline-none shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Categorías */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl font-medium text-xs md:text-sm transition-all shadow-sm ${
                  activeCategory === cat
                    ? 'bg-rose-600 text-white shadow-rose-200'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sin resultados */}
          {filteredStores.length === 0 && (
            <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl text-center border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <Search size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold">No se encontraron comercios</p>
              <p className="text-xs mt-1">Prueba con otro nombre o categoría</p>
            </div>
          )}

          {/* Comercios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredStores.map(store => (
              <div key={store.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="relative h-40 overflow-hidden">
                  <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-white/95 dark:bg-gray-900/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1 shadow-sm">
                    <Star size={12} className="text-amber-500 fill-amber-500" /> {store.rating}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[11px] font-bold tracking-wider text-rose-600 uppercase bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-md self-start">
                    {store.category}
                  </span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg mt-1">{store.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                    <MapPin size={12} /> {store.address}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <span className="flex items-center gap-1"><Clock size={14} /> {store.deliveryTime}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Mínimo ${store.minOrder} MXN</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Menú disponible:</p>
                    {store.products.map(prod => {
                      const inCart = cart.find(i => i.id === prod.id);
                      return (
                        <div key={prod.id} className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl flex justify-between items-center border border-gray-100 dark:border-gray-600 gap-2">
                          {/* Imagen del producto */}
                          {prod.image ? (
                            <img src={prod.image} alt={prod.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0 text-lg">
                              🍽️
                            </div>
                          )}
                          <div className="flex-1 min-w-0 pr-1">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{prod.name}</p>
                            {prod.description && <p className="text-[10px] text-gray-400 truncate">{prod.description}</p>}
                            <p className="text-[11px] text-rose-600 font-bold">${prod.price} MXN</p>
                          </div>
                          {inCart ? (
                            <div className="flex items-center gap-2 bg-rose-600 text-white rounded-lg px-2 py-1 text-xs shrink-0">
                              <button onClick={() => removeFromCart(prod.id)}><Minus size={14} /></button>
                              <span className="font-bold">{inCart.quantity}</span>
                              <button onClick={() => addToCart(prod, store)}><Plus size={14} /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(prod, store)}
                              className="bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-700 dark:text-rose-300 font-bold p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors shrink-0"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── TAB: MIS PEDIDOS ─────────────────────────── */}
      {tab === 'PEDIDOS' && (
        <div className="space-y-4">
          {myOrders.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl text-center border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <ShoppingBag size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-semibold">Sin pedidos aún</p>
              <p className="text-xs mt-1">
                {customerInfo.phone
                  ? 'Haz tu primer pedido desde la pestaña Tiendas 🏪'
                  : 'Ingresa tu teléfono al hacer un pedido para ver tu historial'}
              </p>
            </div>
          ) : (
            myOrders.map(order => {
              const st = STATUS_LABEL[order.status] || {};
              const alreadyRated = ratedOrderIds.includes(order.id);
              return (
                <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">#{order.id}</span>
                        <h4 className="font-bold text-gray-900 dark:text-white">{order.storeName}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        <p className="font-black text-emerald-600 dark:text-emerald-400 mt-1">${order.total} MXN</p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2.5 space-y-1">
                      {order.items.map(i => (
                        <div key={i.id} className="flex justify-between">
                          <span>{i.quantity}x {i.name}</span>
                          <span>${i.price * i.quantity} MXN</span>
                        </div>
                      ))}
                    </div>

                    {order.status === 'DELIVERED' && !alreadyRated && (
                      <button
                        onClick={() => setRatingOrder(order)}
                        className="w-full flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-bold py-2.5 rounded-xl text-xs transition-all"
                      >
                        <Star size={15} className="text-amber-500 fill-amber-500" /> Calificar este pedido
                        <ChevronRight size={14} />
                      </button>
                    )}

                    {alreadyRated && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle size={14} /> Pedido calificado. ¡Gracias!
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Carrito flotante */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl z-40 border border-gray-700 flex justify-between items-center">
          <div>
            <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider">{selectedStore?.name}</span>
            <p className="font-bold text-base">{cart.reduce((s, i) => s + i.quantity, 0)} productos • ${grandTotal} MXN</p>
          </div>
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="bg-rose-600 hover:bg-rose-500 font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-1.5 shadow-lg transition-all"
          >
            Ver Pedido <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Modal Checkout */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
              <h3 className="font-black text-xl text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="text-rose-600" /> Confirmar Pedido
              </h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl space-y-2 border border-gray-200 dark:border-gray-700 text-xs">
                <p className="font-bold text-gray-500 dark:text-gray-400 uppercase">Comercio: {selectedStore?.name}</p>
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-gray-800 dark:text-gray-200">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-semibold">${item.price * item.quantity} MXN</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Envío en Bici</span><span>${deliveryFee} MXN</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between font-black text-sm text-gray-900 dark:text-white">
                  <span>Total a pagar</span><span className="text-rose-600">${grandTotal} MXN</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tu Nombre Completo *</label>
                <input type="text" required placeholder="Ej. María Elena"
                  value={customerInfo.name} onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Dirección de Entrega *</label>
                <input type="text" required placeholder="Calle, número, colonia"
                  value={customerInfo.address} onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Teléfono de Contacto</label>
                <input type="tel" placeholder="441 123 4567"
                  value={customerInfo.phone} onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Forma de Pago</label>
                <select value={customerInfo.paymentMethod} onChange={e => setCustomerInfo({ ...customerInfo, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="Efectivo al entregar">💵 Efectivo al entregar</option>
                  <option value="Transferencia / Mercado Pago">📱 Transferencia / Mercado Pago</option>
                </select>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800 text-[11px] text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <ShieldCheck size={16} className="shrink-0 text-rose-600" />
                <span>Se generará un <strong>PIN Secreto de 4 dígitos</strong> para validar tu entrega.</span>
              </div>

              <button type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-2xl shadow-lg transition-all text-sm flex justify-center items-center gap-2">
                <CheckCircle size={18} /> Confirmar Pedido Seguro
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Calificación */}
      {ratingOrder && (
        <RatingModal
          order={ratingOrder}
          onClose={() => setRatingOrder(null)}
          onSubmit={handleSubmitRating}
        />
      )}
    </div>
  );
}
