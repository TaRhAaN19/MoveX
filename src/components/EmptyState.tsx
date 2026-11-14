import { ReactNode } from 'react';
import { Package, Inbox, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-[#F5F5F5] dark:bg-[#181a1f] p-8 text-center sm:p-12 ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-[#25282D] text-[#101114] dark:text-[#FFD43B] shadow-sm mb-4">
        {icon || <Inbox className="h-7 w-7 stroke-[1.75]" />}
      </div>

      <h3 className="font-display text-lg font-bold text-[#101114] dark:text-neutral-100">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-[#777777] dark:text-neutral-400 leading-relaxed">
        {description}
      </p>

      {(actionText && (actionHref || onAction)) && (
        <div className="mt-6">
          {actionHref ? (
            <Link
              to={actionHref}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#101114] dark:bg-[#FFD43B] px-4 text-xs font-bold text-white dark:text-[#101114] hover:bg-[#25282D] dark:hover:bg-[#F5C419] transition-colors"
            >
              <span>{actionText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#101114] dark:bg-[#FFD43B] px-4 text-xs font-bold text-white dark:text-[#101114] hover:bg-[#25282D] dark:hover:bg-[#F5C419] transition-colors"
            >
              <span>{actionText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
