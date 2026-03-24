import React from 'react';
import { DomainListEditor } from './DomainListEditor';

interface DomainConfigSectionProps {
    domainPatterns: string[];
    onUpdate: (newPatterns: string[]) => void;
    activeUrl: string | null;
    isGroup?: boolean;
    autoFocus?: boolean;
}

export const DomainConfigSection: React.FC<DomainConfigSectionProps> = ({
    domainPatterns,
    onUpdate,
    activeUrl,
    isGroup = false,
    autoFocus = false
}) => {
    const isRunEverywhere = domainPatterns.includes('<all_urls>');

    const toggleRunEverywhere = () => {
        if (isRunEverywhere) {
            onUpdate(domainPatterns.filter(p => p !== '<all_urls>'));
        } else {
            onUpdate([...domainPatterns, '<all_urls>']);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Run Everywhere Toggle */}
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-800 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-200">Run everywhere</span>
                    <span className="text-xs text-slate-400">Inject code into all websites automatically</span>
                </div>
                <button
                    onClick={toggleRunEverywhere}
                    className={`w-12 h-6 rounded-full relative transition-colors ${isRunEverywhere ? 'bg-green-500' : 'bg-slate-600'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${isRunEverywhere ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>

            {isRunEverywhere ? (
                <div className="text-sm text-center py-8 text-slate-400 bg-slate-800/20 rounded-lg border border-dashed border-slate-800">
                    {isGroup ? 'This group is' : 'This theme is'} currently active on <span className="font-semibold text-slate-300">all websites</span>.
                </div>
            ) : (
                <DomainListEditor
                    domainPatterns={domainPatterns}
                    onUpdate={onUpdate}
                    activeUrl={activeUrl}
                    autoFocus={autoFocus}
                />
            )}
        </div>
    );
};
