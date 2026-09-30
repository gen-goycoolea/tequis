import React, { useState, useEffect } from 'react';
import { ShoppingBag, Bike, Store, ShieldCheck, MapPin, Lock, FileText } from 'lucide-react';
import ClientView from './components/ClientView';
import RiderView from './components/RiderView';
import StoreView from './components/StoreView';
import LegalModal from './components/LegalModal';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:4000';
const socket = io(API_BASE);

export default function App() {
  const [activeRole, setActiveRole] = useState('CLIENT');
  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Estado Modal Legal
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalDefaultTab, setLegalDefaultTab] = useState('PRIVACY');

  useEffect(() => {
    fetchStores();
    fetchOrders();
    fetchRiders();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new_order', (newOrder) => {
      setOrders(prev => [newOrder, ...prev]);
    });

    socket.on('order_updated', (updatedOrder) => {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    });

    socket.on('riders_updated', (updatedRiders) => {
      setRiders(updatedRiders);
    });

    socket.on('rider_location_changed', (data) => {
      setRiders(prev => prev.map(r => r.id === data.riderId ? { ...r, currentLocation: data.location } : r));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_order');
      socket.off('order_updated');
      socket.off('riders_updated');
      socket.off('rider_location_changed');
    };
  }, []);

  const fetchStores = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stores`);
      const data = await res.json();
      setStores(data);
    } catch (e) {
      console.error('Error fetching stores', e);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      console.error('Error fetching orders', e);
    }
  };

  const fetchRiders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/riders`);
      const data = await res.json();
      setRiders(data);
    } catch (e) {
      console.error('Error fetching riders', e);
    }
  };

  const handleCreateOrder = async (orderData) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const newOrder = await res.json();
      setOrders(prev => [newOrder, ...prev]);
    } catch (e) {
      alert('Error creando pedido');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status, riderId = null, inputPin = null) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, riderId, inputPin })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error actualizando pedido');
        return;
      }
      setOrders(prev => prev.map(o => o.id === data.id ? data : o));
    } catch (e) {
      alert('Error actualizando pedido');
    }
  };

  const handleRegisterRider = async (riderData) => {
    try {
      const res = await fetch(`${API_BASE}/api/riders/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(riderData)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error en el registro de repartidor');
        return;
      }
      setRiders(prev => [...prev, data]);
      alert(`¡Bienvenido ${data.name}! Registrado y verificado correctamente.`);
    } catch (e) {
      alert('Error registrando repartidor');
    }
  };

  const handleUpdateLocation = (locationData) => {
    socket.emit('update_location', locationData);
  };

  const openLegalModal = (tab) => {
    setLegalDefaultTab(tab);
    setIsLegalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 text-white p-2 rounded-xl font-black text-lg shadow-md flex items-center gap-1">
              <span>Tequis</span><Bike size={20} />
            </div>
            <div>
              <h1 className="font-black text-gray-900 leading-none text-base md:text-lg">TequisDelivery 🛡️</h1>
              <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                <MapPin size={10} className="text-rose-600" /> Tequisquiapan, Querétaro • Seguro & Legal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${isConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              {isConnected ? 'Sistema Seguro Activo' : 'Conectando...'}
            </span>
          </div>
        </div>

        {/* Roles */}
        <div className="max-w-6xl mx-auto px-4 border-t border-gray-100 flex gap-2 py-2 overflow-x-auto">
          <button
            onClick={() => setActiveRole('CLIENT')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeRole === 'CLIENT'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ShoppingBag size={14} /> Cliente 🛍️
          </button>

          <button
            onClick={() => setActiveRole('RIDER')}
            className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeRole === 'RIDER'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Bike size={14} /> Repartidor Bici 🚴‍♂️
          </button>

          <button
            onClick={() => setActiveRole('STORE')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeRole === 'STORE'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Store size={14} /> Negocios 🏪
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        {activeRole === 'CLIENT' && (
          <ClientView
            stores={stores}
            orders={orders}
            riders={riders}
            onCreateOrder={handleCreateOrder}
          />
        )}

        {activeRole === 'RIDER' && (
          <RiderView
            riders={riders}
            orders={orders}
            onRegisterRider={handleRegisterRider}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateLocation={handleUpdateLocation}
            onOpenLegalModal={openLegalModal}
          />
        )}

        {activeRole === 'STORE' && (
          <StoreView
            stores={stores}
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}
      </main>

      {/* Footer Legal */}
      <footer className="bg-white border-t border-gray-200 py-4 px-4 text-center text-xs text-gray-500 space-y-2">
        <div className="flex justify-center items-center gap-4 text-gray-600 font-semibold text-[11px]">
          <button onClick={() => openLegalModal('PRIVACY')} className="hover:text-rose-600 flex items-center gap-1 underline">
            <Lock size={12} /> Aviso de Privacidad (LFPDPPP)
          </button>
          <span>•</span>
          <button onClick={() => openLegalModal('TERMS')} className="hover:text-rose-600 flex items-center gap-1 underline">
            <FileText size={12} /> Términos & Carta Responsiva Repartidor
          </button>
        </div>
        <p className="font-semibold text-gray-700">TequisDelivery • Tequisquiapan, Qro.</p>
        <p className="text-[10px] text-gray-400">Protección legal LFPDPPP y validación de entregas mediante PIN secreto de 4 dígitos.</p>
      </footer>

      {/* Modal Legal */}
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        defaultTab={legalDefaultTab}
      />
    </div>
  );
}
