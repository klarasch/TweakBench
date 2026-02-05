import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDangerous = false,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={isDangerous ? 'danger' : 'filled'}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="flex gap-3 text-slate-300">
                <div className="shrink-0 mt-0.5">
                    <HelpCircle className="text-blue-400" size={24} />
                </div>
                <div>{message}</div>
            </div>
        </Modal>
    );
};

interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: React.ReactNode;
    buttonLabel?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
    isOpen,
    onClose,
    title = 'Alert',
    message,
    buttonLabel = 'OK',
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <Button variant="filled" onClick={onClose}>
                    {buttonLabel}
                </Button>
            }
        >
            <div className="flex gap-3 text-slate-300">
                <div className="shrink-0 mt-0.5">
                    <AlertCircle className="text-yellow-400" size={24} />
                </div>
                <div>{message}</div>
            </div>
        </Modal>
    );
};
