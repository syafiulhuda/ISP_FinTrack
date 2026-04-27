"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

// Helper to create colored marker icons
const createStatusIcon = (status: string) => {
  const color = status === 'Online' ? '#10b981' : 
                status === 'Maintenance' ? '#f59e0b' : 
                '#ef4444';
  
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-white dark:bg-slate-900 shadow-xl opacity-20 animate-ping"></div>
        <div class="relative w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-lg" style="background-color: ${color}"></div>
      </div>
    `,
    className: 'custom-status-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

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
  const [isMounted, setIsMounted] = useState(false);
  const defaultCenter: [number, number] = [-2.5489, 118.0149]; // Indonesia Center

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500 font-black">
        PREPARING MAP CONTAINER...
      </div>
    );
  }

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
            key={asset.id}
            position={[parseFloat(asset.latitude), parseFloat(asset.longitude)]}
            icon={createStatusIcon(asset.status)}
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
