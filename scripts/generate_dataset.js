const fs = require('fs/promises');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT_DIR, 'tests', 'fixtures', 'dataset_schema.json');
const NATIVE_DIR = path.join(ROOT_DIR, 'tests', 'fixtures', 'pdfs', 'native');
const SCANNED_DIR = path.join(ROOT_DIR, 'tests', 'fixtures', 'pdfs', 'scanned');
const DOCUMENTS_PER_TYPE = 10;
const SCANNED_PER_TYPE = 5;

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomNumber(rng, min, max, decimals = 1) {
  const value = rng() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function pick(rng, values) {
  return values[randomInt(rng, 0, values.length - 1)];
}

function randomDate(rng, min = '2026-01-01', max = '2026-12-31') {
  const start = new Date(`${min}T00:00:00Z`).getTime();
  const end = new Date(`${max}T00:00:00Z`).getTime();
  const value = new Date(start + Math.floor(rng() * (end - start + 1)));
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function makeRecord(type, index, rng) {
  if (type === 'laudo_ultrassonografia') {
    const week = randomInt(rng, 4, 41);
    return {
      document_type: type,
      fields: {
        data_exame: randomDate(rng),
        semana_gestacional: week,
        ccn_mm: randomNumber(rng, 2, 85),
        bpd_mm: randomNumber(rng, Math.max(14, week * 2.1), 98),
        ca_mm: randomNumber(rng, Math.max(70, week * 7), 380),
        cfl_mm: randomNumber(rng, Math.max(8, week * 1.5), 78),
      },
    };
  }

  if (type === 'exame_laboratorial') {
    const exam = pick(rng, ['glicemia', 'hemoglobina', 'leucocitos', 'plaquetas', 'tsh']);
    const ranges = {
      glicemia: [70, 200, 'mg/dL', '70 a 99 mg/dL em jejum'],
      hemoglobina: [9, 15, 'g/dL', '11 a 15 g/dL'],
      leucocitos: [5, 18, 'mil/mm3', '5 a 15 mil/mm3'],
      plaquetas: [150, 450, 'mil/mm3', '150 a 400 mil/mm3'],
      tsh: [0.2, 4.5, 'uUI/mL', '0.4 a 4.0 uUI/mL'],
    };
    const [min, max, unidade, referencia] = ranges[exam];

    return {
      document_type: type,
      fields: {
        data_exame: randomDate(rng),
        tipo_exame: exam,
        valor: randomNumber(rng, min, max),
        unidade,
        referencia,
      },
    };
  }

  if (type === 'cartao_vacinacao') {
    const dataAplicacao = randomDate(rng);
    return {
      document_type: type,
      fields: {
        vacina: pick(rng, ['dTpa', 'influenza', 'hepatite B', 'covid-19', 'dT']),
        data_aplicacao: dataAplicacao,
        lote: `L${randomInt(rng, 1000, 9999)}-${String.fromCharCode(65 + index)}`,
        proxima_dose: addDays(dataAplicacao, randomInt(rng, 30, 180)),
      },
    };
  }

  if (type === 'receita_medica') {
    return {
      document_type: type,
      fields: {
        medicamento: pick(rng, ['sulfato ferroso', 'acido folico', 'carbonato de calcio', 'vitamina D', 'metildopa']),
        dose: pick(rng, ['1 comprimido', '2 comprimidos', '5 mg', '250 mg', '500 mg']),
        posologia: pick(rng, ['tomar uma vez ao dia', 'tomar a cada 12 horas', 'tomar apos o almoco', 'tomar antes de dormir']),
        crm_medico: `CRM-PE ${randomInt(rng, 10000, 99999)}`,
      },
    };
  }

  return {
    document_type: type,
    fields: {
      data_consulta: randomDate(rng),
      peso_kg: randomNumber(rng, 45, 120),
      pressao: `${randomInt(rng, 90, 180)}/${randomInt(rng, 50, 110)} mmHg`,
      idade_gestacional: randomInt(rng, 4, 41),
      observacoes: pick(rng, [
        'gestante sem queixas no momento',
        'orientada hidratacao e retorno em quatro semanas',
        'movimentos fetais presentes',
        'solicitado acompanhamento de pressao arterial',
      ]),
    },
  };
}

function recordToLines(record, index) {
  const titleByType = {
    laudo_ultrassonografia: 'Laudo de ultrassonografia obstetrica',
    exame_laboratorial: 'Resultado de exame laboratorial',
    cartao_vacinacao: 'Cartao de vacinacao',
    receita_medica: 'Receita medica',
    resumo_pre_natal: 'Resumo de consulta pre-natal',
  };

  const labels = {
    data_exame: 'Data do exame',
    semana_gestacional: 'Semana gestacional',
    ccn_mm: 'CCN mm',
    bpd_mm: 'BPD mm',
    ca_mm: 'CA mm',
    cfl_mm: 'CFL mm',
    tipo_exame: 'Tipo do exame',
    valor: 'Valor',
    unidade: 'Unidade',
    referencia: 'Referencia',
    vacina: 'Vacina',
    data_aplicacao: 'Data de aplicacao',
    lote: 'Lote',
    proxima_dose: 'Proxima dose',
    medicamento: 'Medicamento',
    dose: 'Dose',
    posologia: 'Posologia',
    crm_medico: 'CRM do medico',
    data_consulta: 'Data da consulta',
    peso_kg: 'Peso kg',
    pressao: 'Pressao arterial',
    idade_gestacional: 'Idade gestacional',
    observacoes: 'Observacoes',
  };

  return [
    'MyFetus - documento sintetico',
    titleByType[record.document_type],
    `Identificador: ${record.document_type}_${String(index + 1).padStart(2, '0')}`,
    '',
    ...Object.entries(record.fields).map(([key, value]) => `${labels[key]}: ${value}`),
    '',
    'Dados ficticios gerados exclusivamente para testes automatizados.',
  ];
}

async function writeNativePdf(filePath, lines) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  lines.forEach((line, index) => {
    const isTitle = index === 0 || index === 1;
    page.drawText(line || ' ', {
      x: 56,
      y,
      size: isTitle ? 16 : 11,
      font: isTitle ? bold : font,
      color: isTitle ? rgb(0.1, 0.22, 0.28) : rgb(0.08, 0.08, 0.08),
    });
    y -= isTitle ? 28 : 19;
  });

  const bytes = await pdf.save();
  await fs.writeFile(filePath, bytes);
}

function loadCanvas() {
  try {
    return require('@napi-rs/canvas');
  } catch (err) {
    return require(path.join(ROOT_DIR, 'apps', 'api', 'node_modules', '@napi-rs', 'canvas'));
  }
}

function degradeCanvas(canvas, rng) {
  const context = canvas.getContext('2d');
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const noise = randomInt(rng, -8, 8);
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  context.putImageData(imageData, 0, 0);
  context.globalAlpha = 0.04;
  context.fillStyle = '#f5f0df';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = 1;
}

async function writeScannedPdf(lines, targetPath, rng) {
  const { createCanvas } = loadCanvas();
  const canvas = createCanvas(1240, 1754);
  const context = canvas.getContext('2d');

  context.fillStyle = '#fffdf6';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#1a1a1a';

  let y = 160;
  lines.forEach((line, index) => {
    const isTitle = index === 0 || index === 1;
    context.font = `${isTitle ? 'bold ' : ''}${isTitle ? 34 : 24}px Arial`;
    context.fillText(line || ' ', 110, y);
    y += isTitle ? 58 : 42;
  });

  degradeCanvas(canvas, rng);

  const scanned = await PDFDocument.create();
  const scannedPage = scanned.addPage([595.28, 841.89]);
  const png = await scanned.embedPng(canvas.toBuffer('image/png'));
  scannedPage.drawImage(png, {
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
  });

  await fs.writeFile(targetPath, await scanned.save());
}

async function cleanDirectory(dir) {
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });

  await Promise.all(entries.map((entry) => fs.rm(path.join(dir, entry.name), {
    recursive: true,
    force: true,
  })));
}

async function generateDataset({ withOcr = false } = {}) {
  const schema = JSON.parse(await fs.readFile(SCHEMA_PATH, 'utf8'));
  const types = Object.keys(schema.document_types);

  await cleanDirectory(NATIVE_DIR);
  if (withOcr) {
    await cleanDirectory(SCANNED_DIR);
  } else {
    await fs.mkdir(SCANNED_DIR, { recursive: true });
  }

  const generated = [];

  for (const [typeIndex, type] of types.entries()) {
    for (let index = 0; index < DOCUMENTS_PER_TYPE; index += 1) {
      const rng = createRng((typeIndex + 1) * 1000 + index + 7);
      const record = makeRecord(type, index, rng);
      const baseName = `${type}_${String(index + 1).padStart(2, '0')}`;
      const pdfPath = path.join(NATIVE_DIR, `${baseName}.pdf`);
      const truthPath = path.join(NATIVE_DIR, `${baseName}.ground_truth.json`);
      const lines = recordToLines(record, index);

      await writeNativePdf(pdfPath, lines);
      await fs.writeFile(truthPath, `${JSON.stringify({
        ...record,
        file_name: `${baseName}.pdf`,
        method: 'pdfjs',
        text_tokens: lines.filter(Boolean),
      }, null, 2)}\n`);

      generated.push(pdfPath);

      if (withOcr && index < SCANNED_PER_TYPE) {
        const scannedBaseName = `${baseName}_scanned`;
        const scannedPath = path.join(SCANNED_DIR, `${scannedBaseName}.pdf`);
        const scannedTruthPath = path.join(SCANNED_DIR, `${scannedBaseName}.ground_truth.json`);

        await writeScannedPdf(lines, scannedPath, createRng((typeIndex + 1) * 5000 + index + 11));
        await fs.writeFile(scannedTruthPath, `${JSON.stringify({
          ...record,
          file_name: `${scannedBaseName}.pdf`,
          method: 'ocr',
          text_tokens: lines.filter(Boolean),
        }, null, 2)}\n`);
      }
    }
  }

  return {
    nativeCount: generated.length,
    scannedCount: withOcr ? types.length * SCANNED_PER_TYPE : 0,
    nativeDir: path.relative(ROOT_DIR, NATIVE_DIR),
    scannedDir: path.relative(ROOT_DIR, SCANNED_DIR),
  };
}

if (require.main === module) {
  generateDataset({ withOcr: process.argv.includes('--with-ocr') })
    .then((summary) => {
      console.log(`Generated ${summary.nativeCount} native PDFs in ${summary.nativeDir}`);
      if (summary.scannedCount) {
        console.log(`Generated ${summary.scannedCount} scanned PDFs in ${summary.scannedDir}`);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  generateDataset,
  recordToLines,
};
