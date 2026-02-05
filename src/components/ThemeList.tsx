import React, { useState, useEffect } from 'react';
import { useStore } from '../store.ts';
import { Plus, Trash2, Play, Pause, MoreVertical, Upload, Download, Globe } from 'lucide-react';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';
import { exportThemeToJS, exportThemeToCSS, parseThemeFromJS } from '../utils/impexp.ts';
import { isDomainMatch, getDomainFromUrl } from '../utils/domains.ts';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { ConfirmDialog, AlertDialog } from './ui/Dialog';

interface ThemeListProps {
    onSelectTheme: (id: string) => void;
    activeUrl: string | null;
}

export const ThemeList: React.FC<ThemeListProps> = ({ onSelectTheme, activeUrl }) => {
    const { themes, snippets, addTheme, deleteTheme, updateTheme, addSnippet, addSnippetToTheme, globalEnabled } = useStore();

    // Creation Modal State
    const [isCreating, setIsCreating] = useState(false);
    const [newThemeName, setNewThemeName] = useState('');
    const [scannedDomain, setScannedDomain] = useState<string | null>(null);
    const [limitToDomain, setLimitToDomain] = useState(false);

    // Dialog States
    const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Context Menu State
    const [menuState, setMenuState] = useState<{ x: number; y: number; themeId: string | null }>({ x: 0, y: 0, themeId: null });

    useEffect(() => {
        if (isCreating && activeUrl) {
            try {
                const domain = getDomainFromUrl(activeUrl);
                setScannedDomain(domain);
                // Default to unchecked as per UX requirement ("quick option")
                setLimitToDomain(false);
            } catch (e) {
                setScannedDomain(null);
            }
        }
    }, [isCreating, activeUrl]);

    const handleCreate = () => {
        if (!newThemeName.trim()) return;

        const domainPatterns = limitToDomain && scannedDomain
            ? [scannedDomain]
            : ['<all_urls>'];

        const newId = addTheme({
            name: newThemeName.trim(),
            domainPatterns,
            items: [],
            isActive: true,
        });

        setNewThemeName('');
        setIsCreating(false);
        setLimitToDomain(false);

        // Direct navigation to the new theme
        onSelectTheme(newId);
    };

    // ... (Import/Export logic kept same)

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const importedData = parseThemeFromJS(content);
            if (importedData) {
                const newThemeId = addTheme({
                    name: importedData.name,
                    domainPatterns: importedData.domainPatterns,
                    items: [],
                    isActive: true
                });
                importedData.snippets.forEach(s => {
                    const newSnippetId = addSnippet({
                        name: s.name,
                        type: s.type,
                        content: s.content,
                        relatedSnippetIds: [],
                        isLibraryItem: false
                    });
                    addSnippetToTheme(newThemeId, newSnippetId);
                });
                setAlertMessage(`Imported theme: ${importedData.name}`);
            } else {
                setAlertMessage('Failed to parse theme from file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleExport = (themeId: string, type: 'js' | 'css') => {
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return;
        let content = '';
        let extension = '';
        if (type === 'js') {
            content = exportThemeToJS(theme, snippets);
            extension = 'tb.js';
        } else {
            content = exportThemeToCSS(theme, snippets);
            extension = 'css';
        }
        const blob = new Blob([content], { type: type === 'js' ? 'text/javascript' : 'text/css' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${theme.name.replace(/\s+/g, '_')}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleContextMenu = (e: React.MouseEvent, themeId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuState({ x: e.pageX, y: e.pageY, themeId });
    };

    const handleKebabClick = (e: React.MouseEvent, themeId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({ x: rect.left, y: rect.bottom, themeId });
    };

    const getMenuItems = (themeId: string): ContextMenuItem[] => {
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return [];
        return [
            {
                label: theme.isActive ? 'Disable Theme' : 'Enable Theme',
                icon: theme.isActive ? <Pause size={14} /> : <Play size={14} />,
                onClick: () => updateTheme(themeId, { isActive: !theme.isActive })
            },
            { separator: true },
            {
                label: 'Export to JS',
                icon: <Download size={14} />,
                onClick: () => handleExport(themeId, 'js')
            },
            {
                label: 'Export to CSS (Only)',
                icon: <Download size={14} />,
                onClick: () => handleExport(themeId, 'css')
            },
            { separator: true },
            {
                label: 'Delete Theme',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => setThemeToDelete(themeId)
            }
        ];
    };

    const themeToDeleteDetails = themeToDelete ? themes.find(t => t.id === themeToDelete) : null;

    return (
        <div className="flex flex-col gap-4 relative">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-200">Themes</h2>
                <div className="flex gap-2">
                    <button onClick={handleImportClick} className="p-1 rounded hover:bg-slate-700 text-slate-300" title="Import Theme">
                        <Upload size={20} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".js" />
                    <button onClick={() => setIsCreating(true)} className="p-1 rounded hover:bg-slate-700 text-slate-300" title="Create Theme">
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Create Theme Modal */}
            <Modal
                isOpen={isCreating}
                onClose={() => setIsCreating(false)}
                title="Create New Theme"
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="filled"
                            size="sm"
                            onClick={handleCreate}
                            disabled={!newThemeName.trim()}
                        >
                            Create Theme
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Theme Name</label>
                        <input
                            type="text"
                            value={newThemeName}
                            onChange={(e) => setNewThemeName(e.target.value)}
                            placeholder="My Awesome Theme"
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                    </div>

                    {scannedDomain && (
                        <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded border border-slate-800/50">
                            <div className="mt-0.5">
                                <input
                                    type="checkbox"
                                    id="limitDomain"
                                    checked={limitToDomain}
                                    onChange={(e) => setLimitToDomain(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-offset-slate-900"
                                />
                            </div>
                            <label htmlFor="limitDomain" className="flex flex-col cursor-pointer select-none">
                                <span className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                                    Limit to {scannedDomain}
                                    <Globe size={12} className="text-slate-500" />
                                </span>
                                <span className="text-xs text-slate-500 mt-0.5">
                                    This theme will only activate on this domain. You can change this later.
                                </span>
                            </label>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!themeToDelete}
                onClose={() => setThemeToDelete(null)}
                onConfirm={() => {
                    if (themeToDelete) deleteTheme(themeToDelete);
                }}
                title="Delete Theme"
                message={
                    <span>
                        Are you sure you want to delete theme <strong>"{themeToDeleteDetails?.name}"</strong>? This action cannot be undone.
                    </span>
                }
                confirmLabel="Delete"
                isDangerous
            />

            {/* Alert Dialog */}
            <AlertDialog
                isOpen={!!alertMessage}
                onClose={() => setAlertMessage(null)}
                message={alertMessage}
            />

            <div className="flex flex-col gap-2">
                {themes.length === 0 && !isCreating && (
                    <div className="text-center p-8 border border-dashed border-slate-800 rounded-lg text-slate-500 flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                            <Plus size={24} className="opacity-50" />
                        </div>
                        <p className="font-medium text-slate-400">No themes yet</p>
                        <p className="text-xs max-w-[200px] mx-auto">Create a theme to start customizing your web experience.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setIsCreating(true)}
                        >
                            Create First Theme
                        </Button>
                    </div>
                )}
                {themes.map(theme => {
                    const isMatch = activeUrl ? isDomainMatch(theme.domainPatterns, activeUrl) : false;
                    const isActiveOnTab = theme.isActive && globalEnabled && isMatch;
                    const isSystemDisabled = !globalEnabled;

                    return (
                        <div
                            key={theme.id}
                            className={`p-3 rounded border flex flex-col gap-2 cursor-pointer transition-all active:scale-[0.99]
                                ${isActiveOnTab
                                    ? 'bg-slate-800 border-green-500/50 shadow-[0_0_10px_-2px_rgba(34,197,94,0.15)]'
                                    : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                }
                                ${!theme.isActive && 'opacity-75'}
                            `}
                            onClick={() => onSelectTheme(theme.id)}
                            onContextMenu={(e) => handleContextMenu(e, theme.id)}
                        >
                            <div className="flex justify-between items-center">
                                <span className={`font-medium flex-1 truncate pr-2 ${isActiveOnTab ? 'text-green-400' : 'text-slate-200'}`}>
                                    {theme.name}
                                </span>
                                <div className="flex gap-1 items-center">
                                    <div className="flex gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!globalEnabled) return;
                                                updateTheme(theme.id, { isActive: !theme.isActive });
                                            }}
                                            disabled={!globalEnabled}
                                            className={`p-1 rounded flex items-center gap-1.5 px-2 transition-colors ${isSystemDisabled
                                                ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed opacity-50'
                                                : theme.isActive
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                                                }`}
                                            title={isSystemDisabled ? "System Disabled" : (theme.isActive ? "Disable Theme" : "Enable Theme")}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${isSystemDisabled ? 'bg-slate-600' : (theme.isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-500')}`}></div>
                                            <span className="text-[10px] font-bold uppercase">{theme.isActive ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setThemeToDelete(theme.id);
                                            }}
                                            className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-colors"
                                            title="Delete Theme"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={(e) => handleKebabClick(e, theme.id)}
                                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700"
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 truncate max-w-[200px]">
                                    {theme.domainPatterns.join(', ')}
                                </span>
                                {isActiveOnTab && (
                                    <span className="text-[10px] uppercase font-bold text-green-500/80 bg-green-500/10 px-1.5 py-0.5 rounded">Active</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {menuState.themeId && (
                <ContextMenu
                    x={menuState.x}
                    y={menuState.y}
                    items={getMenuItems(menuState.themeId)}
                    onClose={() => setMenuState({ ...menuState, themeId: null })}
                />
            )}
        </div>
    );
};

