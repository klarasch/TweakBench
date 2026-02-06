import React, { useState, useEffect } from 'react';
import { ArrowLeft, Globe, MoreVertical, BookOpen, Plus, Edit2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Modal } from '../ui/Modal';
import type { Theme } from '../../types.ts';
import { useActiveTab } from '../../hooks/useActiveTab.ts';
import { isDomainMatch, getDomainFromUrl } from '../../utils/domains.ts';
import { ConfirmDialog } from '../ui/Dialog';

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
    // libraryFilter,
    setLibraryFilter,
    globalEnabled,
    toggleGlobal,
    onContextMenu
}) => {
    const activeUrl = useActiveTab();
    const [localName, setLocalName] = useState(theme.name);
    const [showDomainSettings, setShowDomainSettings] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [confirmEnableGlobal, setConfirmEnableGlobal] = useState(false);

    const isMatch = activeUrl ? isDomainMatch(theme.domainPatterns, activeUrl) : false;
    const currentDomain = activeUrl ? getDomainFromUrl(activeUrl) : null;

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

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');

    const startEditing = (index: number, val: string) => {
        setEditingIndex(index);
        setEditValue(val);
    };

    const saveEditing = (index: number) => {
        if (editingIndex === null) return;
        const current = theme.domainPatterns || [];
        const newValue = editValue.trim();

        if (!newValue) {
            // If empty, maybe remove? or just revert? Let's revert for safety or remove if user intends.
            // Better to revert if empty to avoid accidental deletes, or show confirm. 
            // Let's just do nothing if empty string usually, but here maybe revert.
            setEditingIndex(null);
            return;
        }

        // Update
        const newPatterns = [...current];
        newPatterns[index] = newValue;
        // Dedupe if needed, but simple update is fine
        updateTheme(theme.id, { domainPatterns: newPatterns });
        setEditingIndex(null);
    };

    const handleRemoveDomain = (domain: string) => {
        const current = theme.domainPatterns || [];
        updateTheme(theme.id, { domainPatterns: current.filter(d => d !== domain) });
    };

    return (
        <div className="flex-none flex items-start gap-2 p-2 sm:p-4 border-b border-slate-800 bg-slate-900 z-10 relative">
            <button onClick={onBack} className="p-1 mt-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
                <input
                    className="bg-transparent font-semibold text-lg outline-none w-full text-white placeholder-slate-600"
                    value={localName}
                    onChange={(e) => {
                        setLocalName(e.target.value);
                        updateTheme(theme.id, { name: e.target.value });
                    }}
                    placeholder="Theme name"
                />
                <div className="flex items-center flex-wrap gap-2 mt-2">
                    {/* Domain Config Button - Interactive */}
                    <button
                        className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 bg-slate-800/50 border border-slate-700/50 px-2 py-1 rounded-md cursor-pointer hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600 transition-all select-none active:scale-95"
                        onClick={() => setShowDomainSettings(true)}
                        title="Configure domains"
                    >
                        <Globe size={11} />
                        {theme.domainPatterns && theme.domainPatterns.includes('<all_urls>')
                            ? "Runs everywhere"
                            : theme.domainPatterns && theme.domainPatterns.length > 0
                                ? `${theme.domainPatterns.length} Domain${theme.domainPatterns.length > 1 ? 's' : ''}`
                                : "No domains"
                        }
                    </button>

                    {/* Active Match Status - Passive Badge */}
                    {activeUrl && (
                        <div
                            className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full ${isMatch
                                ? 'text-green-400/90 bg-green-500/5'
                                : 'text-slate-500'
                                }`}
                            title={isMatch ? "Theme matches this tab" : "Theme does not run on this tab"}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${isMatch ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-600'}`}></div>
                            {isMatch ? "Active on this tab" : "Inactive"}
                        </div>
                    )}
                </div>
            </div>
            {/* Theme Toggle & Menu */}
            <div className="flex items-center gap-2 mt-0.5">
                {/* Global Disabled Warning */}
                {!globalEnabled && (
                    <span
                        className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mr-2 cursor-pointer hover:underline hover:text-amber-400"
                        onClick={() => setConfirmEnableGlobal(true)}
                        title="Click to re-enable plugin"
                    >
                        All themes disabled
                    </span>
                )}

                {!globalEnabled ? (
                    <Toggle checked={false} onChange={() => { }} disabled labelOff="OFF" title="System disabled via master switch" />
                ) : (
                    <Toggle
                        checked={theme.isActive}
                        onChange={() => updateTheme(theme.id, { isActive: !theme.isActive })}
                        labelOn="ON"
                        labelOff="OFF"
                        title={theme.isActive ? "Disable theme" : "Enable theme"}
                    />
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onContextMenu}
                    title="Theme options"
                >
                    <MoreVertical size={18} />
                </Button>

                <div className="w-px h-6 bg-slate-800 mx-1"></div>

                <Button
                    variant={showLibrary ? "filled" : "outline"}
                    size="sm"
                    onClick={() => { setShowLibrary(!showLibrary); setLibraryFilter(null); }}
                    icon={<BookOpen size={14} />}
                    title="Toggle snippet library"
                >
                    <span className="hidden sm:inline">Library</span>
                </Button>
            </div>

            <ConfirmDialog
                isOpen={confirmEnableGlobal}
                onClose={() => setConfirmEnableGlobal(false)}
                onConfirm={() => {
                    toggleGlobal();
                    setConfirmEnableGlobal(false);
                }}
                title="Re-enable plugin?"
                message="This will re-enable the TweakBench plugin and all active themes."
                confirmLabel="Re-enable"
            />

            <Modal
                isOpen={showDomainSettings}
                onClose={() => setShowDomainSettings(false)}
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-blue-500/10 text-blue-400">
                            <Globe size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-100 tracking-tight">Domain configuration</h3>
                            <p className="text-xs font-normal text-slate-500">Control where this theme is active</p>
                        </div>
                    </div>
                }
                footer={
                    <Button
                        onClick={() => setShowDomainSettings(false)}
                        variant="filled"
                        className="font-semibold"
                    >
                        Done
                    </Button>
                }
            >
                {/* Run Everywhere Toggle */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-800 flex items-center justify-between mb-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-200">Run everywhere</span>
                        <span className="text-xs text-slate-500">Inject code into all websites automatically</span>
                    </div>
                    <button
                        onClick={() => {
                            const currentPatterns = theme.domainPatterns || [];
                            const isAll = currentPatterns.includes('<all_urls>');
                            if (isAll) updateTheme(theme.id, { domainPatterns: currentPatterns.filter(p => p !== '<all_urls>') });
                            else updateTheme(theme.id, { domainPatterns: [...currentPatterns, '<all_urls>'] });
                        }}
                        className={`w-12 h-6 rounded-full relative transition-colors ${theme.domainPatterns?.includes('<all_urls>') ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${theme.domainPatterns?.includes('<all_urls>') ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>

                {theme.domainPatterns?.includes('<all_urls>') ? (
                    <div className="text-sm text-center py-8 text-slate-500 bg-slate-800/20 rounded-lg border border-dashed border-slate-800">
                        This theme is currently active on <span className="font-semibold text-slate-300">all websites</span>.
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Allowed domains</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors placeholder:text-slate-600"
                                    value={newDomain}
                                    onChange={e => setNewDomain(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
                                    placeholder="example.com"
                                    autoFocus
                                />
                                <button
                                    onClick={handleAddDomain}
                                    disabled={!newDomain.trim()}
                                    className="px-3 bg-slate-800 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-slate-800 rounded-lg border border-slate-700 text-white transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 px-1">
                                Enter a domain (e.g. <code className="bg-slate-800 px-1 rounded">google.com</code>) or pattern (<code className="bg-slate-800 px-1 rounded">*.gov</code>).
                            </p>

                            {currentDomain && (!theme.domainPatterns || !theme.domainPatterns.includes(currentDomain)) && (
                                <button
                                    onClick={() => {
                                        const current = theme.domainPatterns || [];
                                        updateTheme(theme.id, { domainPatterns: [...current, currentDomain] });
                                    }}
                                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline text-left px-1 flex items-center gap-1"
                                >
                                    <Plus size={10} />
                                    Add current: {currentDomain}
                                </button>
                            )}
                        </div>

                        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                            {(!theme.domainPatterns || theme.domainPatterns.length === 0) && (
                                <div className="text-center py-6 text-slate-500 text-sm">
                                    No domains configured.<br />The theme will not run anywhere.
                                </div>
                            )}
                            {theme.domainPatterns?.map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-800/50 group transition-colors">
                                    <div className="flex items-center gap-3 flex-1">
                                        <Globe size={14} className="text-slate-500 group-hover:text-blue-400 transition-colors" />

                                        {editingIndex === i ? (
                                            <input
                                                className="flex-1 bg-slate-900 border border-blue-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEditing(i);
                                                    if (e.key === 'Escape') setEditingIndex(null);
                                                    e.stopPropagation(); // Keep input events isolated
                                                }}
                                                onBlur={() => saveEditing(i)}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div
                                                className="flex-1 flex items-center justify-between group/item cursor-pointer"
                                                onClick={(e) => { e.stopPropagation(); startEditing(i, p); }}
                                            >
                                                <span className="text-sm font-medium text-slate-300 group-hover:text-white font-mono truncate">
                                                    {p}
                                                </span>
                                                <Edit2 size={12} className="text-slate-600 opacity-0 group-hover/item:opacity-100 transition-opacity ml-2" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveDomain(p); }}
                                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors ml-2"
                                        title="Remove domain"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
