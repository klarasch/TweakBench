import React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Globe, MoreVertical, Link as LinkIcon, CheckSquare, ChevronDown, Plus } from 'lucide-react';
import { SortableThemeItem } from './SortableThemeItem';
import type { Theme } from '../types';
import { isDomainMatch } from '../utils/domains';

interface ThemeGroupProps {
    id: string; // Group ID (or pseudo ID for dnd)
    themes: Theme[];
    domainPatterns: string[];
    activeUrl: string | null;
    isSelectionMode: boolean;
    selectedThemeIds: Set<string>;
    globalEnabled: boolean;
    onSelectTheme: (id: string) => void;
    onToggleSelection: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
    onGroupContextMenu: (e: React.MouseEvent, groupId: string, triggers: any) => void;
    onUpdateTheme: (id: string, updates: Partial<Theme>) => void;
    onDeleteTheme: (e: React.MouseEvent, id: string) => void;
    onDomainClick: (e: React.MouseEvent) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export const ThemeGroup: React.FC<ThemeGroupProps> = ({
    id,
    themes,
    domainPatterns,
    activeUrl,
    isSelectionMode,
    selectedThemeIds,
    globalEnabled,
    onSelectTheme,
    onToggleSelection,
    onContextMenu,
    onGroupContextMenu,
    onUpdateTheme,
    onDeleteTheme,
    onDomainClick,
    isCollapsed,
    onToggleCollapse
}) => {
    // Sortable logic for the GROUP container
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: id, disabled: isSelectionMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 'auto',
        position: 'relative' as 'relative',
    };

    // Forces collapsed state during dragging if the group is being dragged
    const effectivelyCollapsed = isCollapsed || isDragging;

    // Calculate selection state for group
    const isAllSelected = themes.every(t => selectedThemeIds.has(t.id));
    const isSomeSelected = themes.some(t => selectedThemeIds.has(t.id));

    // Find active theme in group
    const activeTheme = themes.find(t => t.isActive);

    // Check if active theme matches current URL
    const isMatch = activeUrl && activeTheme ? isDomainMatch(activeTheme.domainPatterns, activeUrl) : false;
    const isActiveOnTab = activeTheme?.isActive && globalEnabled && isMatch;

    const handleGroupSelect = () => {
        if (isSomeSelected && !isAllSelected) {
            // If partially selected, deselect all
            themes.forEach(t => {
                if (selectedThemeIds.has(t.id)) {
                    onToggleSelection(t.id);
                }
            });
        } else {
            // Otherwise toggle all
            themes.forEach(t => onToggleSelection(t.id));
        }
    };

    const handleHeaderClick = (e: React.MouseEvent) => {
        // Only toggle if clicking on the header itself, not interactive elements
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        onToggleCollapse();
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                rounded-lg border overflow-hidden transition-all
                ${isActiveOnTab
                    ? effectivelyCollapsed
                        ? 'border-green-500/50 bg-slate-800 shadow-[0_0_10px_-2px_rgba(34,197,94,0.15)]'
                        : 'border-green-500/25 bg-slate-900/50'
                    : 'border-slate-800 bg-slate-900/50'
                }
                ${effectivelyCollapsed ? 'bg-slate-800/50' : ''}
                ${isDragging ? 'shadow-xl ring-2 ring-blue-500/50 z-10 border-blue-500/50' : ''}
            `}
        >
            {/* Group Header - Drag handle is now here only */}
            <div
                className={`flex items-center justify-between p-2 bg-slate-800/80 cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-colors ${!effectivelyCollapsed ? 'border-b border-slate-700/50' : ''}`}
                onClick={handleHeaderClick}
                {...attributes}
                {...listeners}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse();
                        }}
                        className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors shrink-0"
                        onPointerDown={e => e.stopPropagation()}
                        title={isCollapsed ? 'Expand group' : 'Collapse group'}
                    >
                        <ChevronDown size={14} className={`transition-transform ${effectivelyCollapsed ? '-rotate-90' : ''}`} />
                    </button>

                    <div
                        className="p-1 rounded bg-blue-500/10 text-blue-400"
                        title="Switch Group: Only one theme active at a time"
                    >
                        <LinkIcon size={12} />
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDomainClick(e);
                        }}
                        className="flex items-center gap-1.5 min-w-0 hover:bg-slate-700/50 px-1.5 py-1 rounded transition-colors cursor-pointer"
                        onPointerDown={e => e.stopPropagation()}
                        title="Configure domains"
                    >
                        <Globe size={12} className="text-slate-500 shrink-0" />
                        <span className="text-xs font-semibold text-slate-300 truncate">
                            {domainPatterns.join(', ')}
                        </span>
                    </button>

                    {effectivelyCollapsed && activeTheme && (
                        <div className="flex items-center gap-2 ml-2 min-w-0">
                            <span className="text-xs text-slate-500">•</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectTheme(activeTheme.id);
                                }}
                                className="text-xs text-slate-300 hover:text-white truncate"
                                title={`Active: ${activeTheme.name}`}
                            >
                                {activeTheme.name}
                            </button>
                        </div>
                    )}
                    {effectivelyCollapsed && !activeTheme && (
                        <div className="flex items-center gap-2 ml-2 min-w-0">
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-500 italic">
                                No theme enabled
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {isSelectionMode ? (
                        <div
                            onClick={(e) => { e.stopPropagation(); handleGroupSelect(); }}
                            className={`w-5 h-5 flex items-center justify-center rounded border cursor-pointer transition-colors ${isAllSelected
                                ? 'bg-blue-500 border-blue-500'
                                : isSomeSelected
                                    ? 'bg-blue-900/50 border-blue-400'
                                    : 'bg-transparent border-slate-600 hover:border-slate-500'
                                }`}
                            onPointerDown={e => e.stopPropagation()} // Prevent drag start
                        >
                            {isAllSelected && <CheckSquare size={12} className="text-white fill-current" />}
                            {isSomeSelected && !isAllSelected && <div className="w-2 h-0.5 bg-blue-400 rounded-full" />}
                        </div>
                    ) : (
                        <>
                            {effectivelyCollapsed && activeTheme && (
                                <>
                                    {isActiveOnTab && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full text-green-400/90 bg-green-500/5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                                            Active on this tab
                                        </div>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!globalEnabled) return;
                                            onUpdateTheme(activeTheme.id, { isActive: !activeTheme.isActive });
                                        }}
                                        onPointerDown={e => e.stopPropagation()}
                                        disabled={!globalEnabled}
                                        className={`p-1 rounded flex items-center gap-1.5 px-2 transition-colors ${!globalEnabled
                                            ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed opacity-50'
                                            : activeTheme.isActive
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                                            }`}
                                        title={!globalEnabled ? "System disabled" : (activeTheme.isActive ? "Disable theme" : "Enable theme")}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${!globalEnabled ? 'bg-slate-600' : (activeTheme.isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-500')}`}></div>
                                        <span className="text-[10px] font-bold uppercase">{activeTheme.isActive ? 'ON' : 'OFF'}</span>
                                    </button>
                                </>
                            )}
                            {!effectivelyCollapsed && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGroupContextMenu(e, themes[0].groupId!, { x: e.pageX, y: e.pageY, action: 'add-theme' });
                                    }}
                                    className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 pointer-events-auto"
                                    onPointerDown={e => e.stopPropagation()} // Prevent drag
                                    title="Add theme to group"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onGroupContextMenu(e, themes[0].groupId!, { x: e.pageX, y: e.pageY });
                                }}
                                className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 pointer-events-auto"
                                onPointerDown={e => e.stopPropagation()} // Prevent drag
                            >
                                <MoreVertical size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Themes List - Wrapped in SortableContext */}
            {!effectivelyCollapsed && (
                <div className="flex flex-col">
                    <SortableContext
                        items={themes.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {themes.map((theme, index) => (
                            <div key={theme.id}>
                                {index > 0 && <div className="mx-4 h-px bg-slate-800/50" />}
                                <SortableThemeItem
                                    theme={theme}
                                    activeUrl={activeUrl}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedThemeIds.has(theme.id)}
                                    globalEnabled={globalEnabled}
                                    onSelect={() => onSelectTheme(theme.id)}
                                    onToggleSelection={() => onToggleSelection(theme.id)}
                                    onContextMenu={(e) => onContextMenu(e, theme.id)}
                                    onKebabClick={(e) => {
                                        e.stopPropagation();
                                        onContextMenu(e, theme.id);
                                    }}
                                    onUpdateTheme={(updates) => onUpdateTheme(theme.id, updates)}
                                    onDeleteClick={(e) => onDeleteTheme(e, theme.id)}
                                    isOtherInGroupActive={themes.some(t => t.isActive && t.id !== theme.id)}
                                    isNested={true}
                                />
                            </div>
                        ))}
                    </SortableContext>
                </div>
            )}
        </div>
    );
};


