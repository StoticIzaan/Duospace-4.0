import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', isLoading, className = '', ...props 
}) => {
  const base = "px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-xl";
  
  const variants = {
    primary: "bg-vibe text-white shadow-vibe/30 hover:brightness-110",
    secondary: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 dark:text-slate-300 hover:text-vibe-primary hover:bg-vibe-soft shadow-none",
    danger: "bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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
  <div className="flex flex-col gap-2.5 w-full group">
    {label && <label className="px-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-300 group-focus-within:text-vibe-primary transition-colors">{label}</label>}
    <div className="relative">
        <input 
        className={`w-full px-6 py-4.5 rounded-[1.25rem] bg-white border-2 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-8 focus:ring-vibe-soft focus:border-vibe-primary transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-600 font-bold ${icon ? 'pr-14' : ''} ${className}`}
        {...props} 
        />
        {icon && (
            <button 
                type="button"
                onClick={onIconClick}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-vibe-primary transition-all active:scale-90"
            >
                {icon}
            </button>
        )}
    </div>
    {error && <span className="px-1 text-xs font-bold text-rose-500 animate-in fade-in slide-in-from-top-1">{error}</span>}
  </div>
);

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`glass rounded-[3.5rem] p-8 shadow-4xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-white/5 relative overflow-hidden transition-all duration-500 ${className}`} {...props}>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' }) => (
  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border border-black/5 dark:border-white/5 shadow-sm ${color}`}>
    {children}
  </span>
);