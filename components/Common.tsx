
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', isLoading, className = '', ...props 
}) => {
  const base = "px-6 py-4 rounded-2xl font-bold tracking-tight transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100 whitespace-nowrap";
  
  const variants = {
    primary: "bg-vibe text-white shadow-xl shadow-vibe/20 hover:brightness-110",
    secondary: "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700",
    ghost: "bg-transparent text-slate-500 hover:text-vibe-primary hover:bg-vibe-soft",
    danger: "bg-rose-500 text-white shadow-lg shadow-rose-200 hover:bg-rose-600",
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
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="px-1 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</label>}
    <input 
      className={`px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-vibe-soft focus:border-vibe-primary transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-white dark:placeholder:text-slate-700 font-bold ${className}`}
      {...props} 
    />
    {error && <span className="px-1 text-xs font-bold text-rose-500">{error}</span>}
  </div>
);

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`glass rounded-[2.8rem] p-6 shadow-2xl shadow-slate-200/50 dark:shadow-black/20 border border-white/40 dark:border-white/5 relative overflow-hidden transition-all ${className}`} {...props}>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' }) => (
  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${color}`}>
    {children}
  </span>
);
