import ExcelJS from 'exceljs';
import { AppState, Exam } from '../types';
import { minToTime, examSlotToMin } from '../utils/TimeService';

/**
 * Excel Export Service
 * Generates a styled .xlsx file for the Beisitzer list.
 * Layout mirrors the PDF card-based design.
 */

const CYAN_ARGB = 'FF06B6D4';
const GRAY_FILL_ARGB = 'FFF3F4F6';
const BORDER_GRAY_ARGB = 'FFCCCCCC';
const BLACK_ARGB = 'FF000000';
const DARK_GRAY_ARGB = 'FF555555';

const thinBorder = (color = BLACK_ARGB): ExcelJS.Border => ({
  style: 'thin',
  color: { argb: color },
});

const mediumBorder = (color = BLACK_ARGB): ExcelJS.Border => ({
  style: 'medium',
  color: { argb: color },
});

function applyOutlineBorder(
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  borderStyle: 'thin' | 'medium' = 'thin',
  color = BORDER_GRAY_ARGB,
) {
  const makeBorder = borderStyle === 'medium' ? mediumBorder : thinBorder;
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      const isTop = r === startRow;
      const isBottom = r === endRow;
      const isLeft = c === startCol;
      const isRight = c === endCol;
      cell.border = {
        top: isTop ? makeBorder(color) : cell.border?.top,
        bottom: isBottom ? makeBorder(color) : cell.border?.bottom,
        left: isLeft ? makeBorder(color) : cell.border?.left,
        right: isRight ? makeBorder(color) : cell.border?.right,
      };
    }
  }
}

function setCellValue(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string | ExcelJS.RichText[] | ExcelJS.CellRichTextValue,
  fontSize = 11,
  bold = false,
  colorArgb = BLACK_ARGB,
  hAlign: ExcelJS.Alignment['horizontal'] = 'left',
  vAlign: ExcelJS.Alignment['vertical'] = 'middle',
  wrapText = false,
) {
  const cell = ws.getCell(row, col);
  if (Array.isArray(value)) {
    cell.value = { richText: value as ExcelJS.RichText[] };
  } else if (typeof value === 'object' && value !== null && 'richText' in value) {
    cell.value = value as ExcelJS.CellRichTextValue;
  } else {
    cell.value = value as string;
  }
  cell.font = { name: 'Calibri', size: fontSize, bold, color: { argb: colorArgb } };
  cell.alignment = { horizontal: hAlign, vertical: vAlign, wrapText };
}

function mergeCells(ws: ExcelJS.Worksheet, startRow: number, startCol: number, endRow: number, endCol: number) {
  ws.mergeCells(startRow, startCol, endRow, endCol);
}

function fillCells(
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  fillArgb: string,
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      ws.getCell(r, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillArgb },
      };
    }
  }
}

export const ExcelExportService = {
  async generateBeisitzerExcel(state: AppState, activeDayIdx: number, filename: string): Promise<void> {
    const activeDay = state.days[activeDayIdx];
    if (!activeDay) return;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'LinexioAbi';
    wb.created = new Date();

    const ws = wb.addWorksheet('Beisitzerliste', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    // --- Column widths ---
    // A: margin | B: Zeit label | C: Zeit value | D: Prüfling label | E: Prüfling value | F: spacer | G-H: Beisitzer content | I: margin
    ws.columns = [
      { key: 'A', width: 2 },    // col 1 - left margin
      { key: 'B', width: 9 },    // col 2 - Zeit
      { key: 'C', width: 10 },   // col 3 - Zeit value
      { key: 'D', width: 10 },   // col 4 - Prüfling label
      { key: 'E', width: 22 },   // col 5 - Prüfling value (subject / student names)
      { key: 'F', width: 3 },    // col 6 - horizontal gap
      { key: 'G', width: 8 },    // col 7 - Beisitzer number
      { key: 'H', width: 28 },   // col 8 - Beisitzer name (editable)
      { key: 'I', width: 2 },    // col 9 - right margin
    ];

    // Column indices (1-based)
    const LEFT_START = 2;  // B
    const LEFT_END = 5;    // E
    const GAP_COL = 6;     // F
    const RIGHT_START = 7; // G
    const RIGHT_END = 8;   // H

    // Date formatting
    const dateObj = new Date(activeDay.date);
    const dayName = new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(dateObj);
    const dateDigits = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dateObj);
    const currentYear = dateObj.getFullYear();

    // NTA check
    const dayExamsAll = state.exams.filter(
      (e) => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === activeDayIdx && e.status !== 'cancelled',
    );
    const hasNTA = dayExamsAll.some((e) => e.hasNachteilsausgleich);

    // ---- ROW 1: Global header ----
    ws.getRow(1).height = 34;
    mergeCells(ws, 1, LEFT_START, 1, LEFT_END);
    setCellValue(ws, 1, LEFT_START, `mündliche Abiturprüfungen ${currentYear}`, 26, true, BLACK_ARGB, 'left', 'middle');

    // Date right side: "Mittwoch, 18.03.2026" with cyan weekday
    mergeCells(ws, 1, RIGHT_START, 1, RIGHT_END);
    ws.getCell(1, RIGHT_START).value = {
      richText: [
        { text: dayName, font: { name: 'Calibri', size: 13, bold: true, color: { argb: CYAN_ARGB } } },
        { text: `, ${dateDigits}`, font: { name: 'Calibri', size: 13, bold: true, color: { argb: BLACK_ARGB } } },
      ],
    };
    ws.getCell(1, RIGHT_START).alignment = { horizontal: 'right', vertical: 'middle' };

    // ---- ROW 2: NTA footnote ----
    ws.getRow(2).height = 14;
    if (hasNTA) {
      mergeCells(ws, 2, RIGHT_START, 2, RIGHT_END);
      setCellValue(ws, 2, RIGHT_START, '* = Nachteilsausgleich (Vorbereitungszeit: 25 Min.)', 9, false, DARK_GRAY_ARGB, 'right', 'middle');
      ws.getCell(2, RIGHT_START).font = {
        name: 'Calibri',
        size: 9,
        italic: true,
        color: { argb: DARK_GRAY_ARGB },
      };
    }

    // ---- Build blocks (same logic as PDF) ----
    const dayExams = state.exams.filter(
      (e) =>
        e.startTime > 0 &&
        Math.floor((e.startTime - 1) / 1000) === activeDayIdx &&
        e.status !== 'cancelled' &&
        !e.isBackupExam,
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
            exam.startTime - prev.startTime > (60 / 20) * 1;

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

    // ---- Render each block ----
    let currentRow = 3; // Start after global header rows

    blocks.forEach((block) => {
      // Spacer before block
      ws.getRow(currentRow).height = 8;
      currentRow++;

      // --- Subject name row ---
      const subjectRow = currentRow;
      ws.getRow(subjectRow).height = 24;
      mergeCells(ws, subjectRow, LEFT_START, subjectRow, LEFT_END);
      setCellValue(ws, subjectRow, LEFT_START, block.subject, 16, true, BLACK_ARGB, 'left', 'middle');
      currentRow++;

      // --- Info box rows (Raum / Prüfer / Anzahl) ---
      const infoRow1 = currentRow;
      ws.getRow(infoRow1).height = 18;

      // Merge left info area across full width for row 1
      mergeCells(ws, infoRow1, LEFT_START, infoRow1, LEFT_END);
      ws.getCell(infoRow1, LEFT_START).value = {
        richText: [
          { text: 'Raum:  ', font: { name: 'Calibri', size: 11, bold: true, color: { argb: DARK_GRAY_ARGB } } },
          { text: block.roomName, font: { name: 'Calibri', size: 11, bold: true, color: { argb: BLACK_ARGB } } },
          { text: '          Prüfer:  ', font: { name: 'Calibri', size: 11, bold: true, color: { argb: DARK_GRAY_ARGB } } },
          { text: block.teacherShort, font: { name: 'Calibri', size: 11, bold: true, color: { argb: CYAN_ARGB } } },
        ],
      };
      ws.getCell(infoRow1, LEFT_START).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      fillCells(ws, infoRow1, infoRow1, LEFT_START, LEFT_END, GRAY_FILL_ARGB);
      currentRow++;

      const infoRow2 = currentRow;
      ws.getRow(infoRow2).height = 16;
      mergeCells(ws, infoRow2, LEFT_START, infoRow2, LEFT_END);
      const pluralSuffix = block.exams.length === 1 ? '' : 'en';
      ws.getCell(infoRow2, LEFT_START).value = {
        richText: [
          { text: 'Anzahl:  ', font: { name: 'Calibri', size: 11, bold: true, color: { argb: DARK_GRAY_ARGB } } },
          { text: `${block.exams.length}`, font: { name: 'Calibri', size: 11, bold: true, color: { argb: BLACK_ARGB } } },
          { text: `  Prüfung${pluralSuffix}`, font: { name: 'Calibri', size: 11, bold: false, color: { argb: DARK_GRAY_ARGB } } },
        ],
      };
      ws.getCell(infoRow2, LEFT_START).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      fillCells(ws, infoRow2, infoRow2, LEFT_START, LEFT_END, GRAY_FILL_ARGB);
      currentRow++;

      // --- Column header row (Zeit / Prüfling) ---
      const headerRow = currentRow;
      ws.getRow(headerRow).height = 18;
      // Spacer
      ws.getRow(currentRow - 1).height = 8; // small gap before column headers

      setCellValue(ws, headerRow, LEFT_START, 'Zeit', 11, true, DARK_GRAY_ARGB, 'center', 'middle');
      mergeCells(ws, headerRow, LEFT_START, headerRow, LEFT_START + 1);
      setCellValue(ws, headerRow, LEFT_START + 2, 'Prüfling', 11, true, DARK_GRAY_ARGB, 'left', 'middle');
      mergeCells(ws, headerRow, LEFT_START + 2, headerRow, LEFT_END);

      // Underline for header
      ws.getCell(headerRow, LEFT_START).border = { bottom: thinBorder(BORDER_GRAY_ARGB) };
      ws.getCell(headerRow, LEFT_START + 2).border = { bottom: thinBorder(BORDER_GRAY_ARGB) };
      currentRow++;

      // --- Exam rows ---
      const examStartRow = currentRow;
      block.exams.forEach((exam) => {
        ws.getRow(currentRow).height = 16;
        const timeStr = minToTime(examSlotToMin(exam.startTime));
        const student = state.students.find((s) => s.id === exam.studentId);
        const ntaMarker = exam.hasNachteilsausgleich ? '*' : '';
        const studentShort = (student?.lastName.substring(0, 3).toUpperCase() || '???') + ntaMarker;

        // Zeit (centered, spans 2 cols)
        mergeCells(ws, currentRow, LEFT_START, currentRow, LEFT_START + 1);
        setCellValue(ws, currentRow, LEFT_START, timeStr, 11, false, BLACK_ARGB, 'center', 'middle');

        // Prüfling (bold abbreviation)
        mergeCells(ws, currentRow, LEFT_START + 2, currentRow, LEFT_END);
        setCellValue(ws, currentRow, LEFT_START + 2, studentShort, 11, true, BLACK_ARGB, 'left', 'middle');

        // Light separator line between exam rows
        for (let c = LEFT_START; c <= LEFT_END; c++) {
          const cell = ws.getCell(currentRow, c);
          cell.border = {
            ...cell.border,
            bottom: thinBorder('FFE2E8F0'),
          };
        }
        currentRow++;
      });

      // Determine the Beisitzer box's vertical span:
      // It spans from infoRow1 to last exam row
      const beisitzerTopRow = infoRow1;
      const lastExamRow = currentRow - 1;

      // We need 5 beisitzer lines + 1 header row minimum
      // If block is small, extend down
      const minBeisitzerRows = 7; // header + 5 lines + small padding
      const blockHeight = lastExamRow - beisitzerTopRow + 1;
      const beisitzerEndRow = beisitzerTopRow + Math.max(blockHeight, minBeisitzerRows) - 1;

      // Ensure worksheet has enough rows
      while (ws.rowCount < beisitzerEndRow) {
        ws.addRow([]);
      }

      // ---- BEISITZER BOX (right column) ----
      // Header row of Beisitzer box
      const beisitzerHeaderRow = beisitzerTopRow;
      ws.getRow(beisitzerHeaderRow).height = Math.max(ws.getRow(beisitzerHeaderRow).height || 0, 20);

      // Merge title cell
      mergeCells(ws, beisitzerHeaderRow, RIGHT_START, beisitzerHeaderRow, RIGHT_END);
      setCellValue(ws, beisitzerHeaderRow, RIGHT_START, 'Beisitzer:', 12, true, BLACK_ARGB, 'left', 'middle');
      ws.getCell(beisitzerHeaderRow, RIGHT_START).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      // Line under "Beisitzer:" header
      for (let c = RIGHT_START; c <= RIGHT_END; c++) {
        const cell = ws.getCell(beisitzerHeaderRow, c);
        cell.border = {
          ...cell.border,
          bottom: thinBorder(BORDER_GRAY_ARGB),
        };
      }

      // 5 Beisitzer entry rows
      const beisitzerEntryHeight = Math.max(
        Math.floor((beisitzerEndRow - beisitzerHeaderRow) / 5),
        3,
      );

      for (let i = 1; i <= 5; i++) {
        const bRow = beisitzerHeaderRow + (i - 1) * beisitzerEntryHeight + 1;

        // Number label row
        if (bRow <= beisitzerEndRow) {
          ws.getRow(bRow).height = 14;
          setCellValue(ws, bRow, RIGHT_START, `${i}.`, 11, false, DARK_GRAY_ARGB, 'left', 'bottom');
        }
        // Signature line row (1 row below number)
        const lineRow = bRow + 1;
        if (lineRow <= beisitzerEndRow) {
          ws.getRow(lineRow).height = 14;
          // Empty cell with bottom border as "line to write on"
          mergeCells(ws, lineRow, RIGHT_START, lineRow, RIGHT_END);
          ws.getCell(lineRow, RIGHT_START).border = {
            bottom: thinBorder(BORDER_GRAY_ARGB),
          };
        }
      }

      // Draw outline border around entire Beisitzer box
      applyOutlineBorder(ws, beisitzerTopRow, beisitzerEndRow, RIGHT_START, RIGHT_END, 'thin', BORDER_GRAY_ARGB);

      // Advance currentRow to end of beisitzerBox if it extends further
      if (beisitzerEndRow >= currentRow) {
        currentRow = beisitzerEndRow + 1;
      }
    });

    // ---- Footer: created-by ----
    currentRow++;
    ws.getRow(currentRow).height = 14;
    const now = new Date();
    const footerText = `Erstellt mit LinexioAbi am ${now.toLocaleDateString('de-DE')}, ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
    mergeCells(ws, currentRow, LEFT_START, currentRow, RIGHT_END);
    ws.getCell(currentRow, LEFT_START).value = footerText;
    ws.getCell(currentRow, LEFT_START).font = { name: 'Calibri', size: 8, italic: true, color: { argb: DARK_GRAY_ARGB } };
    ws.getCell(currentRow, LEFT_START).alignment = { horizontal: 'right', vertical: 'middle' };

    // ---- Generate and download ----
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
