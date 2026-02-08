import { useState, useMemo, useCallback, useEffect } from 'react';
import type { ThemeItem, Snippet } from '../types.ts';
import type { VirtuosoHandle } from 'react-virtuoso';

interface SearchMatch {
    itemId: string;
    matches: Array<{ from: number; to: number }>;
}

export const useThemeDetailSearch = (
    filteredItems: ThemeItem[],
    snippets: Snippet[],
    virtuosoRef: React.RefObject<VirtuosoHandle | null>,
    setSelectedItemId: (id: string | null) => void,
    setCollapsedItems: (updater: (prev: Set<string>) => Set<string>) => void
) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

    const searchResults = useMemo<SearchMatch[]>(() => {
        if (!searchQuery || searchQuery.trim() === '') return [];

        const query = searchQuery.toLowerCase();
        const results: SearchMatch[] = [];

        filteredItems.forEach(item => {
            const snippet = snippets.find(s => s.id === item.snippetId);
            if (!snippet) return;

            const matches: Array<{ from: number; to: number }> = [];

            // Search in snippet name
            const nameLower = snippet.name.toLowerCase();
            let namePos = 0;
            while ((namePos = nameLower.indexOf(query, namePos)) !== -1) {
                matches.push({ from: namePos, to: namePos + query.length });
                namePos += query.length;
            }

            // Search in content
            const content = item.overrides?.content ?? snippet.content;
            const contentLower = content.toLowerCase();
            let contentPos = 0;
            while ((contentPos = contentLower.indexOf(query, contentPos)) !== -1) {
                matches.push({ from: contentPos, to: contentPos + query.length });
                contentPos += query.length;
            }

            // Search in HTML selector if applicable
            if (snippet.type === 'html') {
                const selector = item.overrides?.selector ?? snippet.selector ?? '';
                const selectorLower = selector.toLowerCase();
                let selectorPos = 0;
                while ((selectorPos = selectorLower.indexOf(query, selectorPos)) !== -1) {
                    matches.push({ from: selectorPos, to: selectorPos + query.length });
                    selectorPos += query.length;
                }
            }

            if (matches.length > 0) {
                results.push({ itemId: item.id, matches });
            }
        });

        return results;
    }, [searchQuery, filteredItems, snippets]);

    const totalMatches = useMemo(() => {
        return searchResults.reduce((sum, result) => sum + result.matches.length, 0);
    }, [searchResults]);

    const displayedItems = useMemo(() => {
        if (!searchQuery || searchQuery.trim() === '') return filteredItems;
        return filteredItems.filter(item =>
            searchResults.some(result => result.itemId === item.id)
        );
    }, [searchQuery, filteredItems, searchResults]);

    const currentMatch = useMemo(() => {
        if (totalMatches === 0 || currentMatchIndex >= totalMatches) return null;

        let matchCount = 0;
        for (const result of searchResults) {
            if (matchCount + result.matches.length > currentMatchIndex) {
                const localIndex = currentMatchIndex - matchCount;
                return {
                    itemId: result.itemId,
                    match: result.matches[localIndex]
                };
            }
            matchCount += result.matches.length;
        }
        return null;
    }, [searchResults, currentMatchIndex, totalMatches]);

    const handleNextMatch = useCallback(() => {
        if (totalMatches === 0) return;
        setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
    }, [totalMatches]);

    const handlePreviousMatch = useCallback(() => {
        if (totalMatches === 0) return;
        setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
    }, [totalMatches]);

    const handleCloseSearch = useCallback(() => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setCurrentMatchIndex(0);
    }, []);

    // Auto-expand and scroll
    useEffect(() => {
        if (!currentMatch) return;

        setCollapsedItems(prev => {
            if (!prev.has(currentMatch.itemId)) return prev;
            const next = new Set(prev);
            next.delete(currentMatch.itemId);
            return next;
        });

        const index = displayedItems.findIndex(i => i.id === currentMatch.itemId);
        if (index !== -1) {
            setTimeout(() => {
                virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
            }, 100);
        }

        setSelectedItemId(currentMatch.itemId);
    }, [currentMatch, displayedItems, setCollapsedItems, virtuosoRef, setSelectedItemId]);

    // Reset index on query change
    useEffect(() => {
        setCurrentMatchIndex(0);
    }, [searchQuery]);

    // Global Keybinding
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                const target = e.target as HTMLElement;
                if (target.closest('.theme-detail-container')) {
                    e.preventDefault();
                    setIsSearchOpen(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        isSearchOpen,
        setIsSearchOpen,
        searchQuery,
        setSearchQuery,
        currentMatchIndex,
        totalMatches,
        searchResults,
        displayedItems,
        currentMatch,
        handleNextMatch,
        handlePreviousMatch,
        handleCloseSearch
    };
};
