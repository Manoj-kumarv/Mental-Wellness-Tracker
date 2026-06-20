import { clsx } from 'clsx'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export default function LoadingSpinner({ size = 'md', label = 'Loading...', className }: Props) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  }

  return (
    <div
      className={clsx('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className={clsx(
          'rounded-full border-sage-200 border-t-sage-500 animate-spin',
          sizeClasses[size]
        )}
      />
      {size !== 'sm' && (
        <p className="text-sm text-sage-500 animate-pulse-soft">{label}</p>
      )}
    </div>
  )
}
