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
}
