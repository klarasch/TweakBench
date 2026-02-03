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

    addSnippetToTheme: (themeId: string, snippetId: string) => void;
    toggleThemeItem: (themeId: string, itemId: string) => void;
    removeSnippetFromTheme: (themeId: string, itemId: string) => void;
    updateThemeItem: (themeId: string, itemId: string, updates: Partial<import('./types.ts').ThemeItem>) => void;
    reorderThemeItems: (themeId: string, newItems: import('./types.ts').ThemeItem[]) => void;
    toggleGlobal: () => void;
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
            items: (themeData.items && themeData.items.length > 0) ? themeData.items : [themeItem],
            id: themeId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        set((state) => {
            const newState = {
                ...state,
                themes: [...state.themes, newTheme],
                snippets: (themeData.items && themeData.items.length > 0) ? state.snippets : [...state.snippets, mainSnippet]
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
        set((state) => {
            const theme = state.themes.find(t => t.id === themeId);
            if (!theme) return state;

            const newItem = {
                id: uuidv4(),
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

    toggleGlobal: () => {
        set((state) => {
            const newState = {
                ...state,
                globalEnabled: !state.globalEnabled
            };
            storageService.save(newState);
            return newState;
        });
    }
}));
