import React, { useState, useEffect } from 'react';
import { Bike, Navigation, CheckCircle, UserPlus, ShieldCheck, Zap, Lock, Key, FileText } from 'lucide-react';
import MapComponent from './components/MapComponent';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(API_BASE);

export default function App() {
  const [riders, setRiders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [pinInputModalOrder, setPinInputModalOrder] = useState(null);
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [newRiderData, setNewRiderData] = useState({
    name: '',
    vehicleType: 'Bicicleta Normal',
    phone: '',
    ine: '',
    curp: '',
    address: '',
    acceptTerms: false
  });

  useEffect(() => {
    fetchRiders();
    fetchOrders();

    socket.on('new_order', o => setOrders(prev => [o, ...prev]));
    socket.on('order_updated', o => setOrders(prev => prev.map(item => item.id === o.id ? o : item)));
    socket.on('riders_updated', r => setRiders(r));
    socket.on('rider_location_changed', d => {
      setRiders(prev => prev.map(r => r.id === d.riderId ? { ...r, currentLocation: d.location } : r));
    });

    return () => {
      socket.off('new_order');
      socket.off('order_updated');
      socket.off('riders_updated');
      socket.off('rider_location_changed');
    };
  }, []);

  useEffect(() => {
    if (riders.length > 0 && !selectedRider) {
      setSelectedRider(riders[0]);
    }
  }, [riders]);

  const fetchRiders = () => fetch(`${API_BASE}/api/riders`).then(r => r.json()).then(setRiders);
  const fetchOrders = () => fetch(`${API_BASE}/api/orders`).then(r => r.json()).then(setOrders);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!newRiderData.name || !newRiderData.ine || !newRiderData.phone) {
      alert('Ingresa tu Nombre, Teléfono e INE para verificación');
      return;
    }
    if (!newRiderData.acceptTerms) {
      alert('Debes aceptar la Carta Responsiva para registrarte');
      return;
    }

    const res = await fetch(`${API_BASE}/api/riders/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRiderData)
    });
    const data = await res.json();
    setRiders(prev => [...prev, data]);
    setSelectedRider(data);
    setShowRegisterModal(false);
  };

  const handleAcceptOrder = async (orderId) => {
    await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ON_THE_WAY', riderId: selectedRider?.id })
    });
  };

  const handleConfirmPinDelivery = async (e) => {
    e.preventDefault();
    setPinError('');

    const res = await fetch(`${API_BASE}/api/orders/${pinInputModalOrder.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DELIVERED', inputPin })
    });
    const data = await res.json();
    if (!res.ok) {
      setPinError(data.error || 'PIN Incorrecto');
      return;
    }
    setPinInputModalOrder(null);
    setInputPin('');
  };

  const simulateBikeMovement = () => {
    if (!selectedRider) return;
    let lat = selectedRider.currentLocation?.lat || 20.5222;
    let lng = selectedRider.currentLocation?.lng || -99.8938;

    const interval = setInterval(() => {
      lat += (Math.random() - 0.45) * 0.0005;
      lng += (Math.random() - 0.45) * 0.0005;
      socket.emit('update_location', { riderId: selectedRider.id, lat, lng });
    }, 2500);

    setTimeout(() => clearInterval(interval), 15000);
  };

  const pendingOrders = orders.filter(o => o.status === 'ACCEPTED');
  const myActiveOrders = orders.filter(o => o.assignedRider?.id === selectedRider?.id && o.status === 'ON_THE_WAY');

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 pb-20">
      <header className="bg-emerald-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bike className="text-emerald-400" size={24} />
            <div>
              <h1 className="font-black text-lg">TequisDelivery Repartidor</h1>
              <p className="text-[10px] text-emerald-200">Bicicletas Normales & Eléctricas • Tequisquiapan</p>
            </div>
          </div>
          <button onClick={() => setShowRegisterModal(true)} className="bg-emerald-600 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1">
            <UserPlus size={14} /> Registro INE
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {selectedRider && (
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center text-xs shadow-sm">
            <div>
              <span className="font-bold text-gray-900 text-sm">{selectedRider.name}</span>
              <p className="text-gray-500 font-semibold">{selectedRider.vehicleType} • Estatus: <span className="text-emerald-600">{selectedRider.verifiedStatus}</span></p>
            </div>
            <button onClick={() => setIsOnline(!isOnline)} className={`px-3 py-1.5 rounded-xl font-bold ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
              {isOnline ? '🟢 En Línea' : '🔴 Fuera de Servicio'}
            </button>
          </div>
        )}

        <div>
          <h3 className="font-bold text-gray-800 text-xs mb-2">📍 Tu posición GPS en Tequisquiapan</h3>
          <MapComponent riders={riders} />
        </div>

        {/* Mis Pedidos en Camino */}
        {myActiveOrders.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900">⚡ Mi Pedido en Camino ({myActiveOrders.length})</h3>
            {myActiveOrders.map(order => (
              <div key={order.id} className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-emerald-800">#{order.id}</span>
                    <h4 className="font-bold text-gray-900">{order.storeName}</h4>
                    <p className="text-xs text-gray-600">Cliente: <strong>{order.customerName}</strong> ({order.customerPhone})</p>
                    <p className="text-xs font-bold mt-1">📍 Entregar en: {order.customerAddress}</p>
                  </div>
                  <span className="text-lg font-black text-emerald-700">${order.total} MXN</span>
                </div>

                <div className="flex gap-2">
                  <button onClick={simulateBikeMovement} className="flex-1 bg-amber-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1">
                    <Navigation size={14} /> Mover Bici 🚴‍♂️
                  </button>
                  <button onClick={() => setPinInputModalOrder(order)} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1">
                    <Key size={14} /> Ingresar PIN e Entregar 🔒
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pedidos Disponibles */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">Pedidos disponibles para entregar en bici ({pendingOrders.length})</h3>
          {pendingOrders.map(order => (
            <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-900">{order.storeName}</h4>
                <p className="text-xs text-gray-500">📍 Entrega: {order.customerAddress}</p>
                <p className="text-xs text-emerald-600 font-bold mt-0.5">Ganancia bici: ${order.deliveryFee} MXN</p>
              </div>
              <button onClick={() => handleAcceptOrder(order.id)} disabled={!isOnline} className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs">
                Aceptar y Llevar
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Modal PIN */}
      {pinInputModalOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="font-black text-base text-gray-900">Ingresa el PIN del Cliente</h3>
            <p className="text-xs text-gray-500">Pídele al cliente el PIN de 4 dígitos que aparece en su pantalla.</p>
            <form onSubmit={handleConfirmPinDelivery} className="space-y-3">
              <input type="text" maxLength={4} required placeholder="0000" value={inputPin} onChange={e => setInputPin(e.target.value)} className="w-full text-center text-3xl font-black tracking-widest py-2 border-2 border-amber-400 rounded-xl outline-none" />
              {pinError && <p className="text-xs text-rose-600 font-bold">{pinError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setPinInputModalOrder(null)} className="flex-1 bg-gray-200 py-2 rounded-xl text-xs font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold">Confirmar PIN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registro Repartidor */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs">
            <h3 className="font-black text-base text-gray-900">Registro Seguro de Repartidor</h3>
            <form onSubmit={handleRegister} className="space-y-3">
              <input type="text" required placeholder="Nombre Completo *" value={newRiderData.name} onChange={e => setNewRiderData({ ...newRiderData, name: e.target.value })} className="w-full p-2 border rounded-xl" />
              <input type="tel" required placeholder="Teléfono Móvil *" value={newRiderData.phone} onChange={e => setNewRiderData({ ...newRiderData, phone: e.target.value })} className="w-full p-2 border rounded-xl" />
              <input type="text" required placeholder="Clave INE / ID *" value={newRiderData.ine} onChange={e => setNewRiderData({ ...newRiderData, ine: e.target.value })} className="w-full p-2 border rounded-xl uppercase" />
              <select value={newRiderData.vehicleType} onChange={e => setNewRiderData({ ...newRiderData, vehicleType: e.target.value })} className="w-full p-2 border rounded-xl bg-white">
                <option value="Bicicleta Normal">🚲 Bicicleta Normal</option>
                <option value="Bicicleta Eléctrica">⚡🚲 Bicicleta Eléctrica</option>
              </select>
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input type="checkbox" required checked={newRiderData.acceptTerms} onChange={e => setNewRiderData({ ...newRiderData, acceptTerms: e.target.checked })} />
                <span>Acepto Carta Responsiva y Términos.</span>
              </label>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl">Registrarme</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
