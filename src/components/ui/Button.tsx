import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'filled' | 'outline' | 'ghost' | 'danger' | 'danger-ghost';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    className = '',
    variant = 'filled',
    size = 'md',
    isLoading = false,
    icon,
    disabled,
    ...props
}) => {

    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed rounded-md box-border overflow-hidden";

    const variants = {
        filled: "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 shadow-sm border border-transparent",
        outline: "bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600",
        ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent",
        danger: "bg-red-600 text-white hover:bg-red-500 border border-transparent",
        "danger-ghost": "bg-transparent text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent",
    };

    const sizes = {
        sm: "h-6 px-2 text-[11px] leading-none gap-1.5 rounded flex-shrink-0",
        md: "h-8 px-3 text-xs gap-2 rounded-md flex-shrink-0 min-h-[32px]",
        lg: "h-10 px-5 text-sm gap-2 rounded-md flex-shrink-0 min-h-[40px]",
        icon: "h-7 w-7 p-0 rounded-md", // slightly smaller icon button
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : icon}
            {children}
        </button>
    );
};
