'use client'

import { useEffect, useRef, ReactNode } from 'react'

interface ScrollScaleSectionProps {
    children: ReactNode
    className?: string
}

export function ScrollScaleSection({ children, className = '' }: ScrollScaleSectionProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        el.style.transform = 'scale(1)'
                        el.style.opacity = '1'
                    } else {
                        el.style.transform = 'scale(0.3)'
                        el.style.opacity = '0'
                    }
                })
            },
            { threshold: 0.15 }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            className={className}
            style={{
                transform: 'scale(0.3)',
                opacity: 0,
                transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease',
                willChange: 'transform, opacity',
            }}
        >
            {children}
        </div>
    )
}
