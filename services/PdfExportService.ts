import { jsPDF } from 'jspdf';
import { AppState, Room, Exam, Supervision } from '../types';
import { minToTime, examSlotToMin } from '../utils/TimeService';

/**
 * PDF Export Service (Native Drawing Engine)
 * Modularized Architecture V5.0 - Category B Stability
 */

// Central Style Configuration
const PDF_CONFIG = {
  marginX: 15,
  marginY: 20,
  pageWidth: 210,
  pageHeight: 297,
  rowHeight: 6.8,
  cyanRGB: [6, 182, 212] as [number, number, number],
  headerFontSize: 15,
  tableFontSize: 9,
  footerFontSize: 7.5,
};

export const PdfExportService = {
  // --- INTERNAL HELPERS ---

  _drawFooter(pdf: jsPDF) {
    const now = new Date();
    const footerText = `Erstellt mit LinexioAbi am ${now.toLocaleDateString('de-DE')}, ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;

    pdf.setFontSize(PDF_CONFIG.footerFontSize);
    pdf.setTextColor(120);
    pdf.setFont('helvetica', 'italic');
    const x = pdf.internal.pageSize.getWidth() - PDF_CONFIG.marginX;
    const y = pdf.internal.pageSize.getHeight() - 10;
    pdf.text(footerText, x, y, { align: 'right' });
  },

  _drawHeader(pdf: jsPDF, prefix: string, coloredPart: string, dateStr: string) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const currentY = PDF_CONFIG.marginY;

    pdf.setFontSize(PDF_CONFIG.headerFontSize);
    pdf.setFont('helvetica', 'bold');

    pdf.setTextColor(0);
    pdf.text(prefix, PDF_CONFIG.marginX, currentY);
    const prefixWidth = pdf.getTextWidth(prefix);

    pdf.setTextColor(PDF_CONFIG.cyanRGB[0], PDF_CONFIG.cyanRGB[1], PDF_CONFIG.cyanRGB[2]);
    pdf.text(coloredPart, PDF_CONFIG.marginX + prefixWidth, currentY);

    pdf.setFontSize(11);
    pdf.setTextColor(0);
    pdf.text(dateStr, pageWidth - PDF_CONFIG.marginX, currentY, { align: 'right' });

    pdf.setLineWidth(0.5);
    pdf.setDrawColor(0);
    pdf.line(PDF_CONFIG.marginX, currentY + 3, pageWidth - PDF_CONFIG.marginX, currentY + 3);

    return currentY + 12;
  },

  _drawCell(
    pdf: jsPDF,
    text: string,
    x: number,
    y: number,
    width: number,
    align: 'left' | 'center' = 'center',
    isBold = false
  ) {
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    const rowH = PDF_CONFIG.rowHeight;
    const centerX = align === 'center' ? x + width / 2 : x + 2;
    pdf.text(text || '-', centerX, y + rowH / 2, { align, baseline: 'middle' });
  },

  // --- PUBLIC API ---

  async generateAndDownload(
    state: AppState,
    activeDayIdx: number,
    filename: string
  ): Promise<void> {
    const activeDay = state.days[activeDayIdx];
    if (!activeDay) return;

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const colWidths = [18, 15, 15, 55, 35, 14, 14, 14];
    const colLabels = ['Zeit', 'Vorb.', 'Raum', 'Prüfling', 'Fach', 'Prüfer', 'Prot.', 'Vorsitz'];
    const contentWidth = PDF_CONFIG.pageWidth - 2 * PDF_CONFIG.marginX;

    const dateStr = new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(activeDay.date));
    let currentY = this._drawHeader(pdf, `Mündliches Abitur: `, `Prüfungsplan`, dateStr);

    const drawTableHeader = (y: number) => {
      pdf.setFillColor(243, 244, 246);
      pdf.rect(PDF_CONFIG.marginX, y, contentWidth, 8, 'F');
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.1);
      pdf.rect(PDF_CONFIG.marginX, y, contentWidth, 8, 'D');
      let x = PDF_CONFIG.marginX;
      pdf.setFontSize(8);
      colLabels.forEach((label, i) => {
        pdf.setFont('helvetica', 'bold');
        const centerX = i >= 3 && i <= 4 ? x + 2 : x + colWidths[i] / 2;
        pdf.text(label, centerX, y + 4, {
          align: i >= 3 && i <= 4 ? 'left' : 'center',
          baseline: 'middle',
        });
        if (i < colLabels.length - 1) {
          x += colWidths[i];
          pdf.line(x, y, x, y + 8);
        }
      });
      return y + 8;
    };

    currentY = drawTableHeader(currentY);

    const roomsWithExams = state.rooms
      .filter((r) => r.type === 'Prüfungsraum')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((room) => ({
        room,
        exams: state.exams
          .filter(
            (e) =>
              e.startTime > 0 &&
              Math.floor((e.startTime - 1) / 1000) === activeDayIdx &&
              e.roomId === room.id &&
              e.status !== 'cancelled'
          )
          .sort((a, b) => a.startTime - b.startTime),
      }))
      .filter((g) => g.exams.length > 0);

    roomsWithExams.forEach((group, gIdx) => {
      let zebra = false;
      let lastComm = '';
      group.exams.forEach((exam, eIdx) => {
        if (currentY + PDF_CONFIG.rowHeight > PDF_CONFIG.pageHeight - 20) {
          pdf.addPage();
          currentY = drawTableHeader(PDF_CONFIG.marginY);
        }
        const comm = `${exam.teacherId}-${exam.chairId}-${exam.protocolId}`;
        if (eIdx === 0) {
          lastComm = comm;
          zebra = false;
        } else if (comm !== lastComm) {
          zebra = !zebra;
          lastComm = comm;
        }
        if (zebra) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(PDF_CONFIG.marginX, currentY, contentWidth, PDF_CONFIG.rowHeight, 'F');
        }
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.1);
        pdf.rect(PDF_CONFIG.marginX, currentY, contentWidth, PDF_CONFIG.rowHeight, 'D');

        let x = PDF_CONFIG.marginX;
        pdf.setFontSize(9.5);
        this._drawCell(
          pdf,
          minToTime(examSlotToMin(exam.startTime)),
          x,
          currentY,
          colWidths[0],
          'center',
          true
        );
        x += colWidths[0];
        pdf.line(x, currentY, x, currentY + PDF_CONFIG.rowHeight);
        pdf.setFontSize(9);
        this._drawCell(
          pdf,
          state.rooms.find((r) => r.id === exam.prepRoomId)?.name || '-',
          x,
          currentY,
          colWidths[1]
        );
        x += colWidths[1];
        pdf.line(x, currentY, x, currentY + PDF_CONFIG.rowHeight);
        pdf.setFontSize(9);
        this._drawCell(pdf, group.room.name, x, currentY, colWidths[2]);
        x += colWidths[2];
        pdf.line(x, currentY, x, currentY + PDF_CONFIG.rowHeight);
        pdf.setFontSize(9.5);
        this._drawCell(
          pdf,
          state.students.find((s) => s.id === exam.studentId)?.lastName || '???',
          x,
          currentY,
          colWidths[3],
          'left',
          true
        );
        x += colWidths[3];
        pdf.line(x, currentY, x, currentY + PDF_CONFIG.rowHeight);
        pdf.setFontSize(8.5);
        const isComb = state.subjects.find((s) => s.name === exam.subject)?.isCombined;
        this._drawCell(
          pdf,
          `${exam.subject}${isComb ? '*' : ''}`,
          x,
          currentY,
          colWidths[4],
          'left'
        );
        x += colWidths[4];
        pdf.line(x, currentY, x, currentY + PDF_CONFIG.rowHeight);
        pdf.setFontSize(isComb ? 6.5 : 8);
        const t = state.teachers.find((t) => t.id === exam.teacherId)?.shortName || '-';
        const p = state.teachers.find((t) => t.id === exam.protocolId)?.shortName || '-';
        const c = state.teachers.find((t) => t.id === exam.chairId)?.shortName || '-';
        this._drawCell(pdf, isComb ? `${t}/${p}` : t, x, currentY, colWidths[5]);
        x += colWidths[5];
        pdf.line(x, currentY, x, currentY + PDF_CONFIG.rowHeight);
        this._drawCell(pdf, isComb ? `${t}/${p}` : p, x, currentY, colWidths[6]);
        x += colWidths[6];
        pdf.line(x, currentY, x, currentY + PDF_CONFIG.rowHeight);
        this._drawCell(pdf, c, x, currentY, colWidths[7]);
        currentY += PDF_CONFIG.rowHeight;
      });
      if (gIdx < roomsWithExams.length - 1) currentY += 5;
    });

    this._drawFooter(pdf);
    pdf.save(`${filename}.pdf`);
  },

  async generatePrepRoomPdf(
    state: AppState,
    activeDayIdx: number,
    filename: string
  ): Promise<void> {
    const activeDay = state.days[activeDayIdx];
    if (!activeDay) return;

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const contentWidth = PDF_CONFIG.pageWidth - 2 * PDF_CONFIG.marginX;

    const dayExams = state.exams.filter(
      (e) =>
        e.startTime > 0 &&
        Math.floor((e.startTime - 1) / 1000) === activeDayIdx &&
        e.status !== 'cancelled' &&
        e.prepRoomId
    );
    const examsByPrepRoom: Record<string, Exam[]> = {};
    dayExams.forEach((e) => {
      if (!examsByPrepRoom[e.prepRoomId!]) examsByPrepRoom[e.prepRoomId!] = [];
      examsByPrepRoom[e.prepRoomId!].push(e);
    });

    const prepRoomIds = Object.keys(examsByPrepRoom).sort((a, b) =>
      (state.rooms.find((r) => r.id === a)?.name || '').localeCompare(
        state.rooms.find((r) => r.id === b)?.name || '',
        undefined,
        { numeric: true }
      )
    );

    prepRoomIds.forEach((prepRoomId, pageIdx) => {
      if (pageIdx > 0) pdf.addPage();
      let currentY = PDF_CONFIG.marginY;
      const room = state.rooms.find((r) => r.id === prepRoomId);
      const dateStr = new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(activeDay.date));

      currentY = this._drawHeader(
        pdf,
        `Mündliches Abitur: `,
        `Vorbereitungsraum ${room?.name || '-'}`,
        dateStr
      );

      const colWidths = [25, 60, 45, 50];
      const colLabels = ['Zeit', 'Prüfling', 'Prüfer', 'Fach'];

      pdf.setLineWidth(0.2);
      pdf.setDrawColor(0);
      pdf.setFillColor(243, 244, 246);
      pdf.rect(PDF_CONFIG.marginX, currentY, contentWidth, 8, 'FD');

      let x = PDF_CONFIG.marginX;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      colLabels.forEach((label, i) => {
        const align = i === 0 ? 'center' : 'left';
        const posX = i === 0 ? x + colWidths[i] / 2 : x + 3;
        pdf.text(label, posX, currentY + 4, { align, baseline: 'middle' });
        if (i < colLabels.length - 1) {
          x += colWidths[i];
          pdf.setLineWidth(0.1);
          pdf.line(x, currentY, x, currentY + 8);
        }
      });
      currentY += 8;

      const sortedExams = examsByPrepRoom[prepRoomId].sort((a, b) => a.startTime - b.startTime);
      sortedExams.forEach((exam, eIdx) => {
        pdf.setFontSize(9.5);
        pdf.setLineWidth(0.2);
        pdf.rect(PDF_CONFIG.marginX, currentY, contentWidth, PDF_CONFIG.rowHeight, 'D');

        let cellX = PDF_CONFIG.marginX;
        pdf.setFont('helvetica', 'bold');
        pdf.text(
          minToTime(examSlotToMin(exam.startTime) - 20),
          cellX + colWidths[0] / 2,
          currentY + PDF_CONFIG.rowHeight / 2,
          { align: 'center', baseline: 'middle' }
        );
        cellX += colWidths[0];
        pdf.setLineWidth(0.1);
        pdf.line(cellX, currentY, cellX, currentY + PDF_CONFIG.rowHeight);

        pdf.setFont('helvetica', 'normal');
        const s = state.students.find((s) => s.id === exam.studentId);
        pdf.text(
          `${s?.lastName || '???'}, ${s?.firstName || ''}`,
          cellX + 3,
          currentY + PDF_CONFIG.rowHeight / 2,
          { baseline: 'middle' }
        );
        cellX += colWidths[1];
        pdf.line(cellX, currentY, cellX, currentY + PDF_CONFIG.rowHeight);
        const t = state.teachers.find((t) => t.id === exam.teacherId);
        pdf.text(t?.lastName || '-', cellX + 3, currentY + PDF_CONFIG.rowHeight / 2, {
          baseline: 'middle',
        });
        cellX += colWidths[2];
        pdf.line(cellX, currentY, cellX, currentY + PDF_CONFIG.rowHeight);
        pdf.text(exam.subject, cellX + 3, currentY + PDF_CONFIG.rowHeight / 2, {
          baseline: 'middle',
        });
        currentY += PDF_CONFIG.rowHeight;
      });

      this._drawFooter(pdf);
    });

    pdf.save(`${filename}.pdf`);
  },

  async generateSupervisionPdf(
    state: AppState,
    activeDayIdx: number,
    filename: string
  ): Promise<void> {
    const activeDay = state.days[activeDayIdx];
    if (!activeDay) return;

    const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    const marginX = 12;
    const marginY = 15;
    const pageWidth = 297;
    const pageWidthContent = pageWidth - 2 * marginX;

    const dateStr = new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(activeDay.date));
    let currentY = this._drawHeader(pdf, `Mündliches Abitur: `, `Aufsichtsplan`, dateStr);

    const stations = state.rooms.filter(
      (r) => r.isSupervisionStation || r.type === 'Aufsicht-Station'
    );
    const totalSubSlots = stations.reduce((sum, s) => sum + (s.requiredSupervisors || 1), 0);
    const timeColWidth = 18;
    const gridWidth = pageWidthContent - timeColWidth;
    const subColWidth = totalSubSlots > 0 ? gridWidth / totalSubSlots : 0;
    const rowHeight = 6.4;
    const headerHeight = 10;

    pdf.setLineWidth(0.1);
    pdf.setFillColor(243, 244, 246);
    pdf.rect(marginX, currentY, pageWidthContent, headerHeight, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('Zeit', marginX + timeColWidth / 2, currentY + 5, {
      align: 'center',
      baseline: 'middle',
    });

    let hx = marginX + timeColWidth;
    stations.forEach((station) => {
      const w = (station.requiredSupervisors || 1) * subColWidth;
      pdf.setFontSize(w < 20 ? 6 : 8);
      pdf.text(station.name, hx + w / 2, currentY + 5, { align: 'center', baseline: 'middle' });
      hx += w;
    });

    pdf.setDrawColor(0);
    pdf.line(marginX, currentY, marginX + pageWidthContent, currentY);
    pdf.line(marginX, currentY, marginX, currentY + headerHeight);
    let lx = marginX + timeColWidth;
    pdf.line(lx, currentY, lx, currentY + headerHeight);
    stations.forEach((station) => {
      lx += (station.requiredSupervisors || 1) * subColWidth;
      pdf.line(lx, currentY, lx, currentY + headerHeight);
    });

    pdf.setLineWidth(0.5);
    pdf.line(marginX, currentY + headerHeight, marginX + pageWidthContent, currentY + headerHeight);

    currentY += headerHeight;
    const tableTopY = currentY;

    const timeSlots: string[] = [];
    for (let h = 7.5; h <= 18.0; h += 0.5) {
      timeSlots.push(`${Math.floor(h).toString().padStart(2, '0')}:${h % 1 === 0 ? '00' : '30'}`);
    }

    const occupied = new Set<string>();
    timeSlots.forEach((time, sIdx) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(0);

      const y = currentY + sIdx * rowHeight;

      pdf.setFillColor(243, 244, 246);
      pdf.rect(marginX, y, timeColWidth, rowHeight, 'F');
      pdf.text(time, marginX + timeColWidth / 2, y + rowHeight / 2, {
        align: 'center',
        baseline: 'middle',
      });

      let cx = marginX + timeColWidth;
      stations.forEach((station) => {
        for (let i = 0; i < (station.requiredSupervisors || 1); i++) {
          const key = `${station.id}-${i}-${sIdx}`;
          if (!occupied.has(key)) {
            const sup = state.supervisions.find(
              (s) =>
                s.dayIdx === activeDayIdx &&
                s.stationId === station.id &&
                s.subSlotIdx === i &&
                s.startTime === time
            );
            if (sup) {
              const t = state.teachers.find((t) => t.id === sup.teacherId)?.shortName || '?';
              pdf.setFillColor(255, 255, 255);
              pdf.rect(cx, y, subColWidth, rowHeight * 2, 'F');
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(subColWidth < 12 ? 6.5 : 8.5);
              pdf.text(t, cx + subColWidth / 2, y + rowHeight, {
                align: 'center',
                baseline: 'middle',
              });
              pdf.setFont('helvetica', 'normal');
              occupied.add(`${station.id}-${i}-${sIdx + 1}`);
            } else {
              pdf.setFillColor(248, 250, 252);
              pdf.rect(cx, y, subColWidth, rowHeight, 'F');
            }
          }
          cx += subColWidth;
        }
      });
    });

    pdf.setDrawColor(0);
    pdf.setLineWidth(0.1);

    pdf.line(marginX, tableTopY, marginX, tableTopY + timeSlots.length * rowHeight);
    let vgx = marginX + timeColWidth;
    pdf.line(vgx, tableTopY, vgx, tableTopY + timeSlots.length * rowHeight);
    stations.forEach((station) => {
      for (let i = 0; i < (station.requiredSupervisors || 1); i++) {
        vgx += subColWidth;
        pdf.line(vgx, tableTopY, vgx, tableTopY + timeSlots.length * rowHeight);
      }
    });

    for (let sIdx = 0; sIdx <= timeSlots.length; sIdx++) {
      const y = tableTopY + sIdx * rowHeight;
      pdf.line(marginX, y, marginX + timeColWidth, y);

      let sgx = marginX + timeColWidth;
      stations.forEach((station) => {
        for (let i = 0; i < (station.requiredSupervisors || 1); i++) {
          const isMiddleOfBlock = state.supervisions.some(
            (s) =>
              s.dayIdx === activeDayIdx &&
              s.stationId === station.id &&
              s.subSlotIdx === i &&
              timeSlots.indexOf(s.startTime) === sIdx - 1
          );

          if (!isMiddleOfBlock) {
            pdf.line(sgx, y, sgx + subColWidth, y);
          }
          sgx += subColWidth;
        }
      });
    }

    this._drawFooter(pdf);
    pdf.save(`${filename}.pdf`);
  },

  async generateBeisitzerPdf(
    state: AppState,
    activeDayIdx: number,
    filename: string
  ): Promise<void> {
    const activeDay = state.days[activeDayIdx];
    if (!activeDay) return;

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const contentWidth = PDF_CONFIG.pageWidth - 2 * PDF_CONFIG.marginX;
    const currentYear = new Date(activeDay.date).getFullYear();

    const dateStrFull = new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(activeDay.date));
    const [dayName, dateDigits] = dateStrFull.split(', ');

    // 1. Gruppierungslogik (Gleich wie in BeisitzerPrintView)
    const dayExams = state.exams.filter(
      (e) =>
        e.startTime > 0 &&
        Math.floor((e.startTime - 1) / 1000) === activeDayIdx &&
        e.status !== 'cancelled' &&
        !e.isBackupExam
    );

    const blocks: { subject: string; roomName: string; teacherShort: string; exams: Exam[] }[] = [];
    state.rooms
      .filter((r) => r.type === 'Prüfungsraum')
      .forEach((room) => {
        const roomExams = dayExams
          .filter((e) => e.roomId === room.id)
          .sort((a, b) => a.startTime - b.startTime);

        let currentBlockExams: Exam[] = [];
        roomExams.forEach((exam, idx) => {
          const prev = roomExams[idx - 1];
          const isNew =
            !prev ||
            prev.subject !== exam.subject ||
            exam.startTime - prev.startTime > (60 / 20) * 1; // 3 slots threshold

          if (isNew && currentBlockExams.length > 0) {
            const first = currentBlockExams[0];
            blocks.push({
              subject: first.subject,
              roomName: room.name,
              teacherShort: state.teachers.find((t) => t.id === first.teacherId)?.shortName || '?',
              exams: [...currentBlockExams],
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
            teacherShort: state.teachers.find((t) => t.id === first.teacherId)?.shortName || '?',
            exams: currentBlockExams,
          });
        }
      });

    blocks.sort((a, b) => a.exams[0].startTime - b.exams[0].startTime);

    blocks.forEach((block, bIdx) => {
      const isFirstOnPage = bIdx % 2 === 0;
      if (bIdx > 0 && isFirstOnPage) pdf.addPage();

      // topY mit mehr Abstand nach Trennung
      const topY = isFirstOnPage ? PDF_CONFIG.marginY : PDF_CONFIG.pageHeight / 2 + 12;

      // Header
      pdf.setFontSize(PDF_CONFIG.headerFontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0);
      pdf.text(`Abiturprüfungen ${currentYear}`, PDF_CONFIG.marginX, topY);

      // Datum rechts mit Cyan-Tag
      pdf.setFontSize(11);
      const dateTextWidth = pdf.getTextWidth(`, ${dateDigits}`);
      pdf.setTextColor(PDF_CONFIG.cyanRGB[0], PDF_CONFIG.cyanRGB[1], PDF_CONFIG.cyanRGB[2]);
      pdf.text(dayName, PDF_CONFIG.pageWidth - PDF_CONFIG.marginX - dateTextWidth - 1, topY, {
        align: 'right',
      });
      pdf.setTextColor(0);
      pdf.text(`, ${dateDigits}`, PDF_CONFIG.pageWidth - PDF_CONFIG.marginX, topY, {
        align: 'right',
      });

      // Trennlinie
      pdf.setLineWidth(0.5);
      pdf.line(PDF_CONFIG.marginX, topY + 2, PDF_CONFIG.pageWidth - PDF_CONFIG.marginX, topY + 2);

      // Fach
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(block.subject.toUpperCase(), PDF_CONFIG.marginX, topY + 14);

      // Layout: Linke Spalte (Info + Tabelle) | Rechte Spalte (Beisitzer)
      const contentBaseY = topY + 22;

      // --- LINKE SPALTE ---
      const colWidth = 70;

      // Info-Box (In Spalte integriert) mit abgerundeten Ecken, ohne Rand
      pdf.setFillColor(243, 244, 246);
      pdf.roundedRect(PDF_CONFIG.marginX, contentBaseY, colWidth, 14, 3, 3, 'F');

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100); // Slate-500 equivalent for label
      pdf.text('RAUM:', PDF_CONFIG.marginX + 3, contentBaseY + 5);
      pdf.setTextColor(0);
      pdf.text(block.roomName, PDF_CONFIG.marginX + 15, contentBaseY + 5);

      // Prüfer Rechtsbündig in der Spalte - Exakte Berechnung für perfekten Abstand ohne Overlap
      const rightEdge = PDF_CONFIG.marginX + colWidth - 3;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const labelText = 'PRÜFER: ';
      const labelWidth = pdf.getTextWidth(labelText);

      pdf.setFontSize(11); // Kürzel ist größer
      const valueText = block.teacherShort;
      const valueWidth = pdf.getTextWidth(valueText);

      const totalWidth = labelWidth + valueWidth;
      const startX = rightEdge - totalWidth;

      // Label zeichnen
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text(labelText, startX, contentBaseY + 5);

      // Kürzel zeichnen (Direkt nach dem Label)
      pdf.setFontSize(11);
      pdf.setTextColor(PDF_CONFIG.cyanRGB[0], PDF_CONFIG.cyanRGB[1], PDF_CONFIG.cyanRGB[2]);
      pdf.text(valueText, startX + labelWidth, contentBaseY + 5);
      pdf.setTextColor(0);

      // Anzahl mit Plural-Logik
      pdf.setFontSize(9);
      pdf.setTextColor(0);
      pdf.setFont('helvetica', 'bold');
      const pluralSuffix = block.exams.length === 1 ? '' : 'en';
      pdf.text(`Anzahl: ${block.exams.length} Prüfung${pluralSuffix}`, PDF_CONFIG.marginX + 3, contentBaseY + 10);

      // Prüfungs-Tabelle
      const tableY = contentBaseY + 22;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Zeit', PDF_CONFIG.marginX, tableY);
      pdf.text('Prüfling', PDF_CONFIG.marginX + 20, tableY);
      pdf.setLineWidth(0.4);
      pdf.line(PDF_CONFIG.marginX, tableY + 2, PDF_CONFIG.marginX + colWidth, tableY + 2);

      block.exams.forEach((exam, eIdx) => {
        const rowY = tableY + 10 + eIdx * 9;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.text(minToTime(examSlotToMin(exam.startTime)), PDF_CONFIG.marginX, rowY);

        const s = state.students.find((s) => s.id === exam.studentId);
        pdf.setFont('helvetica', 'bold');
        pdf.text(
          s?.lastName.substring(0, 3).toUpperCase() || '???',
          PDF_CONFIG.marginX + 22,
          rowY
        );

        pdf.setLineWidth(0.1);
        pdf.setDrawColor(230);
        pdf.line(PDF_CONFIG.marginX, rowY + 2, PDF_CONFIG.marginX + colWidth, rowY + 2);
        pdf.setDrawColor(0);
      });

      // --- RECHTE SPALTE (BEISITZER) ---
      const beisitzerX = PDF_CONFIG.marginX + 80;
      const beisitzerWidth = PDF_CONFIG.pageWidth - PDF_CONFIG.marginX - beisitzerX;

      // Rahmen um Beisitzer-Sektion mit abgerundeten Ecken
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(beisitzerX - 4, contentBaseY, beisitzerWidth + 8, 90, 4, 4, 'S');
      pdf.setDrawColor(0);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Beisitzer:', beisitzerX, contentBaseY + 8);
      pdf.setLineWidth(0.5);
      pdf.line(beisitzerX, contentBaseY + 10, PDF_CONFIG.pageWidth - PDF_CONFIG.marginX, contentBaseY + 10);

      pdf.setFontSize(11);
      for (let i = 1; i <= 6; i++) {
        const rowY = contentBaseY + 24 + (i - 1) * 11;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${i}.`, beisitzerX, rowY);
        pdf.setLineWidth(0.2);
        pdf.line(beisitzerX + 8, rowY + 1, PDF_CONFIG.pageWidth - PDF_CONFIG.marginX, rowY + 1);
      }

      // Mittellinie (halbe Seite)
      if (isFirstOnPage) {
        pdf.setDrawColor(180);
        pdf.setLineWidth(0.1);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(5, PDF_CONFIG.pageHeight / 2, PDF_CONFIG.pageWidth - 5, PDF_CONFIG.pageHeight / 2);
        pdf.setLineDashPattern([], 0);
        pdf.setDrawColor(0);
      }
    });

    this._drawFooter(pdf);
    pdf.save(`${filename}.pdf`);
  },
};
