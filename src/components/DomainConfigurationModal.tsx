import React from 'react';
import { Globe } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { DomainListEditor } from './DomainListEditor';
import type { Theme } from '../types';

interface DomainConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
    themes?: Theme[];
    groupId?: string;
    onUpdateTheme?: (id: string, updates: Partial<Theme>) => void;
    activeUrl: string | null;
    mode?: 'edit' | 'create';
    onCreateGroup?: (domainPatterns: string[]) => void;
}

export const DomainConfigurationModal: React.FC<DomainConfigurationModalProps> = ({
    isOpen,
    onClose,
    themes = [],
    groupId,
    onUpdateTheme,
    activeUrl,
    mode = 'edit',
    onCreateGroup
}) => {
    const [localPatterns, setLocalPatterns] = React.useState<string[]>([]);

    // Initialize local patterns for create mode - MUST be before any conditional returns
    React.useEffect(() => {
        if (mode === 'create' && isOpen) {
            setLocalPatterns([]);
        }
    }, [mode, isOpen]);

    // Get themes to configure
    const themesToConfigure = groupId
        ? themes.filter(t => t.groupId === groupId)
        : themes;

    // In create mode, we don't need existing themes
    if (mode === 'edit' && themesToConfigure.length === 0) return null;

    // Use first theme as source of truth (they're synced in groups), or local state for create mode
    const patterns = mode === 'create' ? localPatterns : (themesToConfigure[0]?.domainPatterns || []);

    const updateDomains = (newPatterns: string[]) => {
        if (mode === 'create') {
            setLocalPatterns(newPatterns);
        } else if (onUpdateTheme) {
            themesToConfigure.forEach(theme => {
                onUpdateTheme(theme.id, { domainPatterns: newPatterns });
            });
        }
    };

    const handleConfirm = () => {
        if (mode === 'create' && onCreateGroup) {
            onCreateGroup(localPatterns.length > 0 ? localPatterns : ['<all_urls>']);
        }
        onClose();
    };

    const isGroup = !!groupId;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-blue-500/10 text-blue-400">
                        <Globe size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-100 tracking-tight">
                            {mode === 'create'
                                ? 'Create switch group'
                                : isGroup ? 'Group domain configuration' : 'Domain configuration'
                            }
                        </h3>
                        <p className="text-xs font-normal text-slate-500">
                            {mode === 'create'
                                ? 'Configure where this group will be active'
                                : isGroup
                                    ? 'Changes apply to all themes in this switch group'
                                    : 'Control where this theme is active'
                            }
                        </p>
                    </div>
                </div>
            }
            footer={
                <Button
                    onClick={handleConfirm}
                    variant="filled"
                    className="font-semibold"
                >
                    {mode === 'create' ? 'Create' : 'Done'}
                </Button>
            }
        >
            {/* Run Everywhere Toggle */}
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-800 flex items-center justify-between mb-4">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-200">Run everywhere</span>
                    <span className="text-xs text-slate-500">Inject code into all websites automatically</span>
                </div>
                <button
                    onClick={() => {
                        const isAll = patterns.includes('<all_urls>');
                        if (isAll) updateDomains(patterns.filter(p => p !== '<all_urls>'));
                        else updateDomains([...patterns, '<all_urls>']);
                    }}
                    className={`w-12 h-6 rounded-full relative transition-colors ${patterns.includes('<all_urls>') ? 'bg-green-500' : 'bg-slate-600'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${patterns.includes('<all_urls>') ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>

            {patterns.includes('<all_urls>') ? (
                <div className="text-sm text-center py-8 text-slate-500 bg-slate-800/20 rounded-lg border border-dashed border-slate-800">
                    {isGroup ? 'This group is' : 'This theme is'} currently active on <span className="font-semibold text-slate-300">all websites</span>.
                </div>
            ) : (
                <DomainListEditor
                    domainPatterns={patterns}
                    onUpdate={updateDomains}
                    activeUrl={activeUrl}
                />
            )}
        </Modal>
    );
};
