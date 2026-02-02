"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState, useMemo } from "react";

// Fix for default marker icon - use CDN URLs
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MarkerData {
    id: string;
    name: string;
    position: [number, number];
    lastSeen: string;
}

interface MapProps {
    center: [number, number];
    zoom?: number;
    markers?: MarkerData[];
}

function RecenterMap({ position }: { position: [number, number] }) {
    const map = useMap();
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (mountedRef.current && map) {
            map.setView(position);
        }
    }, [position, map]);

    return null;
}

function MapMarkers({ markers }: { markers: MarkerData[] }) {
    // Memoize markers to prevent unnecessary re-renders
    const memoizedMarkers = useMemo(() => markers, [JSON.stringify(markers)]);

    return (
        <>
            {memoizedMarkers.map((marker) => (
                <Marker key={marker.id} position={marker.position}>
                    <Popup>
                        <div className="p-1">
                            <h3 className="font-bold text-gray-900">{marker.name}</h3>
                            <p className="text-xs text-gray-500">Last seen: {marker.lastSeen}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}

export default function Map({ center, zoom = 13, markers = [] }: MapProps) {
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<L.Map | null>(null);

    // Memoize center to prevent unnecessary re-renders
    const memoizedCenter = useMemo(() => center, [center[0], center[1]]);

    return (
        <MapContainer
            center={memoizedCenter}
            zoom={zoom}
            scrollWheelZoom={true}
            className="h-full w-full rounded-xl shadow-lg border border-gray-100"
            ref={mapRef}
            whenReady={() => setMapReady(true)}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapReady && <MapMarkers markers={markers} />}
            {mapReady && <RecenterMap position={memoizedCenter} />}
        </MapContainer>
    );
}
