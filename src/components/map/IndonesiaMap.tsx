"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface IndonesiaMapProps {
  assets: any[];
  onSelectNode: (node: any) => void;
  selectedNode: any;
  zoom?: number;
  center?: [number, number] | null;
}

function ChangeView({ center, zoom }: { center: [number, number] | null | undefined, zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;

    if (center) {
      map.setView(center, zoom, { animate: true });
    } else {
      map.setZoom(zoom, { animate: true });
    }
  }, [center, zoom, map]);

  return null;
}

export default function IndonesiaMap({ assets, onSelectNode, selectedNode, zoom = 5, center: propsCenter }: IndonesiaMapProps) {
  const defaultCenter: [number, number] = [-2.5489, 118.0149]; // Indonesia Center

  return (
    <div className="w-full h-full relative" id="map-parent">
      <MapContainer 
        key="indonesia-map-container"
        center={defaultCenter} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {assets.map((asset) => (
          <Marker
            key={`${asset.id}-${asset.latitude}-${asset.longitude}`}
            position={[parseFloat(asset.latitude), parseFloat(asset.longitude)]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectNode(asset),
            }}
          >
            <Popup>
              <div className="p-1">
                <p className="font-bold text-xs">{asset.sn}</p>
                <p className="text-[10px] text-slate-500">{asset.type} - {asset.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        <ChangeView 
          center={selectedNode ? [parseFloat(selectedNode.latitude), parseFloat(selectedNode.longitude)] : propsCenter} 
          zoom={selectedNode ? 12 : zoom} 
        />
      </MapContainer>
    </div>
  );
}
