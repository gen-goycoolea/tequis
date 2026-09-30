import React, { useState, useEffect } from 'react';
import { Bike, Navigation, CheckCircle, UserPlus, ShieldCheck, Zap, Lock, Key, FileText } from 'lucide-react';
import MapComponent from './MapComponent';

export default function RiderView({ riders, orders, onRegisterRider, onUpdateOrderStatus, onUpdateLocation, onOpenLegalModal }) {
  const [selectedRider, setSelectedRider] = useState(riders[0] || null);
  const [isOnline, setIsOnline] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // Estado para el modal de ingreso de PIN de entrega
  const [pinInputModalOrder, setPinInputModalOrder] = useState(null);
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Formulario de registro con verificación legal
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
    if (riders.length > 0 && !selectedRider) {
      setSelectedRider(riders[0]);
    }
  }, [riders]);

  const simulateBikeMovement = (order) => {
    if (!selectedRider) return;
    let lat = selectedRider.currentLocation?.lat || 20.5222;
    let lng = selectedRider.currentLocation?.lng || -99.8938;

    const interval = setInterval(() => {
      lat += (Math.random() - 0.45) * 0.0005;
      lng += (Math.random() - 0.45) * 0.0005;

      onUpdateLocation({
        riderId: selectedRider.id,
        lat,
        lng
      });
    }, 2500);

    return () => clearInterval(interval);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!newRiderData.name || !newRiderData.ine || !newRiderData.phone) {
      alert('Debes ingresar tu Nombre, Teléfono e INE para la verificación de seguridad');
      return;
    }
    if (!newRiderData.acceptTerms) {
      alert('Debes aceptar la Carta Responsiva y Términos de Servicio para registrarte');
      return;
    }
    onRegisterRider(newRiderData);
    setShowRegisterModal(false);
    setNewRiderData({ name: '', vehicleType: 'Bicicleta Normal', phone: '', ine: '', curp: '', address: '', acceptTerms: false });
  };

  // Validar PIN de entrega antes de finalizar
  const handleConfirmPinDelivery = (e) => {
    e.preventDefault();
    setPinError('');

    if (!inputPin) {
      setPinError('Ingresa el PIN de 4 dígitos proporcionado por el cliente');
      return;
    }

    if (pinInputModalOrder.deliveryPin !== inputPin) {
      setPinError('❌ PIN Incorrecto. Pídele al cliente el PIN que aparece en su pantalla.');
      return;
    }

    onUpdateOrderStatus(pinInputModalOrder.id, 'DELIVERED', null, inputPin);
    setPinInputModalOrder(null);
    setInputPin('');
  };

  const pendingOrders = orders.filter(o => o.status === 'ACCEPTED');
  const myActiveOrders = orders.filter(o => o.assignedRider?.id === selectedRider?.id && o.status === 'ON_THE_WAY');

  return (
    <div className="space-y-6">
      {/* Header Repartidor */}
      <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-lg border border-emerald-800 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Bike className="text-emerald-400" /> Panel Repartidor • Tequisquiapan
              </h2>
            </div>
            <p className="text-emerald-200 text-xs mt-1">Repartidores verificados legalmente con INE y custodia segura de paquetes.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRider?.id || ''}
              onChange={e => setSelectedRider(riders.find(r => r.id === e.target.value))}
              className="bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl border border-emerald-700 outline-none"
            >
              {riders.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.vehicleType}) - {r.verifiedStatus}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowRegisterModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <UserPlus size={14} /> Registro Seguro INE
            </button>
          </div>
        </div>

        {selectedRider && (
          <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-800 flex flex-wrap justify-between items-center text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></span>
              <div>
                <span className="font-bold">{selectedRider.name}</span>
                <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                  <ShieldCheck size={12} /> Estatus: {selectedRider.verifiedStatus} (INE: {selectedRider.ine})
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                isOnline ? 'bg-emerald-500 text-emerald-950' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {isOnline ? '🟢 En Línea' : '🔴 Fuera de Servicio'}
            </button>
          </div>
        )}
      </div>

      {/* Mapa Tequisquiapan */}
      <div>
        <h3 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
          <Navigation className="text-emerald-600" size={16} /> Mapa GPS Repartidor
        </h3>
        <MapComponent riders={riders} />
      </div>

      {/* Pedido Activo en Camino */}
      {myActiveOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <Zap className="text-amber-500" /> Mi Pedido en Camino ({myActiveOrders.length})
          </h3>
          {myActiveOrders.map(order => (
            <div key={order.id} className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-2xl shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Pedido #{order.id}</span>
                  <h4 className="font-bold text-gray-900 text-lg">{order.storeName}</h4>
                  <p className="text-xs text-gray-600">Cliente: <strong>{order.customerName}</strong> ({order.customerPhone})</p>
                  <p className="text-xs font-bold text-gray-800 mt-1">📍 Entregar en: {order.customerAddress}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-700">${order.total} MXN</span>
                  <p className="text-[11px] text-gray-500">{order.paymentMethod}</p>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs space-y-1">
                <p className="font-bold text-gray-700">Contenido a entregar:</p>
                {order.items.map(item => (
                  <p key={item.id} className="text-gray-600">• {item.quantity}x {item.name}</p>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => simulateBikeMovement(order)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm"
                >
                  <Navigation size={14} /> Simular Mover Bici 🚴‍♂️
                </button>
                <button
                  onClick={() => setPinInputModalOrder(order)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm"
                >
                  <Key size={14} /> Pedir PIN e Entregar 🔒
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pedidos Disponibles */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-800 text-base">
          Pedidos disponibles para entregar en bici ({pendingOrders.length})
        </h3>

        {pendingOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center border border-gray-200 text-gray-500 text-sm">
            🚲 No hay pedidos pendientes de recolección en este momento en Tequisquiapan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingOrders.map(order => (
              <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3 hover:border-emerald-300 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold text-gray-400">#{order.id}</span>
                    <h4 className="font-bold text-gray-900">{order.storeName}</h4>
                    <p className="text-xs text-gray-500">📍 Entrega: {order.customerAddress}</p>
                  </div>
                  <span className="font-black text-rose-600 text-sm">${order.total} MXN</span>
                </div>

                <div className="text-xs bg-gray-50 p-2 rounded-lg text-gray-600">
                  Ganancia repartidor bici: <strong className="text-emerald-600">${order.deliveryFee} MXN</strong>
                </div>

                <button
                  onClick={() => onUpdateOrderStatus(order.id, 'ON_THE_WAY', selectedRider?.id)}
                  disabled={!isOnline || !selectedRider}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Bike size={16} /> Aceptar y Llevar en Bici
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Modal Ingresar PIN Secreto de Entrega */}
      {pinInputModalOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Lock size={24} />
            </div>
            <h3 className="font-black text-lg text-gray-900">Validación de Entrega Seguro</h3>
            <p className="text-xs text-gray-500 mt-1">
              Solicita al cliente su <strong>PIN de 4 dígitos</strong> que aparece en su celular para confirmar la recepción del paquete.
            </p>

            <form onSubmit={handleConfirmPinDelivery} className="mt-4 space-y-4">
              <input
                type="text"
                maxLength={4}
                required
                autoFocus
                placeholder="0000"
                value={inputPin}
                onChange={e => setInputPin(e.target.value)}
                className="w-full text-center text-3xl font-black font-mono tracking-widest py-3 border-2 border-amber-400 rounded-2xl focus:ring-4 focus:ring-amber-200 outline-none"
              />

              {pinError && <p className="text-xs text-rose-600 font-bold">{pinError}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPinInputModalOrder(null); setPinError(''); setInputPin(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md"
                >
                  Confirmar PIN 🎯
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registro Repartidor con Blindaje Legal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" /> Registro Seguro de Repartidor
              </h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={newRiderData.name}
                  onChange={e => setNewRiderData({ ...newRiderData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Teléfono Móvil (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  placeholder="441 123 4567"
                  value={newRiderData.phone}
                  onChange={e => setNewRiderData({ ...newRiderData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Clave INE / ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="PERJ880312..."
                    value={newRiderData.ine}
                    onChange={e => setNewRiderData({ ...newRiderData, ine: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">CURP</label>
                  <input
                    type="text"
                    placeholder="PERJ880312H..."
                    value={newRiderData.curp}
                    onChange={e => setNewRiderData({ ...newRiderData, curp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tipo de Vehículo *</label>
                <select
                  value={newRiderData.vehicleType}
                  onChange={e => setNewRiderData({ ...newRiderData, vehicleType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm outline-none bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Bicicleta Normal">🚲 Bicicleta Normal</option>
                  <option value="Bicicleta Eléctrica">⚡🚲 Bicicleta Eléctrica</option>
                  <option value="Moto-Bici">🛵 Moto-Bici / Scooter</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Domicilio en Tequisquiapan</label>
                <input
                  type="text"
                  placeholder="Colonia, Calle y Número"
                  value={newRiderData.address}
                  onChange={e => setNewRiderData({ ...newRiderData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Aceptación Legal */}
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    required
                    checked={newRiderData.acceptTerms}
                    onChange={e => setNewRiderData({ ...newRiderData, acceptTerms: e.target.checked })}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Acepto la Carta Responsiva y Términos de Servicio de TequisDelivery.</span>
                </label>
                <button
                  type="button"
                  onClick={() => onOpenLegalModal('TERMS')}
                  className="text-[11px] text-emerald-700 underline font-bold flex items-center gap-1"
                >
                  <FileText size={12} /> Leer Carta Responsiva y Deslinde Legal
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-all"
              >
                Completar Registro Seguro 🚴‍♂️
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
