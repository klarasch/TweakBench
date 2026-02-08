import { create } from 'zustand';
import type { AppState, Snippet, Theme } from './types.ts';
import { storageService } from './services/storage.ts';
import { v4 as uuidv4 } from 'uuid';
import { broadcastStateUpdate } from './utils/messaging.ts';

interface Store extends AppState {
    // Actions
    loadFromStorage: () => Promise<void>;
    addSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => string;
    updateSnippet: (id: string, updates: Partial<Snippet>) => void;
    deleteSnippet: (id: string) => void;
    deleteSnippets: (ids: string[]) => void;

    addTheme: (themeData: Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>) => string;
    updateTheme: (id: string, updates: Partial<Theme>) => void;
    deleteTheme: (id: string) => void;

    addSnippetToTheme: (themeId: string, snippetId: string, afterItemId?: string) => string;
    toggleThemeItem: (themeId: string, itemId: string) => void;
    removeSnippetFromTheme: (themeId: string, itemId: string) => void;
    updateThemeItem: (themeId: string, itemId: string, updates: Partial<import('./types.ts').ThemeItem>) => void;
    reorderThemeItems: (themeId: string, newItems: import('./types.ts').ThemeItem[]) => void;
    reorderThemes: (newThemes: Theme[]) => void;
    reorderSnippets: (newSnippets: Snippet[]) => void;
    toggleGlobal: () => void;
    importAllData: (data: { themes: Theme[], snippets: Snippet[], globalEnabled: boolean, activeThemeId?: string | null }, mode: 'merge' | 'replace' | 'skip-duplicates') => { themesAdded: number, snippetsAdded: number, skipped: number };

    clipboardSnippet: { snippet: Snippet, overrides?: import('./types.ts').ThemeItem['overrides'] } | null;
    setClipboardSnippet: (data: { snippet: Snippet, overrides?: import('./types.ts').ThemeItem['overrides'] } | null) => void;

    updateSnippetAndPropagate: (id: string, newContent: string, options: { mode: 'soft' | 'force', originItemId?: string }) => void;

    duplicateTheme: (themeId: string) => string;
    duplicateThemeItem: (themeId: string, itemId: string) => void;
    duplicateThemeGroup: (groupId: string) => void;
    detachThemeFromGroup: (themeId: string) => void;

    createThemeGroup: (themeIds: string[]) => void;
    ungroupThemes: (themeIds: string[]) => void;
    createEmptyGroup: (domainPatterns: string[]) => string;
    loadExampleData: () => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
    themes: [],
    snippets: [],
    activeThemeId: null,
    globalEnabled: true,
    clipboardSnippet: null,

    loadFromStorage: async () => {
        const data = await storageService.load();
        set({
            themes: data.themes || [],
            snippets: data.snippets || [],
            activeThemeId: data.activeThemeId || null,
            globalEnabled: data.globalEnabled ?? true,
        });
    },

    addSnippet: (snippetData: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => {
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

    updateSnippet: (id: string, updates: Partial<Snippet>) => {
        set((state: Store) => {
            const newState = {
                ...state,
                snippets: state.snippets.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s)),
            };
            storageService.save(newState);
            return newState;
        });
    },

    deleteSnippet: (id: string) => {
        set((state: Store) => {
            const newState = {
                ...state,
                snippets: state.snippets.filter((s) => s.id !== id),
            };
            storageService.save(newState);
            return newState;
        });
    },

    deleteSnippets: (ids: string[]) => {
        const idSet = new Set(ids);
        set((state: Store) => {
            const newState = {
                ...state,
                snippets: state.snippets.filter((s) => !idSet.has(s.id)),
            };
            storageService.save(newState);
            return newState;
        });
    },

    addTheme: (themeData: Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>) => {
        const themeId = uuidv4();
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

        set((state) => {
            const shouldUseDefault = !themeData.items || themeData.items.length === 0;
            const finalItems = shouldUseDefault ? [themeItem] : themeData.items!;

            const newTheme: Theme = {
                ...themeData,
                items: finalItems,
                id: themeId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            // Handle group exclusivity: if new theme is active, deactivate others in the same group
            let currentThemes = [...state.themes];
            if (newTheme.isActive && newTheme.groupId) {
                currentThemes = currentThemes.map(t =>
                    t.groupId === newTheme.groupId ? { ...t, isActive: false } : t
                );
            }

            const newState = {
                ...state,
                themes: [...currentThemes, newTheme],
                snippets: shouldUseDefault ? [...state.snippets, mainSnippet] : state.snippets
            };
            storageService.save(newState);
            return newState;
        });
        return themeId;
    },

    updateTheme: (id: string, updates: Partial<Theme>) => {
        set((state: Store) => {
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
            // Handle group exclusivity if isActive is being set to true
            let updatedThemes = finalThemes.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t));

            const targetTheme = updatedThemes.find(t => t.id === id);
            if (targetTheme?.isActive && targetTheme?.groupId) {
                updatedThemes = updatedThemes.map(t =>
                    (t.groupId === targetTheme.groupId && t.id !== id)
                        ? { ...t, isActive: false, updatedAt: Date.now() }
                        : t
                );
            }

            const newState = {
                ...state,
                themes: updatedThemes,
            };
            const isImmediate = updates.isActive !== undefined || updates.domainPatterns !== undefined;
            storageService.save(newState, { immediate: isImmediate });
            if (isImmediate) broadcastStateUpdate(newState);
            return newState;
        });
    },

    deleteTheme: (id: string) => {
        set((state: Store) => {
            const newState = {
                ...state,
                themes: state.themes.filter((t) => t.id !== id),
            };
            storageService.save(newState);
            return newState;
        });
    },

    addSnippetToTheme: (themeId: string, snippetId: string, afterItemId?: string) => {
        let themeItemId = uuidv4();
        set((state: Store) => {
            const theme = state.themes.find(t => t.id === themeId);
            if (!theme) return state;

            const newItem = {
                id: themeItemId,
                snippetId,
                isEnabled: true,
            };

            let updatedItems = [...(theme.items || [])];
            if (afterItemId) {
                const index = updatedItems.findIndex(i => i.id === afterItemId);
                if (index !== -1) {
                    updatedItems.splice(index + 1, 0, newItem);
                } else {
                    updatedItems.push(newItem);
                }
            } else {
                updatedItems.push(newItem);
            }

            const updatedTheme = { ...theme, items: updatedItems, updatedAt: Date.now() };

            const newState = {
                ...state,
                themes: state.themes.map(t => t.id === themeId ? updatedTheme : t)
            };
            storageService.save(newState, { immediate: true });
            broadcastStateUpdate(newState);
            return newState;
        });
        return themeItemId;
    },

    toggleThemeItem: (themeId: string, itemId: string) => {
        set((state: Store) => {
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
            storageService.save(newState, { immediate: true });
            broadcastStateUpdate(newState);
            return newState;
        });
    },

    removeSnippetFromTheme: (themeId: string, itemId: string) => {
        set((state: Store) => {
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

    updateThemeItem: (themeId: string, itemId: string, updates: Partial<import('./types.ts').ThemeItem>) => {
        set((state: Store) => {
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

    reorderThemeItems: (themeId: string, newItems: import('./types.ts').ThemeItem[]) => {
        set((state: Store) => {
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

    reorderThemes: (newThemes: Theme[]) => {
        set((state: Store) => {
            const newState = {
                ...state,
                themes: newThemes.map(t => ({ ...t, updatedAt: Date.now() }))
            };
            storageService.save(newState);
            return newState;
        });
    },

    reorderSnippets: (newSnippets: Snippet[]) => {
        set((state: Store) => {
            const newState = {
                ...state,
                snippets: newSnippets.map(s => ({ ...s, updatedAt: Date.now() }))
            };
            storageService.save(newState);
            return newState;
        });
    },

    setClipboardSnippet: (data: { snippet: Snippet, overrides?: import('./types.ts').ThemeItem['overrides'] } | null) => {
        set({ clipboardSnippet: data });
    },

    toggleGlobal: () => {
        set((state: Store) => {
            const newState = {
                ...state,
                globalEnabled: !state.globalEnabled
            };
            storageService.save(newState, { immediate: true });
            broadcastStateUpdate(newState);
            return newState;
        });
    },

    importAllData: (data: { themes: Theme[], snippets: Snippet[], globalEnabled: boolean, activeThemeId?: string | null }, mode: 'merge' | 'replace' | 'skip-duplicates') => {
        let themesAddedCount = 0;
        let snippetsAddedCount = 0;
        let skippedCount = 0;

        set((state: Store) => {
            console.log('ImportAllData: Starting mode', mode, 'themes count in state', state.themes.length);
            console.log('ImportAllData: incoming data', { themes: data.themes?.length, snippets: data.snippets?.length });
            let newThemes: Theme[] = [];
            let newSnippets: Snippet[] = [];
            let activeThemeId = state.activeThemeId;

            if (mode === 'replace') {
                newThemes = data.themes.map(t => ({ ...t, updatedAt: Date.now() }));
                newSnippets = data.snippets.map(s => ({ ...s, updatedAt: Date.now() }));
                activeThemeId = data.activeThemeId || null;
                themesAddedCount = newThemes.length;
                snippetsAddedCount = newSnippets.length;
            } else if (mode === 'merge') {
                newSnippets = [...state.snippets];
                newThemes = [...state.themes];

                const snippetIdMap = new Map<string, string>();
                const groupIdMap = new Map<string, string>();

                data.snippets.forEach(snippet => {
                    const newId = uuidv4();
                    snippetIdMap.set(snippet.id, newId);
                    newSnippets.push({
                        ...snippet,
                        id: newId,
                        updatedAt: Date.now(),
                        createdAt: Date.now()
                    });
                    snippetsAddedCount++;
                });

                data.themes.forEach(theme => {
                    const newThemeId = uuidv4();
                    const remappedItems = (theme.items || []).map(item => ({
                        ...item,
                        id: uuidv4(),
                        snippetId: snippetIdMap.get(item.snippetId) || item.snippetId
                    }));

                    let newGroupId = theme.groupId;
                    if (theme.groupId) {
                        if (!groupIdMap.has(theme.groupId)) {
                            groupIdMap.set(theme.groupId, uuidv4());
                        }
                        newGroupId = groupIdMap.get(theme.groupId);
                    }

                    newThemes.push({
                        ...theme,
                        id: newThemeId,
                        items: remappedItems,
                        groupId: newGroupId,
                        updatedAt: Date.now(),
                        createdAt: Date.now()
                    });
                    themesAddedCount++;
                });
            } else if (mode === 'skip-duplicates') {
                newSnippets = [...state.snippets];
                newThemes = [...state.themes];

                const existingSnippetNames = new Set(state.snippets.map(s => s.name.toLowerCase()));
                const existingThemeNames = new Set(state.themes.map(t => t.name.toLowerCase()));
                const snippetIdMap = new Map<string, string>();
                const groupIdMap = new Map<string, string>();

                data.snippets.forEach(snippet => {
                    if (existingSnippetNames.has(snippet.name.toLowerCase())) {
                        skippedCount++;
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
                    snippetsAddedCount++;
                    existingSnippetNames.add(snippet.name.toLowerCase());
                });

                data.themes.forEach(theme => {
                    if (existingThemeNames.has(theme.name.toLowerCase())) {
                        skippedCount++;
                        return;
                    }
                    const newThemeId = uuidv4();
                    const remappedItems = theme.items
                        .map(item => ({
                            ...item,
                            id: uuidv4(),
                            snippetId: snippetIdMap.get(item.snippetId) || item.snippetId
                        }));

                    let newGroupId = theme.groupId;
                    if (theme.groupId) {
                        if (!groupIdMap.has(theme.groupId)) {
                            groupIdMap.set(theme.groupId, uuidv4());
                        }
                        newGroupId = groupIdMap.get(theme.groupId);
                    }

                    newThemes.push({
                        ...theme,
                        id: newThemeId,
                        items: remappedItems,
                        groupId: newGroupId,
                        updatedAt: Date.now(),
                        createdAt: Date.now()
                    });
                    themesAddedCount++;
                    existingThemeNames.add(theme.name.toLowerCase());
                });
            }

            const newState = {
                ...state,
                themes: newThemes,
                snippets: newSnippets,
                activeThemeId: activeThemeId,
                globalEnabled: mode === 'replace' ? (data.globalEnabled ?? true) : state.globalEnabled
            };
            storageService.save(newState, { immediate: true });
            return newState;
        });

        return { themesAdded: themesAddedCount, snippetsAdded: snippetsAddedCount, skipped: skippedCount };
    },

    updateSnippetAndPropagate: (id: string, newContent: string, options: { mode: 'soft' | 'force', originItemId?: string }) => {
        set((state: Store) => {
            const updatedSnippets = state.snippets.map(s =>
                s.id === id ? { ...s, content: newContent, updatedAt: Date.now() } : s
            );

            const updatedThemes = state.themes.map(theme => {
                const hasUsage = (theme.items || []).some(i => i.snippetId === id);
                if (!hasUsage) return theme;

                const updatedItems = (theme.items || []).map(item => {
                    if (item.snippetId !== id) return item;

                    if (options.originItemId && item.id === options.originItemId) {
                        return { ...item, overrides: { ...item.overrides, content: undefined } };
                    }

                    if (options.mode === 'force') {
                        return { ...item, overrides: { ...item.overrides, content: undefined } };
                    }

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

    duplicateTheme: (themeId: string) => {
        let newThemeIdLong = '';
        set((state: Store) => {
            const theme = state.themes.find(t => t.id === themeId);
            if (!theme) return state;

            newThemeIdLong = uuidv4();
            const newSnippets = [...state.snippets];

            const newItems = (theme.items || []).map(item => {
                const snippet = state.snippets.find(s => s.id === item.snippetId);
                let newItemSnippetId = item.snippetId;

                if (snippet && snippet.isLibraryItem === false) {
                    const newSnippetId = uuidv4();
                    newItemSnippetId = newSnippetId;
                    newSnippets.push({
                        ...snippet,
                        id: newSnippetId,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    });
                }

                return {
                    ...item,
                    id: uuidv4(),
                    snippetId: newItemSnippetId,
                };
            });

            const newTheme = {
                ...theme,
                id: newThemeIdLong,
                name: `${theme.name} (Copy)`,
                items: newItems,
                isActive: theme.isActive,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            let currentThemes = [...state.themes];

            if (newTheme.isActive && newTheme.groupId) {
                currentThemes = currentThemes.map(t =>
                    (t.groupId === newTheme.groupId) ? { ...t, isActive: false } : t
                );
            }

            const newState = {
                ...state,
                themes: [...currentThemes, newTheme],
                snippets: newSnippets
            };
            storageService.save(newState, { immediate: true });
            return newState;
        });
        return newThemeIdLong;
    },

    duplicateThemeItem: (themeId: string, itemId: string) => {
        set((state: Store) => {
            const theme = state.themes.find(t => t.id === themeId);
            if (!theme) return state;

            const item = (theme.items || []).find(i => i.id === itemId);
            if (!item) return state;

            const snippet = state.snippets.find(s => s.id === item.snippetId);
            if (!snippet) return state;

            let newSnippetId = item.snippetId;
            const newSnippets = [...state.snippets];

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
            };

            const originalIndex = (theme.items || []).findIndex(i => i.id === itemId);
            const newItems = [...(theme.items || [])];
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

    duplicateThemeGroup: (groupId: string) => {
        set((state: Store) => {
            const groupThemes = state.themes.filter(t => t.groupId === groupId);
            if (groupThemes.length === 0) return state;

            const newGroupId = uuidv4();
            const newSnippets = [...state.snippets];
            const newThemesToAdd: Theme[] = [];

            groupThemes.forEach(theme => {
                const newThemeId = uuidv4();
                const newItems = (theme.items || []).map(item => {
                    const snippet = state.snippets.find(s => s.id === item.snippetId);
                    let newItemSnippetId = item.snippetId;

                    if (snippet && snippet.isLibraryItem === false) {
                        const newSnippetId = uuidv4();
                        newItemSnippetId = newSnippetId;
                        newSnippets.push({
                            ...snippet,
                            id: newSnippetId,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                    }

                    return {
                        ...item,
                        id: uuidv4(),
                        snippetId: newItemSnippetId
                    };
                });

                newThemesToAdd.push({
                    ...theme,
                    id: newThemeId,
                    name: `${theme.name} (Copy)`,
                    items: newItems,
                    groupId: newGroupId,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            });

            const newState = {
                ...state,
                themes: [...state.themes, ...newThemesToAdd],
                snippets: newSnippets
            };
            storageService.save(newState, { immediate: true });
            return newState;
        });
    },

    createThemeGroup: (themeIds: string[]) => {
        set((state: Store) => {
            if (themeIds.length < 2) return state;
            const groupId = uuidv4();

            const allDomains = new Set<string>();
            themeIds.forEach(id => {
                const t = state.themes.find(theme => theme.id === id);
                if (t && t.domainPatterns) {
                    t.domainPatterns.forEach(d => allDomains.add(d));
                }
            });
            const unifiedDomains = Array.from(allDomains);

            const themesToGroup = state.themes.filter(t => themeIds.includes(t.id));
            const activeTheme = themesToGroup.find(t => t.isActive);

            const updatedThemes = state.themes.map(t => {
                if (!themeIds.includes(t.id)) return t;

                const shouldBeActive = t.isActive && t.id === activeTheme?.id;

                return {
                    ...t,
                    groupId,
                    domainPatterns: unifiedDomains,
                    isActive: shouldBeActive,
                    updatedAt: Date.now()
                };
            });

            const newState = { ...state, themes: updatedThemes };
            storageService.save(newState);
            return newState;
        });
    },

    ungroupThemes: (themeIds: string[]) => {
        set((state: Store) => {
            const updatedThemes = state.themes.map(t => {
                if (!themeIds.includes(t.id)) return t;
                const { groupId, ...rest } = t;
                return { ...rest, updatedAt: Date.now() };
            });

            const newState = { ...state, themes: updatedThemes };
            storageService.save(newState);
            return newState;
        });
    },

    createEmptyGroup: (domainPatterns: string[]) => {
        const groupId = uuidv4();
        const themeId = uuidv4();

        const newTheme: Theme = {
            id: themeId,
            name: 'New Theme',
            domainPatterns,
            items: [],
            isActive: false,
            groupId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        set((state) => {
            const newState = {
                ...state,
                themes: [...state.themes, newTheme],
            };
            storageService.save(newState);
            return newState;
        });
        return groupId;
    },

    detachThemeFromGroup: (themeId: string) => {
        set((state: Store) => {
            const updatedThemes = state.themes.map(t => {
                if (t.id !== themeId) return t;
                const { groupId, ...rest } = t;
                return { ...rest, updatedAt: Date.now() };
            });

            const newState = { ...state, themes: updatedThemes };
            storageService.save(newState);
            return newState;
        });
    },

    loadExampleData: async () => {
        try {
            const response = await fetch('/starter_kit.json');
            const data = await response.json();
            get().importAllData(data.data, 'replace');
        } catch (e) {
            console.error('Failed to load starter kit:', e);
        }
    },
}));
