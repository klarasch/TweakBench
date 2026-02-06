import React, { useState, useEffect } from 'react';
import { useStore } from '../store.ts';
import { Plus, Trash2, Play, Pause, MoreVertical, Upload, Download, Globe, X, Copy, Link as LinkIcon, Ungroup } from 'lucide-react';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';
import { exportThemeToJS, exportThemeToCSS, parseThemeFromJS, exportAllData, importAllData } from '../utils/impexp.ts';
import { getDomainFromUrl } from '../utils/domains.ts';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/Dialog';
import { useToast } from './ui/Toast';
import type { Theme } from '../types.ts';
import { ThemeItem } from './ThemeItem'; // Import new component
import { ThemeGroup } from './ThemeGroup'; // Import new component
import { DomainConfigurationModal } from './DomainConfigurationModal'; // New import
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

interface ThemeListProps {
    onSelectTheme: (id: string) => void;
    activeUrl: string | null;
}

interface SortableThemeItemProps {
    theme: Theme;
    activeUrl: string | null;
    isSelectionMode: boolean;
    isSelected: boolean;
    globalEnabled: boolean;
    onSelect: () => void;
    onToggleSelection: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onKebabClick: (e: React.MouseEvent) => void;
    onUpdateTheme: (updates: Partial<Theme>) => void;
    onDeleteClick: (e: React.MouseEvent) => void;
    onDomainClick?: (e: React.MouseEvent) => void;
    isOtherInGroupActive: boolean;
}

// Wrapper for Sortable functionality for generic items
const SortableThemeItemWrapper: React.FC<SortableThemeItemProps> = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.theme.id, disabled: props.isSelectionMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 20 : 'auto',
        position: 'relative' as 'relative',
    };

    return (
        <ThemeItem
            {...props}
            setNodeRef={setNodeRef}
            style={style}
            dragHandleProps={{ ...attributes, ...listeners }}
            isDragging={isDragging}
        />
    );
};

export const ThemeList: React.FC<ThemeListProps> = ({ onSelectTheme, activeUrl }) => {
    const { themes, snippets, addTheme, deleteTheme, updateTheme, addSnippet, addSnippetToTheme, globalEnabled, importAllData: importData, reorderThemes, createThemeGroup, ungroupThemes, createEmptyGroup } = useStore();
    const { showToast } = useToast();

    // Creation Modal State
    const [isCreating, setIsCreating] = useState(false);
    const [newThemeName, setNewThemeName] = useState('');
    const [scannedDomain, setScannedDomain] = useState<string | null>(null);
    const [limitToDomain, setLimitToDomain] = useState(false);
    const [newThemeGroupId, setNewThemeGroupId] = useState<string | null>(null);

    // Dialog States
    const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [confirmBulkExport, setConfirmBulkExport] = useState<'js' | 'css' | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const allDataFileInputRef = React.useRef<HTMLInputElement>(null);

    // Import All Data State
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importMode, setImportMode] = useState<'merge' | 'replace' | 'skip-duplicates'>('merge');
    const [pendingImportData, setPendingImportData] = useState<{ themes: any[], snippets: any[], globalEnabled: boolean } | null>(null);

    // Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedThemeIds, setSelectedThemeIds] = useState<Set<string>>(new Set());

    // Collapse State for Groups
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

    // Responsive State
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = displayItems.findIndex(i => i.id === active.id);
        const newIndex = displayItems.findIndex(i => i.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            // Reorder displayItems first
            const newDisplayItems = arrayMove(displayItems, oldIndex, newIndex);

            // Flatten back to themes
            const newThemes: Theme[] = [];
            newDisplayItems.forEach(item => {
                if (item.type === 'theme') {
                    newThemes.push(item.data);
                } else {
                    // Spread group themes. Ensure we keep their relative order? Yes, preserving internal order.
                    // Wait, groupThemes in displayItems might be just a filter result.
                    // If we move a group, we move ALL its members.
                    // The internal order within a group is determined by the ORIGINAL array order essentially.
                    // But if we use 'groupThemes' which is filtered from 'themes', they are already in relative order.
                    newThemes.push(...item.themes);
                }
            });

            reorderThemes(newThemes);
        }
    };

    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isCreating && activeUrl) {
            try {
                const domain = getDomainFromUrl(activeUrl);
                setScannedDomain(domain);
                // Default to unchecked as per UX requirement ("quick option")
                setLimitToDomain(false);
            } catch (e) {
                setScannedDomain(null);
            }
        }
    }, [isCreating, activeUrl]);

    // Clear selection when exiting selection mode
    useEffect(() => {
        if (!isSelectionMode) {
            setSelectedThemeIds(new Set());
        }
    }, [isSelectionMode]);

    const handleCreate = () => {
        if (!newThemeName.trim()) return;

        let domainPatterns: string[];
        if (newThemeGroupId) {
            // Inherit from group
            const groupTheme = themes.find(t => t.groupId === newThemeGroupId);
            domainPatterns = groupTheme ? [...groupTheme.domainPatterns] : ['<all_urls>'];
        } else {
            domainPatterns = limitToDomain && scannedDomain
                ? [scannedDomain]
                : ['<all_urls>'];
        }

        const newId = addTheme({
            name: newThemeName.trim(),
            domainPatterns,
            items: [],
            isActive: true,
            ...(newThemeGroupId && { groupId: newThemeGroupId })
        });

        setNewThemeName('');
        setIsCreating(false);
        setLimitToDomain(false);
        setNewThemeGroupId(null);

        // Direct navigation to the new theme
        onSelectTheme(newId);
    };

    // ... (Import/Export logic kept same)

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const importedData = parseThemeFromJS(content);
            if (importedData) {
                const newThemeId = addTheme({
                    name: importedData.name,
                    domainPatterns: importedData.domainPatterns,
                    items: [],
                    isActive: true
                });
                importedData.snippets.forEach(s => {
                    const newSnippetId = addSnippet({
                        name: s.name,
                        type: s.type,
                        content: s.content,
                        relatedSnippetIds: [],
                        isLibraryItem: false
                    });
                    addSnippetToTheme(newThemeId, newSnippetId);
                });
                showToast(`Imported theme: ${importedData.name}`);
            } else {
                showToast('Failed to parse theme from file.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleExportAllData = () => {
        const content = exportAllData(themes, snippets, globalEnabled);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TweakBench_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
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
            const importedData = importAllData(content);
            if (importedData) {
                setPendingImportData(importedData);
                setIsImportDialogOpen(true);
            } else {
                showToast('Failed to parse import file. Please ensure it\'s a valid TweakBench backup.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleConfirmImport = () => {
        if (!pendingImportData) return;

        const result = importData(pendingImportData, importMode);
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

    const handleExport = (themeId: string, type: 'js' | 'css') => {
        const theme = themes.find(t => t.id === themeId);
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
                setScannedDomain(domainPatterns[0] || null);
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



    const getMenuItems = (targetId: string | null, groupId?: string): ContextMenuItem[] => {
        // Group Menu
        if (groupId) {
            return [
                {
                    label: 'Add theme to group',
                    icon: <Plus size={14} />,
                    onClick: () => {
                        const groupThemes = themes.filter(t => t.groupId === groupId);
                        if (groupThemes.length > 0) {
                            // Set the group ID and domain patterns, then open creation dialog
                            const domainPatterns = groupThemes[0].domainPatterns;
                            setScannedDomain(domainPatterns[0] || null);
                            setNewThemeGroupId(groupId);
                            setIsCreating(true);
                        }
                    }
                },
                { separator: true },
                {
                    label: 'Configure domains',
                    icon: <Globe size={14} />,
                    onClick: () => {
                        setEditingDomainGroup(groupId);
                    }
                },
                {
                    label: 'Ungroup themes',
                    icon: <Ungroup size={14} />,
                    onClick: () => {
                        const groupThemes = themes.filter(t => t.groupId === groupId);
                        ungroupThemes(groupThemes.map(t => t.id));
                        showToast('Themes ungrouped');
                    }
                },
                { separator: true },
                {
                    label: 'Delete group',
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onClick: () => {
                        setGroupToDelete(groupId);
                    }
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
        return [
            {
                label: theme.isActive ? 'Disable theme' : 'Enable theme',
                icon: theme.isActive ? <Pause size={14} /> : <Play size={14} />,
                onClick: () => updateTheme(targetId, { isActive: !theme.isActive })
            },
            { separator: true },
            {
                label: 'Export to JS',
                icon: <Download size={14} />,
                onClick: () => handleExport(targetId, 'js')
            },
            {
                label: 'Export to CSS only',
                icon: <Download size={14} />,
                onClick: () => handleExport(targetId, 'css')
            },
            { separator: true },
            {
                label: 'Duplicate theme',
                icon: <Copy size={14} />,
                onClick: () => {
                    const newThemeId = useStore.getState().duplicateTheme(targetId);
                    showToast('Theme duplicated');
                    onSelectTheme(newThemeId);
                }
            },
            { separator: true },
            {
                label: 'Delete theme',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => setThemeToDelete(targetId)
            }
        ];
    };

    const themeToDeleteDetails = themeToDelete ? themes.find(t => t.id === themeToDelete) : null;

    const getMenuItemsForHeader = (): ContextMenuItem[] => [
        {
            label: 'Import theme',
            icon: <Upload size={14} className="text-green-400" />,
            onClick: handleImportClick
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
        <div className="flex flex-col gap-4 relative pb-20">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-200">Themes</h2>
                    {groupCount > 1 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleAllGroups}
                            className="text-slate-400 hover:text-white"
                            title={allGroupsCollapsed ? 'Expand all groups' : 'Collapse all groups'}
                        >
                            {allGroupsCollapsed ? 'Expand all' : 'Collapse all'}
                        </Button>
                    )}
                    {!isSelectionMode && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsSelectionMode(true)}
                            className="text-slate-400 hover:text-white"
                        >
                            Select
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    {!isSelectionMode ? (
                        <>
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
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".js" />
                            <input type="file" ref={allDataFileInputRef} onChange={handleAllDataFileChange} className="hidden" accept=".json" />
                            <button
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMenuState({ x: rect.left, y: rect.bottom, themeId: 'HEADER_MENU' });
                                }}
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-300"
                                title="More options"
                            >
                                <MoreVertical size={16} />
                            </button>
                        </>
                    ) : (
                        <>
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
                                className="text-slate-500 hover:text-white"
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
                                className="text-blue-400 font-medium"
                            >
                                Done
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Create Theme Modal */}
            <Modal
                isOpen={isCreating}
                onClose={() => setIsCreating(false)}
                title={newThemeGroupId ? "Add theme to group" : "Create new theme"}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="filled"
                            size="sm"
                            onClick={handleCreate}
                            disabled={!newThemeName.trim()}
                        >
                            {newThemeGroupId ? "Add to group" : "Create theme"}
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Theme name</label>
                        <input
                            type="text"
                            value={newThemeName}
                            onChange={(e) => setNewThemeName(e.target.value)}
                            placeholder="My Awesome Theme"
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                    </div>

                    {!newThemeGroupId && scannedDomain && (
                        <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded border border-slate-800/50">
                            <div className="mt-0.5">
                                <input
                                    type="checkbox"
                                    id="limitDomain"
                                    checked={limitToDomain}
                                    onChange={(e) => setLimitToDomain(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-offset-slate-900"
                                />
                            </div>
                            <label htmlFor="limitDomain" className="flex flex-col cursor-pointer select-none">
                                <span className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                                    Limit to {scannedDomain}
                                    <Globe size={12} className="text-slate-500" />
                                </span>
                                <span className="text-xs text-slate-500 mt-0.5">
                                    This theme will only activate on this domain. You can change this later.
                                </span>
                            </label>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!themeToDelete}
                onClose={() => setThemeToDelete(null)}
                onConfirm={() => {
                    if (themeToDelete) deleteTheme(themeToDelete);
                }}
                title="Delete theme"
                message={
                    <span>
                        Are you sure you want to delete theme <strong>"{themeToDeleteDetails?.name}"</strong>? This action cannot be undone.
                    </span>
                }
                confirmLabel="Delete"
                isDangerous
            />

            {/* Bulk Delete Confirmation */}
            <ConfirmDialog
                isOpen={confirmBulkDelete}
                onClose={() => setConfirmBulkDelete(false)}
                onConfirm={confirmBulkDeleteAction}
                title="Delete themes"
                message={`Remove ${selectedThemeIds.size} theme${selectedThemeIds.size === 1 ? '' : 's'}? This action cannot be undone.`}
                confirmLabel="Delete"
                isDangerous
            />

            {/* Group Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!groupToDelete}
                onClose={() => setGroupToDelete(null)}
                onConfirm={() => {
                    if (groupToDelete) {
                        const groupThemes = themes.filter(t => t.groupId === groupToDelete);
                        groupThemes.forEach(t => deleteTheme(t.id));
                        showToast('Group deleted');
                        setGroupToDelete(null);
                    }
                }}
                title="Delete group"
                message={(() => {
                    if (!groupToDelete) return '';
                    const groupThemes = themes.filter(t => t.groupId === groupToDelete);
                    return `Delete this domain group and all ${groupThemes.length} theme${groupThemes.length === 1 ? '' : 's'} in it? This action cannot be undone.`;
                })()}
                confirmLabel="Delete"
                isDangerous
            />

            {/* Bulk Export Confirmation */}
            <ConfirmDialog
                isOpen={!!confirmBulkExport}
                onClose={() => setConfirmBulkExport(null)}
                onConfirm={() => {
                    if (confirmBulkExport) {
                        executeBulkExport(confirmBulkExport);
                        setConfirmBulkExport(null);
                    }
                }}
                title="Export themes"
                message={`Export ${selectedThemeIds.size} theme files? This will download multiple files.`}
                confirmLabel="Export"
            />

            {/* Import Mode Selection Dialog */}
            <Modal
                isOpen={isImportDialogOpen}
                onClose={() => {
                    setIsImportDialogOpen(false);
                    setPendingImportData(null);
                }}
                title="Import all data"
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => {
                            setIsImportDialogOpen(false);
                            setPendingImportData(null);
                        }}>
                            Cancel
                        </Button>
                        <Button
                            variant="filled"
                            size="sm"
                            onClick={handleConfirmImport}
                        >
                            Import
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-300">
                        Choose how to import the data:
                    </p>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded border border-slate-700 cursor-pointer hover:border-blue-500/50 transition-colors">
                            <input
                                type="radio"
                                name="importMode"
                                value="merge"
                                checked={importMode === 'merge'}
                                onChange={(e) => setImportMode(e.target.value as 'merge')}
                                className="mt-0.5"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-200">Merge (recommended)</span>
                                <span className="text-xs text-slate-400">Add imported items alongside existing ones</span>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded border border-slate-700 cursor-pointer hover:border-blue-500/50 transition-colors">
                            <input
                                type="radio"
                                name="importMode"
                                value="skip-duplicates"
                                checked={importMode === 'skip-duplicates'}
                                onChange={(e) => setImportMode(e.target.value as 'skip-duplicates')}
                                className="mt-0.5"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-200">Skip duplicates</span>
                                <span className="text-xs text-slate-400">Only import items with unique names</span>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded border border-red-900/50 cursor-pointer hover:border-red-500/50 transition-colors">
                            <input
                                type="radio"
                                name="importMode"
                                value="replace"
                                checked={importMode === 'replace'}
                                onChange={(e) => setImportMode(e.target.value as 'replace')}
                                className="mt-0.5"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-red-400">Replace all</span>
                                <span className="text-xs text-slate-400">⚠️ Delete all existing data and replace with import</span>
                            </div>
                        </label>
                    </div>
                </div>
            </Modal>

            <div className="flex flex-col gap-2">
                {themes.length === 0 && !isCreating && (
                    <div className="text-center p-8 border border-dashed border-slate-800 rounded-lg text-slate-500 flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                            <Plus size={24} className="opacity-50" />
                        </div>
                        <p className="font-medium text-slate-400">No themes yet</p>
                        <p className="text-xs max-w-[200px] mx-auto">Create a theme to start customizing your web experience.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setIsCreating(true)}
                        >
                            Create first theme
                        </Button>
                    </div>
                )}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                >
                    <div className="flex flex-col gap-2">
                        <SortableContext
                            items={displayItems.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {displayItems.map((item) => (
                                item.type === 'group' ? (
                                    <ThemeGroup
                                        key={item.id}
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
                                        onDeleteTheme={(e, id) => { e.stopPropagation(); setThemeToDelete(id); }}
                                        onDomainClick={(e) => {
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
                                    <SortableThemeItemWrapper
                                        key={item.id}
                                        theme={item.data}
                                        isOtherInGroupActive={false}
                                        activeUrl={activeUrl}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedThemeIds.has(item.id)}
                                        globalEnabled={globalEnabled}
                                        onSelect={() => onSelectTheme(item.id)}
                                        onToggleSelection={() => handleToggleSelection(item.id)}
                                        onContextMenu={(e) => handleContextMenu(e, item.id)}
                                        onKebabClick={(e) => handleKebabClick(e, item.id)}
                                        onUpdateTheme={(updates) => updateTheme(item.id, updates)}
                                        onDeleteClick={(e) => {
                                            e.stopPropagation();
                                            setThemeToDelete(item.id);
                                        }}
                                        onDomainClick={(e) => {
                                            e.stopPropagation();
                                            setEditingDomainTheme(item.id);
                                        }}
                                    />
                                )
                            ))}
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
                onCreateGroup={(domainPatterns) => {
                    createEmptyGroup(domainPatterns);
                    setIsCreatingGroup(false);
                    showToast('Domain group created');
                }}
            />
        </div>
    );
};

