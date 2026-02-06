import React, { useState } from 'react';
import { useStore } from '../../store.ts';
import { CodeEditor } from '../CodeEditor.tsx';
import { MoreVertical, ChevronDown, ChevronRight, Terminal, FileCode, Upload, BookOpen } from 'lucide-react';
import type { ThemeItem } from '../../types.ts';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConfirmDialog } from '../ui/Dialog';

interface SnippetStackItemProps {
    item: ThemeItem;
    themeId: string;
    isCollapsed: boolean;
    onToggleCollapse: (id: string) => void;
    isSelected: boolean;
    itemRef: (el: HTMLDivElement | null) => void;
    onKebabClick: (e: React.MouseEvent, itemId: string) => void;
    isEditing: boolean;
    onSetEditing: (id: string, isEditing: boolean) => void;
    onSelect: (id: string) => void;
    isThemeActive: boolean;
    editorRef?: React.Ref<any>;
    isSelectionMode?: boolean;
}

export const SnippetStackItem = React.memo<SnippetStackItemProps>(({
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
    editorRef,
    isSelectionMode
}) => {
    const { snippets, updateSnippet, updateThemeItem, toggleThemeItem } = useStore();
    const s = snippets.find(sn => sn.id === item.snippetId);

    // Confirmation dialogs
    const [confirmPush, setConfirmPush] = useState(false);
    const [confirmRevert, setConfirmRevert] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition, // Remove transition when dragging for snappy feel
        zIndex: isDragging ? 10 : 'auto', // High Z-Index when dragging
        opacity: isDragging ? 0.8 : 1,
        cursor: isDragging ? 'grabbing' : undefined,
    };

    if (!s) return null;

    return (
        <div
            ref={(node) => {
                setNodeRef(node);
                itemRef(node);
            }}
            style={style}
            {...attributes}
            className={`
                group relative border transition-all rounded-lg mb-4 overflow-hidden shrink-0 scroll-mt-14 cursor-default
                ${isSelected
                    ? 'bg-slate-900 border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20'
                    : item.isEnabled
                        ? 'bg-slate-900 border-slate-700 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 opacity-75 grayscale-[0.3]'
                }
                ${isDragging ? 'shadow-2xl border-blue-500 scale-[1.02] z-50 [&_*]:!cursor-grabbing' : ''}
            `}
            onClick={() => {
                // Ensure clicking anywhere selects the item (unless handled by child)
                onSelect(item.id);
            }}
        >
            {/* Snippet Header */}
            <div
                {...listeners}
                className={`
                    flex items-center gap-3 px-3 py-2 select-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
                    ${isCollapsed ? 'hover:bg-slate-800' : 'bg-slate-800/30 border-b border-slate-800/50'}
                    ${isDragging ? 'cursor-grabbing' : ''}
                `}
                onClick={(e) => {
                    if (isSelectionMode) {
                        onSelect(item.id);
                        return;
                    }
                    e.stopPropagation();
                    onSelect(item.id);
                    onToggleCollapse(item.id);
                }}
            >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                    <div
                        className={`mr-3 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600 bg-transparent'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(item.id);
                        }}
                    >
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                )}

                <button className="text-slate-500 hover:text-white transition-colors" onClick={(e) => {
                    e.stopPropagation(); // prevent triggering selection if just collapsing
                    onToggleCollapse(item.id);
                }}>
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {/* Icon based on Type (Always show type icon here) */}
                        {!isEditing && (
                            <div className="relative flex-none">
                                {(s.type as string) === 'js' ? <Terminal size={14} className="text-yellow-500" /> : <FileCode size={14} className="text-blue-400" />}

                                {item.overrides?.content && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full border border-slate-900" title="Has Local Override"></div>
                                )}
                            </div>
                        )}

                        {isEditing ? (
                            <input
                                autoFocus
                                className="bg-slate-950 text-white text-sm font-medium border border-blue-500 rounded px-1.5 py-0.5 outline-none flex-1 min-w-0 w-full"
                                value={s.name}
                                onChange={(e) => updateSnippet(s.id, { name: e.target.value })}
                                onFocus={(e) => e.target.select()}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                onKeyDown={(e: React.KeyboardEvent) => {
                                    if (e.key === 'Enter') {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onSetEditing(item.id, false); // Done
                                    } else if (e.key === 'Escape') {
                                        e.stopPropagation();
                                        onSetEditing(item.id, false);
                                    }
                                }}
                                onBlur={() => onSetEditing(item.id, false)}
                            />
                        ) : (
                            <span
                                className={`text-xs font-semibold truncate cursor-text hover:text-white border border-transparent hover:border-slate-700 px-1.5 py-0.5 rounded -ml-1.5 transition-colors min-w-0 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'} ${!item.isEnabled ? 'line-through opacity-75' : ''}`}
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onSetEditing(item.id, true);
                                }}
                                title="Click to rename"
                            >
                                {s.name}
                            </span>
                        )}

                        {/* Appended Icons/Badges (Hide when editing) */}
                        {!isEditing && (
                            <>
                                {/* Library Icon */}
                                {s.isLibraryItem !== false && (
                                    <div className="flex items-center text-purple-400 flex-none" title="Library Snippet">
                                        <BookOpen size={12} />
                                    </div>
                                )}

                                {/* Override Badge */}
                                {item.overrides?.content !== undefined && (
                                    <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider flex-none">
                                        Override
                                    </span>
                                )}
                            </>
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
                            {(s.isLibraryItem === false) ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newName = prompt('Enter name for Library:', s.name);
                                        if (newName) updateSnippet(s.id, { name: newName, isLibraryItem: true });
                                    }}
                                    className="h-5 text-[10px] px-1.5 border-slate-700 text-slate-400 hover:text-purple-300 hover:border-purple-500/50"
                                    title="Save to library"
                                    icon={<Upload size={10} />}
                                >
                                    Save
                                </Button>
                            ) : (
                                item.overrides?.content !== undefined && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmPush(true);
                                            }}
                                            className="h-5 text-[10px] px-1.5 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/60 mr-1"
                                            title="Update library snippet"
                                            icon={<Upload size={10} />}
                                        >
                                            Push
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmRevert(true);
                                            }}
                                            className="h-5 text-[10px] px-1.5 text-slate-500 hover:text-yellow-400"
                                            title="Revert to library version"
                                        >
                                            Reset
                                        </Button>
                                    </>
                                )
                            )}

                            {/* Allow Reset for Non-Library Imported Snippets too */}
                            {s.isLibraryItem === false && s.originalContent && s.content !== s.originalContent && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmReset(true);
                                    }}
                                    className="h-5 text-[10px] px-1.5 text-slate-500 hover:text-yellow-400"
                                    title="Reset to original import"
                                >
                                    Reset
                                </Button>
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
                        title={!isThemeActive ? "Enable theme to toggle snippets" : "Toggle snippet"}
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
                                title="CSS selector target"
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
                                title="Injection position"
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
                                onSelect(item.id);
                            }}
                            snippets={snippets}
                        />
                    </div>
                )
            }

            {/* Confirmation Dialogs */}
            <ConfirmDialog
                isOpen={confirmPush}
                onClose={() => setConfirmPush(false)}
                onConfirm={() => {
                    if (item.overrides?.content) {
                        updateSnippet(s.id, { content: item.overrides.content });
                        updateThemeItem(themeId, item.id, { overrides: undefined });
                    }
                    setConfirmPush(false);
                }}
                title="Update library snippet"
                message="Update library snippet with local changes?"
                confirmLabel="Update"
            />

            <ConfirmDialog
                isOpen={confirmRevert}
                onClose={() => setConfirmRevert(false)}
                onConfirm={() => {
                    updateThemeItem(themeId, item.id, { overrides: undefined });
                    setConfirmRevert(false);
                }}
                title="Revert to library"
                message="Discard local changes and revert to library version?"
                confirmLabel="Revert"
                isDangerous
            />

            <ConfirmDialog
                isOpen={confirmReset}
                onClose={() => setConfirmReset(false)}
                onConfirm={() => {
                    if (s.originalContent) {
                        updateSnippet(s.id, { content: s.originalContent });
                    }
                    setConfirmReset(false);
                }}
                title="Reset snippet"
                message="Reset snippet to its original imported state? This will discard all changes."
                confirmLabel="Reset"
                isDangerous
            />
        </div>
    );
});
