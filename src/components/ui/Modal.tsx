import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    className = '',
    showCloseButton = true,
}) => {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-2xl',
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === overlayRef.current) {
                    onClose();
                }
            }}
            ref={overlayRef}
        >
            <div
                className={`
                    w-full ${sizeClasses[size]} 
                    bg-slate-900 border border-slate-700 
                    rounded-xl shadow-2xl overflow-hidden 
                    flex flex-col max-h-[90vh]
                    animate-in zoom-in-95 duration-200
                    ${className}
                `}
                role="dialog"
                aria-modal="true"
            >
                {(title || showCloseButton) && (
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
                        <div className="font-semibold text-white text-lg leading-none">
                            {title}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}

                <div className="p-4 overflow-y-auto min-h-0">
                    {children}
                </div>

                {footer && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
