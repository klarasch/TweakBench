import React from 'react';

interface ToggleProps {
    checked: boolean;
    isActive?: boolean; // New prop for "Active on this tab"
    onChange: (checked: boolean) => void;
    labelOn?: string;
    labelOff?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    title?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
    checked,
    isActive = false,
    onChange,
    labelOn = 'ON',
    labelOff = 'OFF',
    disabled = false,
    size = 'md',
    title
}) => {
    const isSm = size === 'sm';

    // Tooltip logic
    const getTooltip = () => {
        if (title) return title;
        if (disabled) return "System disabled";
        if (!checked) return "Theme disabled";
        if (isActive) return "Enabled and active on this tab";
        return "Enabled but inactive on this tab";
    };

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onChange(!checked);
            }}
            disabled={disabled}
            className={`
                rounded flex items-center transition-colors border
                ${isSm ? 'p-0.5 px-1.5 gap-1' : 'p-1 px-2 gap-1.5'}
                ${disabled
                    ? 'bg-slate-800/50 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
                    : checked
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 shadow-[0_0_0_1px_rgba(74,222,128,0.1)]'
                        : 'bg-slate-700/50 text-slate-500 border-transparent hover:bg-slate-700 hover:text-slate-300'
                }
            `}
            title={getTooltip()}
        >
            <div className={`
                rounded-full transition-all
                ${isSm ? 'w-1 h-1' : 'w-1.5 h-1.5'} 
                ${disabled
                    ? 'bg-slate-600'
                    : checked
                        ? isActive
                            ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]'
                            : 'bg-slate-500 shadow-none'
                        : 'bg-slate-500'
                }
            `}></div>
            <span className={`font-bold uppercase ${isSm ? 'text-[9px]' : 'text-[10px]'}`}>
                {checked ? labelOn : labelOff}
            </span>
        </button>
    );
};
