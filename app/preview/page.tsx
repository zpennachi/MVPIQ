import { AdminMentorDashboard } from '@/components/dashboard/AdminMentorDashboard'

export default function PreviewPage() {
  return (
    <div className="flex min-h-screen bg-black dotted-bg font-sans">
      <aside className="hidden lg:flex w-64 bg-black border-r border-[#272727] min-h-screen p-6 flex-col fixed left-0 top-0">
        <div className="mb-8 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#ffc700] text-black font-bold flex items-center justify-center text-xl">M</div>
            <span className="text-white font-bold text-xl">MVP IQ</span>
        </div>
        <nav className="space-y-2 text-[#d9d9d9]">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 bg-[#ffc700] text-black font-medium">
            <span>Home</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#d9d9d9]">
            <span>Feedback</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#d9d9d9]">
            <span>One-on-Ones</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#d9d9d9]">
            <span>Settings</span>
          </div>
          <div className="pt-4 mt-4 border-t border-[#272727]">
             <p className="px-4 py-2 text-xs font-semibold text-[#d9d9d9]/70 uppercase tracking-wider">Admin</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#d9d9d9]">
            <span>Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#d9d9d9]">
            <span>Users</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#d9d9d9]">
            <span>Mentors</span>
          </div>
        </nav>
        <div className="mt-auto pt-6 border-t border-[#272727]">
          <div className="px-4 py-2 mb-4">
            <p className="text-sm text-[#d9d9d9]">Marvel Smith</p>
            <p className="text-xs text-[#d9d9d9]/70 capitalize">admin_mentor</p>
          </div>
        </div>
      </aside>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-64 w-full min-w-0 overflow-x-hidden">
        <div className="mb-6 p-4 bg-[#ffc700]/10 border border-[#ffc700]/40 rounded-lg text-[#ffc700] text-sm flex items-center justify-between">
            <p><strong>Preview Mode:</strong> You are viewing the new AdminMentor dashboard without real data or authentication.</p>
        </div>
        <AdminMentorDashboard userId="preview-mock-user-id" />
      </div>
    </div>
  )
}
