import React, { useState, useEffect } from 'react';
import { ArrowLeft, Globe, MoreVertical, BookOpen, Link as LinkIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Modal } from '../ui/Modal';
import type { Theme } from '../../types.ts';
import { useActiveTab } from '../../hooks/useActiveTab.ts';
import { isDomainMatch } from '../../utils/domains.ts';
import { ConfirmDialog } from '../ui/Dialog';
import { DomainListEditor } from '../DomainListEditor';

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
    isOtherInGroupActive?: boolean;
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
    onContextMenu,
    isOtherInGroupActive
}) => {
    const activeUrl = useActiveTab();
    const [localName, setLocalName] = useState(theme.name);
    const [showDomainSettings, setShowDomainSettings] = useState(false);
    const [confirmEnableGlobal, setConfirmEnableGlobal] = useState(false);

    const isMatch = activeUrl ? isDomainMatch(theme.domainPatterns, activeUrl) : false;

    useEffect(() => {
        setLocalName(theme.name);
    }, [theme.name]);



    return (
        <div className="flex-none flex items-start gap-2 p-2 sm:p-4 border-b border-slate-800 bg-slate-900 z-10 relative">
            <button onClick={onBack} className="p-1 mt-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {theme.groupId && (
                        <div className="text-blue-400" title="This theme is part of a domain group">
                            <LinkIcon size={16} />
                        </div>
                    )}
                    <input
                        className="bg-transparent font-semibold text-lg outline-none w-full text-white placeholder-slate-600"
                        value={localName}
                        onChange={(e) => {
                            setLocalName(e.target.value);
                            updateTheme(theme.id, { name: e.target.value });
                        }}
                        placeholder="Theme name"
                    />
                </div>
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
                            : theme.domainPatterns && theme.domainPatterns.length === 1
                                ? theme.domainPatterns[0]
                                : theme.domainPatterns && theme.domainPatterns.length > 1
                                    ? `${theme.domainPatterns.length} Domains`
                                    : "No domains"
                        }
                    </button>

                    {/* Active Match Status - Passive Badge */}
                    {activeUrl && (
                        <div
                            className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full ${isMatch
                                ? theme.isActive
                                    ? 'text-green-400/90 bg-green-500/10'
                                    : 'text-amber-500/90 bg-amber-500/5'
                                : 'text-slate-500'
                                }`}
                            title={
                                isMatch
                                    ? theme.isActive
                                        ? "Theme matches this tab and is enabled"
                                        : theme.groupId
                                            ? "Theme matches this tab but is disabled because another theme in this group is active"
                                            : "Theme matches this tab but is currently disabled"
                                    : "Theme does not run on this tab"
                            }
                        >
                            {isMatch
                                ? theme.isActive
                                    ? "Active on this tab"
                                    : (theme.groupId && isOtherInGroupActive)
                                        ? "Group active"
                                        : "Inactive"
                                : "Inactive"}
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
                    <Toggle checked={false} onChange={() => { }} disabled labelOff="OFF" />
                ) : (
                    <Toggle
                        checked={theme.isActive}
                        isActive={isMatch}
                        onChange={() => updateTheme(theme.id, { isActive: !theme.isActive })}
                        labelOn="ON"
                        labelOff="OFF"
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
                {theme.groupId && (
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
                        <LinkIcon size={16} className="text-blue-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-blue-300">
                            <span className="font-semibold block mb-0.5">Part of a domain group</span>
                            Changes to domains will apply to <strong>all themes</strong> in this group to ensure they run on the same pages.
                        </div>
                    </div>
                )}
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
                        <DomainListEditor
                            domainPatterns={theme.domainPatterns}
                            onUpdate={(newPatterns) => updateTheme(theme.id, { domainPatterns: newPatterns })}
                            activeUrl={activeUrl}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};
