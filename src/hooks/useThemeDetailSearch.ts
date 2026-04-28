import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
    editorRefs: React.MutableRefObject<Record<string, any>>,
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

    const displayedItems = filteredItems;

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
    // Use a ref to track which (query, index) we last scrolled for, so we don't steal focus/scroll on content edits
    const lastScrolledRef = useRef({ query: '', index: -1 });

    useEffect(() => {
        if (!currentMatch) return;

        // If the query and index haven't changed, this re-render was likely caused by content editing.
        // In that case, do NOT scroll again, to avoid jumping.
        if (
            lastScrolledRef.current.query === searchQuery &&
            lastScrolledRef.current.index === currentMatchIndex
        ) {
            return;
        }

        lastScrolledRef.current = { query: searchQuery, index: currentMatchIndex };

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
                // Scroll CodeMirror inside the item
                if (editorRefs.current[currentMatch.itemId]) {
                    editorRefs.current[currentMatch.itemId]?.scrollToMatch?.(currentMatch.match.from, currentMatch.match.to);
                }
            }, 100);
        }

        setSelectedItemId(currentMatch.itemId);
    }, [currentMatch, displayedItems, setCollapsedItems, virtuosoRef, editorRefs, setSelectedItemId, searchQuery, currentMatchIndex]);

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
