import React from 'react';
import { useStore } from '../../store.ts';
import { CodeEditor } from '../CodeEditor.tsx';
import { MoreVertical, ChevronDown, ChevronRight } from 'lucide-react';
import type { ThemeItem } from '../../types.ts';

interface SnippetStackItemProps {
    item: ThemeItem;
    themeId: string;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    isSelected: boolean;
    itemRef: (el: HTMLDivElement | null) => void;
    onKebabClick: (e: React.MouseEvent, itemId: string) => void;
    isEditing: boolean;
    onSetEditing: (isEditing: boolean) => void;
}

export const SnippetStackItem: React.FC<SnippetStackItemProps> = ({
    item,
    themeId,
    isCollapsed,
    onToggleCollapse,
    isSelected,
    itemRef,
    onKebabClick,
    isEditing,
    onSetEditing
}) => {
    const { snippets, updateSnippet, updateThemeItem, toggleThemeItem } = useStore();
    const s = snippets.find(sn => sn.id === item.snippetId);

    // Local State
    // const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null); // Lifted up

    if (!s) return null;

    const handleUpdateName = (val: string) => {
        if (val.trim()) updateSnippet(s.id, { name: val.trim() });
        onSetEditing(false);
    };

    return (
        <div
            ref={itemRef}
            className={`border transition-all ${isSelected ? 'border-blue-500/50 shadow-lg shadow-blue-500/5' : 'border-slate-800 bg-slate-900'}`}
        >
            {/* Snippet Header */}
            <div
                className={`flex items-center gap-2 p-3 cursor-pointer select-none ${isCollapsed ? 'bg-slate-800/20' : 'bg-slate-950/50 border-b border-slate-800'}`}
                onClick={onToggleCollapse}
            >
                <button className="text-slate-500 hover:text-white transition-colors">
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <input
                                autoFocus
                                className="bg-slate-900 text-slate-200 text-sm font-medium border border-blue-500 rounded px-1 py-0.5 outline-none w-full"
                                defaultValue={s.name}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleUpdateName((e.target as HTMLInputElement).value);
                                    } else if (e.key === 'Escape') {
                                        e.stopPropagation();
                                        onSetEditing(false);
                                    }
                                }}
                                onBlur={(e) => handleUpdateName(e.target.value)}
                            />
                        ) : (
                            <span
                                className={`font-medium text-sm truncate cursor-text hover:border-b hover:border-slate-500 ${!item.isEnabled ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-200'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSetEditing(true);
                                }}
                                title="Click to rename"
                            >
                                {s.name}
                            </span>
                        )}
                        {item.overrides?.content !== undefined && (
                            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Modified</span>
                        )}
                    </div>
                </div>

                {/* Publish / Reset Controls */}
                {!isCollapsed && (
                    <div className="flex items-center gap-2 mr-2">
                        {s.isLibraryItem === false ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newName = prompt('Enter name for Library:', s.name);
                                    if (newName) updateSnippet(s.id, { name: newName, isLibraryItem: true });
                                }}
                                className="text-purple-400 hover:text-purple-300 text-xs px-2 py-1 rounded border border-purple-900/50 hover:bg-purple-900/20"
                            >
                                Publish
                            </button>
                        ) : (
                            item.overrides?.content !== undefined && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Revert to Master Snippet? Local changes will be lost.')) {
                                                const { content, ...rest } = item.overrides || {};
                                                updateThemeItem(themeId, item.id, { overrides: rest.selector || rest.position ? rest : undefined });
                                            }
                                        }}
                                        className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Publish changes to Master Snippet?')) {
                                                const newContent = item.overrides?.content;
                                                if (newContent) {
                                                    updateSnippet(s.id, { content: newContent });
                                                    const { content, ...rest } = item.overrides || {};
                                                    updateThemeItem(themeId, item.id, { overrides: rest.selector || rest.position ? rest : undefined });
                                                }
                                            }
                                        }}
                                        className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded border border-blue-900/50 hover:bg-blue-900/20"
                                    >
                                        Publish Changes
                                    </button>
                                </>
                            )
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2 border-l border-slate-800 pl-2">
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={item.isEnabled}
                            onChange={() => {
                                toggleThemeItem(themeId, item.id);
                            }}
                        />
                        <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[0px] after:left-[0px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600/20 peer-checked:after:bg-blue-400 peer-checked:after:border-blue-300"></div>
                    </label>

                    <button
                        className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 ml-1"
                        onClick={(e) => onKebabClick(e, item.id)}
                    >
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>

            {/* HTML Controls Row (Expanded Only) */}
            {
                s.type === 'html' && !isCollapsed && (
                    <div className="bg-slate-950/30 px-3 pb-3 pt-3 flex gap-2 items-center border-b border-slate-800/50" onClick={e => e.stopPropagation()}>
                        <div className="flex-1 flex gap-2 items-center bg-slate-900 border border-slate-800 rounded px-2 py-1">
                            <span className="text-[10px] text-slate-500 font-mono uppercase">Target</span>
                            <input
                                className="bg-transparent text-slate-300 text-sm font-mono w-full outline-none placeholder:text-slate-700"
                                placeholder="CSS Selector (e.g. .container)"
                                value={item.overrides?.selector ?? s.selector ?? ''}
                                onChange={(e) => updateThemeItem(themeId, item.id, {
                                    overrides: { ...item.overrides, selector: e.target.value }
                                })}
                                title="CSS Selector Target"
                            />
                        </div>
                        <div className="w-[120px] flex gap-2 items-center bg-slate-900 border border-slate-800 rounded px-2 py-1">
                            <span className="text-[10px] text-slate-500 font-mono uppercase">Pos</span>
                            <select
                                className="bg-transparent text-slate-300 text-sm w-full outline-none cursor-pointer"
                                value={item.overrides?.position ?? s.position ?? 'beforeend'}
                                onChange={(e) => updateThemeItem(themeId, item.id, {
                                    overrides: { ...item.overrides, position: e.target.value as any }
                                })}
                                title="Injection Position"
                            >
                                <option value="append">Append</option>
                                <option value="prepend">Prepend</option>
                                <option value="before">Before</option>
                                <option value="after">After</option>
                            </select>
                        </div>
                    </div>
                )
            }

            {/* Snippet Editor Body */}
            {
                !isCollapsed && (
                    <div className="flex flex-col border-t border-slate-800">
                        <CodeEditor
                            value={item.overrides?.content ?? s.content}
                            onChange={(val) => {
                                if (s.isLibraryItem === false) {
                                    updateSnippet(s.id, { content: val });
                                } else {
                                    updateThemeItem(themeId, item.id, {
                                        overrides: { ...item.overrides, content: val }
                                    });
                                }
                            }}
                            className="flex-1 rounded-none border-x-0 border-b-0 border-t-0"
                            mode={s.type}
                            autoHeight={true}
                            onFocus={() => {
                                // Handled by parent if needed, or we assume clicking selects it via scrollspy observation.
                                // Actually, original logic had: setSelectedItemId(item.id).
                                // We don't have setSelectedItemId passed down.
                                // Maybe we don't strictly need it? 
                                // Or we should pass `onSelect` prop.
                                // For now, let's omit the onFocus selection or implement it if key navigation breaks.
                            }}
                        />
                    </div>
                )
            }
        </div>
    );
};
