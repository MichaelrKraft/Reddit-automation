'use client';

import { ReactNode } from 'react';

interface ShinyTextProps {
  children: ReactNode;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

const ShinyText = ({
  children,
  disabled = false,
  speed = 3,
  className = '',
}: ShinyTextProps) => {
  const shimmerGradient = `linear-gradient(
    110deg,
    #b8c4ce 0%,
    #e8ecf0 25%,
    #ffffff 45%,
    #e0f4ff 50%,
    #ffffff 55%,
    #e8ecf0 75%,
    #b8c4ce 100%
  )`;

  return (
    <span
      className={`${className}`}
      style={{
        display: 'inline-block',
        background: disabled ? 'none' : shimmerGradient,
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: disabled ? 'inherit' : 'transparent',
        color: disabled ? 'inherit' : 'transparent',
        animation: disabled ? 'none' : `shimmer ${speed}s ease-in-out infinite`,
      }}
    >
      {children}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: 100% center;
          }
          100% {
            background-position: -100% center;
          }
        }
      `}</style>
    </span>
  );
};

export default ShinyText;
