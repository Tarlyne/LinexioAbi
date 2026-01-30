/**
 * Global CSS for PDF and Print exports.
 * Standardized for LinexioAbi V4.3
 */
export const PRINT_STYLES = `
  @page {
    size: A4;
    margin: 15mm;
  }

  .export-table { 
    font-family: "Times New Roman", Times, Baskerville, Georgia, serif;
    font-variant-numeric: lining-nums tabular-nums;
    border-collapse: separate; 
    border-spacing: 0;
    width: 100%; 
    border: none !important;
  }
  .export-table th, .export-table td { 
    padding: 0; 
    color: black !important;
    border: 0.4pt solid #000;
  }
  .export-table th { 
    height: 22pt;
    background-color: #f3f4f6 !important; 
    font-weight: bold; 
    font-size: 8pt; 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    text-align: center;
    text-transform: none;
  }

  .prep-table th {
    font-size: 10pt !important;
  }

  .export-table td { 
    height: 16.5pt; 
    font-size: 9.5pt; 
    overflow: hidden;
  }
  
  .cell-wrap {
    display: flex;
    align-items: center;
    height: 16.5pt;
    width: 100%;
    padding: 0 6px;
    box-sizing: border-box;
  }
  .justify-center { justify-content: center; }
  .justify-start { justify-content: flex-start; }

  .print-zebra { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
  
  .header-grid { 
    display: flex !important; 
    flex-direction: row !important;
    justify-content: space-between !important; 
    align-items: baseline !important; 
    margin-bottom: 20px; 
    border-bottom: 1.5pt solid #000; 
    padding-bottom: 6px; 
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .header-left { font-weight: 700; font-size: 15pt; margin: 0; color: black !important; }
  .header-cyan { color: #06b6d4 !important; }
  
  .header-right { font-size: 11pt; font-weight: 400; color: black !important; }
  .header-day { color: black !important; font-weight: 700; }

  .room-spacer td { 
    border: 0px solid transparent !important;
    height: 12pt;
    padding: 0 !important;
    background: transparent !important;
  }

  /* Footer Style */
  .export-footer {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 100%;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    padding-top: 20px;
  }

  /* Supervision Print Table (Landscape) */
  .supervision-print-container {
    width: 100%;
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: black !important;
    background: white;
  }
  .supervision-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    color: black !important;
    border: 0.5pt solid black;
  }
  .supervision-table thead th {
    border: 0.5pt solid #000;
    background-color: #f3f4f6 !important;
    font-size: 8pt;
    height: 24pt;
    color: black !important;
    border-bottom: 1.5pt solid black !important; 
  }
  .supervision-table td {
    border: 0.5pt solid black;
    height: 16.5pt;
    font-size: 8.5pt;
    color: black !important;
    text-align: center;
  }
  .sup-empty-cell {
    background-color: #f1f5f9 !important;
    -webkit-print-color-adjust: exact;
  }
  .sup-time-cell {
    font-weight: bold;
    width: 50pt;
    color: black !important;
    background-color: #f3f4f6 !important;
  }
  .sup-teacher-cell {
    font-weight: bold;
    background-color: white !important;
    color: black !important;
  }
`;
