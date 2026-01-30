import React from 'react';

interface GridTimeColumnProps {
  timeSlots: string[];
  slotHeight: number;
  renderSlot: (time: string, idx: number) => React.ReactNode;
  stickyLeft?: boolean;
  useFlexibleGrid?: boolean;
}

/**
 * Reusable Time Column for Planning and Stats Grids.
 * Supports fixed pixel height or flexible CSS Grid layout.
 */
export const GridTimeColumn: React.FC<GridTimeColumnProps> = ({
  timeSlots,
  slotHeight,
  renderSlot,
  stickyLeft = true,
  useFlexibleGrid = false,
}) => {
  const containerStyle = useFlexibleGrid
    ? {
        display: 'grid',
        gridTemplateRows: `repeat(${timeSlots.length}, minmax(${slotHeight}px, 1fr))`,
      }
    : {};

  return (
    <div
      className={`w-20 shrink-0 border-r border-slate-700/60 bg-slate-900/40 z-30 shadow-lg ${stickyLeft ? 'sticky left-0' : ''} ${useFlexibleGrid ? 'h-full' : ''}`}
      style={containerStyle}
    >
      {timeSlots.map((time, idx) => (
        <div
          key={time}
          style={!useFlexibleGrid ? { height: slotHeight } : {}}
          className="w-full flex items-center justify-center border-b border-slate-800/40 relative"
        >
          {renderSlot(time, idx)}
        </div>
      ))}
    </div>
  );
};
