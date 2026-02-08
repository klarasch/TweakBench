import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/Dialog';
import { Link as LinkIcon } from 'lucide-react';
import { DomainConfigSection } from '../DomainConfigSection';

interface ThemeListModalsProps {
    // Creation Modal
    isCreating: boolean;
    setIsCreating: (value: boolean) => void;
    newThemeName: string;
    setNewThemeName: (value: string) => void;
    newDomainPatterns: string[];
    setNewDomainPatterns: (patterns: string[]) => void;
    activeUrl: string | null;
    handleCreate: () => void;

    // Import Dialog
    isImportDialogOpen: boolean;
    setIsImportDialogOpen: (value: boolean) => void;
    importMode: 'merge' | 'replace' | 'skip-duplicates';
    setImportMode: (mode: 'merge' | 'replace' | 'skip-duplicates') => void;
    pendingImportData: any;
    handleConfirmImport: () => void;

    // Delete Modal
    themeToDelete: string | null;
    setThemeToDelete: (id: string | null) => void;
    themeToDeleteName?: string;
    confirmDelete: () => void;

    // Bulk Delete
    confirmBulkDelete: boolean;
    setConfirmBulkDelete: (value: boolean) => void;
    selectedCount: number;
    confirmBulkDeleteAction: () => void;

    // Bulk Export
    confirmBulkExport: 'js' | 'css' | null;
    setConfirmBulkExport: (type: 'js' | 'css' | null) => void;
    executeBulkExport: (type: 'js' | 'css') => void;

    // Group Delete
    groupToDelete: string | null;
    setGroupToDelete: (id: string | null) => void;
    confirmGroupDelete: () => void;

    // Create Group
    isCreatingGroup: boolean;
    setIsCreatingGroup: (value: boolean) => void;
    newGroupName: string;
    handleCreateGroup: () => void;

    newThemeGroupId?: string | null;
}

export const ThemeListModals: React.FC<ThemeListModalsProps> = ({
    isCreating,
    setIsCreating,
    newThemeName,
    setNewThemeName,
    newDomainPatterns,
    setNewDomainPatterns,
    activeUrl,
    handleCreate,


    isImportDialogOpen,
    setIsImportDialogOpen,
    importMode,
    setImportMode,
    pendingImportData,
    handleConfirmImport,

    themeToDelete,
    setThemeToDelete,
    themeToDeleteName,
    confirmDelete,

    confirmBulkDelete,
    setConfirmBulkDelete,
    selectedCount,
    confirmBulkDeleteAction,

    confirmBulkExport,
    setConfirmBulkExport,
    executeBulkExport,

    groupToDelete,
    setGroupToDelete,
    confirmGroupDelete,

    isCreatingGroup,
    setIsCreatingGroup,
    newGroupName,
    handleCreateGroup,
    newThemeGroupId
}) => {
    const [confirmReplaceImport, setConfirmReplaceImport] = React.useState(false);

    const onImportClick = () => {
        if (importMode === 'replace') {
            setConfirmReplaceImport(true);
        } else {
            handleConfirmImport();
        }
    };
    return (
        <>
            {/* Create Theme Modal */}
            <Modal
                isOpen={isCreating}
                onClose={() => setIsCreating(false)}
                title={newThemeGroupId ? "Add theme to a group" : "Create new theme"}
                footer={
                    <div className="flex gap-2 justify-end w-full">
                        <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                        <Button
                            variant="filled"
                            onClick={handleCreate}
                            disabled={!newThemeName.trim()}
                        >
                            Create
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-300">Theme name</label>
                        <input
                            autoFocus
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                            placeholder="e.g. Dark Mode for Google"
                            value={newThemeName}
                            onChange={(e) => setNewThemeName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && newThemeName.trim() && handleCreate()}
                        />
                    </div>

                    {!newThemeGroupId && (
                        <DomainConfigSection
                            domainPatterns={newDomainPatterns}
                            onUpdate={setNewDomainPatterns}
                            activeUrl={activeUrl}
                        />
                    )}
                </div>
            </Modal>

            {/* Create Group Modal */}
            <Modal
                isOpen={isCreatingGroup}
                onClose={() => setIsCreatingGroup(false)}
                title="Create domain group"
                footer={
                    <div className="flex gap-2 justify-end w-full">
                        <Button variant="ghost" onClick={() => setIsCreatingGroup(false)}>Cancel</Button>
                        <Button
                            variant="filled"
                            onClick={handleCreateGroup}
                            disabled={!newGroupName.trim()}
                        >
                            Create group
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5 px-4 pt-4">
                        <label className="text-sm font-medium text-slate-300">Group name</label>
                        <input
                            autoFocus
                            type="text"
                            value={newThemeName}
                            onChange={(e) => setNewThemeName(e.target.value)}
                            placeholder="e.g. Work tools"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mx-4 flex gap-3">
                        <LinkIcon size={18} className="text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-300 leading-relaxed">
                            A <strong>domain group</strong> ensures only one theme is active at a time for specific domains. Perfect for creating multiple versions of a site theme.
                        </p>
                    </div>
                    <DomainConfigSection
                        domainPatterns={newDomainPatterns}
                        onUpdate={setNewDomainPatterns}
                        activeUrl={activeUrl}
                        isGroup
                    />
                </div>
            </Modal>

            {/* Import Dialog */}
            <Modal
                isOpen={isImportDialogOpen}
                onClose={() => setIsImportDialogOpen(false)}
                title="Import data"
                footer={
                    <div className="flex gap-2 justify-end w-full">
                        <Button variant="ghost" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
                        <Button variant="filled" onClick={onImportClick}>Import</Button>
                    </div>
                }
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-300">
                        You are importing <strong>{pendingImportData?.themes.length} themes</strong> and <strong>{pendingImportData?.snippets.length} snippets</strong>.
                        How should existing data be handled?
                    </p>
                    <div className="flex flex-col gap-2">
                        {(['merge', 'skip-duplicates', 'replace'] as const).map((mode) => {
                            const isSelected = importMode === mode;
                            const isReplace = mode === 'replace';

                            let containerClass = "bg-slate-800/30 border-slate-700 hover:border-slate-600";
                            if (isSelected) {
                                containerClass = isReplace
                                    ? "bg-red-500/10 border-red-500"
                                    : "bg-blue-500/10 border-blue-500";
                            } else if (isReplace) {
                                containerClass = "bg-red-500/5 border-red-500/20 hover:border-red-500/40";
                            }

                            const dotBorderClass = isSelected
                                ? (isReplace ? 'border-red-500' : 'border-blue-500')
                                : 'border-slate-600';

                            const dotBgClass = isReplace ? 'bg-red-500' : 'bg-blue-500';

                            return (
                                <label
                                    key={mode}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${containerClass}`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-semibold ${isSelected && isReplace ? 'text-red-400' : 'text-slate-200'}`}>
                                            {mode === 'skip-duplicates' ? 'Skip duplicates' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {mode === 'merge' && 'Add new items and keep existing ones'}
                                            {mode === 'replace' && 'Remove all current data and use imported data'}
                                            {mode === 'skip-duplicates' && 'Only import items that don\'t exist yet'}
                                        </span>
                                    </div>
                                    <input
                                        type="radio"
                                        className="hidden"
                                        name="importMode"
                                        checked={importMode === mode}
                                        onChange={() => setImportMode(mode)}
                                    />
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${dotBorderClass}`}>
                                        {isSelected && <div className={`w-2 h-2 rounded-full ${dotBgClass}`} />}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            {/* Import Replace Confirmation */}
            <ConfirmDialog
                isOpen={confirmReplaceImport}
                onClose={() => setConfirmReplaceImport(false)}
                onConfirm={() => {
                    handleConfirmImport();
                    setConfirmReplaceImport(false);
                }}
                title="Replace all data?"
                message="Are you sure you want to replace ALL your themes and snippets with the imported data? This action cannot be undone."
                confirmLabel="Replace all"
                isDangerous
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!themeToDelete}
                onClose={() => setThemeToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete theme?"
                message={
                    <span>Are you sure you want to delete <strong>"{themeToDeleteName}"</strong>? This action cannot be undone.</span>
                }
                confirmLabel="Delete"
                isDangerous
            />

            {/* Bulk Delete Confirmation */}
            <ConfirmDialog
                isOpen={confirmBulkDelete}
                onClose={() => setConfirmBulkDelete(false)}
                onConfirm={confirmBulkDeleteAction}
                title="Delete multiple themes?"
                message={<span>Are you sure you want to delete <strong>{selectedCount} selected themes</strong>?</span>}
                confirmLabel={`Delete ${selectedCount} themes`}
                isDangerous
            />

            {/* Bulk Export Confirmation */}
            <ConfirmDialog
                isOpen={!!confirmBulkExport}
                onClose={() => setConfirmBulkExport(null)}
                onConfirm={() => {
                    if (confirmBulkExport) executeBulkExport(confirmBulkExport);
                    setConfirmBulkExport(null);
                }}
                title="Export multiple themes?"
                message={`You are about to export ${selectedCount} themes. Your browser may show multiple download prompts.`}
                confirmLabel="Export all"
            />

            {/* Group Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!groupToDelete}
                onClose={() => setGroupToDelete(null)}
                onConfirm={confirmGroupDelete}
                title="Delete domain group?"
                message="Are you sure you want to delete this group? All themes inside the group will be DELETED."
                confirmLabel="Delete group and themes"
                isDangerous
            />
        </>
    );
};
