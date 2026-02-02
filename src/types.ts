export type SnippetType = 'css' | 'html';

export interface Snippet {
    id: string;
    name: string;
    type: SnippetType;
    content: string; // The "master" code

    // HTML specific
    selector?: string;
    position?: 'append' | 'prepend' | 'before' | 'after';

    // For linking related snippets (e.g. Button HTML + Button CSS)
    relatedSnippetIds: string[];
    isLibraryItem?: boolean; // If false, it's a "Ghost" snippet (private to a theme)

    createdAt: number;
    updatedAt: number;
}

export interface ThemeItem {
    id: string; // Unique usage ID in this theme
    snippetId: string; // Reference to the Master Snippet
    isEnabled: boolean;

    // Overrides: if undefined, use master values
    overrides?: {
        content?: string;
        selector?: string;
        position?: 'append' | 'prepend' | 'before' | 'after';
    };
}

export interface Theme {
    id: string;
    name: string;
    domainPatterns: string[]; // e.g. ["*.google.com"]
    items: ThemeItem[];
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface AppState {
    themes: Theme[];
    snippets: Snippet[];
    activeThemeId: string | null;
    globalEnabled: boolean;
}
