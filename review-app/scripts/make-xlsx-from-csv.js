const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function run() {
  const csvPath = path.join(__dirname, '..', 'data', 'classes-sample.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV sample not found at', csvPath);
    process.exit(1);
  }
  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim()));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Classes');
  sheet.addRow(headers);
  for (const r of rows) sheet.addRow(r);

  const outPath = path.join(__dirname, '..', 'classes-test.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log('Wrote', outPath);
}

run().catch(err => { console.error(err); process.exit(1); });
