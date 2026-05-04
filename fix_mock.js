const fs = require('fs');
let content = fs.readFileSync('src/lib/mockData.ts', 'utf8');

// Membuang string 'Rp ' dan titik, mengubah "Rp 5.000.000" menjadi 5000000 murni
content = content.replace(/"amount":\s*"Rp\s+([0-9.]+)"/g, (match, p1) => {
  return '"amount": ' + p1.replace(/\./g, '');
});

fs.writeFileSync('src/lib/mockData.ts', content);
console.log('Mock Data Successfully Normalized!');
