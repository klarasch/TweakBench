import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
    label?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    danger?: boolean;
    disabled?: boolean;
    separator?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // State to store calculated position
    const [position, setPosition] = React.useState<{ top: number; left: number }>({ top: y, left: x });

    React.useLayoutEffect(() => {
        if (!menuRef.current) return;

        const rect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newTop = y;
        let newLeft = x;

        // Check right edge
        if (x + rect.width > viewportWidth) {
            newLeft = x - rect.width;
        }

        // Check bottom edge
        if (y + rect.height > viewportHeight) {
            newTop = y - rect.height;
        }

        // Ensure it doesn't go off top/left
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;

        setPosition({ top: newTop, left: newLeft });
    }, [x, y, items]); // Recalculate if items change as height changes

    const style: React.CSSProperties = {
        top: position.top,
        left: position.left,
    };

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Prevent right click on the menu itself from opening system menu
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-start" onContextMenu={handleContextMenu}>
            {/* Backdrop */}
            <div className="absolute inset-0 z-40" onClick={onClose} />

            {/* Menu */}
            <div
                ref={menuRef}
                className="absolute z-50 bg-slate-800 border border-slate-700 shadow-xl rounded-md py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                style={style}
                onClick={(e) => e.stopPropagation()}
            >
                {items.map((item, index) => {
                    if (item.separator) {
                        return <div key={index} className="h-px bg-slate-700 my-1 mx-2" />;
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => {
                                if (!item.disabled && item.onClick) {
                                    item.onClick();
                                    onClose();
                                }
                            }}
                            disabled={item.disabled}
                            className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors
                                ${item.danger ? 'text-red-400 hover:text-red-300' : 'text-slate-200 hover:text-white'}
                                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                        >
                            {item.icon && <span className="opacity-70">{item.icon}</span>}
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
