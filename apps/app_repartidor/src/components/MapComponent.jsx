import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const TEQUIS_CENTER = [20.5222, -99.8938];

export default function MapComponent({ riders = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      const map = L.map(mapRef.current).setView(TEQUIS_CENTER, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    riders.forEach(rider => {
      const loc = rider.currentLocation || { lat: TEQUIS_CENTER[0], lng: TEQUIS_CENTER[1] };
      const markerId = rider.id;
      const isElectric = rider.vehicleType?.toLowerCase().includes('eléctrica');
      const vehicleEmoji = isElectric ? '⚡🚲' : '🚴‍♂️';

      const bikeIcon = L.divIcon({
        className: 'rider-bike-icon',
        html: `<div style="background-color: #059669; color: white; padding: 4px 8px; border-radius: 16px; font-weight: bold; font-size: 11px; border: 2px solid white; display: flex; align-items: center; gap: 4px;">
                ${vehicleEmoji} ${rider.name.split(' ')[0]}
               </div>`,
        iconSize: [110, 26],
        iconAnchor: [55, 13]
      });

      if (markersRef.current[markerId]) {
        markersRef.current[markerId].setLatLng([loc.lat, loc.lng]);
      } else {
        const marker = L.marker([loc.lat, loc.lng], { icon: bikeIcon }).addTo(mapInstanceRef.current);
        markersRef.current[markerId] = marker;
      }
    });
  }, [riders]);

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden shadow-md border border-gray-200">
      <div ref={mapRef} className="w-full h-full z-0" />
    </div>
  );
}
