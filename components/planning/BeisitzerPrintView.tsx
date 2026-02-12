import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import { minToTime, examSlotToMin, TIME_CONFIG } from '../../utils/TimeService';
import { PRINT_STYLES } from '../../utils/printStyles';
import { Exam } from '../../types';

interface BeisitzerPrintViewProps {
    activeDayIdx: number;
    isPreview?: boolean;
}

interface ExamBlock {
    subject: string;
    roomName: string;
    teacherShort: string;
    exams: Exam[];
}

export const BeisitzerPrintView: React.FC<BeisitzerPrintViewProps> = ({
    activeDayIdx,
    isPreview = false,
}) => {
    const { exams } = useApp();
    const { days, rooms, teachers, students } = useData();
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    const activeDay = days[activeDayIdx];

    const formattedDate = useMemo(() => {
        if (!activeDay) return { day: '', date: '' };
        const date = new Date(activeDay.date);
        return {
            day: new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(date),
            date: new Intl.DateTimeFormat('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            }).format(date),
        };
    }, [activeDay]);

    useEffect(() => {
        if (isPreview && containerRef.current) {
            const updateScale = () => {
                const parent = containerRef.current?.parentElement;
                if (parent) {
                    const parentWidth = parent.clientWidth - 48;
                    const targetWidth = 794;
                    setScale(parentWidth < targetWidth ? parentWidth / targetWidth : 1);
                }
            };
            updateScale();
            window.addEventListener('resize', updateScale);
            return () => window.removeEventListener('resize', updateScale);
        }
    }, [isPreview]);

    const examBlocks = useMemo(() => {
        if (!activeDay) return [];

        // 1. Filtern (Nur Tag, kein Backup)
        const dayExams = exams.filter(
            (e) =>
                e.startTime > 0 &&
                Math.floor((e.startTime - 1) / 1000) === activeDayIdx &&
                e.status !== 'cancelled' &&
                !e.isBackupExam
        );

        // 2. Gruppieren nach Raum & Fach
        const blocks: ExamBlock[] = [];
        const roomsList = rooms.filter(r => r.type === 'Prüfungsraum');

        roomsList.forEach(room => {
            const roomExams = dayExams
                .filter(e => e.roomId === room.id)
                .sort((a, b) => a.startTime - b.startTime);

            let currentBlockExams: Exam[] = [];

            roomExams.forEach((exam, idx) => {
                const prevExam = roomExams[idx - 1];

                // Block-Bruch wenn:
                // - Anderes Fach
                // - Zeitliche Lücke (> 0 Min Pause nach 30 Min Prüfung = 3 Slots)
                const isNewBlock = !prevExam ||
                    prevExam.subject !== exam.subject ||
                    (exam.startTime - prevExam.startTime > TIME_CONFIG.EXAM_DURATION_SLOTS);

                if (isNewBlock && currentBlockExams.length > 0) {
                    const first = currentBlockExams[0];
                    blocks.push({
                        subject: first.subject,
                        roomName: room.name,
                        teacherShort: teachers.find(t => t.id === first.teacherId)?.shortName || '?',
                        exams: currentBlockExams
                    });
                    currentBlockExams = [];
                }
                currentBlockExams.push(exam);
            });

            if (currentBlockExams.length > 0) {
                const first = currentBlockExams[0];
                blocks.push({
                    subject: first.subject,
                    roomName: room.name,
                    teacherShort: teachers.find(t => t.id === first.teacherId)?.shortName || '?',
                    exams: currentBlockExams
                });
            }
        });

        return blocks.sort((a, b) => a.exams[0].startTime - b.exams[0].startTime);
    }, [exams, rooms, teachers, activeDayIdx, activeDay]);

    if (!activeDay) return null;

    const currentYear = new Date(activeDay.date).getFullYear();
    const totalPages = Math.ceil(examBlocks.length / 2);
    const previewBlocks = examBlocks.slice(0, 2); // Nur erste Seite in der Vorschau

    return (
        <div
            className={isPreview ? 'w-full overflow-hidden flex flex-col items-center' : ''}
            style={isPreview ? { height: `${1123 * scale}px` } : {}}
        >
            {isPreview && totalPages > 1 && (
                <div className="mb-4 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full text-[10px] font-bold text-cyan-400 uppercase tracking-widest animate-pulse">
                    Vorschau: Seite 1 von {totalPages} (Alle Seiten werden exportiert)
                </div>
            )}

            <div
                ref={containerRef}
                className={
                    isPreview
                        ? 'bg-white text-black p-12 shadow-2xl mx-auto rounded-sm origin-top'
                        : 'text-black bg-white p-0 m-0 w-full min-h-screen'
                }
                style={
                    isPreview ? { width: '794px', minHeight: '1123px', transform: `scale(${scale})` } : {}
                }
            >
                <style>{PRINT_STYLES}</style>

                {previewBlocks.map((block, bIdx) => {
                    const isFirstInPage = bIdx % 2 === 0;

                    return (
                        <div
                            key={bIdx}
                            className={`flex flex-col border-b border-slate-100 pb-4 mb-4 last:border-0 ${isFirstInPage ? '' : 'pt-4'}`}
                            style={{ minHeight: '460px' }}
                        >
                            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-3">
                                <h1 className="text-xl font-bold">Abiturprüfungen {currentYear}</h1>
                                <div className="text-right">
                                    <span className="text-cyan-600 font-bold">{formattedDate.day}</span>
                                    <span className="ml-2 font-bold">{formattedDate.date}</span>
                                </div>
                            </div>

                            <div className="text-2xl font-black uppercase tracking-tight mb-4">
                                {block.subject}
                            </div>

                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2 bg-slate-100 p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raum: <span className="text-slate-900">{block.roomName}</span></span>
                                            <span className="text-[13px] font-black text-cyan-600 uppercase">Prüfer: {block.teacherShort}</span>
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-700 bg-white/50 py-1 px-2 rounded-md inline-block self-start border border-slate-200/50">
                                            Anzahl: {block.exams.length} {block.exams.length === 1 ? 'Prüfung' : 'Prüfungen'}
                                        </div>
                                    </div>

                                    <table className="w-full text-sm border-collapse mt-2">
                                        <thead>
                                            <tr className="border-b-2 border-slate-900">
                                                <th className="text-left py-2 w-24">Uhrzeit</th>
                                                <th className="text-left py-2">Prüfling</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {block.exams.map((exam) => (
                                                <tr key={exam.id} className="border-b border-slate-100">
                                                    <td className="py-2.5 font-mono text-base">
                                                        {minToTime(examSlotToMin(exam.startTime))}
                                                    </td>
                                                    <td className="py-2.5 font-bold text-base uppercase tracking-widest pl-2">
                                                        {students.find(s => s.id === exam.studentId)?.lastName.substring(0, 3) || '???'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-2 border-slate-300 rounded-2xl p-6 bg-slate-50/30">
                                    <h3 className="text-lg font-black mb-4 border-b-2 border-slate-900 pb-1 uppercase tracking-wider">Beisitzer:</h3>
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {[1, 2, 3, 4, 5, 6].map(num => (
                                                <tr key={num}>
                                                    <td className="py-2.5 w-10 font-bold text-base">{num}.</td>
                                                    <td className="py-2.5 border-b-2 border-slate-200"></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Page break logic for preview (subtle dashed line) */}
                            {isFirstInPage && previewBlocks.length > 1 && (
                                <div className="mt-8 border-t-2 border-dashed border-slate-200 w-full opacity-60"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
