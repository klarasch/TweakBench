import React, { useState, useRef } from 'react';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    delay?: number;
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, delay = 100, className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
            setShowContent(true);
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    const handleTransitionEnd = () => {
        if (!isVisible) {
            setShowContent(false);
        }
    };

    return (
        <div 
            className="relative inline-flex" 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
        >
            {children}
            {showContent && (
                <div 
                    className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs text-slate-200 bg-slate-800 rounded-md shadow-lg border border-slate-700 pointer-events-none transition-all duration-150 ease-out origin-bottom max-w-xs w-max whitespace-pre-wrap text-left ${
                        isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'
                    } ${className}`}
                    onTransitionEnd={handleTransitionEnd}
                >
                    {content}
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 -mb-[2px]" />
                </div>
            )}
        </div>
    );
};
