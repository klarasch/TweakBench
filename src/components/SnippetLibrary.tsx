import React, { useState } from 'react';
import { useStore } from '../store.ts';
import { Plus, Search, Code, FileCode, Trash2, MoreVertical, X } from 'lucide-react';
import type { Snippet } from '../types.ts';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';
import { ConfirmDialog } from './ui/Dialog';
import { Button } from './ui/Button';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface SortableSnippetItemProps {
    snippet: Snippet;
    isEditing: boolean;
    editName: string;
    setEditName: (name: string) => void;
    handleRenameSubmit: () => void;
    handleRenameCancel: () => void;
    handleStartRename: (e: React.MouseEvent, snippet: Snippet) => void;
    handleContextMenu: (e: React.MouseEvent, snippetId: string) => void;
    handleKebabClick: (e: React.MouseEvent, snippetId: string) => void;
    onSelect?: (snippet: any) => void;
    onSelectSnippet?: (id: string) => void;
    setSnippetToDelete: (id: string) => void;
    usageCount: number;
    isSelectionMode: boolean;
    isSelected: boolean;
    onToggleSelection: () => void;
}

const SortableSnippetItem: React.FC<SortableSnippetItemProps> = ({
    snippet,
    isEditing,
    editName,
    setEditName,
    handleRenameSubmit,
    handleRenameCancel,
    handleStartRename,
    handleContextMenu,
    handleKebabClick,
    onSelect,
    onSelectSnippet,
    setSnippetToDelete,
    usageCount,
    isSelectionMode,
    isSelected,
    onToggleSelection
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: snippet.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 'auto',
        position: 'relative' as 'relative',
        touchAction: 'none'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`p-2 mb-1 rounded hover:bg-slate-800 cursor-pointer group flex items-center justify-between relative ${isDragging ? 'bg-slate-800 ring-1 ring-blue-500/50' : ''}`}
            onClick={() => {
                if (isEditing) return;
                if (isSelectionMode) {
                    onToggleSelection();
                } else {
                    if (onSelect) onSelect(snippet);
                    else if (onSelectSnippet) onSelectSnippet(snippet.id);
                }
            }}
            onContextMenu={(e) => handleContextMenu(e, snippet.id)}
        >
            <div className="flex items-center gap-2 overflow-hidden flex-1">
                {isSelectionMode && (
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-500 bg-transparent'}`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                )}
                {!isEditing && (snippet.type === 'css' ? <Code size={14} className="text-blue-400 flex-none" /> : <FileCode size={14} className="text-orange-400 flex-none" />)}
                <div className="flex flex-col overflow-hidden w-full items-start">
                    {isEditing ? (
                        <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleRenameSubmit();
                                if (e.key === 'Escape') handleRenameCancel();
                            }}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onClick={e => e.stopPropagation()}
                            onPointerDown={e => e.stopPropagation()} // Prevent drag start on input
                            className="bg-slate-950 text-white text-sm rounded outline-none w-full border border-blue-500 px-1"
                        />
                    ) : (
                        <span
                            className="text-slate-300 text-sm truncate hover:text-white cursor-text border border-transparent hover:border-slate-700 px-1.5 py-0.5 rounded -ml-1.5 transition-colors min-w-0"
                            onClick={(e) => handleStartRename(e, snippet)}
                            title="Click to rename"
                        >{snippet.name}</span>
                    )}
                    {usageCount > 0 && !isEditing && <span className="text-[10px] text-slate-500">Used in {usageCount} themes</span>}
                </div>
            </div>
            {!isEditing && !isSelectionMode && (
                <div className="flex gap-1 items-center">
                    {/* Shortcuts */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            className="p-1 hover:bg-red-900/50 rounded text-slate-600 hover:text-red-400"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSnippetToDelete(snippet.id);
                            }}
                            onPointerDown={e => e.stopPropagation()}
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
                            onPointerDown={e => e.stopPropagation()}
                            title="Add to Theme"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    {/* Kebab */}
                    <button
                        onClick={(e) => handleKebabClick(e, snippet.id)}
                        onPointerDown={e => e.stopPropagation()}
                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 opacity-50 group-hover:opacity-100"
                    >
                        <MoreVertical size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

interface SnippetLibraryProps {
    onSelectSnippet?: (id: string) => void;
    onClose?: () => void;
    onSelect?: (snippet: any) => void;
    filterType?: 'css' | 'html' | null;
    onBulkAdd?: (ids: string[]) => void;
}

export const SnippetLibrary: React.FC<SnippetLibraryProps> = ({ onSelectSnippet, onSelect, filterType, onClose, onBulkAdd }) => {
    const { snippets, themes, deleteSnippet, updateSnippet, reorderSnippets } = useStore();
    const [filter, setFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'css' | 'html'>('all');

    // Renaming State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // Dialog State
    const [snippetToDelete, setSnippetToDelete] = useState<string | null>(null);

    // Context Menu State
    const [menuState, setMenuState] = useState<{ x: number; y: number; snippetId: string | null }>({ x: 0, y: 0, snippetId: null });

    // Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Clear selection when mode changes
    React.useEffect(() => {
        if (!isSelectionMode) setSelectedIds(new Set());
    }, [isSelectionMode]);

    // Clear selection when filters change
    React.useEffect(() => {
        setSelectedIds(new Set());
    }, [typeFilter, filter]);

    const handleToggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleStartRename = (e: React.MouseEvent, snippet: Snippet) => {
        e.stopPropagation();
        setEditingId(snippet.id);
        setEditName(snippet.name);
    };

    const handleRenameSubmit = () => {
        if (!editingId) return;
        if (editName.trim()) {
            updateSnippet(editingId, { name: editName });
        }
        setEditingId(null);
        setEditName('');
    };

    const handleRenameCancel = () => {
        setEditingId(null);
        setEditName('');
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

        if (!snippet) return [];

        return [
            {
                label: 'Add to Theme',
                icon: <Plus size={14} />,
                onClick: () => {
                    if (onSelect) onSelect(snippet);
                    else if (onSelectSnippet) onSelectSnippet(snippetId);
                }
            },
            {
                label: 'Rename',
                icon: <Code size={14} />,
                onClick: () => {
                    setEditingId(snippetId);
                    setEditName(snippet.name);
                }
            },
            { separator: true },
            {
                label: 'Delete Snippet',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => setSnippetToDelete(snippetId)
            }
        ];
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = filteredSnippets.findIndex(s => s.id === active.id);
        const newIndex = filteredSnippets.findIndex(s => s.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newFilteredSnippets = arrayMove(filteredSnippets, oldIndex, newIndex);
            // Get all snippets not in the filtered list
            const otherSnippets = snippets.filter(s => !filteredSnippets.find(fs => fs.id === s.id));
            // Combine and reorder
            reorderSnippets([...newFilteredSnippets, ...otherSnippets]);
        }
    };

    const filteredSnippets = snippets.filter(s =>
        (s.isLibraryItem !== false) &&
        (filterType ? s.type === filterType : true) &&
        (typeFilter === 'all' || s.type === typeFilter) &&
        s.name.toLowerCase().includes(filter.toLowerCase())
    );

    // Cancel rename on Esc
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (editingId) {
                    handleRenameCancel();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingId]);

    const handleBulkAdd = () => {
        if (onBulkAdd) {
            onBulkAdd(Array.from(selectedIds));
        } else {
            // Fallback: add one by one using onSelectSnippet?
            // Usually SnippetLibrary is used in context where onSelectSnippet adds 1 and closes.
            // But for bulk, we probably want to stay open or close once?
            // If onBulkAdd is not provided, do nothing or rely on parent.
            // But we will implement onBulkAdd in parent.
            selectedIds.forEach(id => {
                if (onSelectSnippet) onSelectSnippet(id);
            });
        }
        setIsSelectionMode(false);
    };

    const snippetToDeleteObj = snippetToDelete ? snippets.find(s => s.id === snippetToDelete) : null;
    const usageCountToDelete = snippetToDelete ? themes.filter(t => t.items.some(i => i.snippetId === snippetToDelete)).length : 0;

    return (
        <div className="flex flex-col h-full bg-slate-900">
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
                <h3 className="font-semibold text-slate-200 text-lg">Library</h3>
                <div className="flex items-center gap-2">
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


            <ConfirmDialog
                isOpen={!!snippetToDelete}
                onClose={() => setSnippetToDelete(null)}
                onConfirm={() => {
                    if (snippetToDelete) deleteSnippet(snippetToDelete);
                }}
                title="Delete Snippet"
                message={
                    <div className="flex flex-col gap-2">
                        <p>Are you sure you want to delete <strong>"{snippetToDeleteObj?.name}"</strong>?</p>
                        {usageCountToDelete > 0 && (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-2 rounded text-xs">
                                Warning: This snippet is used in {usageCountToDelete} theme{usageCountToDelete > 1 ? 's' : ''}. Deleting it will affect those themes.
                            </div>
                        )}
                    </div>
                }
                confirmLabel="Delete"
                isDangerous
            />

            <div className="px-2 pt-2">
                {!filterType && (
                    <div className="flex bg-slate-800 rounded-lg p-1 mb-2 border border-slate-700">
                        <button
                            onClick={() => setTypeFilter('all')}
                            className={`flex-1 text-xs font-medium py-1 rounded-md transition-all ${typeFilter === 'all' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setTypeFilter('css')}
                            className={`flex-1 text-xs font-medium py-1 rounded-md transition-all ${typeFilter === 'css' ? 'bg-blue-600/80 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                        >
                            CSS
                        </button>
                        <button
                            onClick={() => setTypeFilter('html')}
                            className={`flex-1 text-xs font-medium py-1 rounded-md transition-all ${typeFilter === 'html' ? 'bg-orange-600/80 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                        >
                            HTML
                        </button>
                    </div>
                )}
                {filterType && (
                    <div className="mb-2 px-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Showing {filterType} snippets
                        </span>
                    </div>
                )}
                <div className="bg-slate-800 rounded px-2 py-1 mb-2 relative group focus-within:ring-1 focus-within:ring-blue-500/50 flex items-center">
                    <Search size={14} className="text-slate-500 mr-2 shrink-0" />
                    <input
                        autoFocus
                        className="bg-transparent text-sm text-white outline-none w-full placeholder:text-slate-600"
                        placeholder="Search..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.stopPropagation();
                                e.preventDefault();
                                if (filter) {
                                    setFilter('');
                                } else if (onClose) {
                                    onClose();
                                }
                            }
                        }}
                    />
                    {filter && (
                        <button
                            className="text-slate-500 hover:text-white p-0.5"
                            onClick={() => setFilter('')}
                            title="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Selection Toolbar */}
            <div className="px-4 py-2 border-b border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
                {!isSelectionMode ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSelectionMode(true)}
                        className="text-slate-400 hover:text-white text-xs h-7"
                    >
                        Select
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 w-full justify-between animate-in slide-in-from-top-1">
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (selectedIds.size > 0) setSelectedIds(new Set());
                                    else setSelectedIds(new Set(filteredSnippets.map(s => s.id)));
                                }}
                                className="text-slate-400 hover:text-white text-xs h-7"
                            >
                                {selectedIds.size > 0 ? 'Deselect all' : 'Select all'}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSelectionMode(false)}
                                className="text-blue-400 hover:text-blue-300 text-xs h-7"
                            >
                                Done
                            </Button>
                        </div>
                        {selectedIds.size > 0 && (
                            <Button
                                variant="filled"
                                size="sm"
                                onClick={handleBulkAdd}
                                className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                            >
                                Add {selectedIds.size}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 pt-0">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                >
                    <SortableContext
                        items={filteredSnippets.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {filteredSnippets.map(snippet => {
                            const usageCount = themes.filter(t => t.items.some(i => i.snippetId === snippet.id)).length;
                            const isEditing = editingId === snippet.id;

                            return (
                                <SortableSnippetItem
                                    key={snippet.id}
                                    snippet={snippet}
                                    isEditing={isEditing}
                                    editName={editName}
                                    setEditName={setEditName}
                                    handleRenameSubmit={handleRenameSubmit}
                                    handleRenameCancel={handleRenameCancel}
                                    handleStartRename={handleStartRename}
                                    handleContextMenu={handleContextMenu}
                                    handleKebabClick={handleKebabClick}
                                    onSelect={onSelect}
                                    onSelectSnippet={onSelectSnippet}
                                    setSnippetToDelete={setSnippetToDelete}
                                    usageCount={usageCount}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedIds.has(snippet.id)}
                                    onToggleSelection={() => handleToggleSelection(snippet.id)}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
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
