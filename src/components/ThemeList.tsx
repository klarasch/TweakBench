import React, { useState, useEffect } from 'react';
import { useStore } from '../store.ts';
import { Plus, Trash2, Play, Pause, MoreVertical, Upload, Download, Globe, X } from 'lucide-react';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';
import { exportThemeToJS, exportThemeToCSS, parseThemeFromJS, exportAllData, importAllData } from '../utils/impexp.ts';
import { isDomainMatch, getDomainFromUrl } from '../utils/domains.ts';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/Dialog';
import { useToast } from './ui/Toast';
import type { Theme } from '../types.ts';
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
}

const SortableThemeItem: React.FC<SortableThemeItemProps> = ({
    theme,
    activeUrl,
    isSelectionMode,
    isSelected,
    globalEnabled,
    onSelect,
    onToggleSelection,
    onContextMenu,
    onKebabClick,
    onUpdateTheme,
    onDeleteClick
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: theme.id, disabled: isSelectionMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 'auto',
        position: 'relative' as 'relative',
    };

    const isMatch = activeUrl ? isDomainMatch(theme.domainPatterns, activeUrl) : false;
    const isActiveOnTab = theme.isActive && globalEnabled && isMatch;
    const isSystemDisabled = !globalEnabled;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`p-3 rounded border flex flex-col gap-2 cursor-pointer transition-all active:scale-[0.99]
                ${isSelected
                    ? 'bg-blue-900/20 border-blue-500/50'
                    : isActiveOnTab
                        ? 'bg-slate-800 border-green-500/50 shadow-[0_0_10px_-2px_rgba(34,197,94,0.15)]'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                }
                ${!theme.isActive && !isSelected && 'opacity-75'}
                ${isDragging ? 'shadow-xl ring-2 ring-blue-500/50 z-10' : ''}
            `}
            onClick={() => {
                if (isSelectionMode) {
                    onToggleSelection();
                } else {
                    onSelect();
                }
            }}
            onContextMenu={onContextMenu}
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isSelectionMode && (
                        <div className="flex items-center justify-center pointer-events-none">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-500 bg-transparent'}`}>
                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                        </div>
                    )}
                    <span className={`font-medium truncate ${isActiveOnTab ? 'text-green-400' : 'text-slate-200'} ${isSelected ? 'text-white' : ''}`}>
                        {theme.name}
                    </span>
                </div>
                <div className="flex gap-1 items-center">
                    <div className="flex gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!globalEnabled) return;
                                onUpdateTheme({ isActive: !theme.isActive });
                            }}
                            onPointerDown={e => e.stopPropagation()}
                            disabled={!globalEnabled}
                            className={`p-1 rounded flex items-center gap-1.5 px-2 transition-colors ${isSystemDisabled
                                ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed opacity-50'
                                : theme.isActive
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                                }`}
                            title={isSystemDisabled ? "System disabled" : (theme.isActive ? "Disable theme" : "Enable theme")}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${isSystemDisabled ? 'bg-slate-600' : (theme.isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-500')}`}></div>
                            <span className="text-[10px] font-bold uppercase">{theme.isActive ? 'ON' : 'OFF'}</span>
                        </button>
                        {!isSelectionMode && (
                            <button
                                onClick={onDeleteClick}
                                onPointerDown={e => e.stopPropagation()}
                                className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-colors"
                                title="Delete theme"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                    {!isSelectionMode && (
                        <button
                            onClick={onKebabClick}
                            onPointerDown={e => e.stopPropagation()}
                            className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700"
                        >
                            <MoreVertical size={16} />
                        </button>
                    )}
                </div>
            </div>
            <div className={`flex justify-between items-center text-xs ${isSelectionMode ? 'pl-7' : ''}`}>
                <span className="text-slate-400 truncate max-w-[200px]">
                    {theme.domainPatterns.join(', ')}
                </span>
                {isActiveOnTab && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full text-green-400/90 bg-green-500/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                        Active on this tab
                    </div>
                )}
            </div>
        </div>
    );
};

export const ThemeList: React.FC<ThemeListProps> = ({ onSelectTheme, activeUrl }) => {
    const { themes, snippets, addTheme, deleteTheme, updateTheme, addSnippet, addSnippetToTheme, globalEnabled, importAllData: importData, reorderThemes } = useStore();
    const { showToast } = useToast();

    // Creation Modal State
    const [isCreating, setIsCreating] = useState(false);
    const [newThemeName, setNewThemeName] = useState('');
    const [scannedDomain, setScannedDomain] = useState<string | null>(null);
    const [limitToDomain, setLimitToDomain] = useState(false);

    // Dialog States
    const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [confirmBulkExport, setConfirmBulkExport] = useState<'js' | 'css' | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const allDataFileInputRef = React.useRef<HTMLInputElement>(null);

    // Import All Data State
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importMode, setImportMode] = useState<'merge' | 'replace' | 'skip-duplicates'>('merge');
    const [pendingImportData, setPendingImportData] = useState<{ themes: any[], snippets: any[], globalEnabled: boolean } | null>(null);

    // Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedThemeIds, setSelectedThemeIds] = useState<Set<string>>(new Set());

    // Context Menu State
    const [menuState, setMenuState] = useState<{ x: number; y: number; themeId: string | null }>({ x: 0, y: 0, themeId: null });

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

        const oldIndex = themes.findIndex(t => t.id === active.id);
        const newIndex = themes.findIndex(t => t.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newThemes = arrayMove(themes, oldIndex, newIndex);
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

        const domainPatterns = limitToDomain && scannedDomain
            ? [scannedDomain]
            : ['<all_urls>'];

        const newId = addTheme({
            name: newThemeName.trim(),
            domainPatterns,
            items: [],
            isActive: true,
        });

        setNewThemeName('');
        setIsCreating(false);
        setLimitToDomain(false);

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

    const handleKebabClick = (e: React.MouseEvent, themeId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({ x: rect.left, y: rect.bottom, themeId });
    };

    const getMenuItems = (themeId: string): ContextMenuItem[] => {
        if (themeId === 'BULK_ACTIONS_MENU') {
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

        const theme = themes.find(t => t.id === themeId);
        if (!theme) return [];
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
                onClick: () => handleExport(themeId, 'js')
            },
            {
                label: 'Export to CSS only',
                icon: <Download size={14} />,
                onClick: () => handleExport(themeId, 'css')
            },
            { separator: true },
            {
                label: 'Delete theme',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => setThemeToDelete(themeId)
            }
        ];
    };

    const themeToDeleteDetails = themeToDelete ? themes.find(t => t.id === themeToDelete) : null;

    const getMenuItemsForHeader = (): ContextMenuItem[] => [
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

    return (
        <div className="flex flex-col gap-4 relative pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-200">Themes</h2>
                <div className="flex gap-2">
                    {!isSelectionMode ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSelectionMode(true)}
                                className="text-slate-400 hover:text-white"
                            >
                                Select
                            </Button>
                            <button onClick={handleImportClick} className="p-1 rounded hover:bg-slate-700 text-slate-300" title="Import theme">
                                <Upload size={20} />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".js" />
                            <input type="file" ref={allDataFileInputRef} onChange={handleAllDataFileChange} className="hidden" accept=".json" />
                            <button onClick={() => setIsCreating(true)} className="p-1 rounded hover:bg-slate-700 text-slate-300" title="Create theme">
                                <Plus size={20} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMenuState({ x: rect.left, y: rect.bottom, themeId: 'HEADER_MENU' });
                                }}
                                className="p-1 rounded hover:bg-slate-700 text-slate-300"
                                title="Import/export all data"
                            >
                                <MoreVertical size={20} />
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
                title="Create new theme"
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
                            Create theme
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

                    {scannedDomain && (
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
                    <SortableContext
                        items={themes.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {themes.map(theme => {
                            const isSelected = selectedThemeIds.has(theme.id);

                            return (
                                <SortableThemeItem
                                    key={theme.id}
                                    theme={theme}
                                    activeUrl={activeUrl}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={isSelected}
                                    globalEnabled={globalEnabled}
                                    onSelect={() => onSelectTheme(theme.id)}
                                    onToggleSelection={() => handleToggleSelection(theme.id)}
                                    onContextMenu={(e) => handleContextMenu(e, theme.id)}
                                    onKebabClick={(e) => handleKebabClick(e, theme.id)}
                                    onUpdateTheme={(updates) => updateTheme(theme.id, updates)}
                                    onDeleteClick={(e) => {
                                        e.stopPropagation();
                                        setThemeToDelete(theme.id);
                                    }}
                                />
                            );
                        })}
                    </SortableContext>
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

                        {viewportWidth > 600 ? (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => handleBulkEnable(true)} title="Enable selected">
                                    <Play size={14} className="mr-1.5 text-green-400" /> Enable
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleBulkEnable(false)} title="Disable selected">
                                    <Pause size={14} className="mr-1.5 text-slate-400" /> Disable
                                </Button>
                                <div className="h-6 w-px bg-slate-700 mx-1"></div>
                                <Button variant="ghost" size="sm" onClick={() => handleBulkExport('js')} title="Export selected">
                                    <Download size={14} className="mr-1.5 text-blue-400" /> Export
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
                                    if (menuState.themeId === 'BULK_ACTIONS_MENU') {
                                        setMenuState({ x: 0, y: 0, themeId: null });
                                        return;
                                    }
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMenuState({
                                        x: rect.left,
                                        y: rect.top,
                                        themeId: 'BULK_ACTIONS_MENU'
                                    });
                                }}
                            >
                                <MoreVertical size={16} />
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {menuState.themeId && (
                <ContextMenu
                    x={menuState.x}
                    y={menuState.y}
                    items={menuState.themeId === 'HEADER_MENU' ? getMenuItemsForHeader() : getMenuItems(menuState.themeId)}
                    onClose={() => setMenuState({ ...menuState, themeId: null })}
                />
            )}
        </div>
    );
};

