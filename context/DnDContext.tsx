import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Portal } from '../components/Portal';

interface PointerPosition {
  x: number;
  y: number;
}

interface DragState {
  id: string;
  type: 'exam' | 'teacher';
  startPos: PointerPosition;
  currentPos: PointerPosition;
  extraData?: any;
  ghostContent?: React.ReactNode;
  isDraggingStarted: boolean;
}

interface DnDContextType {
  activeDrag: DragState | null;
  startDrag: (
    id: string,
    type: 'exam' | 'teacher',
    event: React.PointerEvent,
    extraData?: any,
    ghostContent?: React.ReactNode
  ) => void;
  dropTarget: { element: HTMLElement; info: any } | null;
}

const DnDContext = createContext<DnDContextType | undefined>(undefined);

export const DnDProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDrag, setActiveDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ element: HTMLElement; info: any } | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const startDrag = useCallback(
    (
      id: string,
      type: 'exam' | 'teacher',
      event: React.PointerEvent,
      extraData?: any,
      ghostContent?: React.ReactNode
    ) => {
      const newState: DragState = {
        id,
        type,
        startPos: { x: event.clientX, y: event.clientY },
        currentPos: { x: event.clientX, y: event.clientY },
        extraData,
        ghostContent,
        isDraggingStarted: false,
      };

      dragRef.current = newState;
      setActiveDrag(newState);
    },
    []
  );

  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;

      const dx = e.clientX - dragRef.current.startPos.x;
      const dy = e.clientY - dragRef.current.startPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const isTouch = e.pointerType === 'touch';

      // RICHTUNGS-ERKENNUNG FÜR TOUCH:
      // Statt nur Pixel zu zählen, prüfen wir die Intention.
      // - Startet nur bei Mindestdistanz (8px Touch, 3px Maus)
      // - Bei Touch: Nur wenn Bewegung deutlich horizontal ist
      const minDistance = isTouch ? 8 : 3;
      const hasMovedEnough = distance > minDistance;

      let shouldStartDrag = dragRef.current.isDraggingStarted;

      if (!shouldStartDrag && hasMovedEnough) {
        if (isTouch) {
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);

          // Wenn vertikale Bewegung dominiert -> Scroll-Intention!
          // Wir ignorieren das Event für D&D und lassen den Browser scrollen
          // (dank touch-action: pan-y)
          if (absY * 1.5 > absX) {
            return;
          }
          // Wenn horizontal dominiert -> Drag-Intention!
          shouldStartDrag = true;
        } else {
          // Maus: Einfacher Threshold reicht
          shouldStartDrag = true;
        }
      }

      const nextState = {
        ...dragRef.current,
        currentPos: { x: e.clientX, y: e.clientY },
        isDraggingStarted: shouldStartDrag,
      };

      dragRef.current = nextState;
      setActiveDrag(nextState);

      if (nextState.isDraggingStarted) {
        const elementUnder = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        const target = elementUnder?.closest('[data-drop-zone="true"]') as HTMLElement;

        if (target) {
          try {
            const info = JSON.parse(target.getAttribute('data-drop-info') || '{}');
            setDropTarget({ element: target, info });
          } catch (err) {
            setDropTarget(null);
          }
        } else {
          setDropTarget(null);
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const currentDrag = dragRef.current;

      const elementUnder = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      const finalTargetElement = elementUnder?.closest('[data-drop-zone="true"]') as HTMLElement;

      if (currentDrag.isDraggingStarted && finalTargetElement) {
        try {
          const info = JSON.parse(finalTargetElement.getAttribute('data-drop-info') || '{}');
          if (info.onDrop) {
            const dropEvent = new CustomEvent('linexio-drop', {
              detail: {
                dragId: currentDrag.id,
                dragType: currentDrag.type,
                extraData: currentDrag.extraData,
                dropInfo: info,
              },
              bubbles: true,
            });
            finalTargetElement.dispatchEvent(dropEvent);
          }
        } catch (err) {
          console.error('Drop event dispatch failed', err);
        }
      }

      dragRef.current = null;
      setActiveDrag(null);
      setDropTarget(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { capture: true });
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp, { capture: true });
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeDrag]);

  return (
    <DnDContext.Provider value={{ activeDrag, startDrag, dropTarget }}>
      {children}
      {activeDrag?.isDraggingStarted && <DragGhost state={activeDrag} />}
    </DnDContext.Provider>
  );
};

const DragGhost: React.FC<{ state: DragState }> = ({ state }) => {
  const isGroup = state.type === 'exam' && state.extraData?.groupCount > 1;

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          left: state.currentPos.x,
          top: state.currentPos.y,
          transform: 'translate(-50%, -50%) scale(0.85)',
          pointerEvents: 'none',
          zIndex: 99999,
          opacity: 0.9,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {state.ghostContent ? (
          <div className="relative shadow-2xl ring-2 ring-cyan-500 rounded-xl overflow-hidden bg-[#1e293b] pointer-events-none">
            {state.ghostContent}
            {isGroup && (
              <div className="absolute top-0 right-0 p-1">
                <div className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg shadow-lg border border-indigo-400 animate-in zoom-in-50">
                  BLÖCK-DROP: {state.extraData.groupCount}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-800 border-2 border-cyan-500 rounded-xl px-4 py-2 shadow-2xl flex items-center gap-2 pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {isGroup
                ? `${state.extraData.groupCount} Prüfungen ziehen`
                : `Ziehe ${state.type === 'exam' ? 'Prüfung' : 'Lehrer'}`}
            </span>
          </div>
        )}
      </div>
    </Portal>
  );
};

export const useDnD = () => {
  const context = useContext(DnDContext);
  if (!context) throw new Error('useDnD must be used within DnDProvider');
  return context;
};
