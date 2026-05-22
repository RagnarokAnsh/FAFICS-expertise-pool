import React from 'react';

type BadgeVariant = 'draft' | 'submitted' | 'endorsed' | 'changes_requested' | 'under_review' | 'approved' | 'rejected' | 'expired';

interface BadgeProps {
  status: string;
}

export function Badge({ status }: BadgeProps) {
  const normalized = status.toLowerCase() as BadgeVariant;
  
  let bg = 'bg-gray-100';
  let text = 'text-gray-800';
  let label = status.replace('_', ' ');

  switch (normalized) {
    case 'draft':
      bg = 'bg-gray-100'; text = 'text-gray-800';
      break;
    case 'submitted':
      bg = 'bg-blue-100'; text = 'text-blue-800';
      break;
    case 'endorsed':
      bg = 'bg-purple-100'; text = 'text-purple-800';
      break;
    case 'changes_requested':
      bg = 'bg-amber-100'; text = 'text-amber-800';
      break;
    case 'under_review':
      bg = 'bg-indigo-100'; text = 'text-indigo-800';
      break;
    case 'approved':
      bg = 'bg-green-100'; text = 'text-green-800';
      break;
    case 'rejected':
      bg = 'bg-red-100'; text = 'text-red-800';
      break;
    case 'expired':
      bg = 'bg-gray-200'; text = 'text-gray-600';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${bg} ${text}`}>
      {label}
    </span>
  );
}
