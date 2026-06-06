'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'

type VantaEffect = {
  destroy: () => void
}

declare global {
  interface Window {
    THREE?: {
      Color?: unknown
    }
    VANTA?: {
      CLOUDS?: (options: Record<string, unknown>) => VantaEffect
    }
  }
}

const threeSrc = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js'
const vantaSrc = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.clouds.min.js'

export function HeroCloudBackground() {
  const backgroundRef = useRef<HTMLDivElement>(null)
  const effectRef = useRef<VantaEffect | null>(null)
  const [threeReady, setThreeReady] = useState(false)
  const [vantaReady, setVantaReady] = useState(false)

  useEffect(() => {
    if (window.THREE?.Color) setThreeReady(true)
    if (window.VANTA?.CLOUDS) setVantaReady(true)
  }, [])

  useEffect(() => {
    if (!backgroundRef.current || effectRef.current || !threeReady || !vantaReady || !window.THREE?.Color || !window.VANTA?.CLOUDS) {
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    effectRef.current = window.VANTA.CLOUDS({
      el: backgroundRef.current,
      THREE: window.THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      backgroundColor: 0xffffff,
      skyColor: 0x68b8d7,
      cloudColor: 0xacd1de,
      cloudShadowColor: 0x183550,
      sunColor: 0xff9919,
      sunGlareColor: 0xff6633,
      sunlightColor: 0xff9933,
      speed: 1.0,
      scale: 1.0,
      scaleMobile: 0.9,
    })

    return () => {
      effectRef.current?.destroy()
      effectRef.current = null
    }
  }, [threeReady, vantaReady])

  return (
    <>
      <Script id="three-r121" src={threeSrc} strategy="afterInteractive" onReady={() => setThreeReady(Boolean(window.THREE?.Color))} />
      <Script id="vanta-clouds" src={vantaSrc} strategy="afterInteractive" onReady={() => setVantaReady(true)} />
      <div ref={backgroundRef} aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden bg-[#68b8d7]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(255,255,255,0.74)_0%,rgba(255,255,255,0.38)_43%,rgba(255,255,255,0.03)_100%)]"
      />
    </>
  )
}
