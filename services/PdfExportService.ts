import { jsPDF } from 'jspdf';
import { AppState, Exam } from '../types';
import { minToTime, examSlotToMin } from '../utils/TimeService';

/**
 * PDF Export Service (Native Drawing Engine)
 * Erstellt hochpräzise, vektorbasierte PDFs ohne html2canvas.
 * Fokus: Perfekte vertikale Zentrierung und iPad-Kompatibilität.
 */
export const PdfExportService = {
  /**
   * Generiert ein PDF basierend auf den App-Daten.
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

    // --- Konfiguration ---
    const marginX = 15;
    const marginY = 20;
    const pageHeight = 297;
    const pageWidth = 210;
    const contentWidth = pageWidth - (2 * marginX);
    
    const headerHeight = 8;
    const rowHeight = 6.5; // Kompakt & Elegant
    const roomSpacerHeight = 5;

    let currentY = marginY;

    // Hilfsfunktion: Text zeichnen mit Baseline-Zentrierung
    const drawCellText = (text: string, x: number, y: number, width: number, align: 'left' | 'center' = 'center', isBold = false) => {
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      const centerX = align === 'center' ? x + (width / 2) : x + 2;
      pdf.text(text || '-', centerX, y + (rowHeight / 2), { 
        align, 
        baseline: 'middle' // DAS LÖST DAS ZENTRIERUNGSPROBLEM
      });
    };

    // Hilfsfunktion: Kopfzeile zeichnen
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

    // Hilfsfunktion: Tabellenkopf
    const colWidths = [18, 15, 15, 55, 35, 14, 14, 14]; // Zeit, Vorb, Raum, Prüfling, Fach, P, Pr, V
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

    // --- Daten aufbereiten ---
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

    // --- Zeichnen ---
    drawHeader();
    drawTableHeader();

    roomsWithExams.forEach((group, gIdx) => {
      let lastCommissionKey = "";
      let zebra = false;

      group.exams.forEach((exam, eIdx) => {
        // Seitenwechsel prüfen
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
        
        // Zebra-Logik nach Kommission
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
        
        const timeStr = minToTime(examSlotToMin(exam.startTime));
        drawCellText(timeStr, x, currentY, colWidths[0], 'center', true); x += colWidths[0];
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

      // Abstand zwischen Räumen
      if (gIdx < roomsWithExams.length - 1) {
        currentY += roomSpacerHeight;
      }
    });

    // --- Footer ---
    const now = new Date();
    const footerText = `Erstellt mit LinexioAbi am ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr.`;
    pdf.setFontSize(7);
    pdf.setTextColor(100);
    pdf.text(footerText, pageWidth - marginX, pageHeight - 10, { align: 'right' });

    pdf.save(`${filename}.pdf`);
  }
};
