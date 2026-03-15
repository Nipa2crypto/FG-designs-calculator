import { BASE, DEFAULTS, complexityConfig, referenceExtraHours, projectConfig, REFERENCE_LABELS } from './config.js';
import { PRESETS } from './presets.js';

const el = (id) => document.getElementById(id);

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function formatCurrency(value) {
  return new Intl.NumberFormat(BASE.defaultDateLocale, {
    style: 'currency',
    currency: BASE.currency,
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat(BASE.defaultDateLocale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function todayString() {
  return new Intl.DateTimeFormat(BASE.defaultDateLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());
}

function slugify(value) {
  return (value || 'fg-designs-kalkulation')
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'fg-designs-kalkulation';
}

function getValues() {
  return {
    projectName: el('projectName').value.trim(),
    customerName: el('customerName').value.trim(),
    projectNote: el('projectNote').value.trim(),
    complexity: el('complexity').value,
    referenceQuality: el('referenceQuality').value,
    projectType: el('projectType').value,
    partCount: clampNumber(el('partCount').value, 1, 10, DEFAULTS.partCount),
    widthCm: clampNumber(el('widthCm').value, 1, 5000, DEFAULTS.widthCm),
    heightCm: clampNumber(el('heightCm').value, 1, 5000, DEFAULTS.heightCm),
    detailLevel: clampNumber(el('detailLevel').value, 1, 10, DEFAULTS.detailLevel),
    precisionLevel: clampNumber(el('precisionLevel').value, 1, 10, DEFAULTS.precisionLevel),
    colors: clampNumber(el('colors').value, 1, 20, DEFAULTS.colors)
  };
}

function buildSummaryHtml(v, calc, proj, comp) {
  const items = [
    `<li><strong>Projekt:</strong> ${v.projectName || '–'}</li>`,
    `<li><strong>Kunde:</strong> ${v.customerName || '–'}</li>`,
    `<li><strong>Objekt:</strong> ${proj.name}</li>`,
    `<li><strong>Grundkomplexität:</strong> ${comp.name}</li>`,
    `<li><strong>Vorlagenqualität:</strong> ${REFERENCE_LABELS[v.referenceQuality]}</li>`,
    v.projectType === 'flat' ? `<li><strong>Grösse:</strong> ${v.widthCm} × ${v.heightCm} cm</li>` : '',
    `<li><strong>Detailgrad:</strong> ${v.detailLevel}/10</li>`,
    `<li><strong>Präzision:</strong> ${v.precisionLevel}/10</li>`,
    `<li><strong>Farblagen:</strong> ${v.colors}</li>`,
    `<li><strong>Preisziel:</strong> ${formatCurrency(calc.target)}</li>`
  ].filter(Boolean).join('');
  return `<ul>${items}</ul>`;
}

function calculate() {
  const v = getValues();
  const comp = complexityConfig(v.complexity);
  const proj = projectConfig(v.projectType, v.partCount);
  const refHours = referenceExtraHours(v.referenceQuality);

  const area = v.projectType === 'flat'
    ? (v.widthCm * v.heightCm) / 10000
    : proj.area;

  const detailFactor = 0.82 + (v.detailLevel * 0.08);
  const precisionFactor = 0.86 + (v.precisionLevel * 0.07);
  const colorsFactor = 1 + (Math.max(0, v.colors - 2) * 0.05);

  const productionHours = area
    * BASE.productionHoursPerM2
    * comp.multiplier
    * detailFactor
    * precisionFactor
    * colorsFactor
    * proj.surfaceFactor;

  const totalHours = comp.setupHours + proj.objectBaseHours + refHours + productionHours;
  const labor = totalHours * BASE.hourlyRate;
  const material = area * BASE.materialRatePerM2 * (1 + ((v.colors - 1) * 0.08));
  const subtotal = labor + material;
  const target = subtotal * (1 + (BASE.bufferPercent / 100));
  const low = target * 0.9;
  const high = target * 1.1;

  const calc = { area, productionHours, totalHours, labor, material, subtotal, target, low, high, detailFactor, precisionFactor, colorsFactor, refHours };

  el('priceTarget').textContent = formatCurrency(target);
  el('priceRange').textContent = `Angebotsspanne: ${formatCurrency(low)} – ${formatCurrency(high)}`;
  el('areaEquivalent').textContent = `${formatNumber(area)} m²`;
  el('hoursTotal').textContent = `${formatNumber(totalHours, 1)} h`;
  el('laborTotal').textContent = formatCurrency(labor);
  el('materialTotal').textContent = formatCurrency(material);
  el('detailLevelValue').textContent = v.detailLevel;
  el('precisionLevelValue').textContent = v.precisionLevel;
  el('objectInfo').innerHTML = `<strong>Objektlogik:</strong> ${proj.info} <br><strong>Flächenlogik:</strong> ${proj.areaText}`;
  el('projectSummary').innerHTML = buildSummaryHtml(v, calc, proj, comp);

  el('formulaText').innerHTML = `
    <strong>Rechenlogik:</strong><br>
    Stunden = Setup (${formatNumber(comp.setupHours, 1)} h) + Objektbasis (${formatNumber(proj.objectBaseHours, 1)} h) + Vorlagenaufbereitung (${formatNumber(refHours, 1)} h) + Produktionszeit.<br>
    Produktionszeit = Fläche × ${formatNumber(BASE.productionHoursPerM2, 1)} h/m² × Komplexität (${formatNumber(comp.multiplier, 2)}) × Detail (${formatNumber(detailFactor, 2)}) × Präzision (${formatNumber(precisionFactor, 2)}) × Farben (${formatNumber(colorsFactor, 2)}) × Oberflächenfaktor (${formatNumber(proj.surfaceFactor, 2)}).<br><br>
    <strong>Fix hinterlegt:</strong> ${formatCurrency(BASE.hourlyRate)} / h, ${formatCurrency(BASE.materialRatePerM2)} pro m², ${BASE.bufferPercent} % Puffer.
  `;

  window.currentCalculation = { values: v, comp, proj, calc };
}

function handleProjectTypeChange() {
  const type = el('projectType').value;
  el('flatWrap').classList.toggle('hidden', type !== 'flat');
  el('partsWrap').classList.toggle('hidden', type !== 'tankParts');
  calculate();
}

function resetForm() {
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    if (el(key)) el(key).value = value;
  });
  handleProjectTypeChange();
  calculate();
}

function applyPreset(values) {
  Object.entries(values).forEach(([key, value]) => {
    if (el(key)) el(key).value = value;
  });
  calculate();
}

function renderPresets() {
  const row = el('presetRow');
  row.innerHTML = PRESETS.map((preset) => `
    <button type="button" class="preset-chip" data-preset="${preset.id}">${preset.label}</button>
  `).join('');
  row.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset]');
    if (!button) return;
    const preset = PRESETS.find((item) => item.id === button.dataset.preset);
    if (preset) applyPreset(preset.values);
  });
}

async function exportPdf() {
  const state = window.currentCalculation;
  if (!state) return;
  const { values: v, comp, proj, calc } = state;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const margin = 16;
  let y = 18;

  doc.setFillColor(10, 8, 16);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setFillColor(122, 63, 212);
  doc.roundedRect(margin, y, 178, 24, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('FG Designs – Kalkulation', margin + 8, y + 15);

  y += 34;
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 230);
  doc.text(`Datum: ${todayString()}`, margin, y);
  doc.text(`Projekt: ${v.projectName || '–'}`, margin + 58, y);
  doc.text(`Kunde: ${v.customerName || '–'}`, margin + 118, y);

  y += 10;

  const addBlock = (title, lines) => {
    doc.setFillColor(22, 20, 33);
    doc.roundedRect(margin, y, 178, 8 + (lines.length * 7), 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(245, 245, 250);
    doc.text(title, margin + 6, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(215, 215, 225);
    lines.forEach((line, index) => {
      doc.text(line, margin + 6, y + 13 + (index * 7));
    });
    y += 14 + (lines.length * 7);
  };

  addBlock('Eckdaten', [
    `Objekt: ${proj.name}`,
    `Grundkomplexität: ${comp.name}`,
    `Vorlagenqualität: ${REFERENCE_LABELS[v.referenceQuality]}`,
    v.projectType === 'flat' ? `Grösse: ${v.widthCm} × ${v.heightCm} cm` : `Flächenlogik: ${proj.areaText}`
  ]);

  addBlock('Bewertung', [
    `Detailgrad: ${v.detailLevel}/10`,
    `Präzision / Maskierung: ${v.precisionLevel}/10`,
    `Farben / Farblagen: ${v.colors}`,
    `Geschätzte Stunden: ${formatNumber(calc.totalHours, 1)} h`
  ]);

  addBlock('Ergebnis', [
    `Äquivalente Fläche: ${formatNumber(calc.area)} m²`,
    `Arbeitsanteil: ${formatCurrency(calc.labor)}`,
    `Materialanteil: ${formatCurrency(calc.material)}`,
    `Preisziel inkl. Puffer: ${formatCurrency(calc.target)}`,
    `Angebotsspanne: ${formatCurrency(calc.low)} – ${formatCurrency(calc.high)}`
  ]);

  if (v.projectNote) {
    const split = doc.splitTextToSize(`Notiz: ${v.projectNote}`, 164);
    addBlock('Notiz', split);
  }

  doc.setFontSize(9);
  doc.setTextColor(170, 170, 185);
  doc.text(`Fixe Basis: ${formatCurrency(BASE.hourlyRate)} / h · ${formatCurrency(BASE.materialRatePerM2)} pro m² · ${BASE.bufferPercent} % Puffer`, margin, 286);

  const filename = `${slugify(v.projectName || v.customerName || 'fg-designs-kalkulation')}_${todayString().replaceAll('.', '-')}.pdf`;
  doc.save(filename);
}

async function copySummary() {
  const state = window.currentCalculation;
  if (!state) return;
  const { values: v, comp, proj, calc } = state;
  const text = [
    'FG Designs – Kalkulation',
    `Datum: ${todayString()}`,
    `Projekt: ${v.projectName || '–'}`,
    `Kunde: ${v.customerName || '–'}`,
    `Objekt: ${proj.name}`,
    `Grundkomplexität: ${comp.name}`,
    `Vorlagenqualität: ${REFERENCE_LABELS[v.referenceQuality]}`,
    v.projectType === 'flat' ? `Grösse: ${v.widthCm} × ${v.heightCm} cm` : `Flächenlogik: ${proj.areaText}`,
    `Detailgrad: ${v.detailLevel}/10`,
    `Präzision: ${v.precisionLevel}/10`,
    `Farblagen: ${v.colors}`,
    `Äquivalente Fläche: ${formatNumber(calc.area)} m²`,
    `Geschätzte Stunden: ${formatNumber(calc.totalHours, 1)} h`,
    `Preisziel: ${formatCurrency(calc.target)}`,
    `Angebotsspanne: ${formatCurrency(calc.low)} – ${formatCurrency(calc.high)}`,
    v.projectNote ? `Notiz: ${v.projectNote}` : ''
  ].filter(Boolean).join('\n');

  await navigator.clipboard.writeText(text);
}

function initBaseCards() {
  el('baseHourlyRate').textContent = formatCurrency(BASE.hourlyRate);
  el('baseMaterialRate').textContent = formatCurrency(BASE.materialRatePerM2);
  el('baseBuffer').textContent = `${BASE.bufferPercent} %`;
}

function bindEvents() {
  document.querySelectorAll('input, select, textarea').forEach((node) => {
    node.addEventListener('input', calculate);
    node.addEventListener('change', calculate);
  });

  el('projectType').addEventListener('change', handleProjectTypeChange);
  el('resetBtn').addEventListener('click', resetForm);
  el('pdfBtn').addEventListener('click', exportPdf);
  el('copyBtn').addEventListener('click', async () => {
    try {
      await copySummary();
      const original = el('copyBtn').textContent;
      el('copyBtn').textContent = 'Kopiert';
      setTimeout(() => { el('copyBtn').textContent = original; }, 1200);
    } catch {
      alert('Kopieren hat nicht funktioniert.');
    }
  });
}

function init() {
  initBaseCards();
  renderPresets();
  bindEvents();
  resetForm();
}

init();
