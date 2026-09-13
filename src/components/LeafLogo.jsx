import React from 'react';

export default function LeafLogo({ className = "w-10 h-10" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Leaf body */}
      <path
        d="M20 78C18 52 32 24 78 16C82 48 70 82 20 78Z"
        fill="#046A38"
      />
      {/* Leaf stem/curve */}
      <path
        d="M19 79C26 62 46 44 76 20"
        stroke="#E8F5E9"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Small side veins */}
      <path
        d="M38 54C46 51 52 50 56 46"
        stroke="#E8F5E9"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M52 40C60 37 66 35 70 30"
        stroke="#E8F5E9"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}
