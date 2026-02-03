import React from 'react';
import { useStore } from '../store.ts';
import { isDomainMatch } from '../utils/domains.ts';
import { Network, Check, X, Power, Globe } from 'lucide-react';

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
                {/* Page-Specific Actions (Only if system enabled and safe page) */}
                {globalEnabled && !isInternal && activeUrl && (
                    <div className="flex items-center gap-1 border-r border-slate-800 pr-2 mr-0">
                        {hasMatchingTheme ? (
                            <button
                                onClick={() => matchingThemes.forEach(t => updateTheme(t.id, { isActive: false }))}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors border border-slate-700"
                                title="Disable Matching Themes"
                            >
                                <X size={10} />
                                <span className="font-bold uppercase text-[10px]">Disable Url</span>
                            </button>
                        ) : (
                            (() => {
                                // Check for disabled matches
                                const disabledMatches = themes.filter(t => !t.isActive && isDomainMatch(t.domainPatterns, activeUrl));
                                if (disabledMatches.length > 0) {
                                    return (
                                        <button
                                            onClick={() => disabledMatches.forEach(t => updateTheme(t.id, { isActive: true }))}
                                            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-green-900/30 text-slate-400 hover:text-green-400 transition-colors border border-slate-700"
                                            title={`Enable ${disabledMatches.length} Matching Theme(s)`}
                                        >
                                            <Check size={10} />
                                            <span className="font-bold uppercase text-[10px]">Enable Url</span>
                                        </button>
                                    );
                                }
                                return null;
                            })()
                        )}
                    </div>
                )}

                {/* Global Master Switch */}
                <button
                    onClick={toggleGlobal}
                    className={`flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-full transition-all border ${globalEnabled
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                        }`}
                    title={globalEnabled ? "Turn System OFF (Stops all injections)" : "Turn System ON"}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${globalEnabled ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                    <span className="font-bold uppercase text-[10px]">{globalEnabled ? 'ON' : 'OFF'}</span>
                    <Power size={10} strokeWidth={3} className={globalEnabled ? "opacity-50" : ""} />
                </button>
            </div>
        </div>
    );
};
