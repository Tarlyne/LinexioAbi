import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  X,
  Trash2,
  Save,
  Settings,
  ChevronDown,
  Layers,
  AlertCircle,
  Check,
  Users,
  UserCheck,
  GraduationCap,
  BookOpen,
  MapPin,
  ShieldCheck,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Modal } from '../Modal';
import { Exam, Student, Teacher, Room, Subject } from '../../types';
import { useApp } from '../../context/AppContext';

interface ExamEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExam: Partial<Exam> | null;
  setEditingExam: (exam: any) => void;
  students: Student[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
  onSave: (e: React.FormEvent, applyToGroup: boolean) => void;
  onDelete: (id: string) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (val: boolean) => void;
}

type RoleType = 'teacherId' | 'protocolId' | 'chairId';

export const ExamEditorModal: React.FC<ExamEditorModalProps> = ({
  isOpen,
  onClose,
  editingExam,
  setEditingExam,
  students,
  teachers,
  rooms,
  subjects,
  onSave,
  onDelete,
  showDeleteConfirm,
  setShowDeleteConfirm,
}) => {
  const { exams, getTeacherStats } = useApp();
  const [applyToGroup, setApplyToGroup] = useState(true);
  const [activeRole, setActiveRole] = useState<RoleType>('teacherId');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showOthers, setShowOthers] = useState(false);

  // Synchronisiere Reset beim Öffnen
  useEffect(() => {
    if (isOpen) {
      setApplyToGroup(true);
      setActiveRole('teacherId');
      setTeacherSearch('');
      setShowOthers(false);
    }
  }, [isOpen]);

  const groupSiblings = useMemo(() => {
    if (!editingExam?.groupId || !editingExam?.subject || !editingExam?.teacherId) return [];
    return exams.filter(
      (e) =>
        e.groupId === editingExam.groupId &&
        e.subject === editingExam.subject &&
        e.teacherId === editingExam.teacherId &&
        e.id !== editingExam.id
    );
  }, [exams, editingExam]);

  const student = useMemo(
    () => students.find((s) => s.id === editingExam?.studentId),
    [students, editingExam?.studentId]
  );

  // Lehrer-Filtering Logik für die Matrix
  const filteredTeacherData = useMemo(() => {
    if (!editingExam?.subject) return { specialists: [], leadership: [], others: [] };

    const subjectObj = subjects.find((s) => s.name === editingExam.subject);
    const subjectId = subjectObj?.id;
    const term = teacherSearch.toLowerCase();

    const baseList = teachers
      .filter(
        (t) =>
          !term ||
          t.lastName.toLowerCase().includes(term) ||
          t.firstName.toLowerCase().includes(term) ||
          t.shortName.toLowerCase().includes(term)
      )
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));

    const specialists = baseList.filter((t) => t.subjectIds?.includes(subjectId || '---'));
    const leadership = baseList.filter((t) => t.isLeadership);
    const others = baseList.filter(
      (t) => !t.subjectIds?.includes(subjectId || '---') && !t.isLeadership
    );

    return { specialists, leadership, others };
  }, [teachers, subjects, editingExam?.subject, teacherSearch]);

  const getRoleColor = useCallback((role: RoleType) => {
    if (role === 'teacherId') return '#06b6d4'; // Cyan
    if (role === 'protocolId') return '#6366f1'; // Indigo
    if (role === 'chairId') return '#f59e0b'; // Amber
    return '#64748b';
  }, []);

  const handleTeacherClick = (teacherId: string) => {
    setEditingExam((prev: any) => {
      const isAlreadyThisRole = prev?.[activeRole] === teacherId;
      return {
        ...prev,
        [activeRole]: isAlreadyThisRole ? undefined : teacherId,
      };
    });
  };

  const currentRoleColor = getRoleColor(activeRole);

  const roles = [
    { id: 'teacherId' as RoleType, label: 'Prüfer' },
    { id: 'protocolId' as RoleType, label: 'Protokoll' },
    { id: 'chairId' as RoleType, label: 'Vorsitz' },
  ];

  const getDeletingItemName = () => {
    if (!editingExam?.studentId) return 'Prüfung';
    return student ? `${student.lastName}, ${student.firstName}` : 'Prüfung';
  };

  // Hilfsfunktion für das Rendering einer Lehrer-Karten-Struktur
  const renderTeacherCard = (teacher: Teacher) => {
    const assignedRole = (['teacherId', 'protocolId', 'chairId'] as RoleType[]).find(
      (r) => editingExam?.[r] === teacher.id
    );
    const isSelected = activeRole === assignedRole;
    const isUsedInOtherRole = assignedRole && assignedRole !== activeRole;

    const stats = getTeacherStats(teacher.id);
    const cardColor = assignedRole ? getRoleColor(assignedRole) : 'transparent';

    return (
      <button
        key={teacher.id}
        type="button"
        disabled={isUsedInOtherRole}
        onClick={() => handleTeacherClick(teacher.id)}
        className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-2.5 relative overflow-hidden group/card
          ${assignedRole
            ? 'shadow-lg scale-[1.02] z-10'
            : isUsedInOtherRole
              ? 'opacity-20 cursor-not-allowed border-slate-800'
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
          }
        `}
        style={
          assignedRole
            ? {
              borderColor: cardColor,
              backgroundColor: `${cardColor}26`, // 15% opacity
              boxShadow: isSelected ? `0 0 15px ${cardColor}40` : 'none',
            }
            : {}
        }
      >
        <span
          className={`text-[13.5px] font-bold truncate leading-tight flex-1 ${assignedRole ? 'text-white' : 'text-slate-200'}`}
        >
          {teacher.lastName}
        </span>

        <div
          className={`text-[10px] font-black px-1.5 py-0.5 rounded border transition-all shrink-0 ${assignedRole
            ? 'bg-white/10 border-white/10 text-white'
            : 'bg-slate-950/40 border-slate-800 text-slate-600'
            }`}
        >
          {Math.round(stats.points)}
        </div>
      </button>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-[1600px]">
      <div className="flex flex-col gap-6 min-h-[75vh] max-h-[90vh]">
        {/* HEADER SECTION */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
              {editingExam?.id?.startsWith('e-draft') ? (
                <UserCheck size={24} />
              ) : (
                <Settings size={24} />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Prüfung bearbeiten</h3>
              <p className="text-[11px] text-cyan-500/80 font-black uppercase tracking-widest">
                Details zur Prüfung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-all rounded-xl"
          >
            <X size={24} />
          </button>
        </div>

        {!showDeleteConfirm ? (
          <form onSubmit={(e) => onSave(e, applyToGroup)} className="flex-1 flex flex-col min-h-0">
            {/* SECTION 1: CORE DATA (4 COLUMNS) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-slate-900/30 border border-slate-800 rounded-2xl shrink-0 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 ml-1">
                  Prüfling
                </label>
                <div className="h-12 flex items-center px-4 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                  <span className="text-[13.5px] font-bold text-cyan-400">
                    {student ? `${student.lastName}, ${student.firstName}` : 'Unbekannt'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 ml-1">
                  Prüfungsfach
                </label>
                <div className="relative">
                  <select
                    className="w-full h-12 appearance-none bg-[#0a0f1d] border border-slate-700/50 rounded-xl pl-4 pr-10 text-[13.5px] font-bold text-white focus:ring-1 focus:ring-cyan-500/40 cursor-pointer"
                    onChange={(e) =>
                      setEditingExam((prev: any) => ({ ...prev, subject: e.target.value }))
                    }
                    value={editingExam?.subject || ''}
                  >
                    <option value="">Fach wählen...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"
                    size={18}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 ml-1">
                  Prüfungsblock
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={10}
                    value={editingExam?.groupId || ''}
                    onChange={(e) =>
                      setEditingExam((prev: any) => ({
                        ...prev,
                        groupId: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full h-12 bg-[#0a0f1d] border border-slate-700/50 rounded-xl px-4 text-[13.5px] font-bold text-indigo-400 focus:ring-1 focus:ring-indigo-500/40 placeholder:font-normal placeholder:text-slate-700"
                    placeholder="A"
                  />
                  <Layers
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 ml-1">
                  Gruppen-Status
                </label>
                {groupSiblings.length > 0 ? (
                  <div className="h-12 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex items-center justify-between px-4 animate-in slide-in-from-right-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users size={16} className="text-cyan-400 shrink-0" />
                      <span className="text-[10px] font-black text-white uppercase truncate">
                        {groupSiblings.length + 1}er Gruppe
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer group px-2 py-1 bg-slate-900/40 border border-slate-700/50 rounded-lg shrink-0">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        Daten übernehmen?
                      </span>
                      <input
                        type="checkbox"
                        checked={applyToGroup}
                        onChange={(e) => setApplyToGroup(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-8 h-5 rounded-full transition-all flex items-center px-1 border ${applyToGroup ? 'bg-cyan-600 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-800 border-slate-700'}`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full bg-white transition-all duration-300 transform ${applyToGroup ? 'translate-x-3' : 'translate-x-0'}`}
                        />
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="h-12 border border-slate-800/40 border-dashed rounded-xl flex items-center justify-center px-4">
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em]">
                      Einzelne Prüfung
                    </span>
                  </div>
                )}

                {/* Nachteilsausgleich + Sicherungsprüfung Toggles */}
                <div className="flex gap-2 mt-3">
                  <label className="flex-1 flex items-center gap-2 cursor-pointer group px-3 py-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/10 transition-all">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <AlertCircle size={14} className="text-indigo-500 shrink-0" />
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-tight">
                        NTA
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingExam?.hasNachteilsausgleich || false}
                      onChange={(e) =>
                        setEditingExam((prev: any) => ({
                          ...prev,
                          hasNachteilsausgleich: e.target.checked,
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-9 h-5 rounded-full transition-all flex items-center px-0.5 border ${editingExam?.hasNachteilsausgleich
                        ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                        : 'bg-slate-800 border-slate-700'
                        }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-all duration-300 transform ${editingExam?.hasNachteilsausgleich ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                      />
                    </div>
                  </label>

                  <label className="flex-1 flex items-center gap-2 cursor-pointer group px-3 py-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl hover:bg-amber-500/10 transition-all">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <ShieldCheck size={14} className="text-amber-500 shrink-0" />
                      <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest leading-tight">
                        Sicherung
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingExam?.isBackupExam || false}
                      onChange={(e) =>
                        setEditingExam((prev: any) => ({
                          ...prev,
                          isBackupExam: e.target.checked,
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-9 h-5 rounded-full transition-all flex items-center px-0.5 border ${editingExam?.isBackupExam
                        ? 'bg-amber-600 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-800 border-slate-700'
                        }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-all duration-300 transform ${editingExam?.isBackupExam ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 2: COMMISSION MATRIX */}
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex items-center justify-between shrink-0 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <Users size={16} />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                    Kommission wählen
                  </h4>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Auswahl:
                    </span>
                    <div className="flex gap-1.5">
                      {roles.map((role) => {
                        const tId = editingExam?.[role.id];
                        const teacher = teachers.find((t) => t.id === tId);
                        const roleColor = getRoleColor(role.id);
                        const placeholder = role.id === 'chairId' ? 'V' : 'P';

                        return (
                          <div
                            key={role.id}
                            className={`px-2 py-1 rounded-md border text-[10px] font-black transition-all duration-300 flex items-center justify-center min-w-[36px] h-7 ${teacher ? 'bg-white/5 border-solid' : 'border-dashed opacity-60'
                              }`}
                            style={{ borderColor: roleColor, color: roleColor }}
                          >
                            {teacher?.shortName || placeholder}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-px h-6 bg-slate-800" />

                  <div className="segmented-control-wrapper h-10 w-80">
                    <div
                      className="segmented-control-slider"
                      style={{
                        width: 'calc((100% - 6px) / 3)',
                        transform: `translateX(calc(${roles.findIndex((r) => r.id === activeRole)} * 100%))`,
                        background: currentRoleColor,
                        boxShadow: `0 4px 12px ${currentRoleColor}66`,
                      }}
                    />
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setActiveRole(role.id)}
                        className={`segmented-control-item text-[10px] ${activeRole === role.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-slate-950/40 border border-slate-800/60 rounded-3xl overflow-hidden shadow-inner">
                <div className="p-3 border-b border-slate-800/80 bg-slate-900/20 flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="Lehrkraft suchen..."
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 h-9 pl-9 pr-4 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-white/10"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scroll-smooth no-scrollbar">
                  <div className="grid grid-cols-[1fr_420px] gap-8 min-h-full items-stretch">
                    {/* LEFT COLUMN: SPECIALISTS + OTHERS OPTIONAL */}
                    <div className="space-y-6 flex flex-col">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 sticky top-0 bg-slate-950/0 backdrop-blur-sm pb-2 z-20">
                          <BookOpen size={14} className="text-cyan-500" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Fachlehrkräfte
                          </span>
                          <div className="h-px flex-1 bg-cyan-500/20 ml-2" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                          {filteredTeacherData.specialists.map((t) => renderTeacherCard(t))}
                          {filteredTeacherData.specialists.length === 0 && (
                            <div className="col-span-full py-4 text-[10px] text-slate-600 italic">
                              Keine Fachlehrer gefunden.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => setShowOthers(!showOthers)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${showOthers
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                        >
                          {showOthers ? <EyeOff size={14} /> : <Eye size={14} />}
                          {showOthers ? 'Fachfremde ausblenden' : 'Fachfremde einblenden'}
                        </button>
                      </div>

                      {showOthers && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 mt-4">
                          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-slate-950/0 backdrop-blur-sm pb-2 z-20">
                            <Users size={14} className="text-slate-500" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              Alle anderen Lehrkräfte
                            </span>
                            <div className="h-px flex-1 bg-slate-800 ml-2" />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filteredTeacherData.others.map((t) => renderTeacherCard(t))}
                          </div>
                        </div>
                      )}
                      <div className="flex-1" />
                    </div>

                    {/* RIGHT COLUMN: LEADERSHIP */}
                    <div className="space-y-4 border-l border-slate-800/40 pl-8 flex flex-col">
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-slate-950/0 backdrop-blur-sm pb-2 z-20">
                        <ShieldCheck size={14} className="text-amber-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Schulleitung
                        </span>
                        <div className="h-px flex-1 bg-amber-500/20 ml-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {filteredTeacherData.leadership.map((t) => renderTeacherCard(t))}
                      </div>
                      <div className="flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COMBINED FOOTER AREA: PREP ROOM & ACTIONS */}
            <div className="mt-8 pt-6 border-t border-slate-700/30 flex items-center justify-between gap-8 shrink-0">
              {/* LEFT: COMPACT PREP ROOM SELECTION */}
              <div className="flex-none w-fit flex items-center gap-5 bg-slate-900/30 border border-slate-800 rounded-2xl p-2.5">
                <div className="flex items-center gap-3 shrink-0 ml-1.5">
                  <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20 text-amber-500">
                    <MapPin size={16} />
                  </div>
                  <span className="text-sm font-black text-white uppercase tracking-[0.2em] leading-none">
                    Vorbereitungsraum:
                  </span>
                </div>

                <div className="w-px h-8 bg-slate-800 shrink-0" />

                <div className="flex flex-wrap gap-2.5">
                  {rooms
                    .filter((r) => r.type === 'Vorbereitungsraum')
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                    .map((room) => {
                      const isSelected = editingExam?.prepRoomId === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() =>
                            setEditingExam((prev: any) => ({
                              ...prev,
                              prepRoomId: isSelected ? undefined : room.id,
                            }))
                          }
                          className={`min-w-[100px] h-9 rounded-xl border flex items-center justify-center gap-2.5 transition-all duration-200 relative overflow-hidden group
                            ${isSelected
                              ? 'bg-amber-600 border-amber-500 text-white shadow-lg scale-105'
                              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800/60'
                            }
                          `}
                        >
                          <MapPin
                            size={12}
                            className={isSelected ? 'text-white' : 'text-slate-600'}
                          />
                          <span className="text-[11px] font-black uppercase tracking-wider">
                            {room.name}
                          </span>
                        </button>
                      );
                    })}
                  {rooms.filter((r) => r.type === 'Vorbereitungsraum').length === 0 && (
                    <span className="text-[10px] text-slate-600 italic">
                      Keine Vorbereitungsräume verfügbar.
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT: ACTION BUTTONS */}
              <div className="flex items-center gap-3 shrink-0">
                {editingExam?.id && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-5 h-14 flex items-center justify-center rounded-2xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all active:scale-95 gap-2 text-sm font-bold"
                  >
                    <Trash2 size={20} />
                    <span className="hidden sm:inline">Löschen</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="btn-primary-aurora px-8 h-14 rounded-2xl text-sm font-bold shadow-[0_10px_30px_-5px_rgba(8,145,178,0.4)]"
                >
                  <Save size={20} />
                  <span>Änderungen speichern</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-10 animate-in zoom-in-95 duration-200">
            <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
              <AlertCircle size={48} />
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-2xl font-black text-white tracking-tight">
                "{getDeletingItemName()}" löschen?
              </h4>
              <p className="text-slate-400 text-sm">
                Die Planung wird dauerhaft aus dem Kalender entfernt.
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button
                type="button"
                onClick={() => onDelete(editingExam!.id!)}
                className="btn-danger-aurora w-full h-16 rounded-2xl text-base uppercase tracking-[0.2em] font-black shadow-[0_10px_25px_-5px_rgba(220,38,38,0.4)]"
              >
                Unwiderruflich löschen
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary-glass w-full h-14 rounded-2xl text-xs font-bold uppercase tracking-widest border-slate-700"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
