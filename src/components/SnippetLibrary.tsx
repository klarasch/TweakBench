import React, { useState } from 'react';
import { useStore } from '../store.ts';
import { Plus, Search, Code, FileCode, Trash2, MoreVertical, X } from 'lucide-react';
import type { SnippetType } from '../types.ts';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';

interface SnippetLibraryProps {
    onSelectSnippet?: (id: string) => void;
    onClose?: () => void;
    onSelect?: (snippet: any) => void;
    filterType?: 'css' | 'html' | null;
}

export const SnippetLibrary: React.FC<SnippetLibraryProps> = ({ onSelectSnippet, onSelect, filterType, onClose }) => {
    const { snippets, addSnippet, themes, deleteSnippet } = useStore();
    const [filter, setFilter] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemType, setNewItemType] = useState<SnippetType>('css');

    // Context Menu State
    const [menuState, setMenuState] = useState<{ x: number; y: number; snippetId: string | null }>({ x: 0, y: 0, snippetId: null });

    const handleCreateLibrary = () => {
        if (!newItemName.trim()) return;

        const baseContent = newItemType === 'css'
            ? '/* New Library Snippet */\n.class {\n  color: blue;\n}'
            : '<div class="lib-snippet">\n  Hello Library\n</div>';

        addSnippet({
            name: newItemName,
            type: newItemType,
            content: baseContent,
            relatedSnippetIds: [],
            isLibraryItem: true
        });

        setNewItemName('');
        setIsCreating(false);
        // Optional: onSelectSnippet(id); 
    };

    const handleContextMenu = (e: React.MouseEvent, snippetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuState({ x: e.pageX, y: e.pageY, snippetId });
    };

    const handleKebabClick = (e: React.MouseEvent, snippetId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({ x: rect.left, y: rect.bottom, snippetId });
    };

    const getMenuItems = (snippetId: string): ContextMenuItem[] => {
        const snippet = snippets.find(s => s.id === snippetId);
        if (!snippet) return [];

        const usageCount = themes.reduce((acc, t) => acc + t.items.filter(i => i.snippetId === snippet.id).length, 0);

        return [
            {
                label: 'Add to Theme',
                icon: <Plus size={14} />,
                onClick: () => {
                    if (onSelect) onSelect(snippet);
                    else if (onSelectSnippet) onSelectSnippet(snippetId);
                }
            },
            { separator: true },
            {
                label: 'Delete Snippet',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => {
                    if (usageCount > 0) {
                        if (!confirm(`Warning: This snippet is used in ${usageCount} themes. Deleting it will break those themes. Continue?`)) return;
                    } else {
                        if (!confirm('Delete this snippet from library?')) return;
                    }
                    deleteSnippet(snippetId);
                }
            }
        ];
    };

    const filteredSnippets = snippets.filter(s =>
        (s.isLibraryItem !== false) &&
        (filterType ? s.type === filterType : true) &&
        s.name.toLowerCase().includes(filter.toLowerCase())
    );

    // Cancel creation on Esc
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isCreating) {
                setIsCreating(false);
                setNewItemName('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCreating]);

    return (
        <div className="flex flex-col h-full bg-slate-900">
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-200 text-lg">Library</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCreating(true)}
                        className={`text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800 ${isCreating ? 'text-white bg-slate-800' : ''}`}
                        title="New Library Item"
                    >
                        <Plus size={20} />
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {isCreating && (
                <div className="bg-slate-950/50 border-b border-slate-800/50 p-4 animate-in slide-in-from-top-2 duration-200 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700/75 focus:border-blue-500 rounded-md px-3 py-2 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:ring-1 focus:ring-blue-500/50"
                            placeholder="e.g., 'Primary Button' or 'Hero Section'"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateLibrary();
                            }}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
                            <button
                                onClick={() => setNewItemType('css')}
                                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${newItemType === 'css' ? 'bg-blue-600/90 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                            >
                                <span className="flex items-center justify-center gap-1.5">
                                    <Code size={14} /> CSS
                                </span>
                            </button>
                            <button
                                onClick={() => setNewItemType('html')}
                                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${newItemType === 'html' ? 'bg-orange-600/90 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                            >
                                <span className="flex items-center justify-center gap-1.5">
                                    <FileCode size={14} /> HTML
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 rounded-md transition-colors border border-slate-700/50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateLibrary}
                            disabled={!newItemName.trim()}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium py-2 rounded-md transition-all shadow-sm shadow-blue-900/20"
                        >
                            Create Snippet
                        </button>
                    </div>
                </div>
            )}

            <div className="p-2">
                <div className="flex items-center bg-slate-800 rounded px-2 py-1 mb-2">
                    <Search size={14} className="text-slate-500 mr-2" />
                    <input
                        className="bg-transparent text-sm text-white outline-none w-full"
                        placeholder="Search..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 pt-0">
                {filteredSnippets.map(snippet => {
                    const usageCount = themes.reduce((acc, t) => acc + t.items.filter(i => i.snippetId === snippet.id).length, 0);
                    return (
                        <div
                            key={snippet.id}
                            className="p-2 mb-1 rounded hover:bg-slate-800 cursor-pointer group flex items-center justify-between relative"
                            onClick={() => {
                                if (onSelect) onSelect(snippet);
                                else if (onSelectSnippet) onSelectSnippet(snippet.id);
                            }}
                            onContextMenu={(e) => handleContextMenu(e, snippet.id)}
                        >
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                {snippet.type === 'css' ? <Code size={14} className="text-blue-400 flex-none" /> : <FileCode size={14} className="text-orange-400 flex-none" />}
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-slate-300 text-sm truncate">{snippet.name}</span>
                                    {usageCount > 0 && <span className="text-[10px] text-slate-500">Used in {usageCount} themes</span>}
                                </div>
                            </div>
                            <div className="flex gap-1 items-center">
                                {/* Shortcuts */}
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        className="p-1 hover:bg-red-900/50 rounded text-slate-600 hover:text-red-400"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (usageCount > 0) {
                                                if (!confirm(`Warning: This snippet is used in ${usageCount} themes. Deleting it will break those themes. Continue?`)) return;
                                            } else {
                                                if (!confirm('Delete this snippet from library?')) return;
                                            }
                                            deleteSnippet(snippet.id);
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                    <button
                                        className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onSelect) onSelect(snippet);
                                            else if (onSelectSnippet) onSelectSnippet(snippet.id);
                                        }}
                                        title="Add to Theme"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {/* Kebab */}
                                <button
                                    onClick={(e) => handleKebabClick(e, snippet.id)}
                                    className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 opacity-50 group-hover:opacity-100"
                                >
                                    <MoreVertical size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {menuState.snippetId && (
                <ContextMenu
                    x={menuState.x}
                    y={menuState.y}
                    items={getMenuItems(menuState.snippetId)}
                    onClose={() => setMenuState({ ...menuState, snippetId: null })}
                />
            )}
        </div>
    );
};
