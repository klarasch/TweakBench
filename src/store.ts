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

    addTheme: (theme: Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateTheme: (id: string, updates: Partial<Theme>) => void;
    deleteTheme: (id: string) => void;

    addSnippetToTheme: (themeId: string, snippetId: string) => void;
    toggleThemeItem: (themeId: string, itemId: string) => void;
    removeSnippetFromTheme: (themeId: string, itemId: string) => void;
    updateThemeItem: (themeId: string, itemId: string, updates: Partial<import('./types.ts').ThemeItem>) => void;
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

        const newTheme: Theme = {
            ...themeData,
            items: [themeItem],
            id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        set((state) => {
            const newState = {
                ...state,
                themes: [...state.themes, newTheme],
                snippets: [...state.snippets, mainSnippet]
            };
            storageService.save(newState);
            return newState;
        });
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
