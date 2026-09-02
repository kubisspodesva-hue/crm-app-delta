import clsx from 'clsx';

export function ChangeIndicator({ percent }: { percent: number }) {
  const positive = percent >= 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 text-sm font-medium',
        positive ? 'text-emerald-600' : 'text-red-600',
      )}
    >
      {positive ? '↑' : '↓'} {positive ? '+' : ''}
      {percent}%
    </span>
  );
}
