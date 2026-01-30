import React from 'react';

interface LinexioLogoIconProps extends React.SVGProps<SVGSVGElement> {
  secondaryColor?: string;
}

/**
 * LinexioAbi Branding Icon
 * Kombination aus der geometrischen Linexio-Form und dem Abitur-"A".
 */
export const LinexioLogoIcon: React.FC<LinexioLogoIconProps> = ({
  className = 'w-7 h-7',
  ...props
}) => (
  <svg
    className={className}
    viewBox="0 0 270.93333 270.93333"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient id="logoGradientAbi">
        <stop offset="0.158" stopColor="#22d3ee" />
        <stop offset="0.570" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient
        id="logoGradientAbiText"
        x1="117.68"
        y1="121.68"
        x2="166.11"
        y2="121.68"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0.158" stopColor="#22d3ee" />
        <stop offset="0.570" stopColor="#f59e0b" />
      </linearGradient>
    </defs>

    <g>
      {/* Geometrische Grundform (Linexio-Style) */}
      <path
        stroke="#22d3ee"
        strokeWidth="4.1"
        fill="none"
        d="m 62.584546,45.554174 0.328916,166.313296 141.764338,0.65737 -38.81249,-38.12716 h -64.79717 l 0.32891,-90.71636 z"
      />
      <path
        stroke="#22d3ee"
        strokeWidth="4.1"
        fill="none"
        d="M 165.53639,212.52484 62.255627,109.31859"
      />

      {/* Das "A" für Abitur-Branding */}
      <text
        x="114.93772"
        y="147.99986"
        style={{
          fontStyle: 'normal',
          fontWeight: 'normal',
          fontSize: '74.461px',
          fontFamily: "'Comic Sans MS', cursive",
          fill: 'none',
          stroke: 'url(#logoGradientAbiText)',
          strokeWidth: '4.0398',
        }}
      >
        <tspan x="114.93772" y="147.99986">
          A
        </tspan>
      </text>
    </g>
  </svg>
);
