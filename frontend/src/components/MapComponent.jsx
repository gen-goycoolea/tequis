import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Coordenadas fijas de Tequisquiapan Centro
const TEQUIS_CENTER = [20.5222, -99.8938];

export default function MapComponent({ riders = [], activeOrder = null }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      // Inicializar mapa interactivo de Tequisquiapan
      const map = L.map(mapRef.current).setView(TEQUIS_CENTER, 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Marcador del Centro de Tequisquiapan (Plaza Miguel Hidalgo)
      const centerIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #e11d48; color: white; padding: 6px 10px; border-radius: 20px; font-weight: bold; font-size: 11px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px;">📍 Tequis Centro</div>`,
        iconSize: [120, 30],
        iconAnchor: [60, 15]
      });

      L.marker(TEQUIS_CENTER, { icon: centerIcon }).addTo(map)
        .bindPopup('<b>Tequisquiapan Centro</b><br>Zona de cobertura local en bici.');

      mapInstanceRef.current = map;
    }
  }, []);

  // Actualizar marcadores de repartidores en bici
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    riders.forEach(rider => {
      const loc = rider.currentLocation || { lat: TEQUIS_CENTER[0], lng: TEQUIS_CENTER[1] };
      const markerId = rider.id;

      const isElectric = rider.vehicleType?.toLowerCase().includes('eléctrica') || rider.vehicleType?.toLowerCase().includes('electrica');
      const vehicleEmoji = isElectric ? '⚡🚲' : '🚴‍♂️';

      const bikeIcon = L.divIcon({
        className: 'rider-bike-icon',
        html: `<div style="background-color: #059669; color: white; padding: 4px 8px; border-radius: 16px; font-weight: bold; font-size: 11px; box-shadow: 0 2px 5px rgba(0,0,0,0.4); border: 2px solid white; display: flex; align-items: center; gap: 4px; transform: scale(1.1);">
                ${vehicleEmoji} ${rider.name.split(' ')[0]}
               </div>`,
        iconSize: [110, 26],
        iconAnchor: [55, 13]
      });

      if (markersRef.current[markerId]) {
        markersRef.current[markerId].setLatLng([loc.lat, loc.lng]);
      } else {
        const marker = L.marker([loc.lat, loc.lng], { icon: bikeIcon }).addTo(mapInstanceRef.current);
        marker.bindPopup(`<b>${rider.name}</b><br>Vehículo: ${rider.vehicleType}`);
        markersRef.current[markerId] = marker;
      }
    });
  }, [riders]);

  return (
    <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden shadow-md border border-gray-200">
      <div ref={mapRef} className="w-full h-full z-0" />
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-sm border border-gray-200 z-10 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Mapa Tequisquiapan Qro.
      </div>
    </div>
  );
}
