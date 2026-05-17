'use client'

import { useState } from 'react'
import type { Story } from '@/lib/api'

export function StoriesCarousel({ stories, shopName }: { stories: Story[]; shopName: string }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  if (stories.length === 0) return null

  const active = activeIdx !== null ? stories[activeIdx] : null

  return (
    <>
      {/* Story circles row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {stories.map((story, i) => (
          <button
            key={story.id}
            onClick={() => setActiveIdx(i)}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div
              className="w-16 h-16 rounded-full p-0.5"
              style={{ background: 'linear-gradient(135deg, var(--accent), #f59e0b)' }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 border-2 border-white">
                {story.thumbnail_url || story.media_url ? (
                  <img
                    src={story.thumbnail_url ?? story.media_url}
                    alt={story.title ?? shopName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-600 max-w-[64px] text-center line-clamp-1">
              {story.title ?? shopName}
            </span>
          </button>
        ))}
      </div>

      {/* Story viewer modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setActiveIdx(null)}
        >
          {/* Progress bars */}
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
            {stories.map((_, i) => (
              <div
                key={i}
                className="h-0.5 flex-1 rounded-full"
                style={{ background: i <= (activeIdx ?? 0) ? 'white' : 'rgba(255,255,255,0.3)' }}
              />
            ))}
          </div>

          {/* Close */}
          <button
            className="absolute top-8 right-4 text-white z-10 p-2"
            onClick={() => setActiveIdx(null)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Nav prev */}
          {(activeIdx ?? 0) > 0 && (
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white z-10 p-4"
              onClick={(e) => { e.stopPropagation(); setActiveIdx((activeIdx ?? 0) - 1) }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Nav next */}
          {(activeIdx ?? 0) < stories.length - 1 && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white z-10 p-4"
              onClick={(e) => { e.stopPropagation(); setActiveIdx((activeIdx ?? 0) + 1) }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Media */}
          <div className="max-w-sm w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {active.media_type === 'video' ? (
              <video
                src={active.media_url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full max-h-[85vh] object-contain rounded-2xl"
              />
            ) : (
              <img
                src={active.media_url}
                alt={active.title ?? ''}
                className="w-full max-h-[85vh] object-contain rounded-2xl"
              />
            )}
            {active.title && (
              <p className="text-white text-center text-sm font-medium mt-3 px-4">{active.title}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
