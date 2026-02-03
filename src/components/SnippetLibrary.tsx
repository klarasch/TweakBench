import React, { useState } from 'react';
import { useStore } from '../store.ts';
import { Plus, Search, Code, FileCode, Trash2 } from 'lucide-react';
import type { SnippetType } from '../types.ts';

interface SnippetLibraryProps {
    onSelectSnippet: (id: string) => void;
    onClose: () => void;
}

export const SnippetLibrary: React.FC<SnippetLibraryProps> = ({ onSelectSnippet }) => {
    const { snippets, addSnippet, themes, deleteSnippet } = useStore();
    const [filter, setFilter] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemType, setNewItemType] = useState<SnippetType>('css');

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

    const filteredSnippets = snippets.filter(s =>
        (s.isLibraryItem !== false) &&
        s.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 w-64 absolute right-0 top-0 z-20 shadow-xl">
            <div className="p-3 border-b border-slate-800 bg-slate-900">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-slate-200">Library</h3>
                    <button onClick={() => setIsCreating(true)} className="text-slate-400 hover:text-white" title="New Library Item">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {isCreating && (
                <div className="p-3 bg-slate-800 border-b border-slate-700">
                    <input
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-sm text-white mb-2"
                        placeholder="Snippet Name"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        autoFocus
                    />
                    <div className="flex gap-2 mb-2">
                        <button
                            onClick={() => setNewItemType('css')}
                            className={`flex-1 text-xs py-1 rounded ${newItemType === 'css' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                        >CSS</button>
                        <button
                            onClick={() => setNewItemType('html')}
                            className={`flex-1 text-xs py-1 rounded ${newItemType === 'html' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                        >HTML</button>
                    </div>
                    <button onClick={handleCreateLibrary} className="w-full bg-blue-600 text-white text-xs py-1 rounded">Create</button>
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
                            className="p-2 mb-1 rounded hover:bg-slate-800 cursor-pointer group flex items-center justify-between"
                            onClick={() => onSelectSnippet(snippet.id)}
                        >
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                {snippet.type === 'css' ? <Code size={14} className="text-blue-400 flex-none" /> : <FileCode size={14} className="text-orange-400 flex-none" />}
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-slate-300 text-sm truncate">{snippet.name}</span>
                                    {usageCount > 0 && <span className="text-[10px] text-slate-500">Used in {usageCount} themes</span>}
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    className="p-1 hover:bg-red-900/50 rounded text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (usageCount > 0) {
                                            if (!confirm(`Warning: This snippet is used in ${usageCount} themes. Deleting it will break those themes. Continue?`)) return;
                                        } else {
                                            if (!confirm('Delete this snippet from library?')) return;
                                        }
                                        deleteSnippet(snippet.id);
                                    }}
                                >
                                    <Trash2 size={12} />
                                </button>
                                <button className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
