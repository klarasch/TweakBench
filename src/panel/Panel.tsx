import React, { useEffect, useState } from 'react';
import { useStore } from '../store.ts';
import { ThemeList } from '../components/ThemeList.tsx';
import { ThemeDetail } from '../components/ThemeDetail.tsx';
import { AlertTriangle } from 'lucide-react';

const Panel: React.FC = () => {
    const { loadFromStorage } = useStore();
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        loadFromStorage();

        const checkConnection = () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'PING' })
                        .then(() => setIsConnected(true))
                        .catch(() => setIsConnected(false));
                }
            });
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
                    {/* <div className="flex-none p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-10">
                        <h1 className="text-xl font-bold text-blue-400">TweakBench</h1>
                        <div className="flex items-center gap-2" title="Global Enable/Disable">
                            <span className="text-xs text-slate-500 font-mono">MASTER</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={globalEnabled}
                                    onChange={toggleGlobal}
                                />
                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div> */}
                    <div className="flex-1 overflow-y-auto p-4 pt-4">
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
