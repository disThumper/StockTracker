// Command Shield Logo Component
export function Logo({ size = 128 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0f2847' }} />
          <stop offset="100%" style={{ stopColor: '#0a1a30' }} />
        </linearGradient>
        <linearGradient id="shield-gradient" x1="0%" y1="14%" x2="0%" y2="88%">
          <stop offset="0%" style={{ stopColor: 'rgba(59,130,246,0.15)' }} />
          <stop offset="100%" style={{ stopColor: 'rgba(59,130,246,0.03)' }} />
        </linearGradient>
      </defs>

      {/* Background Circle */}
      <circle cx="256" cy="256" r="235.52" fill="url(#bg-gradient)" />

      {/* Shield Shape */}
      <path
        d="M 256,71.68 L 419.84,153.6 L 419.84,296.96 Q 419.84,399.36 256,450.56 Q 92.16,399.36 92.16,296.96 L 92.16,153.6 Z"
        fill="url(#shield-gradient)"
        stroke="#3b82f6"
        strokeWidth="12.8"
      />

      {/* Chevron */}
      <path
        d="M 153.6,215.04 L 256,276.48 L 358.4,215.04"
        stroke="#60a5fa"
        strokeWidth="17.92"
        strokeLinecap="round"
        fill="none"
      />

      {/* PC Text */}
      <text
        x="256"
        y="348.16"
        fontFamily="Arial"
        fontSize="81.92"
        fontWeight="bold"
        fill="#e0e8ff"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        PC
      </text>
    </svg>
  );
}
