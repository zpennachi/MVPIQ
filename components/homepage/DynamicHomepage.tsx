'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { ScrollScaleSection } from './ScrollScaleSection'

// ─── Asset URLs from the original mvp-iq.com ───────────────────────────────
const HERO_VIDEO = 'https://cdn.prod.website-files.com/66bb4ca5d3e63affa2866828%2F67000341883c0429f6c07bd6_hero-intro-transcode.mp4'
const HERO_POSTER = 'https://cdn.prod.website-files.com/66bb4ca5d3e63affa2866828%2F67000341883c0429f6c07bd6_hero-intro-poster-00001.jpg'
const YOUTUBE_ID = 'VXR6ODMZq28'
const MODEL_SRC = 'https://cdn.prod.website-files.com/66bb4ca5d3e63affa2866828/66c369e20be5fc5d4a983106_marvlas-card-2.glb.txt'
const MENTORSHIP_VIDEO = 'https://cdn.prod.website-files.com/66bb4ca5d3e63affa2866828%2F6707238e835e0a3042a4859f_MSE%20updated-transcode.mp4'


const STEPS = [
  {
    number: 1,
    title: 'Video Submission',
    description: 'Start by submitting your game footage through platforms like Hudl or YouTube. This allows our team of former professional athletes to review your performance.',
  },
  {
    number: 2,
    title: 'Evaluation Process',
    description: 'Our experts conduct a thorough analysis of your video, focusing on technical skills, tactical awareness, and physical conditioning to provide a well-rounded assessment.',
  },
  {
    number: 3,
    title: 'Talent Identification',
    description: 'Through this evaluation, we identify your strengths, weaknesses, and areas that need improvement, giving you a clear understanding of where you stand.',
  },
  {
    number: 4,
    title: 'Written & Video Feedback',
    description: "You'll receive detailed, actionable feedback directly on your video, highlighting key moments and offering specific guidance to help you improve. Alongside video insights, we provide written guidance designed to help you strategically develop your game.",
  },
  {
    number: 5,
    title: 'Personalized Consultation',
    description: 'Our platform offers one-on-one consultations with our expert analysts, giving you the opportunity to discuss your progress, ask questions, and receive personalized advice tailored to your development needs.',
    note: '*personalized consultations are a premium offering',
  },
]

export function DynamicHomepage() {
  const modelRef = useRef<any>(null)
  const rotationRef = useRef(0)

  const handleFlipCard = () => {
    const mv = modelRef.current
    if (!mv) return
    rotationRef.current += 180
    mv.cameraOrbit = `${rotationRef.current}deg 75deg auto`
  }

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background video */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          autoPlay
          muted
          loop
          playsInline
        />
        {/* Dark overlay + dotted texture */}
        <div className="absolute inset-0 bg-black/75 z-10" />
        <div className="absolute inset-0 dotted-bg opacity-40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black z-10" />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-24">
          <div className="flex justify-center mb-6">
            <Logo height={120} variant="dark" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#ffc700] mb-6 uppercase tracking-tight">
            Empowering the Next Generation of Sports Talent.
          </h1>
          <p className="text-lg sm:text-xl text-white mb-10 max-w-3xl mx-auto leading-relaxed">
            Led by former professional athletes, we deliver advanced video analysis and tailored tools to elevate sports performance, helping players and coaches refine their skills and strategies.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="#platform"
              className="inline-flex justify-center items-center bg-black border-2 border-[#ffc700] text-[#ffc700] w-48 py-3 rounded-lg font-bold text-base uppercase tracking-wide hover:bg-[#ffc700] hover:text-black transition-all duration-300 active:scale-95 hover:shadow-lg touch-manipulation"
            >
              LEARN MORE
            </Link>
            <Link
              href="/register"
              className="inline-flex justify-center items-center bg-[#ffc700] border-2 border-[#ffc700] text-black w-48 py-3 rounded-lg font-bold text-base uppercase tracking-wide hover:bg-[#e6b300] hover:border-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg touch-manipulation"
            >
              SIGN UP
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ WHAT IS MVP-IQ? — YouTube embed ═══ */}
      <section className="relative py-20 sm:py-28 bg-black dotted-bg border-t border-[#272727]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-12 uppercase tracking-tight">
            What is MVP-IQ?
          </h2>
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full rounded-lg"
              src={`https://www.youtube.com/embed/${YOUTUBE_ID}`}
              title="What is MVP-IQ?"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* ═══ LEARN FROM THE PROS — 3D model-viewer ═══ */}
      <section id="pros" className="relative py-16 sm:py-24 bg-black dotted-bg border-t border-[#272727] scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl font-bold text-white text-center mb-4 uppercase tracking-tight">
            Learn From The Pros
          </h2>
          <p className="text-lg sm:text-xl text-[#ffc700] text-center mb-12 max-w-3xl mx-auto">
            Our analysis is driven by former NFL players, bringing their unparalleled expertise and experience to elevate your game.
          </p>

          {/* 3-column layout: accolades — card — quote */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
            {/* Accolades */}
            <div className="text-white space-y-3 text-center lg:text-left">
              <ul className="space-y-2 text-sm font-mono uppercase tracking-widest">
                <li>• Pro Bowl</li>
                <li>• First-Team All-PAC-10</li>
                <li>• First-Team All-American</li>
                <li>• 2x Super Bowl Champion</li>
              </ul>
            </div>

            {/* 3D Card */}
            <div className="flex flex-col items-center">
              {/* @ts-ignore – model-viewer is a web component loaded via script */}
              <model-viewer
                ref={modelRef}
                id="card-1"
                src={MODEL_SRC}
                shadow-intensity="1"
                touch-action="pan-y"
                camera-controls
                disable-pan
                disable-tap
                disable-zoom
                interaction-prompt
                style={{ width: '320px', height: '440px' }}
                alt="Marvel Smith player card"
              />
              <button
                onClick={handleFlipCard}
                className="mt-6 bg-[#ffc700] text-black px-8 py-3 rounded-lg font-bold text-lg uppercase tracking-wide hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg"
              >
                Flip Card
              </button>
            </div>

            {/* Quote */}
            <div className="text-white text-sm italic text-center lg:text-right font-mono uppercase tracking-widest leading-relaxed">
              &quot;Smith was considered by many to be one of the most important players on the Steelers&apos; offensive line.&quot;
            </div>
          </div>
        </div>
      </section>

      {/* ═══ UNLOCK YOUR FULL POTENTIAL — 5 steps with scroll scale ═══ */}
      <section id="platform" className="relative py-16 sm:py-24 bg-black dotted-bg border-t border-[#272727] scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-20 uppercase tracking-tight">
            Unlock Your Full Potential: How Our Platform Elevates Your Game
          </h2>

          <div className="space-y-32">
            {STEPS.map((step) => {
              const renderMockup = () => {
                switch (step.number) {
                  case 1:
                    return (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-[#272727] to-black border border-[#272727] rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#ffc700]/20 rounded-full flex items-center justify-center border-2 border-[#ffc700]/40">
                              <span className="text-xl font-bold text-[#ffc700]">JD</span>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">Welcome back, John!</h4>
                              <p className="text-sm text-[#d9d9d9]">#23 • Lincoln High School</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-black border border-[#272727] rounded-lg p-6">
                          <h5 className="text-lg font-semibold text-white mb-4">Submit a New Video</h5>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-[#d9d9d9] mb-1">Hudl Video URL <span className="text-[#ffc700]">*</span></label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <svg className="w-4 h-4 text-[#ffc700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                </div>
                                <input type="url" value="https://www.hudl.com/video/3/12345/abc..." className="w-full pl-9 pr-3 py-2 bg-black border border-[#ffc700] rounded text-[#d9d9d9] text-sm" readOnly />
                              </div>
                              <p className="text-xs text-[#d9d9d9]/70 mt-1">Paste your Hudl video link</p>
                            </div>
                            <input type="text" placeholder="Video Title" className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm placeholder-[#d9d9d9]/50" readOnly />
                            <textarea rows={3} placeholder="Describe what you'd like reviewed..." className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm placeholder-[#d9d9d9]/50 resize-none" readOnly />
                            <button className="w-full bg-[#ffc700] text-black px-4 py-2.5 rounded font-bold text-sm" disabled>CHECKOUT ($50)</button>
                          </div>
                        </div>
                      </div>
                    )
                  case 2:
                    return (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-[#272727] to-black border border-[#272727] rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#ffc700]/20 rounded-full flex items-center justify-center border-2 border-[#ffc700]/40">
                              <span className="text-xl font-bold text-[#ffc700]">MS</span>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">Marvel Smith</h4>
                              <p className="text-sm text-[#d9d9d9]">Professional Mentor</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h5 className="text-lg font-semibold text-white mb-3">New Submissions</h5>
                          <div className="bg-black border border-[#272727] rounded-lg p-4 hover:border-[#ffc700]/40 transition-all">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-[#ffc700]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-[#ffc700]" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h6 className="font-semibold text-white mb-1">Week 3 Game Highlights</h6>
                                <p className="text-xs text-[#d9d9d9]/70 mb-2">Submitted by John Doe • 2 hours ago</p>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-[#ffc700]/20 text-[#ffc700] rounded text-xs font-medium border border-[#ffc700]/40">ASSIGNED</span>
                                </div>
                              </div>
                              <button className="bg-[#ffc700] text-black px-4 py-2 rounded text-sm font-medium" disabled>Review & Provide Feedback</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  case 3:
                    return (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-[#272727] to-black border border-[#272727] rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#ffc700]/20 rounded-full flex items-center justify-center border-2 border-[#ffc700]/40">
                              <span className="text-xl font-bold text-[#ffc700]">JD</span>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">Welcome back, John!</h4>
                              <p className="text-sm text-[#d9d9d9]">#23 • Lincoln High School</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-black border border-[#272727] rounded-lg p-6">
                          <h5 className="text-lg font-semibold text-white mb-4">Your Feedback</h5>
                          <div className="bg-[#272727]/50 border border-[#272727] rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="font-semibold text-white">Week 3 Game Highlights</h6>
                              <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium border border-green-800">COMPLETED</span>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex text-[#ffc700]">
                                {[...Array(5)].map((_, i) => (
                                  <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-sm text-[#d9d9d9]">by Marvel Smith</span>
                            </div>
                            <p className="text-sm text-white leading-relaxed mb-3">
                              Great improvement on your footwork! Your stance is much more balanced now. Focus on keeping your head up when making cuts...
                            </p>
                            <button className="bg-[#ffc700] text-black px-4 py-2 rounded text-sm font-medium" disabled>View Full Feedback</button>
                          </div>
                        </div>
                      </div>
                    )
                  case 4:
                    return (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-[#272727] to-black border border-[#272727] rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#ffc700]/20 rounded-full flex items-center justify-center border-2 border-[#ffc700]/40">
                              <span className="text-xl font-bold text-[#ffc700]">JD</span>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">Welcome back, John!</h4>
                              <p className="text-sm text-[#d9d9d9]">#23 • Lincoln High School</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-black border border-[#272727] rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-lg font-semibold text-white">Your Feedback</h5>
                            <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">Completed</span>
                          </div>
                          {/* Written Feedback */}
                          <div className="bg-[#272727]/50 border border-[#272727] rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-[#ffc700]/20 rounded-full flex items-center justify-center border-2 border-[#ffc700]/40">
                                <span className="text-sm font-bold text-[#ffc700]">MS</span>
                              </div>
                              <div>
                                <h6 className="font-semibold text-white text-sm">Marvel Smith</h6>
                                <p className="text-xs text-[#d9d9d9]">Former NFL Offensive Lineman</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm text-[#d9d9d9]">
                              <p className="font-medium text-white">Written Notes:</p>
                              <p className="leading-relaxed">Great improvement on your footwork! Your stance is much more balanced now. I noticed at the 2:15 mark your hip rotation opens up too early on the pass set &mdash; try to stay square longer before kicking...</p>
                            </div>
                          </div>
                          {/* Video Feedback */}
                          <div className="bg-[#272727]/50 border border-[#272727] rounded-lg p-4">
                            <p className="font-medium text-white text-sm mb-3">Video Breakdown:</p>
                            <div className="relative rounded-lg overflow-hidden bg-black border border-[#272727] aspect-video flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-14 h-14 bg-[#ffc700]/20 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-[#ffc700]/40">
                                  <svg className="w-7 h-7 text-[#ffc700] ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                                <p className="text-xs text-[#d9d9d9]">Mentor video feedback &bull; 4:32</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  case 5:
                    return (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-[#272727] to-black border border-[#272727] rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#ffc700]/20 rounded-full flex items-center justify-center border-2 border-[#ffc700]/40">
                              <span className="text-xl font-bold text-[#ffc700]">JD</span>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">Welcome back, John!</h4>
                              <p className="text-sm text-[#d9d9d9]">#23 • Lincoln High School</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-black border border-[#272727] rounded-lg p-6">
                          <h5 className="text-lg font-semibold text-white mb-4">My Appointments</h5>
                          <div className="space-y-3">
                            <div className="bg-[#272727]/50 border border-[#272727] rounded-lg p-4 hover:border-[#ffc700]/40 transition-all">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-10 h-10 bg-[#ffc700]/20 rounded-full flex items-center justify-center border-2 border-[#ffc700]/40">
                                      <span className="text-sm font-bold text-[#ffc700]">MS</span>
                                    </div>
                                    <div>
                                      <h6 className="font-semibold text-white">Marvel Smith</h6>
                                      <p className="text-xs text-[#d9d9d9]">1-on-1 Session</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-[#d9d9d9] mb-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>Friday, March 15, 2024</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-[#d9d9d9]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>3:00 PM - 3:30 PM</span>
                                  </div>
                                  <a href="#" className="text-[#ffc700] text-xs hover:underline mt-2 inline-block">Join Google Meet →</a>
                                </div>
                                <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium border border-green-800">CONFIRMED</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  default:
                    return null
                }
              }

              return (
                <div key={step.number} className="text-center">
                  {/* Number badge */}
                  <div className="w-16 h-16 mx-auto bg-[#ffc700] rounded-xl flex items-center justify-center mb-6 shadow-lg">
                    <span className="text-3xl font-bold text-black">{step.number}</span>
                  </div>
                  {/* Title */}
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#ffc700] mb-4 uppercase tracking-tight">
                    {step.title}
                  </h3>
                  {/* Description */}
                  <p className="text-white max-w-2xl mx-auto leading-relaxed mb-4">
                    {step.description}
                  </p>
                  {step.note && (
                    <p className="text-sm text-[#d9d9d9]/70 italic mb-8">{step.note}</p>
                  )}
                  {/* Dashboard mockup — scroll-scale animated */}
                  <ScrollScaleSection className="max-w-3xl mx-auto mt-8">
                    <div className="bg-[#272727] rounded-lg p-2 shadow-2xl">
                      <div className="bg-black rounded-lg overflow-hidden border border-[#272727]">
                        {/* Browser top bar */}
                        <div className="bg-[#272727] px-4 py-2 flex items-center gap-2 border-b border-[#272727]">
                          <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                          </div>
                          <div className="flex-1 text-center">
                            <div className="bg-black rounded px-4 py-1 text-xs text-[#d9d9d9] mx-auto max-w-md">
                              dashboard.mvp-iq.com
                            </div>
                          </div>
                        </div>
                        {/* App content */}
                        <div className="bg-black p-6 text-left">
                          {renderMockup()}
                        </div>
                      </div>
                    </div>
                  </ScrollScaleSection>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ MVP MENTORSHIP VIDEO ═══ */}
      <section className="relative py-16 sm:py-24 bg-black dotted-bg border-t border-[#272727]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-4 uppercase tracking-tight">
            MVP Mentorship
          </h2>
          <div className="max-w-4xl mx-auto">
            <video
              className="w-full rounded-lg shadow-2xl aspect-video object-cover"
              src={MENTORSHIP_VIDEO}
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
        </div>
      </section>

      {/* ═══ HOW TO GET STARTED ═══ */}
      <section className="relative py-16 sm:py-24 bg-white dotted-bg-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Heading + Description + CTA */}
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6 uppercase tracking-tight">
                How to Get Started
              </h2>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed max-w-md">
                Follow these three easy steps to begin your journey toward elevating your game:
              </p>
              <Link
                href="/register"
                className="inline-block bg-[#ffc700] border-2 border-[#ffc700] text-black px-8 py-3 rounded-lg font-bold text-base uppercase tracking-wide hover:bg-[#e6b300] hover:border-[#e6b300] transition-all duration-300 active:scale-95"
              >
                SIGN UP TODAY
              </Link>
            </div>

            {/* Right: 3 Steps with gold icon badges */}
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex items-start gap-5">
                <div className="bg-[#ffc700] rounded-xl w-14 h-14 flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg className="w-7 h-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-black text-base uppercase tracking-wide mb-1">
                    Fill Out the Interest Form:
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    Start by completing our online interest form to share your goals and needs.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-5">
                <div className="bg-[#ffc700] rounded-xl w-14 h-14 flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg className="w-7 h-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-black text-base uppercase tracking-wide mb-1">
                    Get Matched with a Professional Athlete:
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    We&apos;ll pair you with a former professional athlete who best fits your development objectives.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-5">
                <div className="bg-[#ffc700] rounded-xl w-14 h-14 flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg className="w-7 h-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-black text-base uppercase tracking-wide mb-1">
                    Choose Your Plan and Begin Analysis:
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    Select the plan that suits you, and dive into your personalized analysis to start improving your game.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


    </>
  )
}
