"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Helper to create colored marker icons
const createStatusIcon = (status: string) => {
  const s = (status || '').toLowerCase();
  const color = (s === 'online' || s === 'good') ? '#10b981' : 
                (s === 'maintenance' || s === 'maint.') ? '#f59e0b' : 
                s === 'warning' ? '#ef4444' :
                s === 'offline' ? '#64748b' :
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
      // Use setView with a slight delay to ensure the container is ready
      const timeoutId = setTimeout(() => {
        map.setView(center, zoom, { animate: true });
      }, 0);
      return () => clearTimeout(timeoutId);
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
        center={defaultCenter} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        zoomControl={false}
        scrollWheelZoom={true}
        // Removing key to prevent unnecessary unmounts
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {assets.map((asset) => (
          <Marker
            key={`marker-${asset.id}`} // More unique key
            position={[parseFloat(asset.latitude), parseFloat(asset.longitude)]}
            icon={createStatusIcon(asset.condition || asset.status)}
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
