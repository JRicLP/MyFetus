#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function main() {
  const output = path.resolve(process.argv[2] || 'e2e/artifacts/synthetic-lab-report.pdf');
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('RELATORIO LABORATORIAL SINTETICO - E2E', {
    x: 48,
    y: 760,
    size: 16,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText('Paciente: Gestante E2E Sintetica', { x: 48, y: 720, size: 12, font });
  page.drawText('Exame: Hemograma sintetico E2E', { x: 48, y: 695, size: 12, font });
  page.drawText('Hemoglobina: 12,5 g/dL', { x: 48, y: 650, size: 12, font });
  page.drawText('Documento criado exclusivamente para testes automatizados.', {
    x: 48,
    y: 590,
    size: 11,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });

  fs.writeFileSync(output, await pdf.save());
  console.log(output);
}

main().catch((error) => {
  console.error(`Falha ao criar PDF sintético: ${error.message}`);
  process.exitCode = 1;
});
