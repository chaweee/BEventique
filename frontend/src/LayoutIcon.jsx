import React from 'react';

export default function LayoutIcon({ size = 18, color = 'white', bg = 'transparent' }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="3" y="3" width="7" height="7" fill={color} opacity="0.12" />
      <rect x="14" y="3" width="7" height="7" fill={color} opacity="0.12" />
      <rect x="3" y="14" width="7" height="7" fill={color} opacity="0.12" />
      <rect x="14" y="14" width="7" height="7" fill={color} opacity="0.12" />
      <path d="M3 10.5h18M10.5 3v18" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.95" />
    </svg>
  );
}
