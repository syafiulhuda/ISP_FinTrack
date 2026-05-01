import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

/**
 * Export an HTML element to a PDF file.
 * @param elementId The ID of the HTML element to export.
 * @param filename The name of the downloaded PDF file.
 */
export const exportToPDF = async (elementId: string, filename: string = 'export.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return false;
  }

  try {
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Failed to export to PDF:', error);
    return false;
  }
};

/**
 * Export an array of objects to an Excel file.
 * @param data Array of objects representing rows.
 * @param filename The name of the downloaded Excel file.
 * @param sheetName Optional sheet name.
 */
export const exportToExcel = (data: any[], filename: string = 'export.xlsx', sheetName: string = 'Sheet1') => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
    return true;
  } catch (error) {
    console.error('Failed to export to Excel:', error);
    return false;
  }
};
