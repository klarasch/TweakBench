import React, { useState } from 'react';
import { Globe, Plus, X, Edit2 } from 'lucide-react';

interface DomainListEditorProps {
    domainPatterns: string[];
    onUpdate: (newPatterns: string[]) => void;
    activeUrl: string | null;
}

export const DomainListEditor: React.FC<DomainListEditorProps> = ({ domainPatterns = [], onUpdate, activeUrl }) => {
    const [newDomain, setNewDomain] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleAdd = () => {
        if (!newDomain.trim()) return;
        if (!domainPatterns.includes(newDomain.trim())) {
            onUpdate([...domainPatterns, newDomain.trim()]);
        }
        setNewDomain('');
    };

    const handleRemove = (domain: string) => {
        onUpdate(domainPatterns.filter(d => d !== domain));
    };

    const startEditing = (index: number, val: string) => {
        setEditingIndex(index);
        setEditValue(val);
    };

    const saveEditing = (index: number) => {
        if (editingIndex === null) return;
        const newValue = editValue.trim();

        if (!newValue) {
            setEditingIndex(null);
            return;
        }

        const newPatterns = [...domainPatterns];
        newPatterns[index] = newValue;
        onUpdate(newPatterns);
        setEditingIndex(null);
    };

    // Helper to extract domain from URL if needed, but activeUrl is passed as string?
    // We can assume activeUrl is just a string URL.
    const currentDomain = activeUrl ? new URL(activeUrl).hostname : null;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Allowed domains</label>
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors placeholder:text-slate-600"
                        value={newDomain}
                        onChange={e => setNewDomain(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder="example.com"
                        autoFocus
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newDomain.trim()}
                        className="px-3 bg-slate-800 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-slate-800 rounded-lg border border-slate-700 text-white transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 px-1">
                    Enter a domain (e.g. <code className="bg-slate-800 px-1 rounded">google.com</code>) or pattern (<code className="bg-slate-800 px-1 rounded">*.gov</code>).
                </p>

                {currentDomain && domainPatterns.length > 0 && (!domainPatterns.includes(currentDomain)) && (
                    <button
                        onClick={() => {
                            onUpdate([...domainPatterns, currentDomain]);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline text-left px-1 flex items-center gap-1"
                    >
                        <Plus size={10} />
                        Add current: {currentDomain}
                    </button>
                )}
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {domainPatterns.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg bg-slate-800/20">
                        No domains configured.<br />
                        <span className="text-xs">The theme will not run anywhere.</span>
                        {currentDomain && (
                            <div className="mt-4 pt-4 border-t border-slate-800/50">
                                <button
                                    onClick={() => onUpdate([...domainPatterns, currentDomain])}
                                    className="mx-auto flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-full transition-colors font-medium border border-blue-500/20"
                                >
                                    <Plus size={14} />
                                    Add {currentDomain}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {domainPatterns.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-800/50 group transition-colors min-w-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Globe size={14} className="text-slate-500 group-hover:text-blue-400 transition-colors shrink-0" />

                            {editingIndex === i ? (
                                <input
                                    className="flex-1 bg-slate-900 border border-blue-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none min-w-0"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditing(i);
                                        if (e.key === 'Escape') setEditingIndex(null);
                                        e.stopPropagation();
                                    }}
                                    onBlur={() => saveEditing(i)}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <div
                                    className="flex-1 flex items-center justify-between group/item cursor-pointer min-w-0"
                                    onClick={(e) => { e.stopPropagation(); startEditing(i, p); }}
                                >
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-white font-mono truncate">
                                        {p}
                                    </span>
                                    <Edit2 size={12} className="text-slate-600 opacity-0 group-hover/item:opacity-100 transition-opacity ml-2 shrink-0" />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRemove(p); }}
                            className="p-1.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors ml-2 shrink-0"
                            title="Remove domain"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
