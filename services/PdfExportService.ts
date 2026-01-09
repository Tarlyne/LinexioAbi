
import { jsPDF } from 'jspdf';
import { AppState, Room } from '../types';
import { minToTime, examSlotToMin } from '../utils/TimeService';

/**
 * PDF Export Service (Native Drawing Engine)
 * Erstellt hochpräzise, vektorbasierte PDFs ohne html2canvas.
 */
export const PdfExportService = {
  /**
   * Hilfsmethode für dynamische Farben der Prüfungstage
   */
  getDayColor(idx: number): [number, number, number] {
    const colors: [number, number, number][] = [
      [6, 182, 212],   // Cyan (Tag 1)
      [245, 158, 11],  // Amber (Tag 2)
      [99, 102, 241],  // Indigo (Tag 3)
    ];
    return colors[idx] || colors[0];
  },

  /**
   * Generiert ein Prüfungsplan PDF (A4 Portait).
   */
  async generateAndDownload(state: AppState, activeDayIdx: number, filename: string): Promise<void> {
    const activeDay = state.days[activeDayIdx];
    if (!activeDay) return;

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const marginX = 15;
    const marginY = 20;
    const pageHeight = 297;
    const pageWidth = 210;
    const contentWidth = pageWidth - (2 * marginX);
    
    const headerHeight = 8;
    const rowHeight = 6.5; 
    const roomSpacerHeight = 5;

    let currentY = marginY;

    const drawCellText = (text: string, x: number, y: number, width: number, align: 'left' | 'center' = 'center', isBold = false) => {
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      const centerX = align === 'center' ? x + (width / 2) : x + 2;
      pdf.text(text || '-', centerX, y + (rowHeight / 2), { 
        align, 
        baseline: 'middle'
      });
    };

    const drawHeader = () => {
      const year = new Date(activeDay.date).getFullYear();
      const dateStr = new Intl.DateTimeFormat('de-DE', { 
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' 
      }).format(new Date(activeDay.date));

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Mündliche Abiturprüfung ${year}`, marginX, currentY);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(dateStr, pageWidth - marginX, currentY, { align: 'right' });
      
      currentY += 4;
      pdf.setLineWidth(0.5);
      pdf.line(marginX, currentY, pageWidth - marginX, currentY);
      currentY += 10;
    };

    const colWidths = [18, 15, 15, 55, 35, 14, 14, 14];
    const colLabels = ["Zeit", "Vorb.", "Raum", "Prüfling", "Fach", "Prüfer", "Prot.", "Vorsitz"];

    const drawTableHeader = () => {
      pdf.setFillColor(243, 244, 246);
      pdf.rect(marginX, currentY, contentWidth, headerHeight, 'F');
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.1);
      pdf.rect(marginX, currentY, contentWidth, headerHeight, 'D');

      let x = marginX;
      pdf.setFontSize(8);
      colLabels.forEach((label, i) => {
        drawCellText(label, x, currentY, colWidths[i], i >= 3 && i <= 4 ? 'left' : 'center', true);
        if (i < colLabels.length - 1) {
          x += colWidths[i];
          pdf.line(x, currentY, x, currentY + headerHeight);
        }
      });
      currentY += headerHeight;
    };

    const sortedRooms = [...state.rooms]
      .filter(r => r.type === 'Prüfungsraum')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const dayExams = state.exams.filter(e => 
      e.startTime > 0 && 
      Math.floor((e.startTime - 1) / 1000) === activeDayIdx &&
      e.status !== 'cancelled'
    );

    const roomsWithExams = sortedRooms.map(room => ({
      room,
      exams: dayExams.filter(e => e.roomId === room.id).sort((a, b) => a.startTime - b.startTime)
    })).filter(g => g.exams.length > 0);

    drawHeader();
    drawTableHeader();

    roomsWithExams.forEach((group, gIdx) => {
      let lastCommissionKey = "";
      let zebra = false;

      group.exams.forEach((exam, eIdx) => {
        if (currentY + rowHeight > pageHeight - 20) {
          pdf.addPage();
          currentY = marginY;
          drawTableHeader();
        }

        const student = state.students.find(s => s.id === exam.studentId);
        const teacher = state.teachers.find(t => t.id === exam.teacherId);
        const chair = state.teachers.find(t => t.id === exam.chairId);
        const protocol = state.teachers.find(t => t.id === exam.protocolId);
        const prepRoom = state.rooms.find(r => r.id === exam.prepRoomId);
        
        const commissionKey = `${exam.teacherId}-${exam.chairId}-${exam.protocolId}`;
        if (eIdx === 0) {
          lastCommissionKey = commissionKey;
          zebra = false;
        } else if (commissionKey !== lastCommissionKey) {
          zebra = !zebra;
          lastCommissionKey = commissionKey;
        }

        if (zebra) {
          pdf.setFillColor(241, 245, 249);
          pdf.rect(marginX, currentY, contentWidth, rowHeight, 'F');
        }

        pdf.rect(marginX, currentY, contentWidth, rowHeight, 'D');

        let x = marginX;
        pdf.setFontSize(9);
        const startTimeStr = minToTime(examSlotToMin(exam.startTime));
        drawCellText(startTimeStr, x, currentY, colWidths[0], 'center', true); x += colWidths[0];
        pdf.line(x, currentY, x, currentY + rowHeight);
        pdf.setFontSize(7.5);
        drawCellText(prepRoom?.name || '-', x, currentY, colWidths[1]); x += colWidths[1];
        pdf.line(x, currentY, x, currentY + rowHeight);
        pdf.setFontSize(9);
        drawCellText(group.room.name, x, currentY, colWidths[2]); x += colWidths[2];
        pdf.line(x, currentY, x, currentY + rowHeight);
        drawCellText(student?.lastName || '???', x, currentY, colWidths[3], 'left', true); x += colWidths[3];
        pdf.line(x, currentY, x, currentY + rowHeight);
        pdf.setFontSize(8);
        const fachStr = `${exam.subject}${exam.groupId ? ` (${exam.groupId})` : ''}`;
        drawCellText(fachStr, x, currentY, colWidths[4], 'left'); x += colWidths[4];
        pdf.line(x, currentY, x, currentY + rowHeight);
        pdf.setFontSize(7.5);
        drawCellText(teacher?.shortName || '-', x, currentY, colWidths[5]); x += colWidths[5];
        pdf.line(x, currentY, x, currentY + rowHeight);
        drawCellText(protocol?.shortName || '-', x, currentY, colWidths[6]); x += colWidths[6];
        pdf.line(x, currentY, x, currentY + rowHeight);
        drawCellText(chair?.shortName || '-', x, currentY, colWidths[7]);
        
        currentY += rowHeight;
      });

      if (gIdx < roomsWithExams.length - 1) {
        currentY += roomSpacerHeight;
      }
    });

    const now = new Date();
    const footerText = `Erstellt mit LinexioAbi am ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr.`;
    pdf.setFontSize(7);
    pdf.setTextColor(100);
    pdf.text(footerText, pageWidth - marginX, pageHeight - 10, { align: 'right' });

    pdf.save(`${filename}.pdf`);
  },

  /**
   * Generiert ein Aufsichtsplan PDF (A4 Landscape).
   * OPTIMIERT: Merged 60-Minuten-Zellen, Thick Borders auf Tabelle begrenzt, kein Zebra.
   * NEU: Leere Zellen grau hinterlegt, Zeiten oben ausgerichtet.
   */
  async generateSupervisionPdf(state: AppState, activeDayIdx: number, filename: string): Promise<void> {
    const activeDay = state.days[activeDayIdx];
    if (!activeDay) return;

    const pdf = new jsPDF({
      orientation: 'l',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const marginX = 12;
    const marginY = 15;
    const pageWidth = 297;
    const pageHeight = 210;
    const pageWidthContent = pageWidth - (2 * marginX);

    let currentY = marginY;

    // --- Header ---
    const drawHeader = () => {
      const year = new Date(activeDay.date).getFullYear();
      const dateObj = new Date(activeDay.date);
      const weekday = dateObj.toLocaleDateString('de-DE', { weekday: 'long' });
      const datePart = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const dayColor = this.getDayColor(activeDayIdx);

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0);
      pdf.text(`Aufsichtsplan für `, marginX, currentY);
      
      const prefixWidth = pdf.getTextWidth(`Aufsichtsplan für `);
      pdf.setTextColor(dayColor[0], dayColor[1], dayColor[2]);
      pdf.text(weekday, marginX + prefixWidth, currentY);
      
      const dayWidth = pdf.getTextWidth(weekday);
      pdf.setTextColor(0);
      pdf.text(`, ${datePart}`, marginX + prefixWidth + dayWidth, currentY);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Abiturprüfung ${year}`, pageWidth - marginX, currentY, { align: 'right' });

      currentY += 4;
      pdf.setLineWidth(0.6);
      pdf.setDrawColor(0);
      pdf.line(marginX, currentY, pageWidth - marginX, currentY);
      currentY += 8;
    };

    // --- Grid Definitionen ---
    const stations = state.rooms.filter(r => r.isSupervisionStation);
    const totalSubSlots = stations.reduce((sum, s) => sum + s.requiredSupervisors, 0);
    const timeColWidth = 18;
    const gridWidth = pageWidthContent - timeColWidth;
    const subColWidth = totalSubSlots > 0 ? gridWidth / totalSubSlots : 0;
    
    const rowHeight = 6.4; 
    const headerRowHeight = 10;

    const timeSlots = [];
    for (let h = 7.5; h <= 18.0; h += 0.5) {
      const hh = Math.floor(h);
      const mm = (h % 1 === 0) ? '00' : '30';
      timeSlots.push(`${hh.toString().padStart(2, '0')}:${mm}`);
    }

    drawHeader();
    const tableTopY = currentY; // Beginn des Headers

    const drawGridHeader = () => {
      pdf.setLineWidth(0.1);
      pdf.setDrawColor(0);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      
      pdf.setFillColor(243, 244, 246);
      pdf.rect(marginX, currentY, timeColWidth, headerRowHeight, 'FD');
      pdf.setTextColor(0);
      pdf.text("Zeit", marginX + timeColWidth / 2, currentY + headerRowHeight / 2, { align: 'center', baseline: 'middle' });

      let currentX = marginX + timeColWidth;
      stations.forEach((station) => {
        const stationWidth = station.requiredSupervisors * subColWidth;
        pdf.setFillColor(243, 244, 246);
        pdf.rect(currentX, currentY, stationWidth, headerRowHeight, 'FD');
        
        const isPrep = station.type === 'Vorbereitungsraum';
        pdf.setFontSize(stationWidth < 20 ? 6 : 8);
        pdf.setTextColor(0);
        pdf.text(station.name, currentX + stationWidth / 2, currentY + (isPrep ? 3.5 : headerRowHeight / 2), { 
          align: 'center', 
          baseline: 'middle' 
        });

        if (isPrep) {
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(5.5);
          pdf.text("(Vorb.-raum)", currentX + stationWidth / 2, currentY + 7.5, { align: 'center', baseline: 'middle' });
          pdf.setFont('helvetica', 'bold');
        }
        currentX += stationWidth;
      });
      currentY += headerRowHeight;
    };

    drawGridHeader();

    // Map zur Nachverfolgung blockierter Zellen (wegen Row-Merging)
    const occupiedCells = new Set<string>();

    // --- Body ---
    timeSlots.forEach((time, slotIdx) => {
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.1);

      // Zeit-Zelle (NEU: baseline 'top', Offset reduziert auf 0.5mm)
      pdf.rect(marginX, currentY, timeColWidth, rowHeight);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0);
      pdf.text(time, marginX + timeColWidth / 2, currentY + 0.5, { align: 'center', baseline: 'top' });

      let currentX = marginX + timeColWidth;
      stations.forEach(station => {
        for (let subIdx = 0; subIdx < station.requiredSupervisors; subIdx++) {
          const cellKey = `${station.id}-${subIdx}-${slotIdx}`;
          
          if (!occupiedCells.has(cellKey)) {
            const sup = state.supervisions.find(s => 
              s.dayIdx === activeDayIdx && 
              s.stationId === station.id && 
              s.subSlotIdx === subIdx &&
              s.startTime === time
            );

            if (sup) {
              const teacher = state.teachers.find(t => t.id === sup.teacherId);
              const mergeHeight = rowHeight * 2;
              pdf.setFillColor(255, 255, 255); // Weißer Hintergrund für Text
              pdf.rect(currentX, currentY, subColWidth, mergeHeight, 'FD');
              pdf.setFontSize(subColWidth < 12 ? 6.5 : 8.5);
              pdf.setFont('helvetica', 'bold');
              pdf.text(teacher?.shortName || '?', currentX + subColWidth / 2, currentY + mergeHeight / 2, { align: 'center', baseline: 'middle' });
              occupiedCells.add(`${station.id}-${subIdx}-${slotIdx + 1}`);
            } else {
              // NEU: Graue Hintergrundfarbe für leere Zellen
              pdf.setFillColor(230, 230, 230);
              pdf.rect(currentX, currentY, subColWidth, rowHeight, 'FD');
            }
          }
          currentX += subColWidth;
        }
      });
      currentY += rowHeight;
    });

    const tableBottomY = currentY;

    // --- THICK BORDERS (Overlays) ---
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(0);
    
    pdf.line(marginX + timeColWidth, tableTopY, marginX + timeColWidth, tableBottomY);
    let xTracker = marginX + timeColWidth;
    stations.forEach(station => {
      xTracker += station.requiredSupervisors * subColWidth;
      pdf.line(xTracker, tableTopY, xTracker, tableBottomY);
    });
    pdf.line(marginX, tableTopY + headerRowHeight, marginX + pageWidthContent, tableTopY + headerRowHeight);

    // --- Footer ---
    const now = new Date();
    const footerText = `Erstellt mit LinexioAbi am ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr.`;
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100);
    pdf.text(footerText, pageWidth - marginX, pageHeight - 8, { align: 'right' });

    pdf.save(`${filename}.pdf`);
  }
};
