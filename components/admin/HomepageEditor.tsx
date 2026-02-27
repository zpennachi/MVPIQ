'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowUp, ArrowDown, Edit2, Save, X, Plus, Trash2, Eye, EyeOff } from 'lucide-react'

interface HomepageSection {
  id: string
  section_key: string
  section_type: string
  title: string | null
  subtitle: string | null
  description: string | null
  button_text: string | null
  button_link: string | null
  content: any
  display_order: number
  is_active: boolean
}

export function HomepageEditor() {
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<Partial<HomepageSection>>({})
  const supabase = createClient()

  useEffect(() => {
    loadSections()
  }, [])

  const loadSections = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('homepage_sections')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error loading sections:', error)
    } else {
      setSections(data || [])
    }
    setLoading(false)
  }

  const handleEdit = (section: HomepageSection) => {
    setEditingSection(section.id)
    setEditedContent({
      title: section.title || '',
      subtitle: section.subtitle || '',
      description: section.description || '',
      button_text: section.button_text || '',
      button_link: section.button_link || '',
      content: section.content || {},
    })
  }

  const handleSave = async (sectionId: string) => {
    const { error } = await supabase
      .from('homepage_sections')
      .update({
        ...editedContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sectionId)

    if (error) {
      console.error('Error saving section:', error)
      alert('Failed to save changes')
    } else {
      setEditingSection(null)
      setEditedContent({})
      loadSections()
    }
  }

  const handleCancel = () => {
    setEditingSection(null)
    setEditedContent({})
  }

  const handleMove = async (sectionId: string, direction: 'up' | 'down') => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    const currentOrder = section.display_order
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1

    // Find the section to swap with
    const swapSection = sections.find(s => s.display_order === newOrder)
    if (!swapSection) return

    // Swap orders
    await Promise.all([
      supabase
        .from('homepage_sections')
        .update({ display_order: newOrder })
        .eq('id', sectionId),
      supabase
        .from('homepage_sections')
        .update({ display_order: currentOrder })
        .eq('id', swapSection.id),
    ])

    loadSections()
  }

  const handleToggleActive = async (sectionId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('homepage_sections')
      .update({ is_active: !currentStatus })
      .eq('id', sectionId)

    if (error) {
      console.error('Error toggling section:', error)
    } else {
      loadSections()
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffc700]"></div>
        <p className="text-white mt-4">Loading homepage sections...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Homepage Editor</h2>
          <p className="text-[#d9d9d9] mt-1">Manage homepage content and section order</p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#ffc700] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#e6b300] transition-all duration-300"
        >
          Preview Homepage
        </a>
      </div>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`bg-black border rounded-lg p-4 sm:p-6 ${
              section.is_active ? 'border-[#272727]' : 'border-red-800 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-[#ffc700] text-black px-2 py-1 rounded text-xs font-bold">
                    {section.display_order}
                  </span>
                  <h3 className="text-lg font-semibold text-white">
                    {section.section_key.toUpperCase()} - {section.section_type}
                  </h3>
                  {!section.is_active && (
                    <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs border border-red-800">
                      HIDDEN
                    </span>
                  )}
                </div>
                {section.title && (
                  <p className="text-sm text-[#d9d9d9] mb-1">
                    <span className="text-[#ffc700]">Title:</span> {section.title}
                  </p>
                )}
                {section.subtitle && (
                  <p className="text-sm text-[#d9d9d9] mb-1">
                    <span className="text-[#ffc700]">Subtitle:</span> {section.subtitle}
                  </p>
                )}
                {section.description && (
                  <p className="text-sm text-[#d9d9d9] line-clamp-2">
                    <span className="text-[#ffc700]">Description:</span> {section.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(section.id, section.is_active)}
                  className={`p-2 rounded transition-all duration-300 ${
                    section.is_active
                      ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                      : 'bg-gray-900/30 text-gray-400 hover:bg-gray-900/50'
                  }`}
                  title={section.is_active ? 'Hide section' : 'Show section'}
                >
                  {section.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleMove(section.id, 'up')}
                  disabled={index === 0}
                  className="p-2 rounded bg-[#272727] text-[#d9d9d9] hover:bg-[#272727]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                  title="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMove(section.id, 'down')}
                  disabled={index === sections.length - 1}
                  className="p-2 rounded bg-[#272727] text-[#d9d9d9] hover:bg-[#272727]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                  title="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(section)}
                  className="p-2 rounded bg-[#272727] text-[#ffc700] hover:bg-[#272727]/80 transition-all duration-300"
                  title="Edit section"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {editingSection === section.id && (
              <div className="mt-4 pt-4 border-t border-[#272727] space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#d9d9d9] mb-1">Title</label>
                  <input
                    type="text"
                    value={editedContent.title || ''}
                    onChange={(e) => setEditedContent({ ...editedContent, title: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#d9d9d9] mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={editedContent.subtitle || ''}
                    onChange={(e) => setEditedContent({ ...editedContent, subtitle: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#d9d9d9] mb-1">Description</label>
                  <textarea
                    value={editedContent.description || ''}
                    onChange={(e) => setEditedContent({ ...editedContent, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#d9d9d9] mb-1">Button Text</label>
                    <input
                      type="text"
                      value={editedContent.button_text || ''}
                      onChange={(e) => setEditedContent({ ...editedContent, button_text: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#d9d9d9] mb-1">Button Link</label>
                    <input
                      type="text"
                      value={editedContent.button_link || ''}
                      onChange={(e) => setEditedContent({ ...editedContent, button_link: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm"
                    />
                  </div>
                </div>

                {/* Section-specific content editing */}
                {section.section_type === 'screenshots' && editedContent.content?.screenshots && (
                  <div>
                    <label className="block text-sm font-medium text-[#d9d9d9] mb-2">Screenshots</label>
                    <div className="space-y-3">
                      {editedContent.content.screenshots.map((screenshot: any, idx: number) => (
                        <div key={idx} className="p-3 bg-[#272727] rounded border border-[#272727]">
                          <div className="grid grid-cols-2 gap-3 mb-2">
                            <input
                              type="text"
                              value={screenshot.title || ''}
                              onChange={(e) => {
                                const newScreenshots = [...editedContent.content.screenshots]
                                newScreenshots[idx].title = e.target.value
                                setEditedContent({ ...editedContent, content: { ...editedContent.content, screenshots: newScreenshots } })
                              }}
                              placeholder="Title"
                              className="w-full px-2 py-1 bg-black border border-[#ffc700] rounded text-white text-xs"
                            />
                            <input
                              type="number"
                              value={screenshot.step || ''}
                              onChange={(e) => {
                                const newScreenshots = [...editedContent.content.screenshots]
                                newScreenshots[idx].step = parseInt(e.target.value)
                                setEditedContent({ ...editedContent, content: { ...editedContent.content, screenshots: newScreenshots } })
                              }}
                              placeholder="Step #"
                              className="w-full px-2 py-1 bg-black border border-[#ffc700] rounded text-white text-xs"
                            />
                          </div>
                          <textarea
                            value={screenshot.description || ''}
                            onChange={(e) => {
                              const newScreenshots = [...editedContent.content.screenshots]
                              newScreenshots[idx].description = e.target.value
                              setEditedContent({ ...editedContent, content: { ...editedContent.content, screenshots: newScreenshots } })
                            }}
                            placeholder="Description"
                            rows={2}
                            className="w-full px-2 py-1 bg-black border border-[#ffc700] rounded text-white text-xs resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {section.section_type === 'steps' && editedContent.content?.steps && (
                  <div>
                    <label className="block text-sm font-medium text-[#d9d9d9] mb-2">Steps</label>
                    <div className="space-y-3">
                      {editedContent.content.steps.map((step: any, idx: number) => (
                        <div key={idx} className="p-3 bg-[#272727] rounded border border-[#272727]">
                          <div className="grid grid-cols-2 gap-3 mb-2">
                            <input
                              type="number"
                              value={step.number || ''}
                              onChange={(e) => {
                                const newSteps = [...editedContent.content.steps]
                                newSteps[idx].number = parseInt(e.target.value)
                                setEditedContent({ ...editedContent, content: { ...editedContent.content, steps: newSteps } })
                              }}
                              placeholder="Step #"
                              className="w-full px-2 py-1 bg-black border border-[#ffc700] rounded text-white text-xs"
                            />
                            <input
                              type="text"
                              value={step.title || ''}
                              onChange={(e) => {
                                const newSteps = [...editedContent.content.steps]
                                newSteps[idx].title = e.target.value
                                setEditedContent({ ...editedContent, content: { ...editedContent.content, steps: newSteps } })
                              }}
                              placeholder="Title"
                              className="w-full px-2 py-1 bg-black border border-[#ffc700] rounded text-white text-xs"
                            />
                          </div>
                          <textarea
                            value={step.description || ''}
                            onChange={(e) => {
                              const newSteps = [...editedContent.content.steps]
                              newSteps[idx].description = e.target.value
                              setEditedContent({ ...editedContent, content: { ...editedContent.content, steps: newSteps } })
                            }}
                            placeholder="Description"
                            rows={2}
                            className="w-full px-2 py-1 bg-black border border-[#ffc700] rounded text-white text-xs resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleSave(section.id)}
                    className="flex items-center gap-2 bg-[#ffc700] text-black px-4 py-2 rounded font-medium hover:bg-[#e6b300] transition-all duration-300"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 bg-[#272727] text-[#d9d9d9] px-4 py-2 rounded font-medium hover:bg-[#272727]/80 transition-all duration-300"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
