import React, { useState } from 'react';
import { Store, Check, Clock, AlertCircle, ShoppingBag } from 'lucide-react';

export default function StoreView({ stores, orders, onUpdateOrderStatus }) {
  const [selectedStore, setSelectedStore] = useState(stores[0] || null);

  const storeOrders = orders.filter(o => o.storeId === selectedStore?.id);

  return (
    <div className="space-y-6">
      {/* Selector de Comercio */}
      <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-lg border border-indigo-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Store className="text-indigo-300" /> Panel de Negocios • Tequisquiapan
          </h2>
          <p className="text-indigo-200 text-xs mt-1">Gestión de cocina, fonda o tienda en tiempo real.</p>
        </div>

        <select
          value={selectedStore?.id || ''}
          onChange={e => setSelectedStore(stores.find(s => s.id === e.target.value))}
          className="bg-indigo-800 text-white text-xs font-bold px-3 py-2 rounded-xl border border-indigo-700 outline-none"
        >
          {stores.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de Pedidos del Comercio */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
          <ShoppingBag size={18} className="text-indigo-600" /> Pedidos Recibidos ({storeOrders.length})
        </h3>

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
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">#{order.id}</span>
                    <h4 className="font-bold text-gray-900 mt-1">{order.customerName}</h4>
                    <p className="text-xs text-gray-500">📍 {order.customerAddress}</p>
                  </div>
                  <span className="font-black text-emerald-600 text-base">${order.total} MXN</span>
                </div>

                <div className="space-y-1 text-xs text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <p className="font-bold text-gray-500 uppercase text-[10px]">Detalle de preparación:</p>
                  {order.items.map(i => (
                    <div key={i.id} className="flex justify-between">
                      <span>• {i.quantity}x {i.name}</span>
                      <span className="font-semibold">${i.price * i.quantity} MXN</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Estado:</span>
                  <span className="font-bold text-gray-800">
                    {order.status === 'PENDING' && '⏳ Nuevo (Esperando Aprobación)'}
                    {order.status === 'ACCEPTED' && '🔥 En Cocina / Listo para Bici'}
                    {order.status === 'ON_THE_WAY' && '🚴‍♂️ En Camino con Repartidor'}
                    {order.status === 'DELIVERED' && '✅ Entregado'}
                  </span>
                </div>

                {order.status === 'PENDING' && (
                  <button
                    onClick={() => onUpdateOrderStatus(order.id, 'ACCEPTED')}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Check size={16} /> Aceptar y Empezar a Preparar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
