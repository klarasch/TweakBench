import React, { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ImportVariablesModalProps {
    variables: Record<string, Record<string, string>>;
    onImport: (selectedScopes: string[]) => void;
    onClose: () => void;
}

export const ImportVariablesModal: React.FC<ImportVariablesModalProps> = ({ variables, onImport, onClose }) => {
    const scopes = Object.keys(variables);
    const [selected, setSelected] = useState<Set<string>>(new Set(scopes));
    const [search, setSearch] = useState('');

    const filteredScopes = scopes.filter(s => s.toLowerCase().includes(search.toLowerCase()));

    const toggleScope = (scope: string) => {
        const next = new Set(selected);
        if (next.has(scope)) next.delete(scope);
        else next.add(scope);
        setSelected(next);
    };

    const toggleAll = () => {
        if (selected.size === filteredScopes.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filteredScopes));
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={
                <div>
                    Import CSS variables
                    <p className="text-xs text-slate-400 font-normal mt-0.5">Select scopes to import as snippets</p>
                </div>
            }
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="filled"
                        onClick={() => onImport(Array.from(selected))}
                        disabled={selected.size === 0}
                    >
                        Import {selected.size} snippets
                    </Button>
                </>
            }
        >
            {scopes.length > 0 ? (
                <div className="p-4 border-b border-slate-800 flex gap-4 -mx-4 -mt-4 mb-2 bg-slate-900 sticky top-0 z-10">
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 flex items-center gap-2">
                        <Search size={14} className="text-slate-500" />
                        <input
                            className="bg-transparent outline-none text-sm text-slate-200 placeholder:text-slate-600 w-full"
                            placeholder="Filter scopes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={toggleAll}>
                        {selected.size === filteredScopes.length ? 'Deselect all' : 'Select all'}
                    </Button>
                </div>
            ) : (
                <div className="text-center py-12 px-6">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={20} className="text-slate-500" />
                    </div>
                    <p className="text-slate-300 font-medium">No CSS variables detected</p>
                    <p className="text-slate-500 text-xs mt-2">
                        We couldn't find any CSS variables on this page. Make sure the page uses CSS variables in <code>:root</code> or other scopes.
                    </p>
                </div>
            )}

            <div className="space-y-1">
                {filteredScopes.map(scope => {
                    const count = Object.keys(variables[scope]).length;
                    const isSelected = selected.has(scope);
                    return (
                        <div
                            key={scope}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-transparent border-transparent hover:bg-slate-800'}`}
                            onClick={() => toggleScope(scope)}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                                {isSelected && <Check size={10} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-mono truncate ${isSelected ? 'text-blue-200' : 'text-slate-300'}`}>{scope}</span>
                                    <span className="text-xs text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">{count} vars</span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                    {Object.keys(variables[scope]).slice(0, 5).join(', ')}{count > 5 ? '...' : ''}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredScopes.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        No scopes found matching "{search}"
                    </div>
                )}
            </div>
        </Modal>
    );
};

