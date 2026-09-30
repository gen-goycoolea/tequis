import React, { useState, useEffect } from 'react';
import { ShoppingBag, Bike, Star, Clock, MapPin, CheckCircle, Plus, Minus, ArrowRight, Key, ShieldCheck, Lock, Smartphone, LogOut, CreditCard } from 'lucide-react';
import MapComponent from './components/MapComponent';
import LegalModal from './components/LegalModal';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(API_BASE);

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('tequis_client_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [authStep, setAuthStep] = useState('PHONE'); // PHONE | OTP_VERIFY
  const [phoneInput, setPhoneInput] = useState('4411234567');
  const [nameInput, setNameInput] = useState('');
  const [addressInput, setAddressInput] = useState('Calle Juárez #12, Tequisquiapan');
  const [otpInput, setOtpInput] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [authError, setAuthError] = useState('');

  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo al entregar');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  const categories = ['TODOS', 'Cocina Económica & Fondas', 'Restaurantes & Antojitos', 'Tiendas & Conveniencia'];

  useEffect(() => {
    if (currentUser) {
      fetchStores();
      fetchOrders();
      fetchRiders();

      socket.on('new_order', o => setOrders(prev => [o, ...prev]));
      socket.on('order_updated', o => setOrders(prev => prev.map(item => item.id === o.id ? o : item)));
      socket.on('stores_updated', s => setStores(s));
      socket.on('riders_updated', r => setRiders(r));
      socket.on('rider_location_changed', d => {
        setRiders(prev => prev.map(r => r.id === d.riderId ? { ...r, currentLocation: d.location } : r));
      });

      return () => {
        socket.off('new_order');
        socket.off('order_updated');
        socket.off('stores_updated');
        socket.off('riders_updated');
        socket.off('rider_location_changed');
      };
    }
  }, [currentUser]);

  const fetchStores = () => fetch(`${API_BASE}/api/stores`).then(r => r.json()).then(setStores);
  const fetchOrders = () => fetch(`${API_BASE}/api/orders`).then(r => r.json()).then(setOrders);
  const fetchRiders = () => fetch(`${API_BASE}/api/riders`).then(r => r.json()).then(setRiders);

  // --- SOLICITAR CÓDIGO SMS OTP ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!phoneInput || phoneInput.length < 10) {
      setAuthError('Ingresa un teléfono celular válido de 10 dígitos');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error);
        return;
      }
      setDemoOtp(data.demoOtp);
      // Si el SMS fue enviado vía Twilio real, dejamos el campo listo para escribir.
      // Si es modo prueba/demo, autocompletamos con demoOtp.
      setOtpInput(data.smsSentReal ? '' : data.demoOtp);
      setAuthStep('OTP_VERIFY');
    } catch (err) {
      setAuthError('Error conectando con el servidor');
    }
  };

  // --- REGISTRAR Y VALIDAR CÓDIGO OTP ---
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!nameInput) {
      setAuthError('Por favor escribe tu Nombre Completo');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneInput,
          name: nameInput,
          address: addressInput,
          code: otpInput
        })
      });
      const user = await res.json();
      if (!res.ok) {
        setAuthError(user.error);
        return;
      }

      setCurrentUser(user);
      localStorage.setItem('tequis_client_user', JSON.stringify(user));
    } catch (err) {
      setAuthError('Error validando registro');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tequis_client_user');
    setAuthStep('PHONE');
  };

  const addToCart = (product, store) => {
    if (cart.length > 0 && cart[0].storeId !== store.id) {
      if (!confirm('Tu carrito contiene productos de otro comercio. ¿Vaciar carrito?')) return;
      setCart([{ ...product, storeId: store.id, quantity: 1 }]);
      setSelectedStore(store);
      return;
    }
    setSelectedStore(store);
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, storeId: store.id, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing.quantity === 1) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();

    // Si es pago online
    if (paymentMethod === 'MercadoPago') {
      try {
        await fetch(`${API_BASE}/api/payments/mercadopago/create-preference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: cart, total: grandTotal })
        });
      } catch (err) {
        console.log('Procesando pago MercadoPago...');
      }
    } else if (paymentMethod === 'Stripe') {
      try {
        await fetch(`${API_BASE}/api/payments/stripe/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: grandTotal })
        });
      } catch (err) {
        console.log('Procesando pago Stripe...');
      }
    }

    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: selectedStore.id,
        items: cart,
        customerName: currentUser.name,
        customerAddress: currentUser.address,
        customerPhone: currentUser.phone,
        paymentMethod
      })
    });
    const newOrder = await res.json();
    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setShowCheckoutModal(false);
  };

  const activeOrders = orders.filter(o => o.status !== 'DELIVERED');
  const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
  const grandTotal = subtotal + 25;

  const filteredStores = activeCategory === 'TODOS'
    ? stores
    : stores.filter(s => s.category === activeCategory);

  // --- MURO DE SEGURIDAD: PANTALLA DE INICIO DE SESIÓN / REGISTRO OBLIGATORIO ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-700 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-rose-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-900/50">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black">Acceso Exclusivo Comprador</h2>
            <p className="text-xs text-gray-400">
              Por seguridad de las fondas y tiendas de Tequisquiapan, debes verificar tu celular antes de hacer pedidos.
            </p>
          </div>

          {authError && (
            <div className="bg-rose-900/50 border border-rose-500 text-rose-200 text-xs p-3 rounded-xl font-semibold">
              {authError}
            </div>
          )}

          {authStep === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-300 mb-1">Teléfono Celular de Tequisquiapan (10 dígitos) *</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="441 123 4567"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm font-mono text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all text-sm"
              >
                Enviar Código SMS de Verificación 📱
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4 text-xs">
              <div className="bg-rose-950 p-3 rounded-xl border border-rose-800 text-rose-200 text-[11px]">
                Código SMS enviado a <strong>{phoneInput}</strong>. (Código Demo: <strong>{demoOtp}</strong>)
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">Tu Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María Elena Gómez"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">Dirección de Entrega en Tequisquiapan *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Calle Juárez #12, Centro"
                  value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">Código de 4 dígitos *</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="0000"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value)}
                  className="w-full text-center text-2xl font-black font-mono tracking-widest py-2 rounded-xl bg-gray-900 border border-rose-500 text-white outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthStep('PHONE')}
                  className="w-1/3 bg-gray-700 text-gray-300 font-bold py-3 rounded-xl"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-sm"
                >
                  Entrar y Ver Menú 🛍️
                </button>
              </div>
            </form>
          )}

          <div className="text-center pt-2">
            <button onClick={() => setIsLegalOpen(true)} className="text-[11px] text-gray-400 hover:text-white underline">
              Aviso de Privacidad Integral (LFPDPPP)
            </button>
          </div>

          <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
        </div>
      </div>
    );
  }

  // --- INTERFAZ DESBLOQUEADA PARA USUARIOS REGISTRADOS ---
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 pb-20">
      {/* Header Cliente */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 text-white p-2 rounded-xl font-black text-lg shadow-md flex items-center gap-1">
              <span>Tequis</span><Bike size={20} />
            </div>
            <div>
              <h1 className="font-black text-gray-900 text-lg">TequisDelivery Cliente</h1>
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <ShieldCheck size={12} /> Sesión de {currentUser.name} ({currentUser.phone})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setIsLegalOpen(true)} className="text-xs font-bold text-gray-500 hover:text-rose-600 underline">
              Privacidad
            </button>
            <button onClick={handleLogout} className="bg-gray-100 p-2 rounded-xl text-gray-600 hover:bg-rose-50 hover:text-rose-600">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <MapPin size={14} /> Tequisquiapan, Qro. • Usuario Verificado
            </div>
            <h2 className="text-2xl font-black">Hola {currentUser.name.split(' ')[0]} 👋</h2>
            <p className="text-rose-100 text-sm mt-1">Pide a domicilio en tus fondas y tiendas locales.</p>
          </div>
          <div className="bg-white text-rose-700 px-4 py-2.5 rounded-xl font-bold shadow-md text-sm">
            Envío local $25 MXN
          </div>
        </div>

        {/* Mapa Bicis */}
        <div>
          <h3 className="font-bold text-gray-800 text-sm mb-2">📍 Bicicletas activas cerca ({riders.length})</h3>
          <MapComponent riders={riders} />
        </div>

        {/* Pedido Activo con PIN */}
        {activeOrders.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-amber-900">Pedido en curso #{activeOrders[0].id}</h3>
              <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full uppercase">
                {activeOrders[0].status}
              </span>
            </div>

            <div className="bg-gradient-to-r from-amber-500 to-rose-600 text-white p-3 rounded-xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="text-amber-200" size={24} />
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-100">Tu PIN Secreto de Entrega:</p>
                  <p className="text-2xl font-black font-mono tracking-widest">{activeOrders[0].deliveryPin}</p>
                </div>
              </div>
              <p className="text-[11px] text-amber-100 max-w-[160px] text-right">🔒 Dale este PIN al repartidor al recibir tu pedido.</p>
            </div>
          </div>
        )}

        {/* Categorías */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs ${
                activeCategory === cat ? 'bg-rose-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Comercios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStores.map(store => (
            <div key={store.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{store.category}</span>
                  <h4 className="font-bold text-gray-900 text-base mt-1">{store.name}</h4>
                  <p className="text-xs text-gray-500">📍 {store.address}</p>
                </div>
                <span className="text-xs font-bold text-amber-500">★ {store.rating}</span>
              </div>

              <div className="space-y-2 border-t pt-2">
                {store.products.map(prod => {
                  const inCart = cart.find(i => i.id === prod.id);
                  return (
                    <div key={prod.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-xl text-xs">
                      <div>
                        <p className="font-bold text-gray-800">{prod.name}</p>
                        <p className="text-gray-500">${prod.price} MXN</p>
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-2 bg-rose-600 text-white rounded-lg px-2 py-1">
                          <button onClick={() => removeFromCart(prod.id)}><Minus size={12} /></button>
                          <span className="font-bold">{inCart.quantity}</span>
                          <button onClick={() => addToCart(prod, store)}><Plus size={12} /></button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(prod, store)} className="bg-rose-100 text-rose-700 font-bold p-1 rounded-lg">
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Carrito Flotante */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl z-40 flex justify-between items-center">
          <div>
            <p className="text-xs text-rose-400 font-bold">{selectedStore?.name}</p>
            <p className="font-bold">{cart.reduce((s, i) => s + i.quantity, 0)} items • ${grandTotal} MXN</p>
          </div>
          <button onClick={() => setShowCheckoutModal(true)} className="bg-rose-600 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1">
            Ver Pedido <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Modal Checkout */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-base text-gray-900">Confirmar Pedido Seguro</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="font-bold text-gray-400">✕</button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-3">
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">
                Cliente Verificado: <strong>{currentUser.name}</strong> ({currentUser.phone})
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Dirección Tequisquiapan *</label>
                <input type="text" required value={currentUser.address} onChange={e => setCurrentUser({ ...currentUser, address: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Método de Pago *</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border rounded-xl bg-white font-semibold text-gray-800"
                >
                  <option value="Efectivo al entregar">💵 Efectivo al entregar</option>
                  <option value="MercadoPago">💳 Tarjeta / MercadoPago</option>
                  <option value="Stripe">💳 Tarjeta / Stripe</option>
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Subtotal productos:</span>
                  <span>${subtotal} MXN</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Envío en bici local:</span>
                  <span>$25 MXN</span>
                </div>
                <div className="flex justify-between text-base font-black text-rose-600 border-t pt-1">
                  <span>Total a pagar:</span>
                  <span>${grandTotal} MXN</span>
                </div>
              </div>

              <button type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-md text-sm">
                Confirmar y Pedir (${grandTotal} MXN) 🛍️
              </button>
            </form>
          </div>
        </div>
      )}

      <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
    </div>
  );
}
