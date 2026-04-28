import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success', action?: { label: string; onClick: () => void }) => {
        const id = Math.random().toString(36).substring(7);
        const newToast: Toast = { id, message, type, action };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss (longer timeout when action button is present)
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, action ? 5000 : 3000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`
                                pointer-events-auto
                                min-w-[300px] max-w-[400px]
                                px-4 py-3 rounded-lg
                                shadow-lg border
                                flex items-start gap-3
                                ${toast.type === 'success'
                                    ? 'bg-green-900/90 border-green-700 text-green-100'
                                    : toast.type === 'error'
                                        ? 'bg-red-900/90 border-red-700 text-red-100'
                                        : 'bg-blue-900/90 border-blue-700 text-blue-100'
                                }
                                backdrop-blur-sm
                            `}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                {toast.type === 'success' && <CheckCircle size={18} />}
                                {toast.type === 'error' && <AlertCircle size={18} />}
                                {toast.type === 'info' && <Info size={18} />}
                            </div>
                            <div className="flex-1 text-sm font-medium flex items-center gap-2">
                                <span>{toast.message}</span>
                                {toast.action && (
                                    <button
                                        onClick={() => {
                                            toast.action!.onClick();
                                            dismissToast(toast.id);
                                        }}
                                        className="text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap"
                                    >
                                        {toast.action.label}
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => dismissToast(toast.id)}
                                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
