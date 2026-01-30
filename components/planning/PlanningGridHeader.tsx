import React from 'react';
import { Clock } from 'lucide-react';
import { Room } from '../../types';

interface PlanningGridHeaderProps {
  rooms: Room[];
}

/**
 * Header row for the Planning Grid showing room names.
 * Category B Refactoring: Modularization.
 */
export const PlanningGridHeader: React.FC<PlanningGridHeaderProps> = ({ rooms }) => {
  return (
    <div className="sticky top-0 z-40 flex bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/60 shadow-xl h-[44px] min-w-max w-full">
      <div className="w-20 shrink-0 border-r border-slate-700/60 flex items-center justify-center bg-slate-900 sticky left-0 z-50">
        <Clock size={16} className="text-slate-500" />
      </div>
      {rooms.map((room) => (
        <div
          key={room.id}
          className="min-w-[180px] flex-1 px-4 py-3 border-r border-slate-700/40 text-center truncate"
        >
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">
            {room.name}
          </span>
        </div>
      ))}
    </div>
  );
};
