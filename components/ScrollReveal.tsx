'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
}

export default function ScrollReveal({ children, className = '' }: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const revealElements = container.querySelectorAll('.reveal-up')

    // Set initial state - hidden and translated down
    gsap.set(revealElements, {
      opacity: 0,
      y: '100%',
    })

    // Get all sections within this container
    const sections = container.querySelectorAll('section')

    sections.forEach((sec) => {
      const elementsInSection = sec.querySelectorAll('.reveal-up')
      if (elementsInSection.length === 0) return

      gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: '10% 80%',
          end: '20% 90%',
          toggleActions: 'play none none none',
        }
      }).to(elementsInSection, {
        opacity: 1,
        duration: 0.8,
        y: '0%',
        stagger: 0.2,
        ease: 'power2.out',
      })
    })

    // Also handle reveal-up elements that might not be in sections
    const standaloneElements = container.querySelectorAll('.reveal-up:not(section .reveal-up)')
    standaloneElements.forEach((el) => {
      gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: '10% 80%',
          end: '20% 90%',
          toggleActions: 'play none none none',
        }
      }).to(el, {
        opacity: 1,
        duration: 0.8,
        y: '0%',
        ease: 'power2.out',
      })
    })

    // Cleanup on unmount
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}
