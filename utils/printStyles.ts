/**
 * Global CSS for PDF and Print exports.
 * Category C Refactoring: Move CSS-in-JS strings to dedicated utility.
 */
export const PRINT_STYLES = `
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
    font-family: 'Inter', sans-serif;
    text-align: center;
  }
  .export-table td { 
    height: 16pt; 
    font-size: 9.5pt; 
    overflow: hidden;
  }
  
  .cell-wrap {
    display: flex;
    align-items: center;
    height: 16pt;
    width: 100%;
    padding: 0 6px;
    box-sizing: border-box;
  }
  .justify-center { justify-content: center; }
  .justify-start { justify-content: flex-start; }

  .print-zebra { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
  
  .header-grid { 
    display: flex !important; 
    flex-direction: row !important;
    justify-content: space-between !important; 
    align-items: baseline !important; 
    margin-bottom: 24px; 
    border-bottom: 1.8pt solid #000; 
    padding-bottom: 4px; 
    width: 100%;
    font-family: 'Inter', sans-serif;
  }
  .header-left { font-weight: 700; font-size: 14pt; margin: 0; }
  .header-right { font-size: 10pt; font-weight: 400; color: #333; }

  .room-spacer td { 
    border: 0px solid transparent !important;
    height: 14pt;
    padding: 0 !important;
    background: transparent !important;
  }
`;
