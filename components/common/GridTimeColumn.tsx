import React from 'react';
import { Clock } from 'lucide-react';

interface GridTimeColumnProps {
  timeSlots: string[];
  slotHeight: number;
  renderSlot: (time: string, idx: number) => React.ReactNode;
  stickyLeft?: boolean;
}

/**
 * Reusable Time Column for Planning and Stats Grids.
 * Category B Refactoring: Modularization.
 */
export const GridTimeColumn: React.FC<GridTimeColumnProps> = ({ 
  timeSlots, 
  slotHeight, 
  renderSlot,
  stickyLeft = true
}) => {
  return (
    <div className={`w-20 shrink-0 border-r border-slate-700/60 bg-slate-900/40 z-30 shadow-lg ${stickyLeft ? 'sticky left-0' : ''}`}>
      {timeSlots.map((time, idx) => (
        <div 
          key={time} 
          style={{ height: slotHeight }}
          className="w-full flex items-center justify-center border-b border-slate-800/40 relative"
        >
          {renderSlot(time, idx)}
        </div>
      ))}
    </div>
  );
};
