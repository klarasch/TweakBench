import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store.ts';

export const useThemeDetailSelection = (themeId: string, activeTab: 'css' | 'html') => {
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
    }, [isSelectionMode, activeTab]);

    const handleToggleSelection = useCallback((id: string) => {
        setSelectedSnippetIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, [activeTab]);

    const handleBulkEnable = useCallback((enable: boolean) => {
        const { updateThemeItem } = useStore.getState();
        selectedSnippetIds.forEach(id => {
            updateThemeItem(themeId, id, { isEnabled: enable });
        });
    }, [themeId, selectedSnippetIds]);

    return {
        isSelectionMode,
        setIsSelectionMode,
        selectedSnippetIds,
        setSelectedSnippetIds,
        handleToggleSelection,
        handleBulkEnable
    };
};
