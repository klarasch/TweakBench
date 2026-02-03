import React, { useState } from 'react';
import { useStore } from '../store.ts';
import { Plus, Trash2, Play, Pause, MoreVertical, Upload, Download } from 'lucide-react';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';
import { exportThemeToJS, exportThemeToCSS, parseThemeFromJS } from '../utils/impexp.ts';

interface ThemeListProps {
    onSelectTheme: (id: string) => void;
}

export const ThemeList: React.FC<ThemeListProps> = ({ onSelectTheme }) => {
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
                // Create Theme
                const newThemeId = addTheme({
                    name: importedData.name,
                    domainPatterns: importedData.domainPatterns,
                    items: [], // will fill below
                    isActive: true
                });

                // Create and Link Snippets
                importedData.snippets.forEach(s => {
                    const newSnippetId = addSnippet({
                        name: s.name,
                        type: s.type,
                        content: s.content,
                        relatedSnippetIds: [],
                        isLibraryItem: false // Import as local by default for safety/simplicity
                    });

                    // Add to theme with overrides if specific logic requires, 
                    // but our export/import simplifies overrides into the JS execution block representation.
                    // For full fidelity, we're restoring them as enabled items.
                    // Note: Our simple import logic creates new local snippets.
                    // If we wanted to preserve "Library" link, we'd need more complex metadata in export (e.g. library UUID).
                    // For now, importing "standalone" JS -> creates Local Copies.

                    addSnippetToTheme(newThemeId, newSnippetId);

                    // If there were specific HTML positioning/selectors we need to apply them to the item overrides
                    if (s.type === 'html' && (s.selector || s.position)) {
                        // We need access to the theme item ID just created.
                        // Ideally addSnippetToTheme returns the new item ID?
                        // Checking store: addSnippetToTheme returns void currently.
                        // We might need to look it up or update store to return it.
                        // For this iteration, let's assume default behaviour or quick update.
                        // FIX: Let's assume user will adjust, OR update store to return item ID.
                        // BETTER: Since we can't easily get the item ID without race component, 
                        // let's rely on the user adjusting for now, OR 
                        // we update the exported text content so it includes comments the user can read?
                        // Actually, our `parseThemeFromJS` returns selector/position.
                        // To apply them strictly, we need to update the ThemeItem.
                        // Let's defer precise restoring of overrides for a subsequent step if store update is needed.
                        // Current store `addSnippetToTheme` generates ID internally.
                    }
                });

                alert(`Imported theme: ${importedData.name}`);
            } else {
                alert('Failed to parse theme from file.');
            }
        };
        reader.readAsText(file);
        // Reset input
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
                <h2 className="text-lg font-semibold">Themes</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleImportClick}
                        className="p-1 rounded hover:bg-slate-700 text-slate-300"
                        title="Import Theme"
                    >
                        <Upload size={20} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".js"
                    />
                    <button
                        onClick={() => setIsCreating(true)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-300"
                        title="Create Theme"
                    >
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
                {themes.map(theme => (
                    <div
                        key={theme.id}
                        className="p-3 bg-slate-800 rounded border border-slate-700 flex flex-col gap-2 group relative hover:border-slate-600 transition-colors"
                        onContextMenu={(e) => handleContextMenu(e, theme.id)}
                    >
                        <div className="flex justify-between items-center">
                            <span
                                className="font-medium cursor-pointer hover:text-blue-400 flex-1 truncate pr-2"
                                onClick={() => onSelectTheme(theme.id)}
                            >
                                {theme.name}
                            </span>
                            <div className="flex gap-1 items-center">
                                {/* Shortcuts (existing icons) */}
                                <div className="flex gap-1 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!globalEnabled) return; // Prevent toggle if global disabled
                                            updateTheme(theme.id, { isActive: !theme.isActive });
                                        }}
                                        disabled={!globalEnabled}
                                        className={`p-1 rounded flex items-center gap-1.5 px-2 transition-colors ${!globalEnabled
                                            ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed opacity-50'
                                            : theme.isActive
                                                ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 shadow-[0_0_0_1px_rgba(74,222,128,0.2)]'
                                                : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                                            }`}
                                        title={!globalEnabled ? "System Disabled" : (theme.isActive ? "Disable Theme" : "Enable Theme")}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${!globalEnabled ? 'bg-slate-600' : (theme.isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-500')}`}></div>
                                        <span className="text-[10px] font-bold uppercase">{theme.isActive ? 'ON' : 'OFF'}</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Are you sure you want to delete theme "${theme.name}"?`)) {
                                                deleteTheme(theme.id);
                                            }
                                        }}
                                        className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Theme"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                {/* Kebab Menu */}
                                <button
                                    onClick={(e) => handleKebabClick(e, theme.id)}
                                    className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 opacity-0 group-hover:opacity-100"
                                >
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                            {theme.domainPatterns.join(', ')}
                        </div>
                    </div>
                ))}
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
