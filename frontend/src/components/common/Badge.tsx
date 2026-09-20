import React from 'react';

export type BadgeVariant = 
  | 'cyan' 
  | 'emerald' 
  | 'rose' 
  | 'amber' 
  | 'blue' 
  | 'purple' 
  | 'slate'
  | 'observed'
  | 'inferred'
  | 'predicted'
  | 'contested'
  | 'evidence'
  | 'inference'
  | 'prediction'
  | 'uncertainty'
  | 'verified';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'slate', 
  size = 'sm',
  className = '' 
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    cyan: 'bg-sky-950/70 text-sky-300 border-sky-800/80',
    emerald: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
    rose: 'bg-rose-950/70 text-rose-300 border-rose-800/80',
    amber: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
    blue: 'bg-blue-950/70 text-blue-300 border-blue-800/80',
    purple: 'bg-purple-950/70 text-purple-300 border-purple-800/80',
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    
    // 4-Tier Semantic Relationship Taxonomy
    observed: 'bg-emerald-950/60 text-emerald-300 border-emerald-600 border-solid',
    inferred: 'bg-sky-950/60 text-sky-300 border-sky-500 border-dashed',
    predicted: 'bg-amber-950/60 text-amber-300 border-amber-500 border-dotted',
    contested: 'bg-rose-950/60 text-rose-300 border-rose-600 border-dashed',

    // 5-Level AI Provenance Tags
    evidence: 'bg-emerald-950 text-emerald-200 border-emerald-500 font-bold',
    inference: 'bg-sky-950 text-sky-200 border-sky-500 font-bold',
    prediction: 'bg-amber-950 text-amber-200 border-amber-500 font-bold',
    uncertainty: 'bg-purple-950 text-purple-200 border-purple-500 font-bold',
    verified: 'bg-emerald-900 text-emerald-100 border-emerald-400 font-bold',
  };

  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.5 font-semibold tracking-wider',
    sm: 'text-[10px] px-2 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-mono uppercase ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
