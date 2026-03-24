import { useStore } from '../store.ts';
import { useToast } from '../components/ui/Toast';
import {
    exportThemeToJSON,
    exportThemeToCSS,
    parseThemeFromJS,
    exportAllData,
    importAllData,
    exportGroupToJSON
} from '../utils/impexp.ts';

export const useThemeListImportExport = () => {
    const { themes, snippets, globalEnabled, activeThemeId, addTheme, addSnippet, addSnippetToTheme, importAllData: importStoreData } = useStore();
    const { showToast } = useToast();

    const handleExport = (themeId: string, type: 'json' | 'css') => {
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return;
        let content = '';
        let extension = '';
        if (type === 'json') {
            content = exportThemeToJSON(theme, snippets);
            extension = 'json';
        } else {
            content = exportThemeToCSS(theme, snippets);
            extension = 'css';
        }
        const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/css' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${theme.name.replace(/\s+/g, '_')}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportGroup = (groupId: string) => {
        const groupThemes = themes.filter(t => t.groupId === groupId);
        const groupName = groupThemes.length > 0 ? groupThemes[0].domainPatterns[0] || 'domain_group' : 'domain_group';
        const content = exportGroupToJSON(groupId, themes, snippets);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ThemeBench_Group_${groupName.replace(/[*.]/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Group exported');
    };

    const handleExportAllData = () => {
        const content = exportAllData(themes, snippets, globalEnabled, activeThemeId);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ThemeBench_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const processImportContent = (content: string): {
        type: 'full' | 'theme' | 'error',
        data?: any,
        theme?: any
    } => {
        // Try Full/Group JSON
        try {
            const importedData = importAllData(content);
            if (importedData) {
                return { type: 'full', data: importedData };
            }
        } catch (e) { }

        // Try Single Theme JS
        const importedTheme = parseThemeFromJS(content);
        if (importedTheme) {
            return { type: 'theme', theme: importedTheme };
        }

        return { type: 'error' };
    };

    const executeThemeImport = (importedTheme: any) => {
        const newThemeId = addTheme({
            name: importedTheme.name,
            domainPatterns: importedTheme.domainPatterns,
            items: [],
            isActive: true
        });
        importedTheme.snippets.forEach((s: any) => {
            const newSnippetId = addSnippet({
                name: s.name,
                type: s.type,
                content: s.content,
                relatedSnippetIds: [],
                isLibraryItem: false
            });
            addSnippetToTheme(newThemeId, newSnippetId);
        });
        showToast(`Imported theme: ${importedTheme.name}`);
        return newThemeId;
    };

    return {
        handleExport,
        handleExportGroup,
        handleExportAllData,
        processImportContent,
        executeThemeImport,
        importStoreData
    };
};
