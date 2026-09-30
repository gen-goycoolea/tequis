import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export default function LegalModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-rose-600" size={24} />
            <h3 className="font-black text-lg text-gray-900">Aviso de Privacidad (LFPDPPP México)</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 font-bold text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 text-xs text-gray-700 space-y-3 leading-relaxed">
          <p className="font-bold text-gray-900">AVISO DE PRIVACIDAD INTEGRAL PARA CLIENTES</p>
          <p>TequisDelivery protege tus datos en cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) en México.</p>
          <p><strong>Datos Recabados:</strong> Nombre, teléfono, domicilio de entrega en Tequisquiapan y ubicación GPS durante órdenes activas.</p>
          <p><strong>Finalidad:</strong> Coordinación de pedidos y entregas seguras mediante PIN de 4 dígitos.</p>
        </div>

        <div className="border-t border-gray-100 pt-3 mt-4 text-right">
          <button onClick={onClose} className="bg-gray-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs">Entendido</button>
        </div>
      </div>
    </div>
  );
}
