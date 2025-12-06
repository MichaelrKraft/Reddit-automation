'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// Typewriter component
function TypewriterText({ texts, speed = 100, delay = 2000 }: { texts: string[], speed?: number, delay?: number }) {
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[textIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < currentText.length) {
          setDisplayText(currentText.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          setTimeout(() => setIsDeleting(true), delay);
        }
      } else {
        if (charIndex > 0) {
          setDisplayText(currentText.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setTextIndex((textIndex + 1) % texts.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex, texts, speed, delay]);

  return (
    <span>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

export default function Home() {
  const [logoAnimated, setLogoAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoAnimated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-8 overflow-hidden bg-bg-primary">
      {/* Dot Grid Background */}
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-4">
        <div 
          className={`text-7xl transition-all duration-1000 ease-out ${
            logoAnimated 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-[0.01]'
          }`}
          style={{
            transformOrigin: 'center',
            transform: logoAnimated ? 'perspective(1000px) translateZ(0)' : 'perspective(1000px) translateZ(-500px)',
          }}
        >
          <span className="logo-glow inline-block">🤖</span>
        </div>
      </div>

      {/* Title with Typewriter */}
      <h1 
        className="relative z-10 shimmer-text mb-2 text-4xl sm:text-5xl lg:text-6xl text-center font-extrabold"
        style={{
          letterSpacing: '-0.02em'
        }}
      >
        <TypewriterText
          texts={[
            'ReddRider',
            'Automate Reddit',
            'Grow Your Reach'
          ]}
          speed={100}
          delay={2000}
        />
      </h1>

      {/* Subtitle */}
      <p className="relative z-10 gradient-text text-lg sm:text-xl mb-8 text-center font-semibold max-w-md">
        AI-Powered Reddit Marketing Automation
      </p>

      {/* CTA Button */}
      <div className="relative z-10 flex flex-col gap-4 mb-10 w-full max-w-sm">
        <Link 
          href="/dashboard"
          className="glass-button flex items-center justify-center gap-3 px-6 py-4 rounded-lg text-gray-300 text-lg font-medium"
        >
          Go to Dashboard →
        </Link>
      </div>

      {/* Feature Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        <Link href="/dashboard/new-post" className="feature-card rounded-lg p-6 cursor-pointer">
          <h2 className="text-xl font-semibold mb-2 text-white">📅 Post Scheduling</h2>
          <p className="text-sm text-gray-400">Schedule posts to multiple subreddits</p>
        </Link>
        <Link href="/dashboard/viral" className="feature-card rounded-lg p-6 cursor-pointer">
          <h2 className="text-xl font-semibold mb-2 text-white">🤖 AI Content</h2>
          <p className="text-sm text-gray-400">Generate engaging content with AI</p>
        </Link>
        <Link href="/dashboard/discover" className="feature-card rounded-lg p-6 cursor-pointer">
          <h2 className="text-xl font-semibold mb-2 text-white">🔍 Discovery</h2>
          <p className="text-sm text-gray-400">Find relevant subreddits automatically</p>
        </Link>
        <Link href="/dashboard/comments" className="feature-card rounded-lg p-6 cursor-pointer">
          <h2 className="text-xl font-semibold mb-2 text-white">💬 Auto-Replies</h2>
          <p className="text-sm text-gray-400">Engage with comments automatically</p>
        </Link>
        <Link href="/dashboard/analytics" className="feature-card rounded-lg p-6 cursor-pointer">
          <h2 className="text-xl font-semibold mb-2 text-white">📊 Analytics</h2>
          <p className="text-sm text-gray-400">Track performance and engagement</p>
        </Link>
        <Link href="/dashboard/timing" className="feature-card rounded-lg p-6 cursor-pointer">
          <h2 className="text-xl font-semibold mb-2 text-white">⏰ Optimal Timing</h2>
          <p className="text-sm text-gray-400">Post at the best times for engagement</p>
        </Link>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-12 text-center">
        <p className="text-sm text-gray-500">
          Powered by Next.js, Gemini AI, and PostgreSQL
        </p>
      </div>
    </main>
  );
}
