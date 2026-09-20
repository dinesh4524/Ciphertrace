import React from 'react';

export type BadgeVariant = 
  | 'cyan' 
  | 'emerald' 
  | 'rose' 
  | 'amber' 
  | 'blue' 
  | 'purple' 
  | 'slate'
  | 'gray'
  | 'verified'
  | 'review'
  | 'critical'
  | 'info'
  | 'inactive'
  | 'observed'
  | 'inferred'
  | 'predicted'
  | 'contested'
  | 'evidence'
  | 'inference'
  | 'prediction'
  | 'uncertainty';

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
    // Light Institutional Semantic Colors
    emerald: 'bg-[#ECFDF5] text-[#16805C] border-[#16805C]',
    verified: 'bg-[#ECFDF5] text-[#16805C] border-[#16805C]',
    observed: 'bg-[#ECFDF5] text-[#16805C] border-[#16805C] border-solid',
    evidence: 'bg-[#D1FAE5] text-[#065F46] border-[#10B981] font-bold',

    amber: 'bg-[#FFFBEB] text-[#B7791F] border-[#B7791F]',
    review: 'bg-[#FFFBEB] text-[#B7791F] border-[#B7791F]',
    predicted: 'bg-[#FFFBEB] text-[#B7791F] border-[#B7791F] border-dotted',
    prediction: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B] font-bold',

    rose: 'bg-[#FEF2F2] text-[#C53030] border-[#C53030]',
    critical: 'bg-[#FEF2F2] text-[#C53030] border-[#C53030]',
    contested: 'bg-[#FEF2F2] text-[#C53030] border-[#C53030] border-dashed',

    blue: 'bg-[#EFF6FF] text-[#2563EB] border-[#2563EB]',
    cyan: 'bg-[#F0F9FF] text-[#0369A1] border-[#0EA5E9]',
    info: 'bg-[#EFF6FF] text-[#2563EB] border-[#2563EB]',
    inferred: 'bg-[#EFF6FF] text-[#2563EB] border-[#2563EB] border-dashed',
    inference: 'bg-[#DBEAFE] text-[#1E40AF] border-[#3B82F6] font-bold',

    purple: 'bg-[#F5F3FF] text-[#6D28D9] border-[#7C3AED]',
    uncertainty: 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6] font-bold',

    slate: 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]',
    gray: 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1]',
    inactive: 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]',
  };

  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.2 font-semibold tracking-wider',
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
