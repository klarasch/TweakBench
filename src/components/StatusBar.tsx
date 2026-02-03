import React from 'react';
import { useStore } from '../store.ts';
import { isDomainMatch } from '../utils/domains.ts';
import { Network, Check, X } from 'lucide-react';

interface StatusBarProps {
    activeUrl: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ activeUrl }) => {
    const { themes, updateTheme } = useStore();

    if (!activeUrl) return null;

    // Determine matching themes
    const matchingThemes = themes.filter(t => t.isActive && isDomainMatch(t.domainPatterns, activeUrl));
    const hasMatchingTheme = matchingThemes.length > 0;

    // Get simple domain for display
    let domainDisplay = 'Current Tab';
    try {
        const u = new URL(activeUrl);
        domainDisplay = u.hostname;
    } catch {
        // ignore
    }

    return (
        <div className="bg-slate-950 border-b border-slate-800 p-2 text-xs flex items-center justify-between z-50">
            <div className="flex items-center gap-2 overflow-hidden">
                <div className={`p-1 rounded ${hasMatchingTheme ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Network size={12} />
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-300 truncate">{domainDisplay}</span>
                    <span className="text-[10px] text-slate-500 truncate">
                        {hasMatchingTheme
                            ? `${matchingThemes.length} Theme${matchingThemes.length > 1 ? 's' : ''} Active`
                            : "No Active Themes Match"
                        }
                    </span>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
                {hasMatchingTheme ? (
                    <button
                        onClick={() => {
                            // If exactly one match, toggle it off.
                            // If multiple, maybe ask? Or disable all?
                            // Simple UX: Disable the matching themes active on this page.
                            matchingThemes.forEach(t => updateTheme(t.id, { isActive: false }));
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors border border-slate-700"
                        title="Disable Matching Themes"
                    >
                        <X size={10} />
                        <span className="font-bold uppercase text-[10px]">Disable</span>
                    </button>
                ) : (
                    // If no match, check if there ARE themes that COULD match but are disabled?
                    // Or if specific theme matches but is disabled?
                    // Let's find "Disabled Themes that WOULD match if active"
                    (() => {
                        const disabledMatches = themes.filter(t => !t.isActive && isDomainMatch(t.domainPatterns, activeUrl));
                        if (disabledMatches.length > 0) {
                            return (
                                <button
                                    onClick={() => {
                                        disabledMatches.forEach(t => updateTheme(t.id, { isActive: true }));
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-green-900/30 text-slate-400 hover:text-green-400 transition-colors border border-slate-700"
                                    title={`Enable ${disabledMatches.length} Matching Theme(s)`}
                                >
                                    <Check size={10} />
                                    <span className="font-bold uppercase text-[10px]">Enable</span>
                                </button>
                            );
                        }
                        return null; // Nothing to enable for this URL
                    })()
                )}
            </div>
        </div>
    );
};
