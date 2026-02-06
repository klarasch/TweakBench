import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { useStore } from '../../store.ts';
import { Plus, Search, Code, FileCode } from 'lucide-react';

interface QuickAddMenuProps {
    x: number;
    y: number;
    type: 'css' | 'html';
    onClose: () => void;
    onAddSnippet: (snippetId: string) => void;
    onShowLibrary: () => void;
}

export const QuickAddMenu: React.FC<QuickAddMenuProps> = ({ x, y, type, onClose, onAddSnippet, onShowLibrary }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const snippets = useStore(state => state.snippets);
    const themes = useStore(state => state.themes);

    // Position state
    const [position, setPosition] = useState({ top: y, left: x, origin: 'top left' });

    // Filter top 10 snippets
    const quickSnippets = snippets
        .filter(s => s.type === type && s.isLibraryItem !== false)
        // Sort by usage count (descending) then name
        .sort((a, b) => {
            const usageA = themes.reduce((acc, t) => acc + t.items.filter(i => i.snippetId === a.id).length, 0);
            const usageB = themes.reduce((acc, t) => acc + t.items.filter(i => i.snippetId === b.id).length, 0);
            if (usageA !== usageB) return usageB - usageA;
            return a.name.localeCompare(b.name);
        })
        .slice(0, 10);

    useLayoutEffect(() => {
        if (!menuRef.current) return;

        const rect = menuRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        let newTop = y + 8; // Slight offset
        let newLeft = x;
        let originY = 'top';
        let originX = 'left';

        // Check vertical overflow (prefer rendering above if no space below)
        if (newTop + rect.height > viewportHeight - 10) {
            newTop = y - rect.height - 8;
            originY = 'bottom';
        }

        // Check horizontal overflow
        if (newLeft + rect.width > viewportWidth - 10) {
            newLeft = viewportWidth - rect.width - 10;
            originX = 'right';
        }

        setPosition({
            top: newTop,
            left: newLeft,
            origin: `${originY} ${originX}`
        });

    }, [x, y, quickSnippets.length]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-start">
            <div className="absolute inset-0 z-40" onClick={onClose} />

            <motion.div
                ref={menuRef}
                className="absolute z-50 bg-slate-900 border border-slate-700 shadow-xl rounded-lg w-72 flex flex-col overflow-hidden"
                style={{ top: position.top, left: position.left, transformOrigin: position.origin }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
            >
                <div className="p-2 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                        Quick add {type.toUpperCase()}
                    </h4>
                </div>

                <div className="max-h-[300px] overflow-y-auto p-1">
                    {quickSnippets.length > 0 ? (
                        quickSnippets.map(snippet => {
                            const usageCount = themes.reduce((acc, t) => acc + t.items.filter(i => i.snippetId === snippet.id).length, 0);
                            return (
                                <button
                                    key={snippet.id}
                                    onClick={() => onAddSnippet(snippet.id)}
                                    className="w-full text-left p-2 rounded hover:bg-slate-800 group transition-colors flex items-center justify-between"
                                >
                                    <div className="flex flex-col overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            {type === 'css' ? <Code size={12} className="text-blue-400 shrink-0" /> : <FileCode size={12} className="text-orange-400 shrink-0" />}
                                            <span className="text-sm text-slate-200 font-medium truncate group-hover:text-white transition-colors">{snippet.name}</span>
                                        </div>
                                        {usageCount > 0 && <span className="text-[10px] text-slate-500 ml-5">Used in {usageCount} themes</span>}
                                    </div>
                                    <Plus size={14} className="text-slate-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                            );
                        })
                    ) : (
                        <div className="p-4 text-center text-slate-500 text-xs">
                            No matching snippets found.
                        </div>
                    )}
                </div>

                <div className="p-1 border-t border-slate-800 bg-slate-900/50">
                    <button
                        onClick={onShowLibrary}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded hover:bg-slate-800 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <Search size={12} />
                        Show all in library
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
