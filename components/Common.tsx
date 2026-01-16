import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', isLoading, className = '', ...props 
}) => {
  const { children: _, ...domProps } = props;
  const base = "px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-md";
  
  const variants = {
    primary: "bg-vibe text-white shadow-vibe/20 hover:brightness-110",
    secondary: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 dark:text-slate-300 hover:text-vibe-primary hover:bg-vibe-soft shadow-none",
    danger: "bg-rose-500 text-white shadow-rose-500/10 hover:bg-rose-600",
  };

  return (
    <button 
      className={`${base} ${variants[variant]} ${className}`} 
      disabled={isLoading || props.disabled} 
      {...domProps}
    >
      {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  onIconClick?: () => void;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, onIconClick, className = '', ...props }) => (
  <div className="flex flex-col gap-1 w-full group">
    {label && <label className="px-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 group-focus-within:text-vibe-primary transition-colors">{label}</label>}
    <div className="relative">
        <input 
        className={`w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-vibe-soft focus:border-vibe-primary transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-600 font-bold text-xs ${icon ? 'pr-10' : ''} ${className}`}
        {...props} 
        />
        {icon && (
            <button 
                type="button"
                onClick={onIconClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-vibe-primary transition-all active:scale-90"
            >
                {icon}
            </button>
        )}
    </div>
    {error && <span className="px-1 text-[9px] font-bold text-rose-500 animate-in fade-in slide-in-from-top-1">{error}</span>}
  </div>
);

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => {
  const { children: _, ...domProps } = props;
  return (
    <div 
      className={`glass rounded-2xl p-4 md:p-5 shadow-xl shadow-slate-200/30 dark:shadow-black/40 border border-white dark:border-white/5 relative overflow-hidden transition-all duration-500 ${className}`} 
      {...domProps}
    >
      {children}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' }) => (
  <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-[0.1em] border border-black/5 dark:border-white/5 shadow-sm ${color}`}>
    {children}
  </span>
);