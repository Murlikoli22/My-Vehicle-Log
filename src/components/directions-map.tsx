'use client';

import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

// Fix for default icon issue with bundlers
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const FitBounds = ({ route }: { route: any }) => {
    const map = useMap();
    useEffect(() => {
        if (route && route.features && route.features.length > 0) {
            const coordinates = route.features[0].geometry.coordinates[0].map((coord: [number, number]) => [coord[1], coord[0]]);
            if (coordinates.length > 0) {
                map.fitBounds(L.polyline(coordinates).getBounds(), { padding: [50, 50] });
            }
        }
    }, [route, map]);
    return null;
}

interface DirectionsMapProps {
  route: any;
}

export default function DirectionsMap({ route }: DirectionsMapProps) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: iconRetinaUrl.src,
      iconUrl: iconUrl.src,
      shadowUrl: shadowUrl.src,
    });
  }, []);

  if (!route || !route.features || route.features.length === 0) return null;

  const routeGeoJSON = route.features[0];
  const coordinates = routeGeoJSON.geometry.coordinates[0];
  
  const startCoords: LatLngExpression = [coordinates[0][1], coordinates[0][0]];
  const endCoords: LatLngExpression = [coordinates[coordinates.length - 1][1], coordinates[coordinates.length - 1][0]];
  
  const polylinePositions = coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);

  return (
    <MapContainer center={startCoords} zoom={13} style={{ height: '500px', width: '100%' }} scrollWheelZoom={false}>
      <TileLayer
        attribution='Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        url={`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY}`}
      />
      <Polyline positions={polylinePositions} color="blue" />
      <Marker position={startCoords}>
        <Popup>Starting Point</Popup>
      </Marker>
      <Marker position={endCoords}>
        <Popup>Destination</Popup>
      </Marker>
      <FitBounds route={route} />
    </MapContainer>
  );
}
