'use client'

import { useState } from 'react'
import { Mail, MessageSquare, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    // For now, use mailto link. In production, you'd send this to an API endpoint
    const mailtoLink = `mailto:support@mvp-iq.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`)}`
    window.location.href = mailtoLink
    
    setTimeout(() => {
      setSubmitted(true)
      setSubmitting(false)
      setFormData({ name: '', email: '', subject: '', message: '' })
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-black dotted-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[#ffc700] hover:text-[#e6b300] mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="bg-black border border-[#272727] rounded-lg p-6 sm:p-8 shadow-mvp">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#ffc700]/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#ffc700]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Contact Support</h1>
              <p className="text-sm text-[#d9d9d9] mt-1">We're here to help with any questions or issues</p>
            </div>
          </div>

          {submitted ? (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-6 text-center">
              <Mail className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Message Sent!</h3>
              <p className="text-[#d9d9d9] mb-4">
                Your email client should open shortly. If it doesn't, please email us directly at{' '}
                <a href="mailto:support@mvp-iq.com" className="text-[#ffc700] hover:underline">
                  support@mvp-iq.com
                </a>
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-[#ffc700] hover:text-[#e6b300] text-sm font-medium"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#d9d9d9] mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#d9d9d9] mb-2">
                  Your Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#d9d9d9] mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#d9d9d9] mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] resize-none touch-manipulation"
                  placeholder="Please describe your question or issue..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#ffc700] text-black px-6 py-3 rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium touch-manipulation"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
