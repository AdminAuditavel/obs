import React, { useEffect, useState } from 'react';
import { MapContainer as PacketMap, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import { useApp } from '..\/..\/AppContext';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Icon path issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = new Icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
Icon.Default.mergeOptions({
    iconRetinaUrl: icon,
    iconUrl: icon,
    shadowUrl: iconShadow,
});

interface MapContainerProps {
    children: React.ReactNode;
}

const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 15); // Default operational zoom
    }, [center, map]);
    return null;
};

export const OperationalMapContainer: React.FC<MapContainerProps> = ({ children }) => {
    const { selectedAirport } = useApp();

    // Default to airport coordinates or fallback
    // SBCT: -25.5327, -49.1758
    const defaultCenter: [number, number] =
        selectedAirport.lat && selectedAirport.lon
            ? [selectedAirport.lat, selectedAirport.lon]
            : [-25.5327, -49.1758];

    return (
        <PacketMap
            center={defaultCenter}
            zoom={15}
            scrollWheelZoom={true}
            zoomControl={false}
            className="w-full h-full z-0"
            style={{ background: '#0f1623' }} // Dark background for loading state
        >
            {/* Dark Matter / Operational Style Tile Layer */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                subdomains='abcd'
                maxZoom={20}
            />

            <ZoomControl position="bottomright" />
            <MapUpdater center={defaultCenter} />
            {children}
        </PacketMap>
    );
};
