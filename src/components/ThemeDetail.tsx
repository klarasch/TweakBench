import React, { useState, useEffect } from 'react';
import { useStore } from '../store.ts';
import { CodeEditor } from './CodeEditor.tsx';
import { SnippetLibrary } from './SnippetLibrary.tsx';
import { ArrowLeft, Trash2, Box, Play, Pause, Code, FileCode, BookOpen, Plus, Globe, Monitor } from 'lucide-react';
import type { SnippetType } from '../types.ts';

interface ThemeDetailProps {
    themeId: string;
    onBack: () => void;
}

export const ThemeDetail: React.FC<ThemeDetailProps> = ({ themeId, onBack }) => {
    const { themes, snippets, updateTheme, updateSnippet, addSnippet, addSnippetToTheme, toggleThemeItem, updateThemeItem } = useStore();
    const theme = themes.find(t => t.id === themeId);

    // State
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [showLibrary, setShowLibrary] = useState(false);
    const [localName, setLocalName] = useState('');

    useEffect(() => {
        if (theme) {
            setLocalName(theme.name);
            // Select first item by default if nothing selected
            if (!selectedItemId && theme.items.length > 0) {
                setSelectedItemId(theme.items[0].id);
            }
        }
    }, [theme, selectedItemId]);

    if (!theme) return <div>Theme not found</div>;

    const activeItem = theme.items.find(i => i.id === selectedItemId);
    const activeSnippet = activeItem ? snippets.find(s => s.id === activeItem.snippetId) : null;

    const handleAddSnippet = (snippetId: string) => {
        addSnippetToTheme(themeId, snippetId);
        setShowLibrary(false);
    };

    const handleCreateLocal = (type: SnippetType) => {
        const id = addSnippet({
            name: type === 'css' ? 'Local CSS' : 'Local HTML',
            type,
            content: type === 'css' ? '/* CSS */\n' : '<!-- HTML -->\n',
            relatedSnippetIds: [],
            isLibraryItem: false
        });
        addSnippetToTheme(themeId, id);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 relative">
            {/* Header */}
            <div className="flex-none flex items-center gap-2 p-4 border-b border-slate-800 bg-slate-900 z-10">
                <button onClick={onBack} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <input
                        className="bg-transparent font-bold text-lg outline-none w-full text-white placeholder-slate-600"
                        value={localName}
                        onChange={(e) => {
                            setLocalName(e.target.value);
                            updateTheme(themeId, { name: e.target.value });
                        }}
                        placeholder="Theme Name"
                    />
                </div>
                <button
                    onClick={() => updateTheme(themeId, { isActive: !theme.isActive })}
                    className={`p-1.5 rounded mr-1 ${theme.isActive ? 'text-green-500 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'}`}
                    title={theme.isActive ? "Disable Theme" : "Enable Theme"}
                >
                    {theme.isActive ? <Pause size={18} /> : <Play size={18} />}
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar: Applied Snippets */}
                <div className="w-1/3 min-w-[150px] border-r border-slate-800 flex flex-col bg-slate-900 z-20">
                    <div className="flex p-3 gap-1 border-b border-slate-800">
                        <button
                            onClick={() => handleCreateLocal('css')}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs py-1.5 rounded flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                            title="Add Local CSS"
                        >
                            <Plus size={12} /> <Code size={14} /> <span>CSS</span>
                        </button>
                        <button
                            onClick={() => handleCreateLocal('html')}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs py-1.5 rounded flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                            title="Add Local HTML"
                        >
                            <Plus size={12} /> <FileCode size={14} /> <span>HTML</span>
                        </button>
                        <button
                            onClick={() => setShowLibrary(!showLibrary)}
                            className={`px-3 py-1.5 rounded border border-slate-700 flex items-center justify-center transition-colors ml-1 ${showLibrary ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            title="Open Library"
                        >
                            <BookOpen size={16} />
                        </button>
                    </div>
                    <div className="p-2 text-xs font-semibold text-slate-500 uppercase">Applied Snippets</div>
                    <div className="flex-1 overflow-y-auto">
                        {theme.items.map(item => {
                            const s = snippets.find(sn => sn.id === item.snippetId);
                            if (!s) return null;
                            return (
                                <div
                                    key={item.id}
                                    className={`p-2 border-l-2 cursor-pointer hover:bg-slate-800 group ${selectedItemId === item.id ? 'border-blue-500 bg-slate-800' : 'border-transparent'} ${!item.isEnabled ? 'opacity-50 grayscale-[0.5]' : ''}`}
                                    onClick={() => setSelectedItemId(item.id)}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-sm font-medium truncate ${selectedItemId === item.id ? 'text-white' : 'text-slate-400'}`}>
                                            {s.name}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {!item.isEnabled && (
                                                <span className="text-[10px] bg-red-900/50 text-red-400 px-1 rounded uppercase">Disabled</span>
                                            )}
                                            {s.isLibraryItem !== false && (
                                                <div className="relative flex items-center justify-center">
                                                    <span className="text-blue-400" title="Library Snippet">
                                                        <BookOpen size={12} />
                                                    </span>
                                                    {item.overrides?.content !== undefined && (
                                                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-500 rounded-full border border-slate-900" title="Has Overrides" />
                                                    )}
                                                </div>
                                            )}
                                            <span className="text-[10px] bg-slate-700 px-1 rounded text-slate-400 uppercase w-[32px] text-center">{s.type}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <label
                                            className="relative inline-flex items-center cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={item.isEnabled}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleThemeItem(theme.id, item.id);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
                                        </label>
                                        <button
                                            className="p-0.5 text-slate-500 hover:text-red-400"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Remove snippet from theme?')) {
                                                    useStore.getState().removeSnippetFromTheme(theme.id, item.id);
                                                    if (selectedItemId === item.id) setSelectedItemId(null);
                                                }
                                            }}
                                            title="Remove Snippet"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {theme.items.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-500">
                                No snippets applied. Use controls above.
                            </div>
                        )}
                    </div>
                </div>

                {/* Main: Editor */}
                <div className="flex-1 flex flex-col bg-slate-900 relative">
                    {/* Library Popover with Backdrop */}
                    {showLibrary && (
                        <>
                            {/* Backdrop to close on click outside */}
                            <div
                                className="absolute inset-0 z-20 bg-slate-900/50 backdrop-blur-[1px]"
                                onClick={() => setShowLibrary(false)}
                            />
                            {/* Popover content */}
                            <div className="absolute top-0 bottom-0 left-0 w-[300px] z-30 bg-slate-900 border-r border-slate-800 shadow-xl flex flex-col">
                                <SnippetLibrary
                                    onSelectSnippet={handleAddSnippet}
                                    onClose={() => setShowLibrary(false)}
                                />
                            </div>
                        </>
                    )}

                    {activeSnippet ? (
                        <>
                            <div className="flex-none p-2 bg-slate-950 border-b border-slate-800 flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400 font-mono flex items-center gap-2">
                                        {activeSnippet.isLibraryItem !== false ? (
                                            <span className="flex items-center gap-1 text-blue-400"><Globe size={12} /> Library</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-slate-500"><Monitor size={12} /> Local</span>
                                        )}
                                        <span className="text-slate-600">/</span>
                                        {activeSnippet.type === 'css' ? 'CSS' : 'HTML'}
                                        {activeItem?.overrides?.content !== undefined && (
                                            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1 rounded uppercase ml-1">Override</span>
                                        )}
                                    </span>

                                    <div className="flex gap-2 text-xs items-center h-6"> {/* Fixed height container */}
                                        {/* GHOST SNIPPET LOGIC */}
                                        {activeSnippet.isLibraryItem === false && (
                                            <button
                                                onClick={() => {
                                                    const newName = prompt('Enter name for Library:', activeSnippet.name);
                                                    if (newName) {
                                                        updateSnippet(activeSnippet.id, { name: newName, isLibraryItem: true });
                                                    }
                                                }}
                                                className="text-purple-400 hover:text-purple-300 px-2 py-0.5 rounded border border-purple-900 bg-purple-900/20 hover:bg-purple-900/40 text-xs flex items-center gap-1"
                                            >
                                                Publish
                                            </button>
                                        )}

                                        {/* OVERRIDE LOGIC (Only for Library Snippets) */}
                                        {activeSnippet.isLibraryItem !== false && activeItem?.overrides?.content !== undefined && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Revert to Master Snippet? Local changes will be lost.')) {
                                                            const { content, ...rest } = activeItem.overrides || {};
                                                            updateThemeItem(themeId, activeItem.id, { overrides: rest.selector || rest.position ? rest : undefined });
                                                        }
                                                    }}
                                                    className="text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-700 hover:bg-slate-800"
                                                >
                                                    Reset
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Publish changes to Master Snippet? This will affect all themes using this snippet.')) {
                                                            const newContent = activeItem.overrides?.content;
                                                            if (newContent) {
                                                                updateSnippet(activeSnippet.id, { content: newContent });
                                                                // Clear local override after promotion
                                                                const { content, ...rest } = activeItem.overrides || {};
                                                                updateThemeItem(themeId, activeItem.id, { overrides: rest.selector || rest.position ? rest : undefined });
                                                            }
                                                        }
                                                    }}
                                                    className="text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded border border-blue-900 bg-blue-900/20 hover:bg-blue-900/40 text-xs"
                                                >
                                                    Publish Changes
                                                </button>
                                            </>
                                        )}

                                        {activeSnippet.type === 'html' && activeItem && (
                                            <>
                                                <input
                                                    className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1 w-32 outline-none"
                                                    placeholder="Selector (e.g. body)"
                                                    value={activeItem.overrides?.selector ?? activeSnippet.selector ?? ''}
                                                    onChange={(e) => updateThemeItem(themeId, activeItem.id, {
                                                        overrides: { ...activeItem.overrides, selector: e.target.value }
                                                    })}
                                                />
                                                <select
                                                    className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1 outline-none"
                                                    value={activeItem.overrides?.position ?? activeSnippet.position ?? 'beforeend'}
                                                    onChange={(e) => updateThemeItem(themeId, activeItem.id, {
                                                        overrides: { ...activeItem.overrides, position: e.target.value as any }
                                                    })}
                                                >
                                                    <option value="append">Append</option>
                                                    <option value="prepend">Prepend</option>
                                                    <option value="before">Before</option>
                                                    <option value="after">After</option>
                                                </select>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <CodeEditor
                                value={activeItem?.overrides?.content ?? activeSnippet.content}
                                onChange={(val) => {
                                    // If Ghost Snippet, update directly
                                    if (activeSnippet.isLibraryItem === false) {
                                        updateSnippet(activeSnippet.id, { content: val });
                                    } else {
                                        // If Library Snippet, use Override
                                        updateThemeItem(themeId, activeItem!.id, {
                                            overrides: { ...activeItem!.overrides, content: val }
                                        });
                                    }
                                }}
                                className="flex-1"
                                mode={activeSnippet.type}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-2">
                            <Box size={40} />
                            <p>Select a snippet to edit</p>
                            <div className="text-xs text-slate-600">or add new from sidebar</div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
