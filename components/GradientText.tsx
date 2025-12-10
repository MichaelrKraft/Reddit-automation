'use client';

import { ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
}

export default function GradientText({
  children,
  className = '',
  colors = ['#2563eb', '#7c3aed', '#db2777', '#2563eb'],
  animationSpeed = 8,
  showBorder = false
}: GradientTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(', ')})`,
    animationDuration: `${animationSpeed}s`
  };

  return (
    <span className={`animated-gradient-text ${className}`}>
      {showBorder && <span className="gradient-overlay" style={gradientStyle}></span>}
      <span className="text-content" style={gradientStyle}>
        {children}
      </span>
      <style jsx>{`
        .animated-gradient-text {
          position: relative;
          display: inline-flex;
          max-width: fit-content;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .gradient-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-size: 300% 100%;
          animation: gradient linear infinite;
          border-radius: inherit;
          z-index: 0;
          pointer-events: none;
        }

        .gradient-overlay::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          border-radius: inherit;
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          background-color: #060010;
          z-index: -1;
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .text-content {
          display: inline-block;
          position: relative;
          z-index: 2;
          background-size: 300% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: gradient linear infinite;
        }
      `}</style>
    </span>
  );
}
