'use client';

import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import type { GeoPoint } from '@/types';
import { useMemo, useEffect } from 'react';

// Fix for default icon path issue with webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';


let DefaultIcon = L.icon({
    iconRetinaUrl: iconRetina.src,
    iconUrl: icon.src,
    shadowUrl: iconShadow.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface RideRouteMapProps {
  route: GeoPoint[];
  interactive?: boolean;
  isThumbnail?: boolean;
}

function MapUpdater({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function RideRouteMap({ route, interactive = true, isThumbnail = false }: RideRouteMapProps) {
  const positions = useMemo(() => route.map(p => [p.latitude, p.longitude] as LatLngExpression), [route]);
  
  const mapOptions: L.MapOptions = isThumbnail ? {
    attributionControl: false,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
  } : {
    scrollWheelZoom: interactive,
    dragging: interactive,
  };

  if (!positions || positions.length === 0) {
    return <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">No route data available.</div>;
  }

  const currentPosition = positions.length > 0 ? positions[positions.length - 1] : null;

  return (
    <MapContainer
      bounds={isThumbnail && positions.length > 1 ? positions : undefined}
      center={currentPosition || [51.505, -0.09]}
      zoom={16}
      className="h-full w-full"
      {...mapOptions}
    >
      <TileLayer
        url={isThumbnail ? 
             "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" :
             "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            }
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {positions.length > 0 && <Polyline pathOptions={{ color: '#FC4C02', weight: isThumbnail ? 3 : 5 }} positions={positions} />}
      {currentPosition && !isThumbnail && <Marker position={currentPosition} />}
      {currentPosition && !isThumbnail && <MapUpdater center={currentPosition} zoom={16} />}
    </MapContainer>
  );
}
