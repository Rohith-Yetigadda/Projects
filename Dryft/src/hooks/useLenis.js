import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

let lenisInstance = null

export function getLenis() {
  return lenisInstance
}

export function useLenis() {
  const rafRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo ease-out
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      smoothTouch: false,
      touchMultiplier: 2,
    })

    lenisInstance = lenis

    function raf(time) {
      lenis.raf(time)
      rafRef.current = requestAnimationFrame(raf)
    }

    rafRef.current = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafRef.current)
      lenis.destroy()
      lenisInstance = null
    }
  }, [])
}
