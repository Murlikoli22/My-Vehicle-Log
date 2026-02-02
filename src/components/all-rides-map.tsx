'use client';

import { MapContainer, TileLayer, Polyline, Tooltip, useMap } from 'react-leaflet';
import L, { type LatLngBoundsExpression, type LatLngExpression } from 'leaflet';
import type { Ride } from '@/types';
import { useMemo, useEffect } from 'react';
import { format } from 'date-fns';

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

interface AllRidesMapProps {
  rides: Ride[];
}

function MapBounds({ bounds }: { bounds: LatLngBoundsExpression | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

const rideColors = ['#FC4C02', '#02A4FC', '#FCDC02', '#A402FC', '#02FCA4'];

export default function AllRidesMap({ rides }: AllRidesMapProps) {
  const allPositions = useMemo(() => {
    return rides.flatMap(ride => ride.route.map(p => [p.latitude, p.longitude] as LatLngExpression));
  }, [rides]);

  const bounds = useMemo(() => {
      if(allPositions.length === 0) return undefined;
      return L.latLngBounds(allPositions);
  }, [allPositions]);

  if (!rides || rides.length === 0) {
    return <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">No ride history to display on map.</div>;
  }

  return (
    <MapContainer
      center={[20.5937, 78.9629]} // Centered on India as a fallback
      zoom={5}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {rides.map((ride, index) => {
          const positions = ride.route.map(p => [p.latitude, p.longitude] as LatLngExpression);
          if (positions.length === 0) return null;

          return (
            <Polyline key={ride.id} pathOptions={{ color: rideColors[index % rideColors.length], weight: 3 }} positions={positions}>
                <Tooltip sticky>
                    <strong>{ride.distance.toFixed(2)} km Ride</strong><br/>
                    {format(new Date(ride.startTime), 'PPP')}
                </Tooltip>
            </Polyline>
          )
      })}
      <MapBounds bounds={bounds} />
    </MapContainer>
  );
}
