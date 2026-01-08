import React from 'react';

interface LinexioLogoIconProps extends React.SVGProps<SVGSVGElement> {
  secondaryColor?: string;
}

/**
 * Linexio Branding Icon
 * Geometrisches Doppel-L Design für die Markenidentität.
 */
export const LinexioLogoIcon: React.FC<LinexioLogoIconProps> = ({ 
  secondaryColor = '#06b6d4', 
  className = "w-7 h-7", 
  ...props 
}) => (
  <svg 
    className={className} 
    viewBox="50 30 65 75" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    {...props}
  >
    <g strokeLinecap="round" strokeLinejoin="round">
      {/* Outer L - Akzentfarbe (Cyan) */}
      <path
        stroke={secondaryColor}
        strokeWidth="2.5"
        d="m 54.971722,35.248072 0.127248,64.388173 54.84447,0.2545 L 94.928019,85.129819 H 69.859897 l 0.127249,-35.120823 z"
        className="opacity-90"
      />
      <path
        stroke={secondaryColor}
        strokeWidth="2.5"
        d="M 94.800771,99.890745 54.844473,59.934448"
        className="opacity-70"
      />
      {/* Inner L - Primärfarbe (weißlich/slate) */}
      <path
        stroke="currentColor"
        strokeWidth="2.2"
        d="m 66.492648,34.678024 0.101334,53.606363 43.675148,0.21188 -11.95746,-12.28921 H 78.348781 l 0.101335,-29.239829 z"
      />
      <path
        stroke="currentColor"
        strokeWidth="2.2"
        d="M 98.716752,88.748345 66.902899,55.105832"
      />
    </g>
  </svg>
);
