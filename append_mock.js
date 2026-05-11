const fs = require('fs');

const oldData = fs.readFileSync('src/lib/mockData_old.ts', 'utf8');

const getExport = (name, isArray) => {
  const startStr = `export const ${name} = `;
  const startIdx = oldData.indexOf(startStr);
  if (startIdx === -1) return '';
  const endChar = isArray ? '];' : '};';
  const endIdx = oldData.indexOf(endChar, startIdx);
  if (endIdx === -1) return '';
  return oldData.substring(startIdx, endIdx + 2);
};

const notif = getExport('MOCK_NOTIFICATIONS', true);
const ocr = getExport('MOCK_OCR', false);
const admin = getExport('MOCK_ADMIN', false);

const aliases = `
export const MOCK_ASSETS = MOCK_ASSET_ROSTER;
export const MOCK_STOCK = MOCK_STOCK_ASSET_ROSTER;
`;

fs.appendFileSync('src/lib/mockData.ts', '\n' + notif + '\n\n' + ocr + '\n\n' + admin + aliases);
console.log('Appended missing exports to mockData.ts');
