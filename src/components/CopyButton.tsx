import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function CopyButton({
  text,
  label,
  className = '',
  size = 'md',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      success(`${label ? label : 'Code'} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if permission rejected
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      aria-label={`Copy ${label || text} to clipboard`}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#25282D] text-[#101114] dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
        isSmall ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className={`${isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-emerald-600 dark:text-emerald-400`} />
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className={`${isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-[#777777] dark:text-neutral-400`} />
          <span className="font-medium">{label || 'Copy'}</span>
        </>
      )}
    </button>
  );
}
