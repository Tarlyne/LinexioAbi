
import { jsPDF } from 'jspdf';
import { AppState, Room, Exam } from '../types';
import { minToTime, examSlotToMin } from '../utils/TimeService';

/**
 * PDF Export Service (Native Drawing Engine)
 * Standardized Design V4.4 - Precision Rendering
 */
export const PdfExportService = {
  
  CYAN_RGB: [6, 182, 212] as [number, number, number],

  drawStandardFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, marginX: number) {
    const now = new Date();
    const footerText = `Erstellt mit LinexioAbi am ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr.`;
    
    pdf.setFontSize(7.5);
    pdf.setTextColor(120);
    pdf.setFont('helvetica', 'italic');
    pdf.text(footerText, pageWidth - marginX, pageHeight - 10, { align: 'right' });
  },

  drawHarmonizedHeader(pdf: jsPDF, prefix: string, coloredPart: string, dateStr: string, pageWidth: number, marginX: number, currentY: number) {
    pdf.setFontSize(15);
    pdf.setFont('helvetica', 'bold');
    
    pdf.setTextColor(0);
    pdf.text(prefix, marginX, currentY);
    const prefixWidth = pdf.getTextWidth(prefix);
    
    pdf.setTextColor(this.CYAN_RGB[0], this.CYAN_RGB[1], this.CYAN_RGB[2]);
    pdf.text(coloredPart, marginX + prefixWidth, currentY);
    
    pdf.setFontSize(11);
    pdf.setTextColor(0);
    pdf.text(dateStr, pageWidth - marginX, currentY, { align: 'right' });
    
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(0);
    pdf.line(marginX, currentY + 3, pageWidth - marginX, currentY + 3);
    
    return currentY + 12;
  },

  async generateAndDownload(state: AppState, activeDayIdx: number, filename: string): Promise<void> {
    const activeDay = state.days[activeDayIdx];
    if (!activeDay) return;

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', putOnlyUsedFonts: true });
    const marginX = 15;
    const marginY = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - (2 * marginX);
    const rowHeight = 6.8;

    const drawCellText = (text: string, x: number, y: number, width: number, align: 'left' | 'center' = 'center', isBold = false) => {
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      const centerX = align === 'center' ? x + (width / 2) : x + 2;
      pdf.text(text || '-', centerX, y + (rowHeight / 2), { align, baseline: 'middle' });
    };

    const colWidths = [18, 15, 15, 55, 35, 14, 14, 14];
    const colLabels = ["Zeit", "Vorb.", "Raum", "Prüfling", "Fach", "Prüfer", "Prot.", "Vorsitz"];

    const dateStr = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(activeDay.date));
    let currentY = this.drawHarmonizedHeader(pdf, `Mündliches Abitur: `, `Prüfungsplan`, dateStr, pageWidth, marginX, marginY);

    const drawTableHeader = (y: number) => {
      pdf.setFillColor(243, 244, 246);
      pdf.rect(marginX, y, contentWidth, 8, 'F');
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.1);
      pdf.rect(marginX, y, contentWidth, 8, 'D');
      let x = marginX;
      pdf.setFontSize(8);
      colLabels.forEach((label, i) => {
        pdf.setFont('helvetica', 'bold');
        const centerX = (i >= 3 && i <= 4) ? x + 2 : x + (colWidths[i] / 2);
        pdf.text(label, centerX, y + 4, { align: (i >= 3 && i <= 4 ? 'left' : 'center'), baseline: 'middle' });
        if (i < colLabels.length - 1) { x += colWidths[i]; pdf.line(x, y, x, y + 8); }
      });
      return y + 8;
    };

    currentY = drawTableHeader(currentY);

    const roomsWithExams = state.rooms
      .filter(r => r.type === 'Prüfungsraum')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map(room => ({
        room,
        exams: state.exams.filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === activeDayIdx && e.roomId === room.id && e.status !== 'cancelled')
          .sort((a, b) => a.startTime - b.startTime)
      })).filter(g => g.exams.length > 0);

    roomsWithExams.forEach((group, gIdx) => {
      let zebra = false;
      let lastComm = "";
      group.exams.forEach((exam, eIdx) => {
        if (currentY + rowHeight > pageHeight - 20) {
          pdf.addPage();
          currentY = drawTableHeader(marginY);
        }
        const comm = `${exam.teacherId}-${exam.chairId}-${exam.protocolId}`;
        if (eIdx === 0) { lastComm = comm; zebra = false; } else if (comm !== lastComm) { zebra = !zebra; lastComm = comm; }
        if (zebra) { pdf.setFillColor(248, 250, 252); pdf.rect(marginX, currentY, contentWidth, rowHeight, 'F'); }
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.1);
        pdf.rect(marginX, currentY, contentWidth, rowHeight, 'D');

        let x = marginX;
        pdf.setFontSize(9.5);
        drawCellText(minToTime(examSlotToMin(exam.startTime)), x, currentY, colWidths[0], 'center', true); x += colWidths[0];
        pdf.line(x, currentY, x, currentY + rowHeight);
        pdf.setFontSize(9);
        drawCellText(state.rooms.find(r => r.id === exam.prepRoomId)?.name || '-', x, currentY, colWidths[1]); x += colWidths[1];
        pdf.line(x, currentY, x, currentY + rowHeight);
        pdf.setFontSize(9);
        drawCellText(group.room.name, x, currentY, colWidths[2]); x += colWidths[2];
        pdf.line(x, currentY, x, currentY + rowHeight);
        pdf.setFontSize(9.5);
        drawCellText(state.students.find(s => s.id === exam.studentId)?.lastName || '???', x, currentY, colWidths[3], 'left', true); x += colWidths[3];
        pdf.line(x, currentY, x, currentY + rowHeight);
        pdf.setFontSize(8.5);
        const isComb = state.subjects.find(s => s.name === exam.subject)?.isCombined;
        drawCellText(`${exam.subject}${isComb ? '*' : ''}`, x, currentY, colWidths[4], 'left'); x += colWidths[4];
        pdf.line(x, currentY, x, currentY + rowHeight);
        pdf.setFontSize(isComb ? 6.5 : 8);
        const t = state.teachers.find(t => t.id === exam.teacherId)?.shortName || '-';
        const p = state.teachers.find(t => t.id === exam.protocolId)?.shortName || '-';
        const c = state.teachers.find(t => t.id === exam.chairId)?.shortName || '-';
        drawCellText(isComb ? `${t}/${p}` : t, x, currentY, colWidths[5]); x += colWidths[5];
        pdf.line(x, currentY, x, currentY + rowHeight);
        drawCellText(isComb ? `${t}/${p}` : p, x, currentY, colWidths[6]); x += colWidths[6];
        pdf.line(x, currentY, x, currentY + rowHeight);
        drawCellText(c, x, currentY, colWidths[7]);
        currentY += rowHeight;
      });
      if (gIdx < roomsWithExams.length - 1) currentY += 5;
    });

    this.drawStandardFooter(pdf, pageWidth, pageHeight, marginX);
    pdf.save(`${filename}.pdf`);
  },

  async generatePrepRoomPdf(state: AppState, activeDayIdx: number, filename: string): Promise<void> {
    const activeDay = state.days[activeDayIdx];
    if (!activeDay) return;

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', putOnlyUsedFonts: true });
    const marginX = 15;
    const marginY = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - (2 * marginX);
    const rowHeight = 6.8;

    const dayExams = state.exams.filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === activeDayIdx && e.status !== 'cancelled' && e.prepRoomId);
    const examsByPrepRoom: Record<string, Exam[]> = {};
    dayExams.forEach(e => { if (!examsByPrepRoom[e.prepRoomId!]) examsByPrepRoom[e.prepRoomId!] = []; examsByPrepRoom[e.prepRoomId!].push(e); });

    const prepRoomIds = Object.keys(examsByPrepRoom).sort((a, b) => (state.rooms.find(r => r.id === a)?.name || '').localeCompare(state.rooms.find(r => r.id === b)?.name || '', undefined, { numeric: true }));

    prepRoomIds.forEach((prepRoomId, pageIdx) => {
      if (pageIdx > 0) pdf.addPage();
      pdf.setTextColor(0);
      let currentY = marginY;
      const room = state.rooms.find(r => r.id === prepRoomId);
      const dateStr = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(activeDay.date));
      
      currentY = this.drawHarmonizedHeader(pdf, `Mündliches Abitur: `, `Vorbereitungsraum ${room?.name || '-'}`, dateStr, pageWidth, marginX, currentY);

      const colWidths = [25, 60, 45, 50];
      const colLabels = ["Zeit", "Prüfling", "Prüfer", "Fach"];

      // Gestochen scharfer Header
      pdf.setLineWidth(0.2); // Etwas stärkerer Rahmen für Außenkanten
      pdf.setDrawColor(0);
      pdf.setFillColor(243, 244, 246);
      pdf.rect(marginX, currentY, contentWidth, 8, 'FD');
      
      let x = marginX;
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
        pdf.setLineWidth(0.2); // Außenkanten Schärfe
        pdf.rect(marginX, currentY, contentWidth, rowHeight, 'D');
        
        let cellX = marginX;
        pdf.setFont('helvetica', 'bold');
        pdf.text(minToTime(examSlotToMin(exam.startTime) - 20), cellX + colWidths[0] / 2, currentY + (rowHeight/2), { align: 'center', baseline: 'middle' });
        cellX += colWidths[0]; 
        pdf.setLineWidth(0.1);
        pdf.line(cellX, currentY, cellX, currentY + rowHeight);
        
        pdf.setFont('helvetica', 'normal');
        const s = state.students.find(s => s.id === exam.studentId);
        pdf.text(`${s?.lastName || '???'}, ${s?.firstName || ''}`, cellX + 3, currentY + (rowHeight/2), { baseline: 'middle' });
        cellX += colWidths[1]; 
        pdf.line(cellX, currentY, cellX, currentY + rowHeight);
        const t = state.teachers.find(t => t.id === exam.teacherId);
        pdf.text(t?.lastName || '-', cellX + 3, currentY + (rowHeight/2), { baseline: 'middle' });
        cellX += colWidths[2]; 
        pdf.line(cellX, currentY, cellX, currentY + rowHeight);
        pdf.text(exam.subject, cellX + 3, currentY + (rowHeight/2), { baseline: 'middle' });
        currentY += rowHeight;
      });

      this.drawStandardFooter(pdf, pageWidth, pageHeight, marginX);
    });

    pdf.save(`${filename}.pdf`);
  },

  async generateSupervisionPdf(state: AppState, activeDayIdx: number, filename: string): Promise<void> {
    const activeDay = state.days[activeDayIdx];
    if (!activeDay) return;

    const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4', putOnlyUsedFonts: true });
    const marginX = 12;
    const marginY = 15;
    const pageWidth = 297;
    const pageHeight = 210;
    const pageWidthContent = pageWidth - (2 * marginX);

    const dateStr = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(activeDay.date));
    let currentY = this.drawHarmonizedHeader(pdf, `Mündliches Abitur: `, `Aufsichtsplan`, dateStr, pageWidth, marginX, marginY);

    const stations = state.rooms.filter(r => r.isSupervisionStation || r.type === 'Aufsicht-Station');
    const totalSubSlots = stations.reduce((sum, s) => sum + (s.requiredSupervisors || 1), 0);
    const timeColWidth = 18;
    const gridWidth = pageWidthContent - timeColWidth;
    const subColWidth = totalSubSlots > 0 ? gridWidth / totalSubSlots : 0;
    const rowHeight = 6.4;
    const headerHeight = 10;

    // --- 1. HEADER ZEICHNEN ---
    pdf.setLineWidth(0.1);
    pdf.setFillColor(243, 244, 246);
    pdf.rect(marginX, currentY, pageWidthContent, headerHeight, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text("Zeit", marginX + timeColWidth/2, currentY + 5, { align: 'center', baseline: 'middle' });

    let hx = marginX + timeColWidth;
    stations.forEach(station => {
      const w = (station.requiredSupervisors || 1) * subColWidth;
      pdf.setFontSize(w < 20 ? 6 : 8);
      pdf.text(station.name, hx + w/2, currentY + 5, { align: 'center', baseline: 'middle' });
      hx += w;
    });

    // Raster-Linien für den Header (Vertikal)
    pdf.setDrawColor(0);
    pdf.line(marginX, currentY, marginX + pageWidthContent, currentY); // Oben
    pdf.line(marginX, currentY, marginX, currentY + headerHeight); // Ganz Links
    let lx = marginX + timeColWidth;
    pdf.line(lx, currentY, lx, currentY + headerHeight);
    stations.forEach(station => {
      lx += (station.requiredSupervisors || 1) * subColWidth;
      pdf.line(lx, currentY, lx, currentY + headerHeight);
    });

    // Die dicke Trennlinie UNTER dem gesamten Header
    pdf.setLineWidth(0.5);
    pdf.line(marginX, currentY + headerHeight, marginX + pageWidthContent, currentY + headerHeight);
    
    currentY += headerHeight;
    const tableTopY = currentY;

    // --- 2. INHALT & HINTERGRÜNDE ---
    const timeSlots = [];
    for (let h = 7.5; h <= 18.0; h += 0.5) { timeSlots.push(`${Math.floor(h).toString().padStart(2, '0')}:${h % 1 === 0 ? '00' : '30'}`); }

    const occupied = new Set<string>();
    timeSlots.forEach((time, sIdx) => {
      // Font-Reset für JEDE Zeile (Fix für Bold-Uhrzeit Bug)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(0);

      const y = currentY + (sIdx * rowHeight);
      
      // Zeit-Spalte Hintergrund
      pdf.setFillColor(243, 244, 246);
      pdf.rect(marginX, y, timeColWidth, rowHeight, 'F');
      pdf.text(time, marginX + timeColWidth/2, y + (rowHeight/2), { align: 'center', baseline: 'middle' });

      let cx = marginX + timeColWidth;
      stations.forEach(station => {
        for (let i = 0; i < (station.requiredSupervisors || 1); i++) {
          const key = `${station.id}-${i}-${sIdx}`;
          if (!occupied.has(key)) {
            const sup = state.supervisions.find(s => s.dayIdx === activeDayIdx && s.stationId === station.id && s.subSlotIdx === i && s.startTime === time);
            if (sup) {
              const t = state.teachers.find(t => t.id === sup.teacherId)?.shortName || '?';
              pdf.setFillColor(255, 255, 255);
              pdf.rect(cx, y, subColWidth, rowHeight * 2, 'F');
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(subColWidth < 12 ? 6.5 : 8.5);
              pdf.text(t, cx + subColWidth/2, y + rowHeight, { align: 'center', baseline: 'middle' });
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

    // --- 3. DAS GITTER FINAL ZEICHNEN (MIT LÜCKEN BEI LEHRER-BLÖCKEN) ---
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.1);
    
    // Vertikale Linien
    pdf.line(marginX, tableTopY, marginX, tableTopY + (timeSlots.length * rowHeight));
    let vgx = marginX + timeColWidth;
    pdf.line(vgx, tableTopY, vgx, tableTopY + (timeSlots.length * rowHeight));
    stations.forEach(station => {
      for (let i = 0; i < (station.requiredSupervisors || 1); i++) {
        vgx += subColWidth;
        pdf.line(vgx, tableTopY, vgx, tableTopY + (timeSlots.length * rowHeight));
      }
    });

    // Horizontale Linien (Segmentweise um Lehrerblöcke zu schützen)
    for (let sIdx = 0; sIdx <= timeSlots.length; sIdx++) {
      const y = tableTopY + (sIdx * rowHeight);
      // Zeitspalte-Segment
      pdf.line(marginX, y, marginX + timeColWidth, y);

      let sgx = marginX + timeColWidth;
      stations.forEach(station => {
        for (let i = 0; i < (station.requiredSupervisors || 1); i++) {
          // Prüfen ob DIESER Teil der horizontalen Linie einen Lehrer-Block schneiden würde
          // Eine Linie an Index sIdx gehört zu Slot sIdx (Unten) oder sIdx-1 (Oben).
          // Ein Lehrerblock belegt sIdx und sIdx+1. Wir dürfen also nicht zeichnen, wenn sIdx der MITTLERE Strich ist.
          const isMiddleOfBlock = state.supervisions.some(s => 
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

    this.drawStandardFooter(pdf, pageWidth, pageHeight, marginX);
    pdf.save(`${filename}.pdf`);
  }
};
