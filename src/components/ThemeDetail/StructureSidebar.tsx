import React from 'react';
import { Toggle } from '../ui/Toggle';
import { Reorder } from "framer-motion";
import { GripVertical, BookOpen, Trash2, MoreVertical } from 'lucide-react';
import type { Theme, ThemeItem, Snippet } from '../../types.ts';
import { useStore } from '../../store.ts';

interface StructureSidebarProps {
    items: ThemeItem[];
    snippets: Snippet[];
    activeTab: 'css' | 'html';
    theme: Theme;
    selectedItemId: string | null;
    onSelect: (id: string) => void;
    onReorder: (newItems: ThemeItem[]) => void;
    onContextMenu: (e: React.MouseEvent, itemId: string) => void;
    itemRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
}

export const StructureSidebar: React.FC<StructureSidebarProps> = ({
    items,
    snippets,
    activeTab,
    theme,
    selectedItemId,
    onSelect,
    onReorder,
    onContextMenu,
    itemRefs
}) => {
    const { toggleThemeItem, removeSnippetFromTheme } = useStore();

    return (
        <div className="flex-1 overflow-y-auto p-4">
            {/* Snippet List (Structure View) */}
            <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Structure ({activeTab})</div>
                <Reorder.Group axis="y" values={items} onReorder={onReorder}>
                    <div className="space-y-2">
                        {items.map(item => {
                            const s = snippets.find(sn => sn.id === item.snippetId);
                            if (!s) return null;
                            return (
                                <Reorder.Item
                                    key={item.id}
                                    value={item}
                                    className={`mb-1 bg-slate-900 border-l-2 rounded cursor-default group relative flex items-center ${selectedItemId === item.id ? 'border-blue-500 bg-slate-800' : 'border-transparent hover:bg-slate-800'} ${!item.isEnabled ? 'opacity-50 grayscale-[0.5]' : ''}`}
                                    onClick={() => onSelect(item.id)}
                                    onContextMenu={(e) => onContextMenu(e, item.id)}
                                >
                                    {/* Render Logic Ref Wrapper because Reorder.Item might not accept ref or interfere */}
                                    <div ref={el => { itemRefs.current[item.id] = el; }} className="contents">
                                        {/* Drag Handle */}
                                        <div className="pl-2 text-slate-600 cursor-grab active:cursor-grabbing hover:text-slate-400">
                                            <GripVertical size={14} />
                                        </div>

                                        <div className="flex-1 min-w-0 p-2 pl-2">
                                            <div className="flex justify-between items-center mb-0.5">
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
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute right-2 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/80 backdrop-blur pl-2 rounded">
                                            <Toggle
                                                checked={item.isEnabled}
                                                disabled={!theme.isActive}
                                                onChange={() => toggleThemeItem(theme.id, item.id)}
                                                title={!theme.isActive ? "Enable theme to toggle snippets" : "Toggle Snippet"}
                                                size="sm"
                                            />
                                            <button
                                                className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Remove snippet from theme?')) {
                                                        removeSnippetFromTheme(theme.id, item.id);
                                                        // Note: Parent handles selection update via store listener or we might need callback.
                                                        // But parent will re-render, filteredItems will update.
                                                        // If selected was removed, we just need to ensure parent handles null check.
                                                    }
                                                }}
                                                title="Remove Snippet"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                            <button
                                                className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-700"
                                                onClick={(e) => onContextMenu(e, item.id)}
                                                title="More options"
                                            >
                                                <MoreVertical size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </Reorder.Item>
                            );
                        })}
                        {items.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-500">
                                No {activeTab.toUpperCase()} snippets.
                            </div>
                        )}
                    </div>
                </Reorder.Group>
            </div>
        </div>
    );
};
