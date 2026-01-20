import React, { useRef, useEffect } from 'react';

interface TimeTimelineProps {
    selectedTime: string | null;
    onSelectTime: (time: string | null) => void;
}

export const TimeTimeline: React.FC<TimeTimelineProps> = ({ selectedTime, onSelectTime }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Generate hours: previous 6 to next 12?
    // Or just 0-23 for current day?
    // Let's do a sliding window around "NOW" to support TAF (future) and recent history.
    // Window: Now - 6h to Now + 18h
    const now = new Date();
    const currentHour = now.getUTCHours(); // Using UTC to match METAR Z time

    const times = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(now);
        d.setUTCHours(currentHour - 6 + i, 0, 0, 0);
        return d;
    });

    // Scroll to center/current on mount
    useEffect(() => {
        if (scrollRef.current) {
            // Simple scroll to roughly start?
            // Center is index 6 (currentHour).
            // 50px per item approx?
            // scrollRef.current.scrollLeft = ...
        }
    }, []);

    return (
        <div className="w-full bg-white dark:bg-[#1a2233] border-b border-gray-200 dark:border-gray-800 py-2">
            <div
                ref={scrollRef}
                className="flex items-center gap-2 overflow-x-auto px-4 no-scrollbar scroll-smooth"
            >
                <button
                    onClick={() => onSelectTime(null)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${!selectedTime ? 'bg-primary text-white border-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                    AGORA
                </button>

                {times.map((t, i) => {
                    const h = t.getUTCHours();
                    const val = t.toISOString();
                    const isSelected = selectedTime === val;

                    return (
                        <button
                            key={i}
                            onClick={() => onSelectTime(val)}
                            className={`shrink-0 flex flex-col items-center justify-center w-12 py-1 rounded-lg transition-colors border ${isSelected
                                ? 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900'
                                : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <span className="text-xs font-bold">{h.toString().padStart(2, '0')}</span>
                            <span className="text-[9px] opacity-60">UTC</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
