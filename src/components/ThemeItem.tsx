import React from 'react';
import { Trash2, MoreVertical } from 'lucide-react';
import type { Theme } from '../types';
import { isDomainMatch } from '../utils/domains';

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
    onDeleteClick,
    dragHandleProps,
    isDragging,
    setNodeRef,
    style
}) => {
    const isMatch = activeUrl ? isDomainMatch(theme.domainPatterns, activeUrl) : false;
    const isActiveOnTab = theme.isActive && globalEnabled && isMatch;
    const isSystemDisabled = !globalEnabled;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...dragHandleProps}
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
            {!theme.groupId && (
                <div className={`flex justify-between items-center text-xs ${isSelectionMode ? 'pl-7' : ''}`}>
                    <div className="flex items-center gap-2 max-w-[200px]">
                        <span className="text-slate-400 truncate">
                            {theme.domainPatterns.join(', ')}
                        </span>
                    </div>
                    {isActiveOnTab && (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full text-green-400/90 bg-green-500/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                            Active on this tab
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
