import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../store.ts';
import { SnippetLibrary } from './SnippetLibrary.tsx';
import { SnippetStackItem } from './ThemeDetail/SnippetStackItem.tsx';
import { StructureSidebar } from './ThemeDetail/StructureSidebar.tsx';
import { ThemeHeader } from './ThemeDetail/ThemeHeader.tsx';
import { ImportVariablesModal } from './ThemeDetail/ImportVariablesModal.tsx';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/Dialog';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';
import { Trash2, Plus, Box, Play, Pause, Download, Edit, X, MoreVertical, Unlink, Copy } from 'lucide-react';
import { useToast } from './ui/Toast';
import type { SnippetType } from '../types.ts';
import { exportThemeToJS, exportThemeToCSS } from '../utils/impexp.ts';
import { QuickAddMenu } from './ThemeDetail/QuickAddMenu.tsx';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
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
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface ThemeDetailProps {
    themeId: string;
    onBack: () => void;
}

export const ThemeDetail: React.FC<ThemeDetailProps> = ({ themeId, onBack }) => {
    const theme = useStore(state => state.themes.find(t => t.id === themeId));
    const snippets = useStore(state => state.snippets);
    const globalEnabled = useStore(state => state.globalEnabled);
    const addSnippet = useStore(state => state.addSnippet);
    const addSnippetToTheme = useStore(state => state.addSnippetToTheme);
    const toggleThemeItem = useStore(state => state.toggleThemeItem);
    const updateTheme = useStore(state => state.updateTheme);

    const toggleGlobal = useStore(state => state.toggleGlobal);
    const { showToast } = useToast();
    // State
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [showLibrary, setShowLibrary] = useState(false);
    const [libraryFilter, setLibraryFilter] = useState<'css' | 'html' | null>(null);
    const [activeTab, setActiveTab] = useState<'css' | 'html'>('css'); // Added activeTab state

    const [pendingScrollItemId, setPendingScrollItemId] = useState<string | null>(null);
    const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
    const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null); // Added editing state
    // itemRefs not needed for main list with Virtuoso, but keeping for sidebar potentially? 
    // Actually sidebar uses it. Main list will use Virtuoso handle.
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const sidebarItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const editorRefs = useRef<Record<string, any>>({});

    // Control Flags
    const scrollSourceRef = useRef<'sidebar' | 'main' | null>(null); // Tracks where selection change originated
    const scrollTriggerRef = useRef(0); // Incremented to force scroll even when selectedItemId doesn't change
    const pendingFocusRef = useRef<string | null>(null);
    const cursorPositionsRef = useRef<Record<string, { from: number; to: number }>>({});

    // Drag Ref to track auto-collapsed items (all items that were expanded before drag)
    const preDragExpandedItemsRef = useRef<Set<string>>(new Set());

    // Import Modal State
    const [importCandidates, setImportCandidates] = useState<{
        variables: Record<string, Record<string, string>>;
        domain: string;
    } | null>(null);

    const [selectionState, setSelectionState] = useState<{
        css: { isSelectionMode: boolean; selectedIds: Set<string> };
        html: { isSelectionMode: boolean; selectedIds: Set<string> };
    }>({
        css: { isSelectionMode: false, selectedIds: new Set() },
        html: { isSelectionMode: false, selectedIds: new Set() }
    });

    const isSelectionMode = selectionState[activeTab].isSelectionMode;
    const selectedSnippetIds = selectionState[activeTab].selectedIds;

    const setIsSelectionMode = (value: boolean) => {
        setSelectionState(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], isSelectionMode: value }
        }));
    };

    const setSelectedSnippetIds = (newSet: Set<string> | ((prev: Set<string>) => Set<string>)) => {
        setSelectionState(prev => {
            const currentSet = prev[activeTab].selectedIds;
            const nextSet = typeof newSet === 'function' ? newSet(currentSet) : newSet;
            return {
                ...prev,
                [activeTab]: { ...prev[activeTab], selectedIds: nextSet }
            };
        });
    };

    // Clear selection when exiting selection mode
    useEffect(() => {
        if (!isSelectionMode) {
            setSelectedSnippetIds(new Set());
        }
    }, [isSelectionMode]);

    const handleToggleSelection = (id: string) => {
        setSelectedSnippetIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkDelete = () => {
        if (selectedSnippetIds.size === 0) return;
        setConfirmBulkDelete(true);
    };

    const handleBulkEnable = (enable: boolean) => {
        // We need a direct updateThemeItem call to force enable/disable.
        const { updateThemeItem } = useStore.getState();

        selectedSnippetIds.forEach(id => {
            updateThemeItem(themeId, id, { isEnabled: enable });
        });
    };

    // ... (rest of imports/logic)

    // Responsive & Popover State
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Resize State
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [isResizing, setIsResizing] = useState(false);


    // Context Menu State
    const [menuState, setMenuState] = useState<{ x: number; y: number; itemId: string | null; source?: 'sidebar' | 'stack' }>({ x: 0, y: 0, itemId: null });
    const [renamingSidebarItemId, setRenamingSidebarItemId] = useState<string | null>(null);
    const [itemToRemove, setItemToRemove] = useState<string | null>(null);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [justDroppedId, setJustDroppedId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Quick Add State
    const [quickAddState, setQuickAddState] = useState<{ x: number; y: number; type: 'css' | 'html' } | null>(null);

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

    const activeItem = theme?.items.find(i => i.id === selectedItemId);
    const activeSnippet = activeItem ? snippets.find(s => s.id === activeItem.snippetId) : null;

    useEffect(() => {
        if (theme) {
            // Select first item by default if nothing selected
            if (!selectedItemId && theme.items.length > 0) {
                // Determine first visible item in active tab
                const firstVisible = theme.items.find(item => {
                    const s = snippets.find(sn => sn.id === item.snippetId);
                    return s?.type === activeTab;
                });
                if (firstVisible) setSelectedItemId(firstVisible.id);
            }
        }
    }, [theme, selectedItemId, activeTab]);

    const filteredItems = useMemo(() => theme ? theme.items.filter(item => {
        const s = snippets.find(sn => sn.id === item.snippetId);
        return s?.type === activeTab;
    }) : [], [theme, snippets, activeTab]);

    // Phase 1: Detect sidebar scroll request and set pending state
    useEffect(() => {
        if (selectedItemId && scrollSourceRef.current === 'sidebar' && !justDroppedId) {
            setPendingScrollItemId(selectedItemId);
            // DON'T reset scrollSourceRef here - it causes the ref to be null when this effect re-runs
        }
    }, [selectedItemId, justDroppedId, scrollTriggerRef.current]);

    // Phase 2: Execute scroll after DOM has updated (runs synchronously after render)
    useLayoutEffect(() => {
        if (pendingScrollItemId && virtuosoRef.current) {
            const index = filteredItems.findIndex(i => i.id === pendingScrollItemId);
            if (index !== -1) {
                // Scroll Virtuoso to the index
                virtuosoRef.current.scrollToIndex({ index, align: 'start', behavior: 'smooth' });
            }
            setPendingScrollItemId(null); // Clear pending scroll
            scrollSourceRef.current = null; // Reset source after scroll
        }
    }, [pendingScrollItemId, filteredItems]);

    // Handle scroll on drop
    useEffect(() => {
        if (justDroppedId) {
            const index = filteredItems.findIndex(i => i.id === justDroppedId);
            if (index !== -1) {
                // Wait for expansion/layout measurement
                const timer = setTimeout(() => {
                    virtuosoRef.current?.scrollToIndex({ index, align: 'start', behavior: 'smooth' });
                    setJustDroppedId(null);

                    // Robust Focus after Drop
                    if (pendingFocusRef.current === justDroppedId) {
                        if (editorRefs.current[justDroppedId]) {
                            editorRefs.current[justDroppedId]?.focus();
                            pendingFocusRef.current = null;
                        }
                    }
                }, 200);
                return () => clearTimeout(timer);
            }
        }
    }, [justDroppedId, filteredItems, collapsedItems]);

    // Resize Handler
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            // Limit width between 200px and 600px
            const newWidth = Math.max(200, Math.min(e.clientX, 600));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Handle Esc key to delete empty/new local snippets
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && activeSnippet && activeSnippet.isLibraryItem === false) {
                const defaultCSS = '/* CSS */\n';
                const defaultHTML = '<!-- HTML -->\n';
                const isDefault = activeSnippet.type === 'css'
                    ? activeSnippet.content === defaultCSS
                    : activeSnippet.content === defaultHTML;

                if (isDefault && activeItem) {
                    // Delete snippet and remove from theme
                    // Since it's local, deleting the snippet handles cleanup usually? 
                    // Or we should double check store logic. 
                    // But safesty: remove from theme then delete snippet.
                    useStore.getState().removeSnippetFromTheme(themeId, activeItem.id);
                    useStore.getState().deleteSnippet(activeSnippet.id);
                    setSelectedItemId(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSnippet, activeItem, themeId]);

    if (!theme) return <div>Theme not found</div>;

    const scrollToItem = (itemId: string) => {
        // Using virtuosoRef in useEffect mostly, but for manual calls:
        const index = filteredItems.findIndex(i => i.id === itemId);
        if (index !== -1) {
            // Defer to ensure render
            setTimeout(() => {
                virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
            }, 50);
        }

        setTimeout(() => {
            const sideEl = sidebarItemRefs.current[itemId];
            if (sideEl) {
                sideEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    };



    const handleAddSnippet = (snippetId: string) => {
        const snippet = snippets.find(s => s.id === snippetId);
        if (snippet) {
            setActiveTab(snippet.type);
        }

        const itemId = addSnippetToTheme(themeId, snippetId);
        setShowLibrary(false);
        setLibraryFilter(null);
        setSelectedItemId(itemId);

        // Ensure item is expanded
        setCollapsedItems(prev => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
        });

        // Set pending focus for the editor
        pendingFocusRef.current = itemId;

        scrollSourceRef.current = 'sidebar'; // Programmatic addition should scroll
        scrollToItem(itemId);

        // Use setTimeout to allow editor to fully mount (especially from empty state)
        setTimeout(() => {
            if (editorRefs.current[itemId]) {
                editorRefs.current[itemId]?.focus();
                pendingFocusRef.current = null;
            }
        }, 100);

        if (snippet) {
            showToast(`Added "${snippet.name}" to theme`, 'success');
        }
    };

    const handleBulkAddSnippets = (ids: string[]) => {
        const addedItemIds: string[] = [];
        let firstType: 'css' | 'html' | null = null;

        ids.forEach(id => {
            const itemId = addSnippetToTheme(themeId, id);
            addedItemIds.push(itemId);
            if (!firstType) {
                const s = snippets.find(sn => sn.id === id);
                if (s) firstType = s.type;
            }
        });

        if (firstType) setActiveTab(firstType);

        setLibraryFilter(null);
        setShowLibrary(false);

        if (addedItemIds.length > 0) {
            setCollapsedItems(prev => {
                const next = new Set(prev);
                addedItemIds.forEach(id => next.delete(id));
                return next;
            });

            const firstItemId = addedItemIds[0];
            setSelectedItemId(firstItemId);
            scrollSourceRef.current = 'sidebar';
            scrollToItem(firstItemId);
            // Pending focus for first item
            pendingFocusRef.current = firstItemId;
            setTimeout(() => {
                if (editorRefs.current[firstItemId]) {
                    editorRefs.current[firstItemId]?.focus();
                    pendingFocusRef.current = null;
                }
            }, 100);

            showToast(`Added ${addedItemIds.length} snippets to theme`, 'success');
        }
    };

    const handleReorder = (newItems: typeof theme.items) => {
        useStore.getState().reorderThemeItems(theme.id, newItems);
    };

    const toggleItemExpand = (id: string) => {
        setCollapsedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                // Expanding
                next.delete(id);

                // Restore Focus & Cursor
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (editorRefs.current[id]) {
                            editorRefs.current[id]?.focus();
                            const savedPos = cursorPositionsRef.current[id];
                            if (savedPos) {
                                editorRefs.current[id]?.setCursorPosition?.(savedPos.from, savedPos.to);
                            }
                        }
                    });
                });
            } else {
                // Collapsing
                // Save Cursor Position before unmounting editor
                if (editorRefs.current[id]) {
                    const cursorPos = editorRefs.current[id]?.getCursorPosition?.();
                    if (cursorPos) {
                        cursorPositionsRef.current[id] = cursorPos;
                    }
                }
                next.add(id);
            }
            return next;
        });
    };

    const handleDragStart = () => {
        setIsDragging(true);

        // Collect ALL currently expanded items in the current view
        const expandedIds = new Set<string>();
        filteredItems.forEach(item => {
            if (!collapsedItems.has(item.id)) {
                expandedIds.add(item.id);
                // Save cursor position for ALL expanded items
                if (editorRefs.current[item.id]) {
                    const cursorPos = editorRefs.current[item.id]?.getCursorPosition?.();
                    if (cursorPos) {
                        cursorPositionsRef.current[item.id] = cursorPos;
                    }
                }
            }
        });

        preDragExpandedItemsRef.current = expandedIds;

        // Collapse ALL items
        setCollapsedItems(prev => {
            const next = new Set(prev);
            filteredItems.forEach(item => next.add(item.id));
            return next;
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setIsDragging(false);
        const { active, over } = event;
        const itemId = active.id as string;

        // Check if item was expanded before drag (before we clear the ref!)
        const shouldRestoreFocus = preDragExpandedItemsRef.current.has(itemId);

        // Restore expanded state for items that were expanded before drag
        setCollapsedItems(prev => {
            const next = new Set(prev);
            preDragExpandedItemsRef.current.forEach(id => next.delete(id));
            return next;
        });

        // Don't clear the ref immediately - let it persist until after re-render
        // It will be cleared in a useEffect or on next drag start

        // Trigger scroll on next render via effect
        setJustDroppedId(itemId);

        // Restore focus and cursor for ALL expanded items
        if (preDragExpandedItemsRef.current.size > 0) {
            // If the dragged item was expanded, we want to focus it specifically
            if (shouldRestoreFocus) {
                pendingFocusRef.current = itemId;
            }

            // Use requestAnimationFrame to wait for editor to mount
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Restore cursor positions for ALL items that were expanded
                    preDragExpandedItemsRef.current.forEach(expandedId => {
                        if (editorRefs.current[expandedId]) {
                            const savedPos = cursorPositionsRef.current[expandedId];
                            if (savedPos) {
                                editorRefs.current[expandedId]?.setCursorPosition?.(savedPos.from, savedPos.to);
                            }
                        }
                    });

                    // Restore focus ONLY to the dragged item if it was expanded
                    if (shouldRestoreFocus && editorRefs.current[itemId]) {
                        editorRefs.current[itemId]?.focus();
                        pendingFocusRef.current = null;
                    }

                    // Clear the ref after restoration
                    preDragExpandedItemsRef.current.clear();
                });
            });
        } else {
            // Clear immediately if no restoration needed
            preDragExpandedItemsRef.current.clear();
        }

        if (active.id !== over?.id) {
            const oldIndex = filteredItems.findIndex((item) => item.id === active.id);
            const newIndex = filteredItems.findIndex((item) => item.id === over?.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newFilteredItems = arrayMove(filteredItems, oldIndex, newIndex);
                // We need to merge this back into the full list
                // get items NOT in current filtered view
                const otherItems = theme.items.filter(item => !filteredItems.find(fi => fi.id === item.id));
                // We need to maintain relative order of other items? 
                // Actually the simplest way:
                // Reconstruct the full list.
                // But wait, arrayMove only moves within the filtered list.
                // We just need to save the new order of filtered items + original other items.
                // But we must be careful not to lose items or duplicate.
                // Actually, handleReorder in my previous code (lines 184-194) did a similar logic but slightly different param.
                // Let's reuse logic.

                handleReorder([...newFilteredItems, ...otherItems]);
            }
        }
    };

    const handleCreateLocal = (type: SnippetType) => {
        setActiveTab(type); // Switch to content type tab
        const id = addSnippet({
            name: type === 'css' ? 'Local CSS' : 'Local HTML',
            type,
            content: type === 'css' ? '/* CSS */\n' : '<!-- HTML -->\n',
            relatedSnippetIds: [],
            isLibraryItem: false
        });
        const itemId = addSnippetToTheme(themeId, id);

        // Auto-select and scroll
        setSelectedItemId(itemId);

        // Ensure item is expanded
        setCollapsedItems(prev => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
        });

        // Set pending focus for the editor
        pendingFocusRef.current = itemId;

        scrollSourceRef.current = 'sidebar'; // Programmatic addition should scroll
        scrollToItem(itemId);

        // Use setTimeout to allow editor to fully mount (especially from empty state)
        setTimeout(() => {
            if (editorRefs.current[itemId]) {
                editorRefs.current[itemId]?.focus();
                pendingFocusRef.current = null;
            }
        }, 100);
    };

    const handleContextMenu = useCallback((e: React.MouseEvent, itemId: string, source: 'sidebar' | 'stack' = 'stack') => {
        e.preventDefault();
        e.stopPropagation();
        setMenuState({ x: e.pageX, y: e.pageY, itemId, source });
    }, []);

    const handleKebabClick = useCallback((e: React.MouseEvent, itemId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({ x: rect.left, y: rect.bottom, itemId, source: 'stack' });
    }, []);

    const handleExport = (type: 'js' | 'css') => {
        if (!theme) return;

        let content = '';
        let extension = '';

        if (type === 'js') {
            content = exportThemeToJS(theme, snippets);
            extension = 'tb.js';
        } else {
            content = exportThemeToCSS(theme, snippets);
            extension = 'css';
        }

        const blob = new Blob([content], { type: type === 'js' ? 'text/javascript' : 'text/css' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${theme.name.replace(/\s+/g, '_')}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const [themeToDelete, setThemeToDelete] = useState(false);

    const getMenuItems = (itemId: string): ContextMenuItem[] => {
        if (itemId === 'THEME_HEADER_MENU') {
            return [
                {
                    label: theme.isActive ? 'Disable theme' : 'Enable theme',
                    icon: theme.isActive ? <Pause size={14} /> : <Play size={14} />,
                    onClick: () => updateTheme(themeId, { isActive: !theme.isActive })
                },
                { separator: true },
                {
                    label: 'Export to JS',
                    icon: <Download size={14} />,
                    onClick: () => handleExport('js')
                },
                {
                    label: 'Export to CSS only',
                    icon: <Download size={14} />,
                    onClick: () => handleExport('css')
                },
                { separator: true },
                {
                    label: 'Duplicate theme',
                    icon: <Copy size={14} />,
                    onClick: () => {
                        useStore.getState().duplicateTheme(themeId);
                        showToast('Theme duplicated');
                    }
                },
                { separator: true },
                {
                    label: 'Delete theme',
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onClick: () => setThemeToDelete(true)
                }
            ];
        }

        if (itemId === 'BULK_ACTIONS_MENU') {
            return [
                {
                    label: 'Enable selected',
                    icon: <Play size={14} className="text-green-400" />,
                    onClick: () => handleBulkEnable(true)
                },
                {
                    label: 'Disable selected',
                    icon: <Pause size={14} className="text-slate-400" />,
                    onClick: () => handleBulkEnable(false)
                },
                { separator: true },
                {
                    label: `Delete ${selectedSnippetIds.size} snippets`,
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onClick: handleBulkDelete
                }
            ];
        }

        const item = theme.items.find(i => i.id === itemId);
        if (!item) return [];

        return [
            {
                label: 'Rename',
                icon: <Edit size={14} />,
                onClick: () => {
                    if (menuState.source === 'sidebar') {
                        setRenamingSidebarItemId(itemId);
                    } else {
                        setEditingSnippetId(itemId);
                    }
                }
            },
            {
                label: 'Duplicate',
                icon: <Copy size={14} />,
                onClick: () => {
                    useStore.getState().duplicateThemeItem(theme.id, itemId);
                    showToast('Snippet duplicated');
                }
            },
            { separator: true },
            {
                label: item.isEnabled ? 'Disable snippet' : 'Enable snippet',
                icon: item.isEnabled ? <Pause size={14} /> : <Play size={14} />,
                onClick: () => toggleThemeItem(theme.id, itemId)
            },
            ...(snippets.find(s => s.id === item.snippetId)?.isLibraryItem !== false ? [{
                label: 'Detach from library',
                icon: <Unlink size={14} />,
                onClick: () => handleDetachSnippet(itemId)
            }] : []),
            { separator: true },
            {
                label: 'Remove from theme',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => setItemToRemove(itemId)
            }
        ];
    };

    const handleImportVariables = async () => {
        if (!theme) return;

        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            if (!activeTab?.id) {
                showToast('No active tab found.', 'error');
                return;
            }

            const url = new URL(activeTab.url || '');
            const domain = url.hostname;

            chrome.tabs.sendMessage(activeTab.id, { type: 'SCAN_CSS_VARIABLES' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    showToast('Could not connect to content script. Make sure the extension is running on this page.', 'error');
                    return;
                }

                if (response && response.variables) {
                    const variables = response.variables as Record<string, Record<string, string>>;
                    setImportCandidates({ variables, domain });
                } else {
                    showToast('No CSS variables found on the page.', 'error');
                }
            });
        } catch (e) {
            console.error(e);
            showToast('Failed to import variables.', 'error');
        }
    };

    const handleConfirmImport = (selectedScopes: string[]) => {
        if (!importCandidates || !theme) return;
        const { variables, domain } = importCandidates;

        const newSnippetIds: string[] = [];
        let count = 0;

        selectedScopes.forEach(scope => {
            const vars = variables[scope];
            if (!vars) return;

            const varLines = Object.entries(vars).map(([name, val]) => `    ${name}: ${val};`).join('\n');
            const content = `/* Imported from ${domain} */\n${scope} {\n${varLines}\n}`;

            // Check if we should use a simpler name if scope is :root
            const scopeName = scope === ':root' ? ':root' : scope;
            const name = `${domain} ${scopeName}`;

            const id = addSnippet({
                name,
                type: 'css',
                content,
                originalContent: content,
                relatedSnippetIds: [],
                isLibraryItem: false
            });
            const itemId = addSnippetToTheme(themeId, id);
            // We want to collapse these by default to avoid UI thrashing
            newSnippetIds.push(itemId);
            count++;
        });

        // Update collapsed items
        const nextCollapsed = new Set(collapsedItems);
        newSnippetIds.forEach(id => nextCollapsed.add(id));
        setCollapsedItems(nextCollapsed);

        setImportCandidates(null);
        showToast(`Imported ${count} variable groups.`);
    };







    const handleDetachSnippet = (itemId: string) => {
        const item = theme.items.find(i => i.id === itemId);
        if (!item) return;

        const snippet = snippets.find(s => s.id === item.snippetId);
        if (!snippet) return;

        // Determine content: use override if exists, otherwise use snippet's original content
        const contentToUse = item.overrides?.content ?? snippet.content;

        // Create new local snippet
        const newSnippetId = addSnippet({
            name: `${snippet.name}`, // Keep same name
            type: snippet.type,
            content: contentToUse,
            relatedSnippetIds: [],
            isLibraryItem: false
        });

        // Update ThemeItem to point to new snippet and Link
        // We need to update the item to point to the new snippet ID
        // AND clear any overrides since they are now baked in
        useStore.getState().updateThemeItem(themeId, itemId, {
            snippetId: newSnippetId,
            overrides: undefined // Clear overrides
        });

        showToast('Snippet detached to local copy', 'success');
    };


    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900 relative overflow-hidden">
            {/* Global cursor style during drag */}
            {isDragging && (
                <style>{`
                    * {
                        cursor: grabbing !important;
                    }
                `}</style>
            )}
            {/* ... (Header) ... */}
            <ThemeHeader
                theme={theme}
                onBack={onBack}
                updateTheme={updateTheme}
                showLibrary={showLibrary}
                setShowLibrary={setShowLibrary}
                libraryFilter={libraryFilter}
                setLibraryFilter={setLibraryFilter}
                globalEnabled={globalEnabled}
                toggleGlobal={toggleGlobal}
                onContextMenu={(e) => {
                    e.stopPropagation();
                    setMenuState({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().bottom, itemId: 'THEME_HEADER_MENU', source: 'stack' });
                }}
            />
            {/* ... (Library Drawer) ... */}
            {showLibrary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-3xl h-[80vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <SnippetLibrary
                            onSelectSnippet={handleAddSnippet}
                            onBulkAdd={handleBulkAddSnippets}
                            filterType={libraryFilter}
                            onClose={() => setShowLibrary(false)}
                        />
                    </div>
                    {/* Click outside to close */}
                    <div className="absolute inset-0 -z-10" onClick={() => setShowLibrary(false)} />
                </div>
            )}

            {/* Tab Bar (New) */}
            <div className="flex border-b border-slate-800 bg-slate-900">
                <button
                    onClick={() => setActiveTab('css')}
                    className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors relative ${activeTab === 'css' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    CSS
                    {activeTab === 'css' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
                </button>
                <div className="w-px bg-slate-800 my-2"></div>
                <button
                    onClick={() => setActiveTab('html')}
                    className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors relative ${activeTab === 'html' ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    HTML
                    {activeTab === 'html' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></div>}
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar - Only show if viewportWidth > 720 */}
                {viewportWidth > 720 && (
                    <div
                        className="flex flex-col bg-slate-900 z-20 shrink-0 relative border-r border-slate-800"
                        style={{ width: sidebarWidth, transition: 'none' }}
                    >
                        {/* Resize Handle */}
                        <div
                            className="absolute top-0 bottom-0 -right-1 w-2 cursor-col-resize z-30 hover:bg-blue-500/50 transition-colors group"
                            onMouseDown={() => setIsResizing(true)}
                        >
                            <div className="w-px h-full bg-slate-800 group-hover:bg-blue-500 mx-auto"></div>
                        </div>

                        {/* Content */}
                        <StructureSidebar
                            items={filteredItems}
                            snippets={snippets}
                            activeTab={activeTab}
                            theme={theme}
                            selectedItemId={selectedItemId}
                            onSelect={(id) => {
                                if (isSelectionMode) {
                                    handleToggleSelection(id);
                                } else {
                                    setSelectedItemId(id);

                                    // Force Expand
                                    setCollapsedItems(prev => {
                                        const next = new Set(prev);
                                        next.delete(id);
                                        return next;
                                    });

                                    // Mark source as sidebar and trigger scroll (even if same item)
                                    scrollSourceRef.current = 'sidebar';
                                    scrollTriggerRef.current++; // Force effect to run

                                    // Robust Focus (Sidebar Click)
                                    pendingFocusRef.current = id;

                                    // Try immediate focus if already mounted
                                    requestAnimationFrame(() => {
                                        if (editorRefs.current[id]) {
                                            editorRefs.current[id]?.focus();
                                            pendingFocusRef.current = null;

                                            // Restore cursor position if we have one saved
                                            const savedPos = cursorPositionsRef.current[id];
                                            console.log('[CURSOR DEBUG] Restoring cursor position for', id, ':', savedPos);
                                            if (savedPos) {
                                                editorRefs.current[id]?.setCursorPosition?.(savedPos.from, savedPos.to);
                                            }
                                        }
                                    });
                                }
                            }}
                            onReorder={handleReorder}
                            onContextMenu={handleContextMenu}
                            itemRefs={sidebarItemRefs}
                            isResizing={isResizing}
                            renamingItemId={renamingSidebarItemId}
                            onRenameCancel={() => setRenamingSidebarItemId(null)}
                            isSelectionMode={isSelectionMode}
                            selectedItemIds={selectedSnippetIds}
                        />
                    </div>
                )}

                {/* Context Menu Render */}
                {menuState.itemId && (
                    <ContextMenu
                        x={menuState.x}
                        y={menuState.y}
                        items={getMenuItems(menuState.itemId)}
                        onClose={() => setMenuState({ ...menuState, itemId: null })}
                    />
                )}

                {/* Quick Add Menu */}
                {quickAddState && (
                    <QuickAddMenu
                        x={quickAddState.x}
                        y={quickAddState.y}
                        type={quickAddState.type}
                        onClose={() => setQuickAddState(null)}
                        onAddSnippet={(id) => {
                            handleAddSnippet(id);
                            setQuickAddState(null);
                        }}
                        onShowLibrary={() => {
                            setQuickAddState(null);
                            setLibraryFilter(quickAddState.type);
                            setShowLibrary(true);
                        }}
                    />
                )}

                {/* Main: Editor */}
                <div className="flex-1 flex flex-col bg-slate-900 relative overflow-hidden">


                    {/* Sticky Subheader - Refreshed */}
                    <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-2 flex items-center justify-between">
                        <div className="flex gap-2">
                            {(() => {
                                if (filteredItems.length === 0) return null;
                                const isAllCollapsed = filteredItems.every(i => collapsedItems.has(i.id));
                                return (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const next = new Set(collapsedItems);
                                                if (isAllCollapsed) {
                                                    filteredItems.forEach(i => next.delete(i.id));
                                                } else {
                                                    filteredItems.forEach(i => next.add(i.id));
                                                }
                                                setCollapsedItems(next);
                                            }}
                                            className="text-slate-500 hover:text-white"
                                        >
                                            {isAllCollapsed ? 'Expand all' : 'Collapse all'}
                                        </Button>
                                        <div className="h-6 w-px bg-slate-800 mx-1"></div>
                                        {!isSelectionMode ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsSelectionMode(true)}
                                                className="text-slate-500 hover:text-white"
                                            >
                                                Select
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (selectedSnippetIds.size > 0) {
                                                            setSelectedSnippetIds(new Set());
                                                        } else {
                                                            const allIds = new Set(filteredItems.map(item => item.id));
                                                            setSelectedSnippetIds(allIds);
                                                        }
                                                    }}
                                                    className="text-slate-500 hover:text-white"
                                                >
                                                    {selectedSnippetIds.size > 0 ? 'Deselect all' : 'Select all'}
                                                </Button>
                                                <div className="h-6 w-px bg-slate-800 mx-1"></div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsSelectionMode(false)}
                                                    className="text-blue-400 font-medium"
                                                >
                                                    Done
                                                </Button>
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {!isSelectionMode && (
                            <div className="flex gap-2">
                                {activeTab === 'css' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleImportVariables}
                                        className="text-slate-400 hover:text-white border-slate-700 hover:border-slate-500"
                                        icon={<Download size={14} />}
                                        title="Import CSS variables from page"
                                    >
                                        Import vars
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-slate-400 hover:text-white border-slate-700 hover:border-slate-500"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setQuickAddState({ x: rect.left, y: rect.bottom, type: activeTab });
                                    }}
                                    icon={<Plus size={14} />}
                                    title="Quick add from library"
                                >
                                    Quick add
                                </Button>

                                <Button
                                    variant="filled"
                                    size="sm"
                                    onClick={() => handleCreateLocal(activeTab)}
                                    // Make HTML orange button use black text for better contrast against orange-600? Or go darker orange?
                                    // User requested darker orange with white label (AA contrast)
                                    className={activeTab === 'css' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-orange-700 hover:bg-orange-600 text-white font-bold'}
                                    icon={<Plus size={10} />}
                                >
                                    Add {activeTab === 'css' ? 'CSS' : 'HTML'}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Bulk Actions Bar for Theme Detail */}
                    {isSelectionMode && selectedSnippetIds.size > 0 && (
                        <div className="absolute bottom-4 left-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white bg-slate-700/50"
                                    onClick={() => setSelectedSnippetIds(new Set())}
                                    title="Deselect all"
                                >
                                    <X size={16} />
                                </Button>
                                <div className="text-sm text-slate-300 font-medium">
                                    {selectedSnippetIds.size} selected
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="h-6 w-px bg-slate-700 mx-1"></div>

                                {viewportWidth > 600 ? (
                                    <>
                                        <Button variant="ghost" size="sm" onClick={() => handleBulkEnable(true)} title="Enable selected">
                                            <Play size={14} className="mr-1.5 text-green-400" /> Enable
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleBulkEnable(false)} title="Disable selected">
                                            <Pause size={14} className="mr-1.5 text-slate-400" /> Disable
                                        </Button>
                                        <div className="h-6 w-px bg-slate-700 mx-1"></div>
                                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={handleBulkDelete}>
                                            <Trash2 size={14} className="mr-1.5" /> Delete
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (menuState.itemId === 'BULK_ACTIONS_MENU') {
                                                setMenuState({ x: 0, y: 0, itemId: null });
                                                return;
                                            }
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMenuState({
                                                // Center horizontally relative to button, display ABOVE the button
                                                x: rect.left,
                                                y: rect.top,
                                                itemId: 'BULK_ACTIONS_MENU',
                                                source: 'stack'
                                            });
                                        }}
                                    >
                                        <MoreVertical size={16} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 p-3">
                        {filteredItems.length > 0 ? (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                modifiers={[restrictToVerticalAxis]}
                            >
                                <SortableContext
                                    items={filteredItems.map(i => i.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <Virtuoso
                                        style={{ height: '100%' }}
                                        ref={virtuosoRef}
                                        data={filteredItems}
                                        itemContent={(_, item) => (
                                            <SnippetStackItem
                                                key={item.id}
                                                item={item}
                                                themeId={themeId}
                                                isCollapsed={collapsedItems.has(item.id)}
                                                onToggleCollapse={() => toggleItemExpand(item.id)}
                                                isSelected={selectedSnippetIds.has(item.id) || selectedItemId === item.id}
                                                itemRef={(el) => sidebarItemRefs.current[item.id] = el}
                                                onKebabClick={handleKebabClick}
                                                isEditing={editingSnippetId === item.id}
                                                onSetEditing={(id, val) => setEditingSnippetId(val ? id : null)}
                                                onSelect={(id) => {
                                                    if (isSelectionMode) {
                                                        handleToggleSelection(id);
                                                    } else {
                                                        setSelectedItemId(id);
                                                        // Ensure focus isn't stolen excessively, but user clicked it.
                                                        // SnippetStackItem handles its own internal focus for editor.
                                                    }
                                                }}
                                                isThemeActive={true}
                                                editorRef={(el: any) => editorRefs.current[item.id] = el}
                                                isSelectionMode={isSelectionMode}
                                            />
                                        )}
                                    />
                                </SortableContext>
                            </DndContext>
                        ) : (
                            // Empty State
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <Box className="w-12 h-12 text-slate-700 mb-4" strokeWidth={1.5} />
                                <h3 className="text-slate-400 font-medium mb-2">No {activeTab.toUpperCase()} snippets yet</h3>
                                <p className="text-slate-500 text-sm max-w-xs mb-6">
                                    Add your first snippet to start customizing this theme.
                                </p>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setLibraryFilter(activeTab);
                                            setShowLibrary(true);
                                        }}
                                        className="border-slate-700 text-slate-400 hover:text-white"
                                    >
                                        Browse library
                                    </Button>
                                    <Button
                                        variant="filled"
                                        onClick={() => handleCreateLocal(activeTab)}
                                        className={activeTab === 'css' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-orange-700 hover:bg-orange-600 text-white font-bold'}
                                    >
                                        <Plus size={14} className="mr-2" />
                                        Create new
                                    </Button>

                                </div>
                            </div>
                        )}
                    </div>
                    {/* Import Modal */}
                    {
                        importCandidates && (
                            <ImportVariablesModal
                                variables={importCandidates.variables}
                                onImport={handleConfirmImport}
                                onClose={() => setImportCandidates(null)}
                            />
                        )
                    }

                    {/* Remove Snippet Confirmation */}
                    <ConfirmDialog
                        isOpen={!!itemToRemove}
                        onClose={() => setItemToRemove(null)}
                        onConfirm={() => {
                            if (itemToRemove) {
                                useStore.getState().removeSnippetFromTheme(themeId, itemToRemove);
                                setItemToRemove(null);
                            }
                        }}
                        title="Remove snippet"
                        message="Remove this snippet from the theme? The snippet will remain in your library."
                        confirmLabel="Remove"
                        isDangerous
                    />

                    {/* Bulk Delete Confirmation */}
                    <ConfirmDialog
                        isOpen={confirmBulkDelete}
                        onClose={() => setConfirmBulkDelete(false)}
                        onConfirm={() => {
                            selectedSnippetIds.forEach(id => {
                                useStore.getState().removeSnippetFromTheme(themeId, id);
                            });
                            setSelectedSnippetIds(new Set());
                            setIsSelectionMode(false);
                            setConfirmBulkDelete(false);
                        }}
                        title="Remove snippets"
                        message={`Remove ${selectedSnippetIds.size} snippet${selectedSnippetIds.size === 1 ? '' : 's'} from this theme?`}
                        confirmLabel="Remove"
                        isDangerous
                    />

                    <ConfirmDialog
                        isOpen={themeToDelete}
                        onClose={() => setThemeToDelete(false)}
                        onConfirm={() => {
                            const { deleteTheme } = useStore.getState();
                            deleteTheme(themeId);
                            setThemeToDelete(false);
                            onBack();
                        }}
                        title="Delete theme"
                        message={`Are you sure you want to delete theme "${theme.name}"? This action cannot be undone.`}
                        confirmLabel="Delete"
                        isDangerous
                    />
                </div >
            </div >
        </div>
    );
};
