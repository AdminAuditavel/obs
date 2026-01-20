import React, { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { useApp } from '..\/..\/AppContext';
import { getWeather } from '..\/..\/services\/weatherService';
import { parseMetar } from '..\/..\/utils\/metarParser';

export const MapMetarLayer = () => {
    const { selectedAirport } = useApp();
    const [metar, setMetar] = useState<string | null>(null);

    useEffect(() => {
        const fetchW = async () => {
            if (selectedAirport) {
                const data = await getWeather(selectedAirport.icao);
                if (data) setMetar(data.raw);
            }
        };
        fetchW();
    }, [selectedAirport]);

    if (!selectedAirport.lat || !selectedAirport.lon || !metar) return null;

    const parsed = parseMetar(metar);
    const cond = parsed.condition;

    // Only show if there is something relevant to show? 
    // Or always show simple wind/viz?
    // Requirement: "Implementar apenas: Ícones simples no aeródromo: Chuva, Nevoeiro..."

    const getIconIdx = (c: string) => {
        if (c.includes('TS')) return 'thunderstorm';
        if (c.includes('SH') || c.includes('RA')) return 'rainy';
        if (c.includes('FG') || c.includes('BR')) return 'foggy';
        if (c.includes('HZ')) return 'dehaze';
        return 'air'; // Default wind
    };

    const iconName = cond ? getIconIdx(cond) : 'air';
    const isSignificant = cond && (cond !== 'N/A' && cond !== 'NSW' && cond !== 'No Wx' && !cond.includes('CAVOK'));

    const customIcon = new DivIcon({
        className: 'metar-icon',
        html: `
            <div class="flex flex-col items-center justify-center">
                <div class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xl flex items-center gap-1">
                    <span class="material-symbols-outlined !text-[14px] ${isSignificant ? 'text-amber-500' : 'text-slate-400'}">${iconName}</span>
                    <span>{parsed.wind !== 'N/A' ? parsed.wind.split('/')[1] : '0kt'}</span>
                </div>
                <div class="bg-black/80 text-white text-[8px] px-1 py-0.5 rounded mt-0.5 whitespace-nowrap">
                   Info. complementar
                </div>
            </div>
        `,
        iconSize: [80, 40],
        iconAnchor: [40, 40]
    });

    return (
        <Marker
            position={[selectedAirport.lat, selectedAirport.lon]}
            icon={customIcon}
            zIndexOffset={-100} // Below pins
        >
            <Popup>
                <div className="text-xs">
                    <strong>{selectedAirport.icao}</strong>
                    <p className="font-mono mt-1">{metar}</p>
                </div>
            </Popup>
        </Marker>
    );
};
