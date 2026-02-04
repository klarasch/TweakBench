import React from 'react';
import { useStore } from '../../store.ts';
import { CodeEditor } from '../CodeEditor.tsx';
import { MoreVertical, ChevronDown, ChevronRight, Terminal, FileCode, Upload, BookOpen } from 'lucide-react';
import type { ThemeItem } from '../../types.ts';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';

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
    onSelect: () => void;
    isThemeActive: boolean;
    editorRef?: React.Ref<any>;
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
    onSetEditing,
    onSelect,
    isThemeActive,
    editorRef
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
            className={`
                group relative border transition-all rounded-lg mb-4 overflow-hidden
                ${isSelected
                    ? 'bg-slate-900 border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20'
                    : item.isEnabled
                        ? 'bg-slate-900 border-slate-700 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 opacity-75 grayscale-[0.3]'
                }
            `}
            onClick={() => {
                // Ensure clicking anywhere selects the item (unless handled by child)
                onSelect();
            }}
        >
            {/* Snippet Header */}
            <div
                className={`
                    flex items-center gap-3 px-3 py-2 cursor-pointer select-none transition-colors
                    ${isCollapsed ? 'hover:bg-slate-800' : 'bg-slate-800/30 border-b border-slate-800/50'}
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                    onToggleCollapse();
                }}
            >
                <button className="text-slate-500 hover:text-white transition-colors">
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {/* Icon based on Type (Always show type icon here) */}
                        <div className="relative flex-none">
                            {(s.type as string) === 'js' ? <Terminal size={14} className="text-yellow-500" /> : <FileCode size={14} className="text-blue-400" />}

                            {item.overrides?.content && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full border border-slate-900" title="Has Local Override"></div>
                            )}
                        </div>

                        {isEditing ? (
                            <input
                                autoFocus
                                className="bg-slate-950 text-white text-sm font-medium border border-blue-500 rounded px-1.5 py-0.5 outline-none flex-1 min-w-0"
                                defaultValue={s.name}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                onKeyDown={(e: React.KeyboardEvent) => {
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
                                className={`text-xs font-semibold truncate cursor-text ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'} ${!item.isEnabled ? 'line-through opacity-75' : ''}`}
                                onDoubleClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onSetEditing(true);
                                }}
                                title="Double-click to rename"
                            >
                                {s.name}
                            </span>
                        )}

                        {/* Appended Icons/Badges */}

                        {/* Library Icon */}
                        {s.isLibraryItem && (
                            <div className="flex items-center text-purple-400" title="Library Snippet">
                                <BookOpen size={12} />
                            </div>
                        )}

                        {/* Override Badge */}
                        {item.overrides?.content !== undefined && (
                            <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Override
                            </span>
                        )}
                    </div>
                </div>

                {/* Controls - Visible on Hover OR when Selected/Focused */}
                <div className={`flex items-center gap-2 transition-opacity ${isSelected || isCollapsed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>

                    {/* Collapsed Actions (Save, Reset) - Only show if collapsed or forced? Actually usually controls are always visible in header if extended? 
                        Wait, this header is arguably ALWAYS visible. 
                        The controls inside the header:
                        1. Save/Reset/Copy/etc
                        2. Toggle
                        3. Kebab
                    */}

                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            {s.isLibraryItem === false ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newName = prompt('Enter name for Library:', s.name);
                                        if (newName) updateSnippet(s.id, { name: newName, isLibraryItem: true });
                                    }}
                                    className="h-5 text-[10px] px-1.5 border-slate-700 text-slate-400 hover:text-purple-300 hover:border-purple-500/50"
                                    title="Save to Library"
                                    icon={<Upload size={10} />}
                                >
                                    Save
                                </Button>
                            ) : (
                                item.overrides?.content !== undefined && (
                                    <>
                                        {/* Removed redundant "Modified" badge as per user request */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Discard local changes and revert to library version?')) {
                                                    updateThemeItem(themeId, item.id, { overrides: undefined });
                                                }
                                            }}
                                            className="h-5 text-[10px] px-1.5 text-slate-500 hover:text-yellow-400"
                                            title="Revert to Library Version"
                                        >
                                            Reset
                                        </Button>
                                    </>
                                )
                            )}
                        </div>
                    )}

                    <div className="h-4 w-px bg-slate-800"></div>

                    {/* Toggle Switch */}
                    <Toggle
                        checked={item.isEnabled}
                        onChange={() => toggleThemeItem(themeId, item.id)}
                        size="sm"
                        disabled={!isThemeActive}
                        title={!isThemeActive ? "Enable theme to toggle snippets" : "Toggle Snippet"}
                    />

                    {/* Kebab Menu */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-600 hover:text-slate-200"
                        onClick={(e) => onKebabClick(e, item.id)}
                    >
                        <MoreVertical size={14} />
                    </Button>
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
                            ref={editorRef}
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
                                onSelect();
                            }}
                        />
                    </div>
                )
            }
        </div>
    );
};
