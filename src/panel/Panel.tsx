import React, { useEffect, useState } from 'react';
import { useStore } from '../store.ts';
import { ThemeList } from '../components/ThemeList.tsx';
import { ThemeDetail } from '../components/ThemeDetail.tsx';
import { StatusBar } from '../components/StatusBar.tsx';
import { useActiveTab } from '../hooks/useActiveTab.ts';
import { AlertTriangle } from 'lucide-react';
import { ToastProvider } from '../components/ui/Toast.tsx';

const Panel: React.FC = () => {
    const { loadFromStorage, globalEnabled } = useStore();
    const activeUrl = useActiveTab();
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        loadFromStorage();
        // ... (connection check logic stays same)
        const checkConnection = () => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tab = tabs[0];
                    if (tab?.id && tab.url) {
                        // Ignore internal browser pages for connection check
                        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
                            setIsConnected(true); // Treat as connected (suppress warning)
                            return;
                        }

                        chrome.tabs.sendMessage(tab.id, { type: 'PING' })
                            .then(() => setIsConnected(prev => prev === true ? prev : true))
                            .catch(() => setIsConnected(prev => prev === false ? prev : false));
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
        <ToastProvider>
            <div className="w-full h-screen bg-slate-900 text-slate-200 flex flex-col overflow-hidden">
                {/* Connection Warning */}
                {!isConnected && (
                    <div className="flex-none bg-amber-800 text-white text-xs p-2 text-center font-bold flex items-center justify-center gap-2 z-50">
                        <AlertTriangle size={14} />
                        <span>Connection lost: reload page</span>
                    </div>
                )}

                {/* Global Status Bar - Always Visible */}
                <StatusBar activeUrl={activeUrl} />

                {view === 'list' ? (
                    // List View
                    <div className={`flex-1 overflow-y-auto pt-4 transition-all duration-300 ${!globalEnabled ? 'opacity-90 grayscale-[0.5]' : ''}`}>
                        <ThemeList onSelectTheme={handleSelectTheme} activeUrl={activeUrl} />
                    </div>
                ) : (
                    selectedThemeId && <ThemeDetail themeId={selectedThemeId} onBack={handleBack} onSelectTheme={handleSelectTheme} />
                )}
            </div>
        </ToastProvider>
    );
};

export default Panel;
