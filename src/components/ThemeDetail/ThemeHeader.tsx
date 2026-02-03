import React, { useState, useEffect } from 'react';
import { ArrowLeft, Globe, MoreVertical, BookOpen, X, Plus, Wifi, WifiOff } from 'lucide-react';
import type { Theme } from '../../types.ts';
import { useActiveTab } from '../../hooks/useActiveTab.ts';
import { isDomainMatch } from '../../utils/domains.ts';

interface ThemeHeaderProps {
    theme: Theme;
    onBack: () => void;
    updateTheme: (id: string, updates: Partial<Theme>) => void;
    showLibrary: boolean;
    setShowLibrary: (show: boolean) => void;
    libraryFilter: string | null;
    setLibraryFilter: (filter: 'css' | 'html' | null) => void;
    globalEnabled: boolean;
    toggleGlobal: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export const ThemeHeader: React.FC<ThemeHeaderProps> = ({
    theme,
    onBack,
    updateTheme,
    showLibrary,
    setShowLibrary,
    libraryFilter,
    setLibraryFilter,
    globalEnabled,
    toggleGlobal,
    onContextMenu
}) => {
    const activeUrl = useActiveTab();
    const [localName, setLocalName] = useState(theme.name);
    const [showDomainSettings, setShowDomainSettings] = useState(false);
    const [newDomain, setNewDomain] = useState('');

    const isMatch = activeUrl ? isDomainMatch(theme.domainPatterns, activeUrl) : false;

    useEffect(() => {
        setLocalName(theme.name);
    }, [theme.name]);

    const handleAddDomain = () => {
        if (!newDomain.trim()) return;
        const current = theme.domainPatterns || [];
        if (!current.includes(newDomain.trim())) {
            updateTheme(theme.id, { domainPatterns: [...current, newDomain.trim()] });
        }
        setNewDomain('');
    };

    const handleRemoveDomain = (domain: string) => {
        const current = theme.domainPatterns || [];
        updateTheme(theme.id, { domainPatterns: current.filter(d => d !== domain) });
    };

    return (
        <div className="flex-none flex items-center gap-2 p-4 border-b border-slate-800 bg-slate-900 z-10 relative">
            <button onClick={onBack} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
                <input
                    className="bg-transparent font-bold text-lg outline-none w-full text-white placeholder-slate-600"
                    value={localName}
                    onChange={(e) => {
                        setLocalName(e.target.value);
                        updateTheme(theme.id, { name: e.target.value });
                    }}
                    placeholder="Theme Name"
                />
                <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-800/50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-800 hover:text-slate-300 transition-colors" onClick={() => setShowDomainSettings(true)}>
                        <Globe size={10} />
                        {theme.domainPatterns && theme.domainPatterns.includes('<all_urls>')
                            ? "Runs Everywhere"
                            : theme.domainPatterns && theme.domainPatterns.length > 0
                                ? `${theme.domainPatterns.length} Domain${theme.domainPatterns.length > 1 ? 's' : ''}`
                                : "No Configured Domains"
                        }
                    </div>
                    {/* Active Match Status */}
                    {activeUrl && (
                        <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${isMatch ? 'text-green-400 border-green-900/50 bg-green-900/20' : 'text-slate-500 border-transparent'}`} title={isMatch ? "Theme matches this tab" : "Theme does not run on this tab"}>
                            {isMatch ? <Wifi size={10} /> : <WifiOff size={10} />}
                            {isMatch ? "Active Tab" : "Inactive"}
                        </div>
                    )}
                </div>
            </div>
            {/* Theme Toggle & Menu */}
            <div className="flex items-center gap-2">
                {/* Global Disabled Warning */}
                {!globalEnabled && (
                    <span
                        className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mr-2 cursor-pointer hover:underline hover:text-amber-400"
                        onClick={() => {
                            if (confirm("Re-enable the entire plugin?")) {
                                toggleGlobal();
                            }
                        }}
                        title="Click to re-enable plugin"
                    >
                        All Themes Disabled
                    </span>
                )}

                {!globalEnabled ? (
                    <button
                        disabled
                        className="p-1 rounded flex items-center gap-1.5 px-2 transition-colors bg-slate-800/50 text-slate-600 cursor-not-allowed opacity-50"
                        title="System Disabled"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                        <span className="text-[10px] font-bold uppercase">OFF</span>
                    </button>
                ) : (
                    <button
                        onClick={() => updateTheme(theme.id, { isActive: !theme.isActive })}
                        className={`p-1 rounded flex items-center gap-1.5 px-2 transition-colors ${theme.isActive ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 shadow-[0_0_0_1px_rgba(74,222,128,0.2)]' : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700 hover:text-slate-300'}`}
                        title={theme.isActive ? "Disable Theme" : "Enable Theme"}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${theme.isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></div>
                        <span className="text-[10px] font-bold uppercase">{theme.isActive ? 'ON' : 'OFF'}</span>
                    </button>
                )}
                <button
                    className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-800"
                    onClick={onContextMenu}
                    title="Theme Options"
                >
                    <MoreVertical size={18} />
                </button>
                <div className="w-px h-6 bg-slate-800 mx-1"></div>
                <button
                    onClick={() => { setShowLibrary(!showLibrary); setLibraryFilter(null); }}
                    className={`p-1.5 rounded flex items-center gap-1.5 px-3 transition-colors ${showLibrary && !libraryFilter ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    title="Snippet Library"
                >
                    <BookOpen size={16} />
                    <span className="text-xs font-bold uppercase">Library</span>
                </button>
            </div>

            {/* Domain Settings Popover */}
            {showDomainSettings && (
                <>
                    <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px]" onClick={() => setShowDomainSettings(false)} />
                    <div className="absolute top-14 left-4 z-50 w-[300px] bg-slate-900 border border-slate-700 shadow-xl rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Run on Domains</h3>
                            <button onClick={() => setShowDomainSettings(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                        </div>
                        {/* Run Everywhere Toggle */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-800 flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Globe size={16} className="text-slate-400" />
                                <span className="text-sm font-medium text-slate-200">All Websites</span>
                            </div>
                            <button
                                onClick={() => {
                                    const currentPatterns = theme.domainPatterns || [];
                                    const isAll = currentPatterns.includes('<all_urls>');
                                    if (isAll) updateTheme(theme.id, { domainPatterns: currentPatterns.filter(p => p !== '<all_urls>') });
                                    else updateTheme(theme.id, { domainPatterns: [...currentPatterns, '<all_urls>'] });
                                }}
                                className={`w-10 h-5 rounded-full relative transition-colors ${theme.domainPatterns?.includes('<all_urls>') ? 'bg-green-500' : 'bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${theme.domainPatterns?.includes('<all_urls>') ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {theme.domainPatterns?.includes('<all_urls>') ? (
                            <div className="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded">Theme runs everywhere.</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={newDomain} onChange={e => setNewDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDomain()} placeholder="google.com" />
                                    <button onClick={handleAddDomain} disabled={!newDomain.trim()} className="p-1 bg-slate-800 rounded border border-slate-700"><Plus size={14} /></button>
                                </div>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {theme.domainPatterns?.map((p, i) => (
                                        <div key={i} className="flex justify-between p-2 bg-slate-800/30 rounded text-xs text-slate-300">
                                            <span>{p}</span>
                                            <button onClick={() => handleRemoveDomain(p)} className="hover:text-red-400"><X size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
