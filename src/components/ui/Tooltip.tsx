import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    delay?: number;
    className?: string; // class for the tooltip itself
    containerClassName?: string; // class for the wrapper/trigger container
    display?: 'inline-flex' | 'flex' | 'block';
}

export const Tooltip: React.FC<TooltipProps> = ({ 
    content, 
    children, 
    delay = 100, 
    className = '', 
    containerClassName = '',
    display = 'inline-flex'
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top' as 'top' | 'bottom' });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<number | null>(null);

    const updatePosition = () => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 8; // min distance from edge

        let top = triggerRect.top - tooltipRect.height - 8;
        let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        let placement: 'top' | 'bottom' = 'top';

        // Flip to bottom if no space on top
        if (top < margin) {
            const bottomSpace = viewportHeight - triggerRect.bottom - 8;
            if (bottomSpace > tooltipRect.height + margin) {
                top = triggerRect.bottom + 8;
                placement = 'bottom';
            } else {
                // If no space on top or bottom, just keep it on top but shift it down to margin
                top = margin;
            }
        } else if (top + tooltipRect.height > viewportHeight - margin) {
            // This case is unlikely for 'top' placement but good to have
            top = viewportHeight - tooltipRect.height - margin;
        }

        // Horizontal boundary checks
        if (left < margin) {
            left = margin;
        } else if (left + tooltipRect.width > viewportWidth - margin) {
            left = viewportWidth - tooltipRect.width - margin;
        }

        setPosition({ top, left, placement });
    };

    useLayoutEffect(() => {
        if (showContent) {
            updatePosition();
            // Second pass once actual width/height is known (transition-ready)
            const raf = requestAnimationFrame(updatePosition);
            return () => cancelAnimationFrame(raf);
        }
    }, [showContent, content]);

    useEffect(() => {
        if (showContent) {
            const handleScroll = (e: Event) => {
                // If the element that scrolled is the tooltip itself or one of its descendants, don't update
                if (tooltipRef.current?.contains(e.target as Node)) return;
                updatePosition();
            };

            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [showContent]);

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
            ref={triggerRef}
            className={`relative ${display} ${containerClassName}`} 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
        >
            {children}
            {showContent && createPortal(
                <div 
                    ref={tooltipRef}
                    style={{ 
                        top: position.top, 
                        left: position.left,
                        position: 'fixed'
                    }}
                    className={`z-[100] px-2.5 py-1.5 text-xs text-slate-200 bg-slate-800 rounded-md shadow-lg border border-slate-700 pointer-events-none transition duration-150 ease-out origin-center max-w-xs w-max whitespace-pre-wrap text-left ${
                        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    } ${className}`}
                    onTransitionEnd={handleTransitionEnd}
                >
                    {content}
                    {/* Optional: Arrow positioning could be more complex, but we'll omit simple arrows for portal tooltips for now to avoid misalignment when shifted */}
                </div>,
                document.body
            )}
        </div>
    );
};
