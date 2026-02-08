import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useStore } from '../store.ts';
import { Plus, Trash2, Play, Pause, MoreVertical, Upload, Download, Globe, X, Copy, Link as LinkIcon, Ungroup } from 'lucide-react';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';
import { getDomainFromUrl } from '../utils/domains.ts';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import type { Theme } from '../types.ts';
import { ThemeGroup } from './ThemeGroup';
import { DomainConfigurationModal } from './DomainConfigurationModal';
import { useThemeListImportExport } from '../hooks/useThemeListImportExport.ts';
import { ThemeListModals } from './ThemeList/ThemeListModals.tsx';



import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';


import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface ThemeListProps {
    onSelectTheme: (id: string) => void;
    activeUrl: string | null;
}

import { SortableThemeItem } from './SortableThemeItem';
import { ThemeItem } from './ThemeItem';

export const ThemeList: React.FC<ThemeListProps> = ({ onSelectTheme, activeUrl }) => {
    // Selective selectors to minimize re-renders
    const themes = useStore(state => state.themes);
    const addTheme = useStore(state => state.addTheme);
    const deleteTheme = useStore(state => state.deleteTheme);
    const updateTheme = useStore(state => state.updateTheme);
    const globalEnabled = useStore(state => state.globalEnabled);
    const reorderThemes = useStore(state => state.reorderThemes);
    const createThemeGroup = useStore(state => state.createThemeGroup);
    const ungroupThemes = useStore(state => state.ungroupThemes);
    const createEmptyGroup = useStore(state => state.createEmptyGroup);
    const detachThemeFromGroup = useStore(state => state.detachThemeFromGroup);


    const { showToast } = useToast();

    // Creation Modal State
    const [isCreating, setIsCreating] = useState(false);
    const [newThemeName, setNewThemeName] = useState('');

    const [newDomainPatterns, setNewDomainPatterns] = useState<string[]>([]);
    const [newThemeGroupId, setNewThemeGroupId] = useState<string | null>(null);

    const {
        handleExport,
        handleExportAllData,
        processImportContent,
        executeThemeImport,
        importStoreData: importStoreDataAction
    } = useThemeListImportExport();

    // Modals State
    const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [confirmBulkExport, setConfirmBulkExport] = useState<'js' | 'css' | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importMode, setImportMode] = useState<'merge' | 'replace' | 'skip-duplicates'>('merge');
    const [pendingImportData, setPendingImportData] = useState<any>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const allDataFileInputRef = React.useRef<HTMLInputElement>(null);

    // Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedThemeIds, setSelectedThemeIds] = useState<Set<string>>(new Set());

    // Collapse State for Groups
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const preDragCollapsedGroupsRef = useRef<Set<string>>(new Set());
    const expansionTimerRef = useRef<number | null>(null);

    // Display Items Logic
    type DisplayItem =
        | { type: 'theme', id: string, data: Theme }
        | { type: 'group', id: string, themes: Theme[], domainPatterns: string[] };

    const displayItems = React.useMemo(() => {
        const items: DisplayItem[] = [];
        const processedGroupIds = new Set<string>();

        themes.forEach(theme => {
            if (theme.groupId) {
                if (processedGroupIds.has(theme.groupId)) return;

                // Find all themes in this group
                const groupThemes = themes.filter(t => t.groupId === theme.groupId);
                items.push({
                    type: 'group',
                    id: theme.groupId, // Use groupId as Item ID
                    themes: groupThemes,
                    domainPatterns: theme.domainPatterns // They share domains
                });
                processedGroupIds.add(theme.groupId);
            } else {
                items.push({ type: 'theme', id: theme.id, data: theme });
            }
        });
        return items;
    }, [themes]);

    // Count groups for collapse/expand all button
    const groupCount = displayItems.filter(item => item.type === 'group').length;
    const allGroupsCollapsed = displayItems
        .filter(item => item.type === 'group')
        .every(item => collapsedGroups.has(item.id));

    const toggleAllGroups = () => {
        if (allGroupsCollapsed) {
            // Expand all
            setCollapsedGroups(new Set());
        } else {
            // Collapse all
            const allGroupIds = displayItems
                .filter(item => item.type === 'group')
                .map(item => item.id);
            setCollapsedGroups(new Set(allGroupIds));
        }
    };

    // Context Menu State
    const [menuState, setMenuState] = useState<{ x: number; y: number; themeId: string | null; groupId?: string }>({ x: 0, y: 0, themeId: null });

    // Domain Config State
    const [editingDomainGroup, setEditingDomainGroup] = useState<string | null>(null);
    const [editingDomainTheme, setEditingDomainTheme] = useState<string | null>(null);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    // DnD Drag State
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [overDragId, setOverDragId] = useState<string | null>(null);

    // Responsive State
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
    const [listWidth, setListWidth] = useState<number>(0);
    const listRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (listRef.current) {
            setListWidth(listRef.current.offsetWidth);
        }
    }, [viewportWidth]);
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

    const handleDragStart = (event: DragStartEvent) => {
        const activeId = event.active.id as string;
        setActiveDragId(activeId);

        // Save current collapse state
        preDragCollapsedGroupsRef.current = new Set(collapsedGroups);

        // Collapse all groups for root-level reordering stability
        // (Only if it's a group header or a root-level theme)
        const activeTheme = themes.find(t => t.id === activeId);
        if (!activeTheme || !activeTheme.groupId) {
            const allGroupIds = displayItems
                .filter(i => i.type === 'group')
                .map(g => g.id);
            setCollapsedGroups(new Set(allGroupIds));
        }
    };

    const handleDragOver = (event: any) => {
        const { over } = event;
        setOverDragId(over?.id as string || null);
    };

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setActiveDragId(null);
        setOverDragId(null);

        if (expansionTimerRef.current) {
            window.clearTimeout(expansionTimerRef.current);
            expansionTimerRef.current = null;
        }

        // Restore collapse state
        const preDragState = preDragCollapsedGroupsRef.current;
        if (preDragState) {
            setCollapsedGroups(new Set(preDragState));
            preDragState.clear();
        }

        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeTheme = themes.find(t => t.id === activeId);
        const overTheme = themes.find(t => t.id === overId);
        const activeGroupItem = displayItems.find(i => i.id === activeId && i.type === 'group');

        // CASE 1: Reordering themes INSIDE the same group
        if (activeTheme?.groupId && overTheme?.groupId === activeTheme.groupId) {
            const groupThemes = themes.filter(t => t.groupId === activeTheme.groupId);
            const oldIdx = groupThemes.findIndex(t => t.id === activeId);
            const newIdx = groupThemes.findIndex(t => t.id === overId);
            if (oldIdx !== -1 && newIdx !== -1) {
                const moved = arrayMove(groupThemes, oldIdx, newIdx);
                const updatedThemes = themes.map(t => {
                    if (t.groupId === activeTheme.groupId) {
                        const newPos = moved.findIndex(mt => mt.id === t.id);
                        return moved[newPos];
                    }
                    return t;
                });
                // We need to maintain the relative order in the main list
                // For simplicity, let's assume reorderThemes handles the internal order correctly
                // and we just need to pass the IDs in the new order.
                reorderThemes(updatedThemes);
            }
            return;
        }

        // CASE 2: Reordering root-level items (standalone themes and groups)
        const activeIsRoot = !activeTheme || !activeTheme.groupId || activeGroupItem;
        const overItem = displayItems.find(i => i.id === overId);
        const overIsRoot = overItem && (overItem.type === 'group' || !themes.find(t => t.id === overId)?.groupId);

        if (activeIsRoot && overIsRoot) {
            const oldIdx = displayItems.findIndex(i => i.id === activeId);
            const newIdx = displayItems.findIndex(i => i.id === overId);

            if (oldIdx !== -1 && newIdx !== -1) {
                const movedItems = arrayMove(displayItems, oldIdx, newIdx);
                const finalThemes: Theme[] = [];
                movedItems.forEach(item => {
                    if (item.type === 'theme') {
                        finalThemes.push(item.data);
                    } else {
                        finalThemes.push(...themes.filter(t => t.groupId === item.id));
                    }
                });
                reorderThemes(finalThemes);
            }
        }
    }, [themes, displayItems, reorderThemes]);

    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if ((isCreating || isCreatingGroup) && activeUrl) {
            try {
                const domain = getDomainFromUrl(activeUrl);
                // Automatically add detected domain to patterns but keep "Run everywhere" (empty patterns) off by default
                if (domain && !newDomainPatterns.includes(domain)) {
                    setNewDomainPatterns(prev => [...prev, domain]);
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }
    }, [isCreating, isCreatingGroup, activeUrl]);

    // Clear selection when exiting selection mode
    useEffect(() => {
        if (!isSelectionMode) {
            setSelectedThemeIds(new Set());
        }
    }, [isSelectionMode]);

    const handleCreate = () => {
        if (!newThemeName.trim()) return;

        const domainPatterns = newDomainPatterns.length > 0 ? newDomainPatterns : ['<all_urls>'];

        const newId = addTheme({
            name: newThemeName.trim(),
            domainPatterns,
            isActive: true,
            items: [],
            ...(newThemeGroupId && { groupId: newThemeGroupId })
        });

        setNewThemeName('');
        setIsCreating(false);
        setNewDomainPatterns([]);
        setNewThemeGroupId(null);

        // Direct navigation to the new theme
        onSelectTheme(newId);
    };



    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const result = processImportContent(content);

            if (result.type === 'full') {
                if (themes.length === 0) {
                    importStoreDataAction(result.data, 'replace');
                    showToast(`Imported ${result.data.themes.length} themes`);
                } else {
                    setPendingImportData(result.data);
                    setIsImportDialogOpen(true);
                }
            } else if (result.type === 'theme') {
                const newId = executeThemeImport(result.theme);
                onSelectTheme(newId);
            } else {
                showToast('Failed to parse file. Please ensure it\'s a valid TweakBench export.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleImportAllDataClick = () => {
        allDataFileInputRef.current?.click();
    };

    const handleAllDataFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const result = processImportContent(content);
            if (result.type === 'full') {
                if (themes.length === 0) {
                    importStoreDataAction(result.data, 'replace');
                    showToast(`Imported ${result.data.themes.length} themes and ${result.data.snippets.length} snippets`);
                } else {
                    setPendingImportData(result.data);
                    setIsImportDialogOpen(true);
                }
            } else {
                showToast('Failed to parse import file. Please ensure it\'s a valid TweakBench backup.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleConfirmImport = () => {
        if (!pendingImportData) return;

        const result = importStoreDataAction(pendingImportData, importMode);
        setIsImportDialogOpen(false);
        setPendingImportData(null);

        let message = '';
        if (importMode === 'replace') {
            message = `Replaced all data: ${result.themesAdded} themes, ${result.snippetsAdded} snippets`;
        } else if (importMode === 'merge') {
            message = `Imported ${result.themesAdded} themes, ${result.snippetsAdded} snippets`;
        } else {
            message = `Imported ${result.themesAdded} themes, ${result.snippetsAdded} snippets (${result.skipped} duplicates skipped)`;
        }
        showToast(message);
    };



    const handleToggleSelection = (id: string) => {
        setSelectedThemeIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkDelete = () => {
        if (selectedThemeIds.size === 0) return;
        setConfirmBulkDelete(true);
    };

    const confirmBulkDeleteAction = () => {
        selectedThemeIds.forEach(id => deleteTheme(id));
        setSelectedThemeIds(new Set());
        setIsSelectionMode(false);
        setConfirmBulkDelete(false);
    };

    const handleBulkEnable = (enable: boolean) => {
        selectedThemeIds.forEach(id => updateTheme(id, { isActive: enable }));
        // Optional: Stay in selection mode? Yes.
    };

    const handleBulkExport = (type: 'js' | 'css') => {
        if (selectedThemeIds.size > 5) {
            setConfirmBulkExport(type);
        } else {
            executeBulkExport(type);
        }
    };

    const executeBulkExport = (type: 'js' | 'css') => {
        let delay = 0;
        selectedThemeIds.forEach(id => {
            setTimeout(() => {
                handleExport(id, type);
            }, delay);
            delay += 500;
        });
        showToast(`Exporting ${selectedThemeIds.size} themes...`);
    };

    const handleContextMenu = (e: React.MouseEvent, themeId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuState({ x: e.pageX, y: e.pageY, themeId });
    };

    const handleGroupContextMenu = (e: React.MouseEvent, groupId: string, triggers: { x: number, y: number, action?: string }) => {
        e.preventDefault();
        e.stopPropagation();

        // If this is the plus button, trigger theme creation
        if (triggers.action === 'add-theme') {
            const groupThemes = themes.filter(t => t.groupId === groupId);
            if (groupThemes.length > 0) {
                const domainPatterns = groupThemes[0].domainPatterns;
                setNewDomainPatterns([...domainPatterns]);
                setNewThemeGroupId(groupId);
                setIsCreating(true);
            }
            return;
        }

        setMenuState({ x: triggers.x, y: triggers.y, themeId: 'GROUP_MENU', groupId });
    };

    const handleKebabClick = (e: React.MouseEvent, themeId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({ x: rect.left, y: rect.bottom, themeId });
    };



    const getMenuItems = (targetId: string, groupId?: string): ContextMenuItem[] => {
        if (targetId === 'GROUP_MENU' && groupId) {
            return [
                {
                    label: 'Add theme to group',
                    icon: <Plus size={14} className="text-blue-400" />,
                    onClick: () => {
                        const groupThemes = themes.filter(t => t.groupId === groupId);
                        if (groupThemes.length > 0) {
                            const domainPatterns = groupThemes[0].domainPatterns;
                            setNewDomainPatterns([...domainPatterns]);
                            setNewThemeGroupId(groupId);
                            setIsCreating(true);
                        }
                    }
                },
                {
                    label: 'Duplicate group',
                    icon: <Copy size={14} />,
                    onClick: () => {
                        useStore.getState().duplicateThemeGroup(groupId);
                        showToast('Domain group duplicated');
                    }
                },
                { separator: true },
                {
                    label: 'Configure domains',
                    icon: <Globe size={14} />,
                    onClick: () => setEditingDomainGroup(groupId)
                },
                { separator: true },
                {
                    label: 'Ungroup themes',
                    icon: <Ungroup size={14} />,
                    onClick: () => {
                        const groupThemes = themes.filter(t => t.groupId === groupId);
                        ungroupThemes(groupThemes.map(t => t.id));
                        showToast('Themes ungrouped');
                    }
                },
                {
                    label: 'Delete group',
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onClick: () => setGroupToDelete(groupId)
                }
            ];
        }

        if (targetId === 'BULK_ACTIONS_MENU') {
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
                    label: 'Create domain group',
                    icon: <LinkIcon size={14} className="text-blue-400" />,
                    onClick: () => {
                        createThemeGroup(Array.from(selectedThemeIds));
                        showToast('Domain group created');
                        setIsSelectionMode(false);
                    }
                },
                {
                    label: 'Ungroup selected',
                    icon: <Ungroup size={14} />,
                    onClick: () => {
                        ungroupThemes(Array.from(selectedThemeIds));
                        showToast('Themes ungrouped');
                        setIsSelectionMode(false);
                    }
                },
                { separator: true },
                {
                    label: 'Export selected',
                    icon: <Download size={14} className="text-blue-400" />,
                    onClick: () => handleBulkExport('js')
                },
                { separator: true },
                {
                    label: `Delete ${selectedThemeIds.size} themes`,
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onClick: handleBulkDelete
                }
            ];
        }

        if (!targetId) return [];
        const theme = themes.find(t => t.id === targetId);
        if (!theme) return [];

        const items: ContextMenuItem[] = [
            {
                label: theme.isActive ? 'Disable theme' : 'Enable theme',
                icon: theme.isActive ? <Pause size={14} /> : <Play size={14} />,
                onClick: () => updateTheme(targetId, { isActive: !theme.isActive })
            }
        ];

        if (theme.groupId) {
            items.push({
                label: 'Detach from group',
                icon: <Ungroup size={14} />,
                onClick: () => {
                    detachThemeFromGroup(targetId);
                    showToast('Theme detached from group');
                }
            });
        }

        items.push({ separator: true });
        items.push({
            label: 'Export to JS',
            icon: <Download size={14} />,
            onClick: () => handleExport(targetId, 'js')
        });
        items.push({
            label: 'Export to CSS only',
            icon: <Download size={14} />,
            onClick: () => handleExport(targetId, 'css')
        });

        items.push({ separator: true });
        items.push({
            label: 'Duplicate theme',
            icon: <Copy size={14} />,
            onClick: () => {
                const newThemeId = useStore.getState().duplicateTheme(targetId);
                showToast('Theme duplicated');
                onSelectTheme(newThemeId);
            }
        });

        items.push({ separator: true });
        items.push({
            label: 'Delete theme',
            icon: <Trash2 size={14} />,
            danger: true,
            onClick: () => setThemeToDelete(targetId)
        });

        return items;
    };

    const getMenuItemsForHeader = (): ContextMenuItem[] => [
        {
            label: 'Import theme or group',
            icon: <Upload size={14} className="text-green-400" />,
            onClick: () => fileInputRef.current?.click()
        },
        { separator: true },
        {
            label: 'Export all data',
            icon: <Download size={14} className="text-blue-400" />,
            onClick: handleExportAllData
        },
        {
            label: 'Import all data',
            icon: <Upload size={14} className="text-green-400" />,
            onClick: handleImportAllDataClick
        }
    ];

    const getMenuItemsForCreate = (): ContextMenuItem[] => [
        {
            label: 'Create theme',
            icon: <Plus size={14} className="text-blue-400" />,
            onClick: () => setIsCreating(true)
        },
        {
            label: 'Create domain group',
            icon: <LinkIcon size={14} className="text-blue-400" />,
            onClick: () => setIsCreatingGroup(true)
        }
    ];

    return (
        <div
            ref={listRef}
            style={{ '--list-width': listWidth > 0 ? `${listWidth}px` : '100%' } as React.CSSProperties}
        >
            <div className="p-4 flex flex-col gap-4 relative pb-20">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-lg font-bold text-slate-100 tracking-tight">Tweaks</h2>
                    <div className="flex items-center gap-1">
                        {!isSelectionMode ? (
                            <>
                                {groupCount > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleAllGroups}
                                        className="btn-ghost-muted px-2"
                                        title={allGroupsCollapsed ? 'Expand all groups' : 'Collapse all groups'}
                                    >
                                        {allGroupsCollapsed ? 'Expand all' : 'Collapse all'}
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsSelectionMode(true)}
                                    className="text-slate-400 hover:text-white px-2"
                                >
                                    Select
                                </Button>

                                <div className="divider-v" />

                                {/* Compact view for narrow screens */}
                                <div className="md:hidden">
                                    <button
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMenuState({ x: rect.left, y: rect.bottom, themeId: 'CREATE_MENU' });
                                        }}
                                        className="p-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                        title="Create"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                {/* Full view for wider screens */}
                                <div className="hidden md:flex md:gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsCreatingGroup(true)}
                                        icon={<Plus size={14} />}
                                    >
                                        Create domain group
                                    </Button>
                                    <Button
                                        variant="filled"
                                        size="sm"
                                        onClick={() => setIsCreating(true)}
                                        icon={<Plus size={14} />}
                                    >
                                        Create theme
                                    </Button>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".js,.json" />
                                <input type="file" ref={allDataFileInputRef} onChange={handleAllDataFileChange} className="hidden" accept=".json" />
                                <button
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setMenuState({ x: rect.left, y: rect.bottom, themeId: 'HEADER_MENU' });
                                    }}
                                    className="icon-button"
                                    title="More options"
                                >
                                    <MoreVertical size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                {groupCount > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleAllGroups}
                                        className="btn-ghost-muted px-2"
                                        title={allGroupsCollapsed ? 'Expand all groups' : 'Collapse all groups'}
                                    >
                                        {allGroupsCollapsed ? 'Expand all' : 'Collapse all'}
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        if (selectedThemeIds.size > 0) {
                                            setSelectedThemeIds(new Set());
                                        } else {
                                            const allIds = new Set(themes.map(t => t.id));
                                            setSelectedThemeIds(allIds);
                                        }
                                    }}
                                    className="text-slate-400 hover:text-white px-2"
                                >
                                    {selectedThemeIds.size > 0 ? 'Deselect all' : 'Select all'}
                                </Button>

                                {selectedThemeIds.size > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMenuState({ x: rect.left, y: rect.bottom, themeId: 'BULK_ACTIONS_MENU' });
                                        }}
                                        className="p-1 rounded hover:bg-slate-700 text-slate-300 mx-1"
                                        title="Bulk actions"
                                    >
                                        <MoreVertical size={20} />
                                    </button>
                                )}

                                <div className="h-6 w-px bg-slate-800 mx-1"></div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsSelectionMode(false)}
                                    className="text-blue-400 font-medium px-2"
                                >
                                    Done
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Create Theme Modal */}
                <ThemeListModals
                    isCreating={isCreating}
                    setIsCreating={setIsCreating}
                    newThemeName={newThemeName}
                    setNewThemeName={setNewThemeName}
                    newDomainPatterns={newDomainPatterns}
                    setNewDomainPatterns={setNewDomainPatterns}
                    activeUrl={activeUrl}
                    handleCreate={handleCreate}
                    isImportDialogOpen={isImportDialogOpen}
                    setIsImportDialogOpen={setIsImportDialogOpen}
                    importMode={importMode}
                    setImportMode={setImportMode}
                    pendingImportData={pendingImportData}
                    handleConfirmImport={handleConfirmImport}
                    themeToDelete={themeToDelete}
                    setThemeToDelete={setThemeToDelete}
                    themeToDeleteName={themes.find(t => t.id === themeToDelete)?.name}
                    confirmDelete={() => { if (themeToDelete) deleteTheme(themeToDelete); setThemeToDelete(null); }}
                    confirmBulkDelete={confirmBulkDelete}
                    setConfirmBulkDelete={setConfirmBulkDelete}
                    selectedCount={selectedThemeIds.size}
                    confirmBulkDeleteAction={confirmBulkDeleteAction}
                    confirmBulkExport={confirmBulkExport}
                    setConfirmBulkExport={setConfirmBulkExport}
                    executeBulkExport={executeBulkExport}
                    groupToDelete={groupToDelete}
                    setGroupToDelete={setGroupToDelete}
                    confirmGroupDelete={() => {
                        if (groupToDelete) {
                            const groupThemes = themes.filter(t => t.groupId === groupToDelete);
                            groupThemes.forEach(t => deleteTheme(t.id));
                            showToast('Group deleted');
                            setGroupToDelete(null);
                        }
                    }}
                    isCreatingGroup={isCreatingGroup}
                    setIsCreatingGroup={setIsCreatingGroup}
                    newGroupName={newThemeName}
                    handleCreateGroup={() => {
                        const domainPatterns = newDomainPatterns.length > 0 ? newDomainPatterns : ['<all_urls>'];
                        createEmptyGroup(domainPatterns);
                        setIsCreatingGroup(false);
                        setNewThemeName('');
                        setNewDomainPatterns([]);
                        showToast('Domain group created');
                    }}
                    newThemeGroupId={newThemeGroupId}
                />


                <div className="flex flex-col gap-2">
                    {themes.length === 0 && !isCreating && (
                        <div className="text-center p-8 border border-dashed border-slate-800 rounded-lg text-slate-500 flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                                <Plus size={24} className="opacity-50" />
                            </div>
                            <p className="font-medium text-slate-400">No themes yet</p>
                            <p className="text-xs max-w-[200px] mx-auto">Create a theme or load some examples to start customizing your web experience.</p>
                            <div className="flex gap-2 mt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        await useStore.getState().loadExampleData();
                                        showToast('Starter kit loaded');
                                    }}
                                >
                                    Load starter kit
                                </Button>
                                <Button
                                    variant="filled"
                                    size="sm"
                                    onClick={() => setIsCreating(true)}
                                >
                                    Create first theme
                                </Button>
                            </div>
                        </div>
                    )}

                    <style>{`
                        .drop-spacer { display: none; }
                    `}</style>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                    >
                        <div className="flex flex-col gap-2">
                            <SortableContext
                                items={displayItems.map(i => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {displayItems.map((item) => {
                                    const isGroup = item.type === 'group';

                                    return (
                                        <div key={item.id} className="relative">
                                            <div className={`${!isGroup ? 'my-1' : 'my-2'}`}>
                                                {item.type === 'group' ? (
                                                    <ThemeGroup
                                                        id={item.id}
                                                        themes={item.themes}
                                                        domainPatterns={item.domainPatterns}
                                                        activeUrl={activeUrl}
                                                        isSelectionMode={isSelectionMode}
                                                        selectedThemeIds={selectedThemeIds}
                                                        globalEnabled={globalEnabled}
                                                        onSelectTheme={onSelectTheme}
                                                        onToggleSelection={handleToggleSelection}
                                                        onContextMenu={handleContextMenu}
                                                        onGroupContextMenu={handleGroupContextMenu}
                                                        onUpdateTheme={updateTheme}
                                                        onDeleteTheme={(e: React.MouseEvent, id: string) => { e.stopPropagation(); setThemeToDelete(id); }}
                                                        onDomainClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            setEditingDomainGroup(item.id);
                                                        }}
                                                        isCollapsed={collapsedGroups.has(item.id)}
                                                        onToggleCollapse={() => {
                                                            setCollapsedGroups(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(item.id)) {
                                                                    next.delete(item.id);
                                                                } else {
                                                                    next.add(item.id);
                                                                }
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                ) : (
                                                    <SortableThemeItem
                                                        theme={item.data}
                                                        isOtherInGroupActive={false}
                                                        activeUrl={activeUrl}
                                                        isSelectionMode={isSelectionMode}
                                                        isSelected={selectedThemeIds.has(item.id)}
                                                        globalEnabled={globalEnabled}
                                                        onSelect={() => onSelectTheme(item.id)}
                                                        onToggleSelection={() => handleToggleSelection(item.id)}
                                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, item.id)}
                                                        onKebabClick={(e: React.MouseEvent) => handleKebabClick(e, item.id)}
                                                        onUpdateTheme={(updates: Partial<Theme>) => updateTheme(item.id, updates)}
                                                        onDeleteClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            setThemeToDelete(item.id);
                                                        }}
                                                        onDomainClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            setEditingDomainTheme(item.id);
                                                        }}
                                                    />
                                                )}
                                            </div>

                                        </div>
                                    );
                                })}
                            </SortableContext>
                        </div>

                    </DndContext>
                </div>

                {/* Bulk Actions Bar */}
                {isSelectionMode && selectedThemeIds.size > 0 && (
                    <div className="fixed bottom-4 left-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-2xl flex items-center justify-between z-20 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white bg-slate-700/50" // Made bigger and slightly distinct
                                onClick={() => setSelectedThemeIds(new Set())}
                                title="Deselect all"
                            >
                                <X size={16} />
                            </Button>
                            <div className="text-sm text-slate-300 font-medium">
                                {selectedThemeIds.size} selected
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="h-6 w-px bg-slate-700 mx-1"></div>

                            <>
                                <Button variant="ghost" size="sm" onClick={() => handleBulkEnable(true)} title="Enable selected">
                                    <Play size={14} className={viewportWidth > 600 ? "mr-1.5 text-green-400" : "text-green-400"} />
                                    {viewportWidth > 600 && "Enable"}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleBulkEnable(false)} title="Disable selected">
                                    <Pause size={14} className={viewportWidth > 600 ? "mr-1.5 text-slate-400" : "text-slate-400"} />
                                    {viewportWidth > 600 && "Disable"}
                                </Button>
                                <div className="h-6 w-px bg-slate-700 mx-1"></div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setMenuState({
                                            x: rect.left,
                                            y: viewportWidth > 600 ? rect.bottom : rect.top,
                                            themeId: 'BULK_ACTIONS_MENU'
                                        });
                                    }}
                                    title="More actions"
                                >
                                    <MoreVertical size={16} />
                                </Button>
                                <div className="h-6 w-px bg-slate-700 mx-1"></div>
                                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={handleBulkDelete} title="Delete selected">
                                    <Trash2 size={14} className={viewportWidth > 600 ? "mr-1.5" : ""} />
                                    {viewportWidth > 600 && "Delete"}
                                </Button>
                            </>
                        </div>
                    </div>
                )}

                <DragOverlay dropAnimation={null}>
                    {activeDragId ? (() => {
                        const activeTheme = themes.find(t => t.id === activeDragId);
                        const activeGroup = displayItems.find(i => i.id === activeDragId && i.type === 'group');

                        if (activeTheme) {
                            return (
                                <div style={{ width: listWidth > 0 ? `${listWidth}px` : '300px' }} className="opacity-90 scale-[1.02] pointer-events-none transition-all duration-200">
                                    <ThemeItem
                                        theme={activeTheme}
                                        activeUrl={activeUrl}
                                        isSelectionMode={false}
                                        isSelected={false}
                                        globalEnabled={globalEnabled}
                                        onSelect={() => { }}
                                        onToggleSelection={() => { }}
                                        onContextMenu={() => { }}
                                        onKebabClick={() => { }}
                                        onUpdateTheme={() => { }}
                                        onDeleteClick={() => { }}
                                        isDragging={true}
                                    />
                                </div>
                            );
                        }

                        if (activeGroup && activeGroup.type === 'group') {
                            return (
                                <div style={{ width: listWidth > 0 ? `${listWidth}px` : '300px' }} className="opacity-80 scale-[1.02] pointer-events-none shadow-2xl">
                                    <ThemeGroup
                                        id={activeGroup.id}
                                        themes={activeGroup.themes}
                                        domainPatterns={activeGroup.domainPatterns}
                                        activeUrl={activeUrl}
                                        isSelectionMode={false}
                                        selectedThemeIds={new Set()}
                                        globalEnabled={globalEnabled}
                                        onSelectTheme={() => { }}
                                        onToggleSelection={() => { }}
                                        onContextMenu={() => { }}
                                        onGroupContextMenu={() => { }}
                                        onUpdateTheme={() => { }}
                                        onDeleteTheme={() => { }}
                                        onDomainClick={() => { }}
                                        isCollapsed={true}
                                        onToggleCollapse={() => { }}
                                    />
                                </div>
                            );
                        }
                        return null;
                    })() : null}
                </DragOverlay>

                {menuState.themeId && (
                    <ContextMenu
                        x={menuState.x}
                        y={menuState.y}
                        items={
                            menuState.themeId === 'HEADER_MENU'
                                ? getMenuItemsForHeader()
                                : menuState.themeId === 'CREATE_MENU'
                                    ? getMenuItemsForCreate()
                                    : getMenuItems(menuState.themeId, menuState.groupId)
                        }
                        onClose={() => setMenuState({ ...menuState, themeId: null, groupId: undefined })}
                    />
                )}


                {/* Domain Configuration Modal */}
                <DomainConfigurationModal
                    isOpen={!!editingDomainGroup}
                    onClose={() => setEditingDomainGroup(null)}
                    themes={themes}
                    groupId={editingDomainGroup || undefined}
                    onUpdateTheme={updateTheme}
                    activeUrl={activeUrl}
                />

                {/* Domain Configuration Modal for Individual Themes */}
                <DomainConfigurationModal
                    isOpen={!!editingDomainTheme}
                    onClose={() => setEditingDomainTheme(null)}
                    themes={editingDomainTheme ? themes.filter(t => t.id === editingDomainTheme) : []}
                    onUpdateTheme={updateTheme}
                    activeUrl={activeUrl}
                />

                {/* Create Group Modal */}
                <DomainConfigurationModal
                    isOpen={isCreatingGroup}
                    onClose={() => setIsCreatingGroup(false)}
                    activeUrl={activeUrl}
                    mode="create"
                    onCreateGroup={(domainPatterns: string[]) => {
                        createEmptyGroup(domainPatterns);
                        setIsCreatingGroup(false);
                        showToast('Domain group created');
                    }}
                />

            </div>
            {/* Sticky Footer */}
            <div className="fixed bottom-0 text-[10px] text-slate-600 px-4 py-5 w-full bg-slate-900/95 backdrop-blur-sm border-t border-slate-800/60 text-center z-10 transition-colors shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
                <p>
                    vibe coded by <a href="https://github.com/klarasch" target="_blank" rel="noopener noreferrer" className="text-slate-500 decoration-dotted underline-offset-2 font-medium hover:text-slate-300 transition-colors">Klára</a> using <a href="https://antigravity.google/" target="_blank" rel="noopener noreferrer" className="decoration-dotted underline-offset-2 font-medium text-slate-500 hover:text-slate-300 transition-colors">Antigravity</a>
                </p>
                <p className="mt-1">
                    if you enjoy this, <a href="https://buymeacoffee.com/ksch" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-300 transition-colors font-semibold">buy me a coffee</a>, thanks! &lt;3
                </p>
            </div>
        </div>
    );
};

