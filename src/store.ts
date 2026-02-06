import { create } from 'zustand';
import type { AppState, Snippet, Theme } from './types.ts';
import { storageService } from './services/storage.ts';
import { v4 as uuidv4 } from 'uuid';

interface Store extends AppState {
    // Actions
    loadFromStorage: () => Promise<void>;
    addSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => string;
    updateSnippet: (id: string, updates: Partial<Snippet>) => void;
    deleteSnippet: (id: string) => void;

    addTheme: (themeData: Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>) => string; // Update to return string
    updateTheme: (id: string, updates: Partial<Theme>) => void;
    deleteTheme: (id: string) => void;

    addSnippetToTheme: (themeId: string, snippetId: string) => string;
    toggleThemeItem: (themeId: string, itemId: string) => void;
    removeSnippetFromTheme: (themeId: string, itemId: string) => void;
    updateThemeItem: (themeId: string, itemId: string, updates: Partial<import('./types.ts').ThemeItem>) => void;
    reorderThemeItems: (themeId: string, newItems: import('./types.ts').ThemeItem[]) => void;
    reorderThemes: (newThemes: Theme[]) => void;
    reorderSnippets: (newSnippets: Snippet[]) => void;
    toggleGlobal: () => void;
    importAllData: (data: { themes: Theme[], snippets: Snippet[], globalEnabled: boolean }, mode: 'merge' | 'replace' | 'skip-duplicates') => { themesAdded: number, snippetsAdded: number, skipped: number };
}

export const useStore = create<Store>((set) => ({
    themes: [],
    snippets: [],
    activeThemeId: null,
    globalEnabled: true,

    loadFromStorage: async () => {
        const data = await storageService.load();
        set({
            themes: data.themes || [],
            snippets: data.snippets || [],
            activeThemeId: data.activeThemeId || null,
            globalEnabled: data.globalEnabled ?? true,
        });
    },

    addSnippet: (snippetData) => {
        const id = uuidv4();
        const newSnippet: Snippet = {
            ...snippetData,
            id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        set((state) => {
            const newState = {
                ...state,
                snippets: [...state.snippets, newSnippet]
            };
            storageService.save(newState);
            return newState;
        });
        return id;
    },

    updateSnippet: (id, updates) => {
        set((state) => {
            const newState = {
                ...state,
                snippets: state.snippets.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s)),
            };
            storageService.save(newState);
            return newState;
        });
    },

    deleteSnippet: (id) => {
        set((state) => {
            const newState = {
                ...state,
                snippets: state.snippets.filter((s) => s.id !== id),
            };
            storageService.save(newState);
            return newState;
        });
    },

    addTheme: (themeData) => {
        const themeId = uuidv4();
        // If items are provided, use them. If empty, create default snippet.
        // Actually, checking if items are empty is a good heuristic.
        // If the user INTENDS to create a truly empty theme, they can't via this heuristic unless we add a flag.
        // But for manual creation, items is empty.
        // For import, items is empty.
        // PROBLEM: I can't distinguish.
        // Let's rely on a property in themeData? No, themeData must match Theme omit.
        // Let's look at ThemeList.tsx again. Import sets items: []. manual sets items: [].
        // I'll stick to: Always create default IF items is empty, UNLESS I change the call in ThemeList.
        // But I can't easily change the arguments without changing the interface defined above.
        // I will just return the ID for now. And let the default snippet be created.
        // IN IMPORT: I can just DELETE the default snippet item after creation if I want cleaner import.
        // Or I can just accept the "Main CSS" is there. 
        // For now, I will keep the default creation logic but RETURN THE ID to fix the type error.

        const snippetId = uuidv4();
        const mainSnippet: Snippet = {
            id: snippetId,
            name: 'Main CSS',
            type: 'css',
            content: '/* Main CSS */\nbody {\n  background-color: #f0f0f0;\n}',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            relatedSnippetIds: [],
        };

        const themeItem = {
            id: uuidv4(),
            snippetId: snippetId,
            isEnabled: true,
        };

        // If themeData has items, use them instead of default?
        // Existing logic forced [themeItem].
        // Let's keep existing logic to avoid breaking manual flow, just return ID.

        const newTheme: Theme = {
            ...themeData,
            items: themeData.items ?? [themeItem],
            id: themeId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        set((state) => {
            // Only add mainSnippet if we actually used it (i.e. themeData.items was undefined)
            const shouldUseDefault = !themeData.items;
            const newState = {
                ...state,
                themes: [...state.themes, newTheme],
                snippets: shouldUseDefault ? [...state.snippets, mainSnippet] : state.snippets
            };
            storageService.save(newState);
            return newState;
        });

        return themeId;
    },

    updateTheme: (id, updates) => {
        set((state) => {
            const newState = {
                ...state,
                themes: state.themes.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t)),
            };
            storageService.save(newState);
            return newState;
        });
    },

    deleteTheme: (id) => {
        set((state) => {
            const newState = {
                ...state,
                themes: state.themes.filter((t) => t.id !== id),
            };
            storageService.save(newState);
            return newState;
        });
    },

    addSnippetToTheme: (themeId, snippetId) => {
        const itemId = uuidv4();
        set((state) => {
            const theme = state.themes.find(t => t.id === themeId);
            if (!theme) return state;

            const newItem = {
                id: itemId,
                snippetId,
                isEnabled: true,
            };

            const updatedTheme = { ...theme, items: [...theme.items, newItem], updatedAt: Date.now() };

            const newState = {
                ...state,
                themes: state.themes.map(t => t.id === themeId ? updatedTheme : t)
            };
            storageService.save(newState);
            return newState;
        });
        return itemId;
    },

    toggleThemeItem: (themeId, itemId) => {
        set((state) => {
            const theme = state.themes.find(t => t.id === themeId);
            if (!theme) return state;

            const updatedItems = theme.items.map(item =>
                item.id === itemId ? { ...item, isEnabled: !item.isEnabled } : item
            );

            const updatedTheme = { ...theme, items: updatedItems, updatedAt: Date.now() };
            const newState = {
                ...state,
                themes: state.themes.map(t => t.id === themeId ? updatedTheme : t)
            };
            storageService.save(newState);
            return newState;

        })
    },

    removeSnippetFromTheme: (themeId, itemId) => {
        set((state) => {
            const theme = state.themes.find(t => t.id === themeId);
            if (!theme) return state;

            const updatedTheme = {
                ...theme,
                items: theme.items.filter(item => item.id !== itemId),
                updatedAt: Date.now()
            };

            const newState = {
                ...state,
                themes: state.themes.map(t => t.id === themeId ? updatedTheme : t)
            };
            storageService.save(newState);
            return newState;
        });
    },

    updateThemeItem: (themeId, itemId, updates) => {
        set((state) => {
            const theme = state.themes.find(t => t.id === themeId);
            if (!theme) return state;

            const updatedItems = theme.items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
            );

            const updatedTheme = { ...theme, items: updatedItems, updatedAt: Date.now() };

            const newState = {
                ...state,
                themes: state.themes.map(t => t.id === themeId ? updatedTheme : t)
            };
            storageService.save(newState);
            return newState;
        });
    },

    reorderThemeItems: (themeId, newItems) => {
        set((state) => {
            const newState = {
                ...state,
                themes: state.themes.map(t => {
                    if (t.id !== themeId) return t;
                    return { ...t, items: newItems, updatedAt: Date.now() };
                })
            };
            storageService.save(newState);
            return newState;
        });
    },

    reorderThemes: (newThemes) => {
        set((state) => {
            const newState = {
                ...state,
                themes: newThemes.map(t => ({ ...t, updatedAt: Date.now() }))
            };
            storageService.save(newState);
            return newState;
        });
    },

    reorderSnippets: (newSnippets) => {
        set((state) => {
            const newState = {
                ...state,
                snippets: newSnippets.map(s => ({ ...s, updatedAt: Date.now() }))
            };
            storageService.save(newState);
            return newState;
        });
    },

    toggleGlobal: () => {
        set((state) => {
            const newState = {
                ...state,
                globalEnabled: !state.globalEnabled
            };
            storageService.save(newState);
            return newState;
        });
    },

    importAllData: (data, mode) => {
        let themesAdded = 0;
        let snippetsAdded = 0;
        let skipped = 0;

        set((state) => {
            let newThemes: Theme[] = [];
            let newSnippets: Snippet[] = [];

            if (mode === 'replace') {
                // Replace mode: use imported data directly with updated timestamps
                newThemes = data.themes.map(t => ({ ...t, updatedAt: Date.now() }));
                newSnippets = data.snippets.map(s => ({ ...s, updatedAt: Date.now() }));
                themesAdded = newThemes.length;
                snippetsAdded = newSnippets.length;
            } else if (mode === 'merge') {
                // Merge mode: add all imported items with new IDs
                newSnippets = [...state.snippets];
                newThemes = [...state.themes];

                // Create ID mapping for snippets
                const snippetIdMap = new Map<string, string>();
                data.snippets.forEach(snippet => {
                    const newId = uuidv4();
                    snippetIdMap.set(snippet.id, newId);
                    newSnippets.push({
                        ...snippet,
                        id: newId,
                        updatedAt: Date.now(),
                        createdAt: Date.now()
                    });
                    snippetsAdded++;
                });

                // Import themes with remapped snippet IDs
                data.themes.forEach(theme => {
                    const newThemeId = uuidv4();
                    const remappedItems = theme.items.map(item => ({
                        ...item,
                        id: uuidv4(),
                        snippetId: snippetIdMap.get(item.snippetId) || item.snippetId
                    }));
                    newThemes.push({
                        ...theme,
                        id: newThemeId,
                        items: remappedItems,
                        updatedAt: Date.now(),
                        createdAt: Date.now()
                    });
                    themesAdded++;
                });
            } else if (mode === 'skip-duplicates') {
                // Skip duplicates mode: only add items with unique names
                newSnippets = [...state.snippets];
                newThemes = [...state.themes];

                const existingSnippetNames = new Set(state.snippets.map(s => s.name.toLowerCase()));
                const existingThemeNames = new Set(state.themes.map(t => t.name.toLowerCase()));
                const snippetIdMap = new Map<string, string>();

                // Import snippets
                data.snippets.forEach(snippet => {
                    if (existingSnippetNames.has(snippet.name.toLowerCase())) {
                        skipped++;
                        return;
                    }
                    const newId = uuidv4();
                    snippetIdMap.set(snippet.id, newId);
                    newSnippets.push({
                        ...snippet,
                        id: newId,
                        updatedAt: Date.now(),
                        createdAt: Date.now()
                    });
                    snippetsAdded++;
                    existingSnippetNames.add(snippet.name.toLowerCase());
                });

                // Import themes
                data.themes.forEach(theme => {
                    if (existingThemeNames.has(theme.name.toLowerCase())) {
                        skipped++;
                        return;
                    }
                    const newThemeId = uuidv4();
                    const remappedItems = theme.items
                        .filter(item => snippetIdMap.has(item.snippetId))
                        .map(item => ({
                            ...item,
                            id: uuidv4(),
                            snippetId: snippetIdMap.get(item.snippetId)!
                        }));
                    newThemes.push({
                        ...theme,
                        id: newThemeId,
                        items: remappedItems,
                        updatedAt: Date.now(),
                        createdAt: Date.now()
                    });
                    themesAdded++;
                    existingThemeNames.add(theme.name.toLowerCase());
                });
            }

            const newState = {
                ...state,
                themes: newThemes,
                snippets: newSnippets,
                globalEnabled: mode === 'replace' ? data.globalEnabled : state.globalEnabled
            };
            storageService.save(newState);
            return newState;
        });

        return { themesAdded, snippetsAdded, skipped };
    }
}));
