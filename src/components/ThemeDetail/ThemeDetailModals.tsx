import React from 'react';
import { ConfirmDialog } from '../ui/Dialog';
import { ImportVariablesModal } from './ImportVariablesModal';
import { useStore } from '../../store.ts';

interface ThemeDetailModalsProps {
    themeId: string;
    themeName: string;
    onBack: () => void;

    // Snippet Delete
    itemToRemove: string | null;
    setItemToRemove: (id: string | null) => void;

    // Bulk Delete
    confirmBulkDelete: boolean;
    setConfirmBulkDelete: (value: boolean) => void;
    selectedSnippetIds: Set<string>;
    setSelectedSnippetIds: (ids: Set<string>) => void;
    setIsSelectionMode: (value: boolean) => void;

    // Theme Delete
    themeToDelete: boolean;
    setThemeToDelete: (value: boolean) => void;

    // Import Variables
    importCandidates: { variables: Record<string, Record<string, string>>; domain: string } | null;
    setImportCandidates: (candidates: any) => void;
    handleConfirmImport: (selectedScopes: string[]) => void;
}

export const ThemeDetailModals: React.FC<ThemeDetailModalsProps> = ({
    themeId,
    themeName,
    onBack,
    itemToRemove,
    setItemToRemove,
    confirmBulkDelete,
    setConfirmBulkDelete,
    selectedSnippetIds,
    setSelectedSnippetIds,
    setIsSelectionMode,
    themeToDelete,
    setThemeToDelete,
    importCandidates,
    setImportCandidates,
    handleConfirmImport
}) => {
    return (
        <>
            {/* Import Variables Modal */}
            {importCandidates && (
                <ImportVariablesModal
                    variables={importCandidates.variables}
                    onImport={handleConfirmImport}
                    onClose={() => setImportCandidates(null)}
                />
            )}

            {/* Remove Snippet Confirmation */}
            <ConfirmDialog
                isOpen={!!itemToRemove}
                onClose={() => setItemToRemove(null)}
                onConfirm={() => {
                    if (itemToRemove) {
                        useStore.getState().removeSnippetFromTheme(themeId, itemToRemove);
                        setItemToRemove(null);
                    }
                }}
                title="Remove snippet"
                message="Remove this snippet from the theme? The snippet will remain in your library."
                confirmLabel="Remove"
                isDangerous
            />

            {/* Bulk Delete Confirmation */}
            <ConfirmDialog
                isOpen={confirmBulkDelete}
                onClose={() => setConfirmBulkDelete(false)}
                onConfirm={() => {
                    const { removeSnippetFromTheme } = useStore.getState();
                    selectedSnippetIds.forEach(id => {
                        removeSnippetFromTheme(themeId, id);
                    });
                    setSelectedSnippetIds(new Set());
                    setIsSelectionMode(false);
                    setConfirmBulkDelete(false);
                }}
                title="Remove snippets"
                message={`Remove ${selectedSnippetIds.size} snippet${selectedSnippetIds.size === 1 ? '' : 's'} from this theme?`}
                confirmLabel="Remove"
                isDangerous
            />

            {/* Theme Delete Confirmation */}
            <ConfirmDialog
                isOpen={themeToDelete}
                onClose={() => setThemeToDelete(false)}
                onConfirm={() => {
                    const { deleteTheme } = useStore.getState();
                    deleteTheme(themeId);
                    setThemeToDelete(false);
                    onBack();
                }}
                title="Delete theme"
                message={`Are you sure you want to delete theme "${themeName}"? This action cannot be undone.`}
                confirmLabel="Delete"
                isDangerous
            />
        </>
    );
};
