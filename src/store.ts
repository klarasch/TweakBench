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

    updateSnippetAndPropagate: (id: string, newContent: string, options: { mode: 'soft' | 'force', originItemId?: string }) => void;

    duplicateTheme: (themeId: string) => string;
    duplicateThemeItem: (themeId: string, itemId: string) => void;

    createThemeGroup: (themeIds: string[]) => void;
    ungroupThemes: (themeIds: string[]) => void;
    createEmptyGroup: (domainPatterns: string[]) => string;
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
            const theme = state.themes.find(t => t.id === id);
            if (!theme) return state;

            let finalThemes = state.themes;
            // Handle Switch Group Logic
            if (theme.groupId) {
                // 1. Mutual Exclusivity: If turning ON, turn others OFF
                if (updates.isActive === true) {
                    finalThemes = finalThemes.map(t =>
                        (t.groupId === theme.groupId && t.id !== id)
                            ? { ...t, isActive: false, updatedAt: Date.now() }
                            : t
                    );
                }

                // 2. Domain Sync: If domains changed, sync to group
                if (updates.domainPatterns) {
                    finalThemes = finalThemes.map(t =>
                        (t.groupId === theme.groupId && t.id !== id)
                            ? { ...t, domainPatterns: updates.domainPatterns!, updatedAt: Date.now() }
                            : t
                    );
                }
            }

            const newState = {
                ...state,
                themes: finalThemes.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t)),
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
    },

    updateSnippetAndPropagate: (id, newContent, options) => {
        set((state) => {
            // 1. Update the master snippet
            const updatedSnippets = state.snippets.map(s =>
                s.id === id ? { ...s, content: newContent, updatedAt: Date.now() } : s
            );

            // 2. Propagate based on mode
            const updatedThemes = state.themes.map(theme => {
                const hasUsage = theme.items.some(i => i.snippetId === id);
                if (!hasUsage) return theme;

                const updatedItems = theme.items.map(item => {
                    if (item.snippetId !== id) return item;

                    // If this is the origin item (the one initiating the push), ALWAYS clear override
                    if (options.originItemId && item.id === options.originItemId) {
                        return { ...item, overrides: { ...item.overrides, content: undefined } };
                    }

                    // If mode is FORCE, clear overrides for ALL usages
                    if (options.mode === 'force') {
                        return { ...item, overrides: { ...item.overrides, content: undefined } };
                    }

                    // If mode is SOFT, leave other overrides alone
                    return item;
                });

                return { ...theme, items: updatedItems, updatedAt: Date.now() };
            });

            const newState = {
                ...state,
                snippets: updatedSnippets,
                themes: updatedThemes
            };
            storageService.save(newState);
            return newState;
        });
    },

    duplicateTheme: (themeId) => {
        let newThemeId = '';
        set((state) => {
            const theme = state.themes.find(t => t.id === themeId);
            if (!theme) return state;

            newThemeId = uuidv4();
            const newSnippets = [...state.snippets];

            const newItems = theme.items.map(item => {
                const snippet = state.snippets.find(s => s.id === item.snippetId);
                let newItemSnippetId = item.snippetId;

                // If local snippet, duplicate it
                if (snippet && snippet.isLibraryItem === false) {
                    const newSnippetId = uuidv4();
                    newItemSnippetId = newSnippetId;
                    newSnippets.push({
                        ...snippet,
                        id: newSnippetId,
                        name: `${snippet.name}`, // Should we toggle name? Usually local snippets just valid as is.
                        // Or maybe we should append Copy? For local snippets inside a theme, maybe not needed if theme is copy.
                        // But let's keep name same for now.
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    });
                }

                return {
                    ...item,
                    id: uuidv4(),
                    snippetId: newItemSnippetId,
                    // overrides are copied as part of ...item
                };
            });

            const newTheme = {
                ...theme,
                id: newThemeId,
                name: `${theme.name} (Copy)`,
                items: newItems,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const newState = {
                ...state,
                themes: [...state.themes, newTheme],
                snippets: newSnippets
            };
            storageService.save(newState);
            return newState;
        });
        return newThemeId;
    },

    duplicateThemeItem: (themeId, itemId) => {
        set((state) => {
            const theme = state.themes.find(t => t.id === themeId);
            if (!theme) return state;

            const item = theme.items.find(i => i.id === itemId);
            if (!item) return state;

            const snippet = state.snippets.find(s => s.id === item.snippetId);
            if (!snippet) return state;

            let newSnippetId = item.snippetId;
            const newSnippets = [...state.snippets];

            // If local snippet, duplicate the snippet itself
            if (snippet.isLibraryItem === false) {
                newSnippetId = uuidv4();
                newSnippets.push({
                    ...snippet,
                    id: newSnippetId,
                    name: `${snippet.name} (Copy)`,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }

            const newItem = {
                ...item,
                id: uuidv4(),
                snippetId: newSnippetId,
                // overrides copied automatically
            };

            // Insert after original item
            const originalIndex = theme.items.findIndex(i => i.id === itemId);
            const newItems = [...theme.items];
            newItems.splice(originalIndex + 1, 0, newItem);

            const updatedTheme = {
                ...theme,
                items: newItems,
                updatedAt: Date.now()
            };

            const newState = {
                ...state,
                themes: state.themes.map(t => t.id === themeId ? updatedTheme : t),
                snippets: newSnippets
            };
            storageService.save(newState);
            return newState;
        });
    },

    createThemeGroup: (themeIds) => {
        set((state) => {
            if (themeIds.length < 2) return state;
            const groupId = uuidv4();

            // Gather all unique domain patterns from all selected themes (Union)
            const allDomains = new Set<string>();
            themeIds.forEach(id => {
                const t = state.themes.find(theme => theme.id === id);
                if (t && t.domainPatterns) {
                    t.domainPatterns.forEach(d => allDomains.add(d));
                }
            });
            const unifiedDomains = Array.from(allDomains);

            // Turn off all themes initially to avoid conflicts? 
            // Or allow one to remain active?
            // Safer to allow the *last* active one to stay, or just let the user toggle.
            // But if multiple are active, we MUST turn off all but one.
            // Let's keep the one that appears latest in the list active, or just disable all except the first active one found.

            // We'll traverse the current themes array to respect order, or just iterate `themeIds`?
            // Iterating `themeIds` is safer if the user intention matters.
            // Actually, we can just enforce the rule: Only ONE can be active.
            // Let's pick the first active one in `themeIds` as the winner, others get disabled.

            const themesToGroup = state.themes.filter(t => themeIds.includes(t.id));
            const activeTheme = themesToGroup.find(t => t.isActive);
            // If none active, fine. If multiple, `activeTheme` is the first one found.

            const updatedThemes = state.themes.map(t => {
                if (!themeIds.includes(t.id)) return t;

                const shouldBeActive = t.isActive && t.id === activeTheme?.id;

                return {
                    ...t,
                    groupId,
                    domainPatterns: unifiedDomains, // Apply union of domains
                    isActive: shouldBeActive,
                    updatedAt: Date.now()
                };
            });

            const newState = { ...state, themes: updatedThemes };
            storageService.save(newState);
            return newState;
        });
    },

    ungroupThemes: (themeIds) => {
        set((state) => {
            const updatedThemes = state.themes.map(t => {
                if (!themeIds.includes(t.id)) return t;
                // Remove groupId. Keep domains and active state as is.
                const { groupId, ...rest } = t;
                return { ...rest, updatedAt: Date.now() };
            });


            const newState = { ...state, themes: updatedThemes };
            storageService.save(newState);
            return newState;
        });
    },

    createEmptyGroup: (domainPatterns) => {
        const groupId = uuidv4();
        const themeId = uuidv4();

        const newTheme: Theme = {
            id: themeId,
            name: 'New theme',
            domainPatterns,
            items: [],
            isActive: false,
            groupId,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        set((state) => {
            const newState = {
                ...state,
                themes: [...state.themes, newTheme]
            };
            storageService.save(newState);
            return newState;
        });

        return groupId;
    }
}));
