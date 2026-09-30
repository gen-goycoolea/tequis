import React, { useState } from 'react';
import { ShieldCheck, FileText, Lock, AlertTriangle } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, defaultTab = 'PRIVACY' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
        {/* Encabezado */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-rose-600" size={24} />
            <h3 className="font-black text-lg text-gray-900">Marco Legal & Blindaje Jurídico</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-gray-200 mb-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PRIVACY')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'PRIVACY'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock size={14} /> Aviso de Privacidad (LFPDPPP)
          </button>
          <button
            onClick={() => setActiveTab('TERMS')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'TERMS'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={14} /> Carta Responsiva Repartidor
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="flex-1 overflow-y-auto pr-2 text-xs text-gray-700 space-y-4 leading-relaxed">
          {activeTab === 'PRIVACY' ? (
            <>
              <h4 className="font-black text-gray-900 text-sm">AVISO DE PRIVACIDAD INTEGRAL DE TEQUISDELIVERY</h4>
              <p className="text-gray-500">Última actualización: Tequisquiapan, Querétaro, México.</p>

              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck size={14} /> Cumplimiento Ley LFPDPPP México
                </p>
                <p>En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, TequisDelivery protege tus datos y ubicación GPS.</p>
              </div>

              <h5 className="font-bold text-gray-900">1. Datos Personales Recabados:</h5>
              <p>Recabamos nombre, teléfono, domicilio de entrega en Tequisquiapan, ubicación en tiempo real (para la navegación de entregas en bicicleta) e Identificación Oficial (INE/CURP para el registro de repartidores).</p>

              <h5 className="font-bold text-gray-900">2. Finalidad del Tratamiento de Datos:</h5>
              <ul className="list-disc pl-4 space-y-1">
                <li>Procesar y coordinar la entrega de pedidos en fondas, restaurantes y tiendas.</li>
                <li>Verificar la identidad de los repartidores para garantizar la seguridad de los productos.</li>
                <li>Mostrar el trayecto del repartidor en el mapa interactivo durante una orden activa.</li>
              </ul>

              <h5 className="font-bold text-gray-900">3. Derechos ARCO:</h5>
              <p>Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición del tratamiento de tus datos enviando una solicitud a través de los canales de atención al cliente de TequisDelivery.</p>
            </>
          ) : (
            <>
              <h4 className="font-black text-gray-900 text-sm">TÉRMINOS DE SERVICIO Y CARTA RESPONSIVA DE SOCIO REPARTIDOR</h4>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle size={14} /> Cláusula de Custodia de Mercancía
                </p>
                <p>El Socio Repartidor asume la responsabilidad civil y legal directa sobre todos los alimentos y productos que recibe de las fondas y comercios hasta la entrega confirmada con PIN al cliente.</p>
              </div>

              <h5 className="font-bold text-gray-900">1. Naturaleza Jurídica:</h5>
              <p>El Socio Repartidor reconoce y acepta que su relación con TequisDelivery es de prestador de servicios independientes. No existe relación laboral, de subordinación patronal ni dependencia directa.</p>

              <h5 className="font-bold text-gray-900">2. Obligación de Verificación de Identidad (INE/CURP):</h5>
              <p>Para la prevención de robos y fraude, el Socio Repartidor debe proporcionar su INE vigente y comprobante de domicilio. TequisDelivery se reserva el derecho de dar de baja inmediata a cualquier repartidor que no entregue la mercancía o la retenga indebidamente.</p>

              <h5 className="font-bold text-gray-900">3. Validación de Entrega mediante PIN Obligatorio:</h5>
              <p>Ninguna entrega será dada por finalizada ni pagada sin que el cliente ingrese o proporcione su PIN de seguridad de 4 dígitos generado por la aplicación.</p>
            </>
          )}
        </div>

        {/* Botón Cerrar */}
        <div className="border-t border-gray-100 pt-3 mt-4 text-right">
          <button
            onClick={onClose}
            className="bg-gray-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-gray-800 transition-all shadow-md"
          >
            Entendido y Aceptado
          </button>
        </div>
      </div>
    </div>
  );
}
