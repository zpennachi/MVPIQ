import { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'font-medium rounded-md transition-all duration-300 ease-smooth active:scale-95',
        {
          'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300 hover:shadow-md': variant === 'secondary',
          'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-md': variant === 'outline',
          'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg': variant === 'danger',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
