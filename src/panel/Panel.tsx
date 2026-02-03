import React, { useEffect, useState } from 'react';
import { useStore } from '../store.ts';
import { ThemeList } from '../components/ThemeList.tsx';
import { ThemeDetail } from '../components/ThemeDetail.tsx';
import { AlertTriangle, Power } from 'lucide-react';

const Panel: React.FC = () => {
    const { loadFromStorage, globalEnabled, toggleGlobal } = useStore();
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        loadFromStorage();

        const checkConnection = () => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, { type: 'PING' })
                            .then(() => setIsConnected(true))
                            .catch(() => setIsConnected(false));
                    }
                });
            } else {
                setIsConnected(true); // Mock connection for local dev
            }
        };

        checkConnection();
        const interval = setInterval(checkConnection, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleSelectTheme = (id: string) => {
        setSelectedThemeId(id);
        setView('detail');
    };

    const handleBack = () => {
        setView('list');
        setSelectedThemeId(null);
    };

    return (
        <div className="w-full h-screen bg-slate-900 text-slate-200 flex flex-col overflow-hidden">
            {!isConnected && (
                <div className="flex-none bg-amber-600 text-white text-xs p-2 text-center font-bold flex items-center justify-center gap-2 z-50">
                    <AlertTriangle size={14} />
                    <span>Connection Lost: Reload Page</span>
                </div>
            )}
            {view === 'list' ? (
                <>
                    <div className="flex-none p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-10 shadow-sm">
                        <div className="flex items-center gap-2">
                            {/* Logo Removed */}
                            <h1 className="text-xl font-bold text-slate-100 tracking-tight">TweakBench</h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${globalEnabled ? 'text-green-400' : 'text-slate-600'}`}>
                                {globalEnabled ? 'Plugin Active' : 'Plugin Inactive'}
                            </span>
                            <button
                                onClick={toggleGlobal}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${globalEnabled ? 'bg-green-500 text-white shadow-green-900/20 hover:bg-green-400' : 'bg-slate-800 text-slate-600 shadow-inner hover:bg-slate-700'}`}
                                title={globalEnabled ? "Turn System OFF" : "Turn System ON"}
                            >
                                <Power size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                    {/* Dimming adjusted: less aggressive grayscale, just slightly dimmed */}
                    <div className={`flex-1 overflow-y-auto p-4 pt-4 transition-all duration-300 ${!globalEnabled ? 'opacity-90 grayscale-[0.5]' : ''}`}>
                        <ThemeList onSelectTheme={handleSelectTheme} />
                    </div>
                </>
            ) : (
                selectedThemeId && <ThemeDetail themeId={selectedThemeId} onBack={handleBack} />
            )}
        </div>
    );
};

export default Panel;
