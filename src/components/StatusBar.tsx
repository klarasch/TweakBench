import React from 'react';
import { useStore } from '../store.ts';
import { isDomainMatch } from '../utils/domains.ts';
import { Network, Play, Pause, Globe, Power } from 'lucide-react';
import { Button } from './ui/Button';

interface StatusBarProps {
    activeUrl: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ activeUrl }) => {
    const { themes, updateTheme, globalEnabled, toggleGlobal } = useStore();

    // Connection / URL Display logic
    // Even if no activeUrl (internal page), we might want to show the Global Toggle?
    // User wants "Status Bar on all pages".
    // So if activeUrl is null (e.g. internal page), we show "System Ready" or similar?

    // Determine matching themes
    const matchingThemes = activeUrl ? themes.filter(t => t.isActive && isDomainMatch(t.domainPatterns, activeUrl)) : [];
    const hasMatchingTheme = matchingThemes.length > 0;

    // Get simple domain for display
    let domainDisplay = 'System Ready';
    let isInternal = true;
    if (activeUrl) {
        try {
            const u = new URL(activeUrl);
            if (u.protocol.startsWith('http')) {
                domainDisplay = u.hostname;
                isInternal = false;
            } else {
                domainDisplay = 'Internal Page';
            }
        } catch {
            // ignore
        }
    }

    return (
        <div className="bg-slate-950 border-b border-slate-800 p-2 text-xs flex items-center justify-between z-50 shrink-0">
            {/* Left Side: Page Context */}
            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                <div className={`p-1 rounded shrink-0 ${!globalEnabled ? 'bg-slate-800 text-slate-600' : hasMatchingTheme ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                    {isInternal ? <Globe size={12} /> : <Network size={12} />}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className={`font-bold truncate ${!globalEnabled ? 'text-slate-600' : 'text-slate-300'}`}>{domainDisplay}</span>
                    <span className="text-[10px] text-slate-500 truncate">
                        {!globalEnabled
                            ? "System Disabled"
                            : isInternal
                                ? "Extension Active"
                                : hasMatchingTheme
                                    ? `${matchingThemes.length} Theme${matchingThemes.length > 1 ? 's' : ''} Active`
                                    : "No Active Themes Match"
                        }
                    </span>
                </div>
            </div>

            {/* Right Side: Controls */}
            <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-3">
                    {/* Page Actions */}
                    {globalEnabled && !isInternal && activeUrl && (
                        <>
                            {hasMatchingTheme ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => matchingThemes.forEach(t => updateTheme(t.id, { isActive: false }))}
                                    className="h-6 text-[10px] px-2 border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-900/50 hover:bg-amber-900/10"
                                    icon={<Pause size={10} />}
                                >
                                    Disable URL
                                </Button>
                            ) : (
                                (() => {
                                    const disabledMatches = themes.filter(t => !t.isActive && isDomainMatch(t.domainPatterns, activeUrl));
                                    if (disabledMatches.length > 0) {
                                        return (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => disabledMatches.forEach(t => updateTheme(t.id, { isActive: true }))}
                                                className="h-6 text-[10px] px-2 border-slate-700 text-slate-400 hover:text-green-400 hover:border-green-900/50 hover:bg-green-900/10"
                                                icon={<Play size={10} />}
                                            >
                                                Enable URL
                                            </Button>
                                        );
                                    }
                                    return null;
                                })()
                            )}
                            <div className="w-px h-4 bg-slate-800"></div>
                        </>
                    )}

                    {/* Master Switch - Less Prominent Power Icon */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleGlobal}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${globalEnabled
                                ? 'bg-slate-900 border-green-500/50 text-green-500 hover:bg-green-500/10 hover:border-green-400'
                                : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
                                }`}
                            title={globalEnabled ? "Master Switch: System ON" : "Master Switch: System OFF"}
                        >
                            <Power size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
