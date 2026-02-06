import React from 'react';
import { MoreVertical, Globe } from 'lucide-react';
import type { Theme } from '../types';
import { isDomainMatch } from '../utils/domains';
import { Toggle } from './ui/Toggle';

export interface ThemeItemProps {
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
    isOtherInGroupActive?: boolean;
    isNested?: boolean;
    // DnD props passed from parent wrapper
    dragHandleProps?: any;
    isDragging?: boolean;
    setNodeRef?: (node: HTMLElement | null) => void;
    style?: React.CSSProperties;
}

export const ThemeItem: React.FC<ThemeItemProps> = ({
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
    onDomainClick,
    isOtherInGroupActive,
    isNested,
    dragHandleProps,
    isDragging,
    setNodeRef,
    style
}) => {
    const isMatch = activeUrl ? isDomainMatch(theme.domainPatterns, activeUrl) : false;
    const isActiveOnTab = theme.isActive && globalEnabled && isMatch;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...dragHandleProps}
            className={`p-3 rounded-lg border flex flex-col gap-2 cursor-pointer transition-all active:scale-[0.99] group
                ${isSelected
                    ? 'bg-blue-900/20 border-blue-500/50'
                    : isActiveOnTab
                        ? 'bg-slate-800 border-green-500/50 shadow-[0_0_10px_-2px_rgba(34,197,94,0.15)]'
                        : isNested
                            ? 'border-transparent hover:bg-slate-700/30'
                            : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                }
                ${!theme.isActive && !isNested && !isSelected && 'opacity-75'}
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
                    <span className={`text-sm font-medium truncate ${isActiveOnTab ? 'text-green-400' : 'text-slate-200'} ${isSelected ? 'text-white' : ''}`}>
                        {theme.name}
                    </span>
                    {!theme.groupId && onDomainClick && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDomainClick(e);
                            }}
                            onPointerDown={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 min-w-0 hover:bg-slate-700/50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            title="Configure domains"
                        >
                            <Globe size={12} className="text-slate-500 shrink-0" />
                            <span className="text-xs font-semibold text-slate-300 truncate max-w-[150px]">
                                {theme.domainPatterns.join(', ')}
                            </span>
                        </button>
                    )}
                </div>
                <div className="flex gap-1 items-center">
                    {isActiveOnTab ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full text-green-400/90 bg-green-500/10">
                            Active on this tab
                        </div>
                    ) : (isMatch && theme.groupId && !theme.isActive && isOtherInGroupActive) ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full text-amber-500/90 bg-amber-500/5" title="Another theme in this group is active on this tab">
                            <div className="w-1.2 h-1.2 rounded-full bg-amber-500/50"></div>
                            Group active
                        </div>
                    ) : null}
                    <div className="flex gap-1 items-center ml-2">
                        <Toggle
                            checked={theme.isActive}
                            isActive={isActiveOnTab}
                            onChange={(checked) => onUpdateTheme({ isActive: checked })}
                            disabled={!globalEnabled}
                            size="sm"
                        />
                        {!isSelectionMode && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={onKebabClick}
                                    onPointerDown={e => e.stopPropagation()}
                                    className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700"
                                >
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
