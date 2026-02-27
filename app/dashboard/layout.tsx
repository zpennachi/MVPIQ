import { Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-black dotted-bg">
      <Suspense fallback={<div className="w-64" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-64 w-full min-w-0 overflow-x-hidden">
        {children}
      </div>
    </div>
  )
}
