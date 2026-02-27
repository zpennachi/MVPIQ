'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { X, User } from 'lucide-react'
import { getFullName } from '@/lib/utils'

interface MentorSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (mentorId: string) => void
  loading?: boolean
}

export function MentorSelectionModal({
  isOpen,
  onClose,
  onSelect,
  loading = false,
}: MentorSelectionModalProps) {
  const [mentors, setMentors] = useState<Profile[]>([])
  const [loadingMentors, setLoadingMentors] = useState(true)
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      loadMentors()
    }
  }, [isOpen])

  const loadMentors = async () => {
    setLoadingMentors(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mentor')
      .order('first_name', { ascending: true })

    if (error) {
      console.error('Error loading mentors:', error)
    }

    if (data) {
      setMentors(data as Profile[])
      console.log('Loaded mentors:', data.length, data)
    } else {
      console.log('No mentors found')
    }
    setLoadingMentors(false)
  }

  const handleSelect = () => {
    if (selectedMentor) {
      onSelect(selectedMentor)
      setSelectedMentor(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] my-8 overflow-y-auto scale-in">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Select a Mentor
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {loadingMentors ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading mentors...
            </div>
          ) : mentors.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No mentors available at this time.
            </div>
          ) : (
            <div className="space-y-2">
              {mentors.map((mentor) => (
                <button
                  key={mentor.id}
                  onClick={() => setSelectedMentor(mentor.id)}
                  className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all duration-300 active:scale-95 touch-manipulation ${
                    selectedMentor === mentor.id
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover-lift'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getFullName(mentor) || 'Professional Athlete'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {mentor.email}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 active:scale-95 font-medium touch-manipulation"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedMentor || loading}
              className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-95 hover:shadow-lg font-medium touch-manipulation"
            >
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
