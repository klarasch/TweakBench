import React, { useState } from 'react';
import { useStore } from '../store.ts';
import { Plus, Trash2, Play, Pause, MoreVertical, Upload, Download } from 'lucide-react';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';
import { exportThemeToJS, exportThemeToCSS, parseThemeFromJS } from '../utils/impexp.ts';
import { isDomainMatch } from '../utils/domains.ts';

interface ThemeListProps {
    onSelectTheme: (id: string) => void;
    activeUrl: string | null;
}

export const ThemeList: React.FC<ThemeListProps> = ({ onSelectTheme, activeUrl }) => {
    const { themes, snippets, addTheme, deleteTheme, updateTheme, addSnippet, addSnippetToTheme, globalEnabled } = useStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newThemeName, setNewThemeName] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Context Menu State
    const [menuState, setMenuState] = useState<{ x: number; y: number; themeId: string | null }>({ x: 0, y: 0, themeId: null });

    const handleCreate = () => {
        if (!newThemeName.trim()) return;
        addTheme({
            name: newThemeName,
            domainPatterns: ['<all_urls>'],
            items: [],
            isActive: true,
        });
        setNewThemeName('');
        setIsCreating(false);
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
                alert(`Imported theme: ${importedData.name}`);
            } else {
                alert('Failed to parse theme from file.');
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
                onClick: () => {
                    if (confirm(`Are you sure you want to delete theme "${theme.name}"?`)) {
                        deleteTheme(themeId);
                    }
                }
            }
        ];
    };

    return (
        <div className="flex flex-col gap-4">
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

            {isCreating && (
                <div className="flex gap-2 p-2 bg-slate-800 rounded border border-slate-700">
                    <input
                        type="text"
                        value={newThemeName}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        placeholder="Theme Name..."
                        className="flex-1 bg-transparent outline-none text-sm"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <button onClick={handleCreate} className="text-xs bg-blue-600 px-2 rounded">Add</button>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {themes.length === 0 && !isCreating && (
                    <div className="text-center p-4 text-slate-500 text-sm">
                        No themes yet. Create one!
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
                                                if (confirm(`Are you sure you want to delete theme "${theme.name}"?`)) {
                                                    deleteTheme(theme.id);
                                                }
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
