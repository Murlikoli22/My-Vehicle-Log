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

// Custom Icons
const pulsingIcon = L.divIcon({
  className: 'pulsing-dot',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const startIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const finishIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


interface RideRouteMapProps {
  route: GeoPoint[];
  interactive?: boolean;
  isThumbnail?: boolean;
  isLive?: boolean;
  showStartFinishMarkers?: boolean;
}

// Inner component to access map instance and control map state
function MapController({ route, isLive, showStartFinishMarkers, isThumbnail }: Omit<RideRouteMapProps, 'interactive'>) {
  const map = useMap();

  const positions = useMemo(() => route.map(p => [p.latitude, p.longitude] as LatLngExpression), [route]);
  const currentPosition = useMemo(() => positions.length > 0 ? positions[positions.length - 1] : null, [positions]);
  const startPosition = useMemo(() => positions.length > 0 ? positions[0] : null, [positions]);

  useEffect(() => {
    // This ensures the map renders correctly if its container size changes
    map.invalidateSize();

    if (isLive && currentPosition) {
        map.setView(currentPosition, 16);
    } else if (showStartFinishMarkers && positions.length > 1) {
        map.fitBounds(positions, { padding: [40, 40] });
    } else if (currentPosition && !isThumbnail) {
        map.setView(currentPosition, 16);
    } else if (isThumbnail && positions.length > 1) {
        map.fitBounds(positions, { padding: [10, 10] });
    }
  }, [map, positions, currentPosition, isLive, showStartFinishMarkers, isThumbnail]);

  return (
    <>
      {positions.length > 0 && <Polyline pathOptions={{ color: '#FC4C02', weight: isLive ? 3 : (isThumbnail ? 3 : 5) }} positions={positions} />}
      
      {isLive && currentPosition && <Marker position={currentPosition} icon={pulsingIcon} />}
      
      {showStartFinishMarkers && startPosition && <Marker position={startPosition} icon={startIcon} />}
      {showStartFinishMarkers && positions.length > 1 && currentPosition && <Marker position={currentPosition} icon={finishIcon} />}

      {/* Default marker for non-live, non-history, non-thumbnail maps */}
      {!isLive && !showStartFinishMarkers && !isThumbnail && currentPosition && <Marker position={currentPosition} />}
    </>
  );
}

export default function RideRouteMap(props: RideRouteMapProps) {
  const { route, interactive = true, isThumbnail = false } = props;
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
  
  const currentPosition = positions.length > 0 ? positions[positions.length - 1] : [20.5937, 78.9629]; // Default center
  const bounds = positions.length > 1 ? L.latLngBounds(positions) : undefined;

  return (
    <MapContainer
      center={currentPosition}
      zoom={16}
      bounds={isThumbnail && bounds ? bounds : undefined}
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
      <MapController {...props} />
    </MapContainer>
  );
}
