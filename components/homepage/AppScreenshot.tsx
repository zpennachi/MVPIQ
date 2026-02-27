'use client'

interface AppScreenshotProps {
  step: number
  title: string
  description: string
  children: React.ReactNode
}

export function AppScreenshot({ step, title, description, children }: AppScreenshotProps) {
  return (
    <div className="max-w-6xl mx-auto mb-20">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Step Number and Info - Aligned to top */}
        <div className="flex-shrink-0 lg:w-64 lg:pt-2">
          <div className="w-20 h-20 bg-[#ffc700] rounded-lg flex items-center justify-center mb-6">
            <span className="text-4xl font-bold text-black">{step}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#ffc700] mb-4 uppercase tracking-tight">
            {title}
          </h3>
          <p className="text-lg text-white leading-relaxed">
            {description}
          </p>
        </div>
        
        {/* Screenshot Mockup - Aligned to top */}
        <div className="flex-1 w-full">
          <div className="bg-[#272727] rounded-lg p-2 shadow-2xl">
            {/* Browser/App Frame */}
            <div className="bg-black rounded-lg overflow-hidden border border-[#272727]">
              {/* Top Bar */}
              <div className="bg-[#272727] px-4 py-2 flex items-center gap-2 border-b border-[#272727]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 text-center">
                  <div className="bg-black rounded px-4 py-1 text-xs text-[#d9d9d9] mx-auto max-w-md">
                    dashboard.mvp-iq.com
                  </div>
                </div>
              </div>
              
              {/* App Content */}
              <div className="bg-black p-6">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
