import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { AppScreenshot } from './AppScreenshot'

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

export async function DynamicHomepage() {
  const supabase = await createClient()
  
  const { data: sections, error } = await supabase
    .from('homepage_sections')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // If no sections found, return fallback content
  if (error || !sections || sections.length === 0) {
    return (
      <>
        {/* Hero Section Fallback */}
        <section className="relative bg-black py-24 sm:py-32 lg:py-40 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80 z-10"></div>
            <div className="absolute inset-0 dotted-bg opacity-30 z-20"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-0"></div>
          </div>
          
          <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-4">
              <Logo height={120} variant="dark" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#ffc700] mb-6 uppercase tracking-tight">
              EMPOWERING THE NEXT GENERATION OF SPORTS TALENT.
            </h2>
            <p className="text-lg sm:text-xl text-white mb-10 max-w-3xl mx-auto leading-relaxed">
              Led by former professional athletes, we deliver advanced video analysis and tailored tools to elevate sports performance, helping players and coaches refine their skills and strategies.
            </p>
            <Link
              href="/register"
              className="inline-block bg-[#ffc700] text-black px-10 py-4 rounded-lg font-bold text-lg uppercase tracking-wide hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg touch-manipulation"
            >
              SIGN UP
            </Link>
          </div>
        </section>

        {/* Learn From The Pros Section Fallback */}
        <section id="pros" className="relative py-16 sm:py-20 bg-black dotted-bg scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold text-white text-center mb-4 uppercase tracking-tight">
              LEARN FROM THE PROS
            </h2>
            <p className="text-lg sm:text-xl text-[#ffc700] text-center mb-12 max-w-3xl mx-auto">
              Our analysis is driven by former NFL players, bringing their unparalleled expertise and experience to elevate your game.
            </p>
            
            <div className="max-w-md mx-auto">
              <div className="bg-[#ffc700] border-4 border-[#ffc700] rounded-lg shadow-2xl overflow-hidden">
                <div className="bg-white p-6 text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-[#ffc700] overflow-hidden bg-gray-200">
                    <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">MS</span>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-black mb-2 uppercase tracking-tight">MARVEL SMITH</h3>
                </div>
                
                <div className="bg-[#ffc700] p-6">
                  <div className="space-y-3 text-center">
                    <div className="text-lg font-bold text-black">PRO BOWL 2004</div>
                    <div className="text-lg font-bold text-black">FIRST-TEAM ALL-PAC-10</div>
                    <div className="text-lg font-bold text-black">FIRST-TEAM ALL-AMERICAN</div>
                    <div className="text-lg font-bold text-black">2x SUPER BOWL CHAMPION</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-white">
                  <ul className="space-y-2 text-sm">
                    <li className="font-semibold">• PRO BOWL</li>
                    <li className="font-semibold">• FIRST-TEAM ALL-PAC-10</li>
                    <li className="font-semibold">• FIRST-TEAM ALL-AMERICAN</li>
                    <li className="font-semibold">• 2x SUPER BOWL CHAMPION</li>
                  </ul>
                </div>
                <div className="text-white text-sm italic">
                  &quot;SMITH WAS CONSIDERED BY MANY TO BE ONE OF THE MOST IMPORTANT PLAYERS ON THE STEELERS&apos; OFFENSIVE LINE.&quot;
                </div>
              </div>
              
              <div className="text-center mt-8">
                <button className="bg-[#ffc700] text-black px-8 py-3 rounded-lg font-bold text-lg uppercase tracking-wide hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg">
                  FLIP CARD
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Section Fallback */}
        <section id="platform" className="relative py-16 sm:py-20 bg-black dotted-bg scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-12 uppercase tracking-tight">
              UNLOCK YOUR FULL POTENTIAL: HOW OUR PLATFORM ELEVATES YOUR GAME
            </h2>
            
            <AppScreenshot
              step={1}
              title="VIDEO SUBMISSION"
              description="Upload your game footage directly through our platform. Simply drag and drop your video, add details about what you'd like reviewed, and submit for professional analysis."
            >
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
                  <h5 className="text-lg font-semibold text-white mb-4">Upload a New Video</h5>
                  <div className="border-2 border-dashed border-[#272727] rounded-lg p-8 text-center hover:border-[#ffc700]/40 transition-all">
                    <div className="text-[#ffc700] mb-3">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-white mb-1">Drag & drop a video file here, or click to select</p>
                    <p className="text-sm text-[#d9d9d9]/70">Maximum file size: 1GB • Keep videos under 60 seconds</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Video Title"
                      className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm placeholder-[#d9d9d9]/50"
                      readOnly
                    />
                    <textarea
                      rows={3}
                      placeholder="Describe what you'd like reviewed..."
                      className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm placeholder-[#d9d9d9]/50 resize-none"
                      readOnly
                    />
                    <button className="w-full bg-[#ffc700] text-black px-4 py-2.5 rounded font-bold text-sm" disabled>
                      CHECKOUT ($50)
                    </button>
                  </div>
                </div>
              </div>
            </AppScreenshot>
          </div>
        </section>

        {/* Mentorship Section Fallback */}
        <section className="relative py-16 sm:py-20 bg-black dotted-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-4 uppercase tracking-tight">
              MVP MENTORSHIP
            </h2>
            <h3 className="text-xl sm:text-2xl font-semibold text-[#d9d9d9] text-center mb-4">
              How to get started
            </h3>
            <p className="text-lg text-white text-center mb-12 max-w-3xl mx-auto">
              Follow these three easy steps to begin your journey toward elevating your game:
            </p>
            
            <div className="max-w-3xl mx-auto space-y-8 mb-12">
              <div className="flex items-start gap-6">
                <div className="bg-[#ffc700] text-black rounded-lg w-12 h-12 flex items-center justify-center font-bold flex-shrink-0 text-xl">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-2 text-lg uppercase tracking-wide">Fill Out the Interest Form:</h4>
                  <p className="text-white leading-relaxed">
                    Start by completing our online interest form to share your goals and needs.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="bg-[#ffc700] text-black rounded-lg w-12 h-12 flex items-center justify-center font-bold flex-shrink-0 text-xl">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-2 text-lg uppercase tracking-wide">Get Matched with a Professional Athlete:</h4>
                  <p className="text-white leading-relaxed">
                    We&apos;ll pair you with a former professional athlete who best fits your development objectives.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="bg-[#ffc700] text-black rounded-lg w-12 h-12 flex items-center justify-center font-bold flex-shrink-0 text-xl">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-2 text-lg uppercase tracking-wide">Choose Your Plan and Begin Analysis:</h4>
                  <p className="text-white leading-relaxed">
                    Select the plan that suits you, and dive into your personalized analysis to start improving your game.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/register"
                className="inline-block bg-[#ffc700] text-black px-10 py-4 rounded-lg font-bold text-lg uppercase tracking-wide hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg touch-manipulation"
              >
                SIGN UP TODAY
              </Link>
            </div>
          </div>
        </section>

        {/* Insights Section Fallback */}
        <section id="insights" className="relative py-16 sm:py-20 bg-black dotted-bg scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-6 uppercase tracking-tight">
              ATHLETE INSIGHTS: STORIES AND LESSONS FROM THE PROS
            </h2>
            <p className="text-lg sm:text-xl text-white text-center mb-12 max-w-3xl mx-auto leading-relaxed">
              Explore our Media Archive to discover valuable insights and stories from seasoned athletes. Learn from their experiences, challenges, and triumphs as they share what it takes to grow and succeed in the world of sports. Whether you&apos;re seeking inspiration or practical advice, our collection offers a wealth of knowledge to help you on your athletic journey.
            </p>
            <div className="text-center">
              <Link
                href="/dashboard/education"
                className="inline-block bg-[#ffc700] text-black px-10 py-4 rounded-lg font-bold text-lg uppercase tracking-wide hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg touch-manipulation"
              >
                EXPLORE MEDIA ARCHIVE
              </Link>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      {sections.map((section: HomepageSection) => {
        switch (section.section_type) {
          case 'hero':
            return (
              <section key={section.id} className="relative bg-black py-24 sm:py-32 lg:py-40 overflow-hidden">
                <div className="absolute inset-0 z-0">
                  <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80 z-10"></div>
                  <div className="absolute inset-0 dotted-bg opacity-30 z-20"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-0"></div>
                </div>
                
                <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                  <div className="flex justify-center mb-4">
                    <Logo height={120} variant="dark" />
                  </div>
                  {section.title && (
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#ffc700] mb-6 uppercase tracking-tight">
                      {section.title}
                    </h2>
                  )}
                  {section.description && (
                    <p className="text-lg sm:text-xl text-white mb-10 max-w-3xl mx-auto leading-relaxed">
                      {section.description}
                    </p>
                  )}
                  <Link
                    href="/register"
                    className="inline-block bg-[#ffc700] text-black px-10 py-4 rounded-lg font-bold text-lg uppercase tracking-wide hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg touch-manipulation"
                  >
                    SIGN UP
                  </Link>
                </div>
              </section>
            )

          case 'content':
            if (section.section_key === 'pros') {
              const mentorData = section.content || {}
              return (
                <section key={section.id} id="pros" className="relative py-16 sm:py-20 bg-black dotted-bg scroll-mt-20">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {section.title && (
                      <h2 className="text-4xl sm:text-5xl font-bold text-white text-center mb-4 uppercase tracking-tight">
                        {section.title}
                      </h2>
                    )}
                    {section.subtitle && (
                      <p className="text-lg sm:text-xl text-[#ffc700] text-center mb-12 max-w-3xl mx-auto">
                        {section.subtitle}
                      </p>
                    )}
                    
                    <div className="max-w-md mx-auto">
                      <div className="bg-[#ffc700] border-4 border-[#ffc700] rounded-lg shadow-2xl overflow-hidden">
                        <div className="bg-white p-6 text-center">
                          <div className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-[#ffc700] overflow-hidden bg-gray-200">
                            <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                              <span className="text-4xl font-bold text-white">
                                {mentorData.mentor_initials || 'MS'}
                              </span>
                            </div>
                          </div>
                          <h3 className="text-3xl font-bold text-black mb-2 uppercase tracking-tight">
                            {mentorData.mentor_name || 'MARVEL SMITH'}
                          </h3>
                        </div>
                        
                        {mentorData.achievements && (
                          <div className="bg-[#ffc700] p-6">
                            <div className="space-y-3 text-center">
                              {mentorData.achievements.map((achievement: string, idx: number) => (
                                <div key={idx} className="text-lg font-bold text-black">
                                  {achievement}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {mentorData.achievements && (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="text-white">
                            <ul className="space-y-2 text-sm">
                              {mentorData.achievements.map((achievement: string, idx: number) => (
                                <li key={idx} className="font-semibold">• {achievement}</li>
                              ))}
                            </ul>
                          </div>
                          {mentorData.quote && (
                            <div className="text-white text-sm italic">
                              &quot;{mentorData.quote}&quot;
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-center mt-8">
                        <button className="bg-[#ffc700] text-black px-8 py-3 rounded-lg font-bold text-lg uppercase tracking-wide hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg">
                          FLIP CARD
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )
            }

            // Generic content section
            return (
              <section key={section.id} id={section.section_key} className="relative py-16 sm:py-20 bg-black dotted-bg scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  {section.title && (
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-6 uppercase tracking-tight">
                      {section.title}
                    </h2>
                  )}
                  {section.description && (
                    <p className="text-lg sm:text-xl text-white text-center mb-12 max-w-3xl mx-auto leading-relaxed">
                      {section.description}
                    </p>
                  )}
                  {section.button_text && section.button_link && (
                    <div className="text-center">
                      <Link
                        href={section.button_link}
                        className="inline-block bg-[#ffc700] text-black px-10 py-4 rounded-lg font-bold text-lg uppercase tracking-wide hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg touch-manipulation"
                      >
                        {section.button_text}
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            )

          case 'screenshots':
            const screenshots = section.content?.screenshots || []
            return (
              <section key={section.id} id="platform" className="relative py-16 sm:py-20 bg-black dotted-bg scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  {section.title && (
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-12 uppercase tracking-tight">
                      {section.title}
                    </h2>
                  )}
                  
                  {screenshots.map((screenshot: any) => {
                    // Render different mockup content based on step
                    const renderScreenshotContent = () => {
                      switch (screenshot.step) {
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
                                <h5 className="text-lg font-semibold text-white mb-4">Upload a New Video</h5>
                                <div className="border-2 border-dashed border-[#272727] rounded-lg p-8 text-center hover:border-[#ffc700]/40 transition-all">
                                  <div className="text-[#ffc700] mb-3">
                                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                  </div>
                                  <p className="text-white mb-1">Drag & drop a video file here, or click to select</p>
                                  <p className="text-sm text-[#d9d9d9]/70">Maximum file size: 1GB • Keep videos under 60 seconds</p>
                                </div>
                                <div className="mt-4 space-y-3">
                                  <input
                                    type="text"
                                    placeholder="Video Title"
                                    className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm placeholder-[#d9d9d9]/50"
                                    readOnly
                                  />
                                  <textarea
                                    rows={3}
                                    placeholder="Describe what you'd like reviewed..."
                                    className="w-full px-3 py-2 bg-black border border-[#ffc700] rounded text-white text-sm placeholder-[#d9d9d9]/50 resize-none"
                                    readOnly
                                  />
                                  <button className="w-full bg-[#ffc700] text-black px-4 py-2.5 rounded font-bold text-sm" disabled>
                                    CHECKOUT ($50)
                                  </button>
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
                                        <span className="px-2 py-1 bg-[#ffc700]/20 text-[#ffc700] rounded text-xs font-medium border border-[#ffc700]/40">
                                          ASSIGNED
                                        </span>
                                      </div>
                                    </div>
                                    <button className="bg-[#ffc700] text-black px-4 py-2 rounded text-sm font-medium" disabled>
                                      Review & Provide Feedback
                                    </button>
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
                                    <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium border border-green-800">
                                      COMPLETED
                                    </span>
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
                                  <button className="bg-[#ffc700] text-black px-4 py-2 rounded text-sm font-medium" disabled>
                                    View Full Feedback
                                  </button>
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
                                <h5 className="text-lg font-semibold text-white mb-4">Book a 1-on-1 Session</h5>
                                <div className="space-y-4">
                                  <div className="bg-[#272727]/50 border border-[#272727] rounded-lg p-4">
                                    <div className="flex items-center gap-4 mb-3">
                                      <div className="w-12 h-12 bg-[#ffc700]/20 rounded-full flex items-center justify-center border-2 border-[#ffc700]/40">
                                        <span className="text-lg font-bold text-[#ffc700]">MS</span>
                                      </div>
                                      <div>
                                        <h6 className="font-semibold text-white">Marvel Smith</h6>
                                        <p className="text-xs text-[#d9d9d9]">Professional Mentor</p>
                                      </div>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                      <div className="flex items-center gap-2 text-sm text-[#d9d9d9]">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>Available: Mon-Fri, 2:00 PM - 6:00 PM</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-[#d9d9d9]">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Session Duration: 30 minutes</span>
                                      </div>
                                    </div>
                                    <button className="w-full bg-[#ffc700] text-black px-4 py-2.5 rounded font-bold text-sm" disabled>
                                      Select Time Slot
                                    </button>
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
                                        <a href="#" className="text-[#ffc700] text-xs hover:underline mt-2 inline-block">
                                          Join Google Meet →
                                        </a>
                                      </div>
                                      <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium border border-green-800">
                                        CONFIRMED
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        default:
                          return <div className="p-4 text-white text-sm">Screenshot preview for step {screenshot.step}</div>
                      }
                    }

                    return (
                      <AppScreenshot
                        key={screenshot.step}
                        step={screenshot.step}
                        title={screenshot.title}
                        description={screenshot.description}
                      >
                        {renderScreenshotContent()}
                      </AppScreenshot>
                    )
                  })}
                </div>
              </section>
            )

          case 'steps':
            const steps = section.content?.steps || []
            return (
              <section key={section.id} className="relative py-16 sm:py-20 bg-black dotted-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  {section.title && (
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-4 uppercase tracking-tight">
                      {section.title}
                    </h2>
                  )}
                  {section.subtitle && (
                    <h3 className="text-xl sm:text-2xl font-semibold text-[#d9d9d9] text-center mb-4">
                      {section.subtitle}
                    </h3>
                  )}
                  {section.description && (
                    <p className="text-lg text-white text-center mb-12 max-w-3xl mx-auto">
                      {section.description}
                    </p>
                  )}
                  
                  <div className="max-w-3xl mx-auto space-y-8 mb-12">
                    {steps.map((step: any) => (
                      <div key={step.number} className="flex items-start gap-6">
                        <div className="bg-[#ffc700] text-black rounded-lg w-12 h-12 flex items-center justify-center font-bold flex-shrink-0 text-xl">
                          {step.number}
                        </div>
                        <div className="flex-1">
                          {step.title && (
                            <h4 className="font-bold text-white mb-2 text-lg uppercase tracking-wide">
                              {step.title}
                            </h4>
                          )}
                          {step.description && (
                            <p className="text-white leading-relaxed">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {section.button_text && section.button_link && (
                    <div className="text-center">
                      <Link
                        href={section.button_link}
                        className="inline-block bg-[#ffc700] text-black px-10 py-4 rounded-lg font-bold text-lg uppercase tracking-wide hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg touch-manipulation"
                      >
                        {section.button_text}
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            )

          default:
            return null
        }
      })}
    </>
  )
}
