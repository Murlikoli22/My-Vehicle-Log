'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  LayersControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { LatLngExpression, LatLng } from 'leaflet';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Search, Route, X, Loader2, LocateFixed, Navigation, MapPin } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';


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

const startIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const endIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const myLocationIcon = L.divIcon({
    html: `<div class="pulsing-dot"></div>`,
    className: '', // important to override default background
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});


// Polyline decoder from OSRM
function decodePolyline(encoded: string) {
  let lat = 0,
    lng = 0;
  const coordinates = [];
  let index = 0;
  while (index < encoded.length) {
    let byte,
      shift = 0,
      result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coordinates.push([lat / 1e5, lng / 1e5]);
  }
  return coordinates as [number, number][];
}

type Point = { lat: number; lon: number; name: string };
type SearchResult = { lat: string; lon: string; display_name: string };
type RouteSummary = { distance: number; duration: number };

function MapController({
    setStart,
    setEnd,
    isLocating,
    setMyLocation,
    addLiveRoutePoint,
    setLocationError,
    autoCenter,
    setAutoCenter,
}: {
    setStart: (p: Point) => void;
    setEnd: (p: Point) => void;
    isLocating: boolean;
    setMyLocation: (l: LatLng) => void;
    addLiveRoutePoint: (l: LatLng) => void;
    setLocationError: (e: string | null) => void;
    autoCenter: boolean;
    setAutoCenter: (val: boolean) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (isLocating) {
      map.locate({ watch: true, setView: true, enableHighAccuracy: true, maxZoom: 16 });
    } else {
      map.stopLocate();
    }
  }, [isLocating, map]);
  
  useMapEvents({
    locationfound(e) {
      setMyLocation(e.latlng);
      addLiveRoutePoint(e.latlng);
      if (autoCenter) {
        map.flyTo(e.latlng, map.getZoom());
      }
      setLocationError(null);
    },
    locationerror(e) {
        setLocationError(`Location Error: ${e.message}`);
    },
    dragstart() {
        if(isLocating) {
            setAutoCenter(false);
        }
    },
    click: async (e) => {
      if (isLocating) return;

      const { lat, lng } = e.latlng;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        const name = data.display_name || `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        const popup = L.popup()
          .setLatLng(e.latlng)
          .setContent(
            `
              <div class="p-1">
                <p class="font-semibold text-sm mb-2">${name}</p>
                <div class="flex gap-2">
                  <button id="set-start-btn" class="bg-green-500 text-white text-xs px-2 py-1 rounded-md hover:bg-green-600">Set Start</button>
                  <button id="set-end-btn" class="bg-red-500 text-white text-xs px-2 py-1 rounded-md hover:bg-red-600">Set End</button>
                </div>
              </div>
            `
          )
          .openOn(map);

        document.getElementById('set-start-btn')?.addEventListener('click', () => {
          setStart({ lat, lon: lng, name });
          map.closePopup();
        });
        document.getElementById('set-end-btn')?.addEventListener('click', () => {
          setEnd({ lat, lon: lng, name });
          map.closePopup();
        });
      } catch (error) {
        console.error('Reverse geocoding failed:', error);
      }
    },
  });
  return null;
}

export default function InteractiveMap() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);

  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [endPoint, setEndPoint] = useState<Point | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<Point | null>(null);
  
  const [isLocating, setIsLocating] = useState(false);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [liveRoute, setLiveRoute] = useState<LatLng[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [autoCenter, setAutoCenter] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    if (locationError) {
        toast({
            variant: "destructive",
            title: "Location Error",
            description: locationError,
        });
    }
  }, [locationError, toast]);
  

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Geocoding search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    const point = { lat: parseFloat(result.lat), lon: parseFloat(result.lon), name: result.display_name };
    setSelectedMarker(point);
    map?.flyTo([point.lat, point.lon], 14);
    setSearchResults([]);
    setSearchQuery('');
  };
  
  const handleToggleLocate = () => {
    if (isLocating) {
        setIsLocating(false);
        setMyLocation(null);
    } else {
        clearRoute();
        setLiveRoute([]);
        setIsLocating(true);
        setAutoCenter(true);
    }
  };

  const clearRoute = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
    setRoute([]);
    setRouteSummary(null);
  }, []);
  
  const addLiveRoutePoint = useCallback((latlng: LatLng) => {
    setLiveRoute(prevRoute => [...prevRoute, latlng]);
  }, []);

  useEffect(() => {
    if (startPoint && endPoint) {
      setIsRouting(true);
      setRoute([]);
      setRouteSummary(null);
      const fetchRoute = async () => {
          try {
            const response = await fetch(
              `https://router.project-osrm.org/route/v1/driving/${startPoint.lon},${startPoint.lat};${endPoint.lon},${endPoint.lat}?overview=full&geometries=polyline`
            );
            const data = await response.json();
            if (data.routes && data.routes[0]) {
              const route = data.routes[0];
              const decoded = decodePolyline(route.geometry);
              setRoute(decoded);
              setRouteSummary({ distance: route.distance, duration: route.duration });
              if(map) {
                const bounds = L.latLngBounds(decoded);
                map.fitBounds(bounds, { padding: [50, 50] });
              }
            }
          } catch (error) {
            console.error('Routing failed:', error);
          } finally {
            setIsRouting(false);
          }
      };
      fetchRoute();
    }
  }, [startPoint, endPoint, map]);

  return (
    <>
      <Card className="absolute top-0 left-0 z-[1000] w-full md:w-96 md:top-4 md:left-4 rounded-none md:rounded-lg shadow-lg">
        <CardHeader className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2 items-center">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for a location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {isSearching && <Loader2 className="h-5 w-5 animate-spin" />}
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {searchResults.length > 0 && (
            <ScrollArea className="h-64">
              {searchResults.map((result, i) => (
                <div key={i} onClick={() => handleSelectResult(result)} className="p-4 border-t hover:bg-muted cursor-pointer">
                  <p className="text-sm font-medium">{result.display_name}</p>
                </div>
              ))}
            </ScrollArea>
          )}

          {(startPoint || endPoint) && (
            <div className="p-4 space-y-4">
                <Separator />
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2"><Route className="h-5 w-5" /> Route Planner</h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearRoute}><X className="h-4 w-4"/></Button>
                </div>
                <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-500" /> <strong>Start:</strong> <span className="truncate">{startPoint?.name || '...'}</span></p>
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-red-500" /> <strong>End:</strong> <span className="truncate">{endPoint?.name || '...'}</span></p>
                </div>
                {isRouting && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/><span>Calculating route...</span></div>}
                {routeSummary && (
                    <div className="flex justify-around text-center p-2 bg-muted rounded-md">
                        <div>
                            <p className="text-xs text-muted-foreground">Distance</p>
                            <p className="font-bold text-lg">{(routeSummary.distance / 1000).toFixed(1)} <span className="text-sm font-normal">km</span></p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="font-bold text-lg">{Math.round(routeSummary.duration / 60)} <span className="text-sm font-normal">min</span></p>
                        </div>
                    </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>
      <Button
        size="icon"
        onClick={handleToggleLocate}
        className="absolute top-4 right-4 z-[1000] rounded-full h-12 w-12 shadow-lg"
        variant={isLocating ? "default" : "secondary"}
        aria-label="Toggle live location tracking"
      >
        {isLocating ? <Navigation className="h-6 w-6" /> : <LocateFixed className="h-6 w-6" />}
      </Button>

      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        className="h-full w-full z-0"
        ref={setMap}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          </LayersControl.BaseLayer>
           <LayersControl.BaseLayer name="Dark Mode">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.arcgis.com/">Esri</a>'
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapController 
            setStart={setStartPoint}
            setEnd={setEndPoint}
            isLocating={isLocating}
            setMyLocation={setMyLocation}
            addLiveRoutePoint={addLiveRoutePoint}
            setLocationError={setLocationError}
            autoCenter={autoCenter}
            setAutoCenter={setAutoCenter}
        />
        
        {selectedMarker && <Marker position={[selectedMarker.lat, selectedMarker.lon]}><Popup>{selectedMarker.name}</Popup></Marker>}
        {startPoint && <Marker position={[startPoint.lat, startPoint.lon]} icon={startIcon}><Popup><strong>Start:</strong> {startPoint.name}</Popup></Marker>}
        {endPoint && <Marker position={[endPoint.lat, endPoint.lon]} icon={endIcon}><Popup><strong>End:</strong> {endPoint.name}</Popup></Marker>}
        {route.length > 0 && <Polyline positions={route} color="hsl(var(--primary))" weight={5} opacity={0.7} />}
        
        {isLocating && myLocation && <Marker position={myLocation} icon={myLocationIcon} />}
        {isLocating && liveRoute.length > 1 && <Polyline positions={liveRoute} color="#FC4C02" weight={3} />}

      </MapContainer>
    </>
  );
}
