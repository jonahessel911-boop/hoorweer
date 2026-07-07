interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ size = 'md' }: LogoProps) {
  const fontSize = size === 'lg' ? '2rem' : size === 'sm' ? '1.1rem' : '1.5rem';
  const svgHeight = size === 'lg' ? 36 : size === 'sm' ? 22 : 28;

  return (
    <div className="logo" style={{ fontSize }}>
      <span className="logo-hd">HD</span>
      <span className="logo-waves">
        <svg viewBox="0 0 40 28" fill="none" style={{ height: svgHeight }}>
          <path
            d="M4 14 Q12 4, 20 14 T36 14"
            stroke="#2563EB"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M8 14 Q14 8, 20 14 T32 14"
            stroke="#93B4F5"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </div>
  );
}
