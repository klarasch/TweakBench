import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Globe, MoreVertical, Link as LinkIcon, CheckSquare, ChevronDown } from 'lucide-react';
import { ThemeItem } from './ThemeItem';
import type { Theme } from '../types';

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

    // Calculate selection state for group
    const isAllSelected = themes.every(t => selectedThemeIds.has(t.id));
    const isSomeSelected = themes.some(t => selectedThemeIds.has(t.id));

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

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners} // Drag handle is entire group for now, or maybe just header?
            // Let's make entire group draggable for ease, unless interacting with internal items
            className={`
                rounded-lg border border-blue-900/30 bg-slate-900/50 overflow-hidden mb-2
                ${isDragging ? 'shadow-xl ring-2 ring-blue-500/50 z-10' : ''}
            `}
        >
            {/* Group Header */}
            <div className="flex items-center justify-between p-2 bg-slate-800/80 border-b border-blue-900/30">
                <div className="flex items-center gap-2 min-w-0">
                    <div
                        className="p-1 rounded bg-blue-500/10 text-blue-400"
                        title="Switch Group: Only one theme active at a time"
                    >
                        <LinkIcon size={12} />
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse();
                        }}
                        className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors shrink-0"
                        onPointerDown={e => e.stopPropagation()}
                        title={isCollapsed ? 'Expand group' : 'Collapse group'}
                    >
                        <ChevronDown size={14} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>

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
                    )}
                </div>
            </div>

            {/* Themes List */}
            {!isCollapsed && (
                <div className="p-1 flex flex-col gap-1">
                    {themes.map(theme => (
                        <ThemeItem
                            key={theme.id}
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
                                const rect = e.currentTarget.getBoundingClientRect();
                                // We need to pass this up, but the prop signature on ThemeItem expects void or simple event
                                // ThemeItem calls: onKebabClick(e)
                                // We need to trigger the parent's context menu handler logic.
                                // The parent `ThemeList` passed `handleContextMenu` to `onContextMenu`.
                                // It passed `handleKebabClick` (which calculates rect) to `onKebabClick` for single items.
                                // But here we need to invoke `onContextMenu` with the right ID, 
                                // OR we need to accept a separate onKebabClick prop in ThemeGroup.
                                // IMPORTANT: ThemeList passes `onContextMenu` which expects (e, id).
                                // Let's reuse onContextMenu for the kebab click since it opens the same menu.
                                onContextMenu(e, theme.id);
                            }}
                            onUpdateTheme={(updates) => onUpdateTheme(theme.id, updates)}
                            onDeleteClick={(e) => onDeleteTheme(e, theme.id)}
                            // NOT passing dragHandleProps, so items aren't draggable individually (for now)
                            style={{}} // Static position relative to group
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


