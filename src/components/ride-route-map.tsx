'use client';

import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import type { GeoPoint } from '@/types';

// Fix for default icon path issue with webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon.src,
    shadowUrl: iconShadow.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;


interface RideRouteMapProps {
  route: GeoPoint[];
}

export default function RideRouteMap({ route }: RideRouteMapProps) {
  if (!route || route.length === 0) {
    return <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">No route data available.</div>;
  }

  const positions: LatLngExpression[] = route.map(p => [p.latitude, p.longitude]);

  return (
    <MapContainer
      bounds={positions.length > 1 ? positions : undefined}
      center={positions.length === 1 ? positions[0] : undefined}
      zoom={positions.length === 1 ? 15 : undefined}
      scrollWheelZoom={true}
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline pathOptions={{ color: 'hsl(var(--primary))', weight: 5 }} positions={positions} />
    </MapContainer>
  );
}
