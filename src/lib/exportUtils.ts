import * as XLSX from 'xlsx';

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
