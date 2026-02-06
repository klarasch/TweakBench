import React, { useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';

interface SearchBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
    currentMatchIndex: number;
    totalMatches: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    searchQuery,
    onSearchChange,
    onClose,
    onNext,
    onPrevious,
    currentMatchIndex,
    totalMatches
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when search bar opens
    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                onPrevious();
            } else {
                onNext();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    const matchText = totalMatches === 0
        ? 'No matches'
        : `${currentMatchIndex + 1} of ${totalMatches}`;

    return (
        <div className="bg-slate-800/95 backdrop-blur border-b border-slate-700 p-2 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
            <div className="flex-1 flex items-center gap-2 max-w-md">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search in snippets..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                        title="Clear search"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium min-w-[80px] text-right">
                    {matchText}
                </span>

                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onPrevious}
                        disabled={totalMatches === 0}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-white disabled:opacity-30"
                        title="Previous match (Shift+Enter)"
                    >
                        <ChevronUp size={16} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onNext}
                        disabled={totalMatches === 0}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-white disabled:opacity-30"
                        title="Next match (Enter)"
                    >
                        <ChevronDown size={16} />
                    </Button>
                </div>

                <div className="h-6 w-px bg-slate-700 mx-1"></div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                    title="Close search (Esc)"
                >
                    <X size={16} />
                </Button>
            </div>
        </div>
    );
};
