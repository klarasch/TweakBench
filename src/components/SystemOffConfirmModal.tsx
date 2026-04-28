import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Power, Check, Layers } from 'lucide-react';

interface SystemOffConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReenableSystem: () => void;
    onEnableOnlyThis: () => void;
    themeName: string;
}

export const SystemOffConfirmModal: React.FC<SystemOffConfirmModalProps> = ({
    isOpen,
    onClose,
    onReenableSystem,
    onEnableOnlyThis,
    themeName,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-amber-500/10 text-amber-500">
                        <Power size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-100 tracking-tight">System is currently off</h3>
                        <p className="text-xs font-normal text-slate-400">Themes are not being applied</p>
                    </div>
                </div>
            }
        >
            <div className="flex flex-col gap-6 py-2">
                <p className="text-sm text-slate-300 leading-relaxed">
                    You are trying to enable <strong>"{themeName}"</strong>, but the ThemeBench system is disabled. How would you like to proceed?
                </p>

                <div className="grid gap-3">
                    <button
                        onClick={onReenableSystem}
                        className="flex items-start gap-4 p-4 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-500 transition-all text-left group"
                    >
                        <div className="mt-1 p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <Check size={18} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-slate-100">Re-enable system</h4>
                            <p className="text-xs text-slate-400 mt-1">Turn system back on. All previously active themes will also be applied.</p>
                        </div>
                    </button>

                    <button
                        onClick={onEnableOnlyThis}
                        className="flex items-start gap-4 p-4 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-500 transition-all text-left group"
                    >
                        <div className="mt-1 p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <Layers size={18} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-slate-100">Enable this theme only</h4>
                            <p className="text-xs text-slate-400 mt-1">Turn system on and disable all other themes. Only "{themeName}" will be applied.</p>
                        </div>
                    </button>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                    <Button variant="ghost" onClick={onClose} className="text-slate-400">
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
