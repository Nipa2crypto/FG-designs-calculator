(() => {
  const cfg = window.FG_CONFIG;
  const presets = window.FG_PRESETS || [];
  const $ = (id) => document.getElementById(id);

  const ids = [
    'projectName','customerName','projectNote','complexity','referenceQuality','projectType','preset',
    'widthCm','heightCm','partCount','partsType','detailLevel','precisionLevel','colors',
    'hourlyRate','materialRate','consumableRate','buffer','preWorkNeeded','preWorkHours','specialMaterialName','specialMaterialCost'
  ];

  const complexityConfig = (level) => {
    if (level === 'normal') return { multiplier: 1.0, setupHours: 1.2, name: 'Normal' };
    if (level === 'complex') return { multiplier: 1.35, setupHours: 2.4, name: 'Komplex' };
    return { multiplier: 1.78, setupHours: 3.9, name: 'Superkomplex' };
  };

  const referenceExtraHours = (type) => {
    if (type === 'clean') return 0;
    if (type === 'usable') return 0.6;
    return 1.4;
  };

  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };

  const currency = (value) => new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: cfg.currency,
    maximumFractionDigits: 0
  }).format(value);

  const num = (value, digits = 2) => new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);

  function formatRatePerHour(value) {
    return `${currency(value)}/h`;
  }

  function formatRatePerSquare(value) {
    return `${currency(value)}/m²`;
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }

  function buildPrintRows(rows) {
    const body = $('printTableBody');
    if (!body) return;
    body.innerHTML = rows.map((row, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${row.label}</td>
        <td class="right">${row.qty}</td>
        <td class="right">${row.rate}</td>
        <td class="right">${row.total}</td>
      </tr>
    `).join('');
  }

  function updatePrintQuote(data) {
    setText('printProjectName', data.values.projectName || '–');
    setText('printCustomerName', data.values.customerName || '–');
    setText('printDate', new Intl.DateTimeFormat('de-CH').format(new Date()));

    const noteWrap = $('printProjectNoteWrap');
    if (data.values.projectNote) {
      noteWrap.style.display = 'block';
      setText('printProjectNote', data.values.projectNote);
    } else {
      noteWrap.style.display = 'none';
      setText('printProjectNote', '–');
    }

    const rows = [
      {
        label: `Grundaufwand ${data.compName}`,
        qty: `${num(data.compSetupHours, 1)} h`,
        rate: formatRatePerHour(data.values.hourlyRate),
        total: currency(data.compSetupCost)
      }
    ];

    if (data.referenceHours > 0) {
      rows.push({
        label: `Vorlagenaufbereitung (${data.referenceLabel})`,
        qty: `${num(data.referenceHours, 1)} h`,
        rate: formatRatePerHour(data.values.hourlyRate),
        total: currency(data.referenceCost)
      });
    }

    if (data.objectBaseHours > 0) {
      rows.push({
        label: `Objektbasis ${data.projectNameResolved}`,
        qty: `${num(data.objectBaseHours, 1)} h`,
        rate: formatRatePerHour(data.values.hourlyRate),
        total: currency(data.objectBaseCost)
      });
    }

    rows.push({
      label: `Produktionszeit ${data.projectNameResolved} · Detail ${data.values.detailLevel}/10 · Präzision ${data.values.precisionLevel}/10 · ${data.values.colors} Farben`,
      qty: `${num(data.productionHours, 1)} h`,
      rate: formatRatePerHour(data.values.hourlyRate),
      total: currency(data.productionCost)
    });

    if (data.values.preWorkNeeded === 'yes' && data.values.preWorkHours > 0) {
      rows.push({
        label: 'Vorarbeiten zusätzlich',
        qty: `${num(data.values.preWorkHours, 1)} h`,
        rate: formatRatePerHour(data.values.hourlyRate),
        total: currency(data.preWorkCost)
      });
    }

    rows.push({
      label: `Material Grundbedarf (${num(data.area)} m²)`,
      qty: `${num(data.area)} m²`,
      rate: formatRatePerSquare(data.values.materialRate),
      total: currency(data.material)
    });

    rows.push({
      label: 'Verbrauchsmaterial',
      qty: `${num(data.totalHours, 1)} h`,
      rate: formatRatePerHour(data.values.consumableRate),
      total: currency(data.consumables)
    });

    if (data.values.specialMaterialCost > 0) {
      rows.push({
        label: data.values.specialMaterialName ? `Sondermaterial: ${data.values.specialMaterialName}` : 'Sondermaterial',
        qty: '1',
        rate: currency(data.values.specialMaterialCost),
        total: currency(data.values.specialMaterialCost)
      });
    }

    buildPrintRows(rows);
    setText('printSubtotal', currency(data.subtotal));
    setText('printBuffer', currency(data.target - data.subtotal));
    setText('printTotal', currency(data.target));
  }

  function tankPartsConfig(partCount, partsType) {
    return {
      name: `Tank + ${partCount} Teil(e)`,
      area: 0.46 + (partCount * 0.11),
      objectBaseHours: 1.8 + (partCount * 0.55),
      surfaceFactor: 1.36,
      info: `Tank mit ${partCount} Zusatzteil(en) (${partsType || 'diverse Teile'}). Pro Teil werden feste Vergleichsfläche und Zusatzstunden ergänzt.`
    };
  }

  function getProjectConfig(type, partCount, partsType) {
    if (type === 'tankParts') return tankPartsConfig(partCount, partsType);
    return cfg.objects[type];
  }

  function getValues() {
    return {
      projectName: $('projectName').value.trim(),
      customerName: $('customerName').value.trim(),
      projectNote: $('projectNote').value.trim(),
      hourlyRate: clamp($('hourlyRate').value, 0, 10000, cfg.defaults.hourlyRate),
      materialRate: clamp($('materialRate').value, 0, 10000, cfg.defaults.materialRate),
      consumableRate: clamp($('consumableRate').value, 0, 10000, cfg.defaults.consumableRate),
      buffer: clamp($('buffer').value, 0, 1000, cfg.defaults.buffer),
      preWorkNeeded: $('preWorkNeeded').value,
      preWorkHours: clamp($('preWorkHours').value, 0, 1000, 0),
      specialMaterialName: $('specialMaterialName').value.trim(),
      specialMaterialCost: clamp($('specialMaterialCost').value, 0, 100000, 0),
      complexity: $('complexity').value,
      referenceQuality: $('referenceQuality').value,
      projectType: $('projectType').value,
      preset: $('preset').value,
      widthCm: clamp($('widthCm').value, 1, 5000, cfg.defaults.widthCm),
      heightCm: clamp($('heightCm').value, 1, 5000, cfg.defaults.heightCm),
      partCount: clamp($('partCount').value, 1, 10, cfg.defaults.partCount),
      partsType: $('partsType').value.trim(),
      detailLevel: clamp($('detailLevel').value, 1, 10, cfg.defaults.detailLevel),
      precisionLevel: clamp($('precisionLevel').value, 1, 10, cfg.defaults.precisionLevel),
      colors: clamp($('colors').value, 1, 20, cfg.defaults.colors),
    };
  }

  function updateStaticConfigView() {
    $('cfgMaterialBase').textContent = currency(cfg.materialBase);
    $('cfgBaseHours').textContent = `${num(cfg.productionHoursPerM2, 1)} h`;
  }

  function populatePresets() {
    const select = $('preset');
    presets.forEach((preset) => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.label;
      select.appendChild(option);
    });
  }

  function applyPreset(presetId) {
    if (!presetId) return;
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    Object.entries(preset.values).forEach(([key, value]) => {
      if ($(key)) $(key).value = value;
    });
    calculate();
  }

  function toggleObjectFields() {
    const type = $('projectType').value;
    $('flatFields').classList.toggle('hidden', type !== 'flat');
    $('partsFields').classList.toggle('hidden', type !== 'tankParts');
  }

  function toggleExtraCostFields() {
    const showPreWork = $('preWorkNeeded').value === 'yes';
    $('preWorkHoursWrap').classList.toggle('hidden', !showPreWork);
    if (!showPreWork) $('preWorkHours').value = 0;
  }

  function buildSummary(data) {
    const lines = [
      'FG Designs – Kalkulationszusammenfassung',
      data.values.projectName ? `Projekt: ${data.values.projectName}` : null,
      data.values.customerName ? `Kunde: ${data.values.customerName}` : null,
      `Objekt: ${data.projectNameResolved}`,
      `Grundkomplexität: ${data.compName}`,
      `Vorlagenqualität: ${data.referenceLabel}`,
      data.dimensions ? `Grösse: ${data.dimensions}` : null,
      `Stundensatz: ${currency(data.values.hourlyRate)}`,
      `Material / m²: ${currency(data.values.materialRate)}`,
      `Verbrauchsmaterial / h: ${currency(data.values.consumableRate)}`,
      `Vorarbeiten nötig: ${data.values.preWorkNeeded === 'yes' ? 'Ja' : 'Nein'}`,
      data.values.preWorkNeeded === 'yes' ? `Vorarbeiten Stunden: ${num(data.values.preWorkHours, 1)} h` : null,
      data.values.specialMaterialName ? `Sondermaterial: ${data.values.specialMaterialName}` : null,
      data.values.specialMaterialCost > 0 ? `Sondermaterial Kosten: ${currency(data.values.specialMaterialCost)}` : null,
      `Puffer: ${data.values.buffer}%`,
      `Äquivalente Fläche: ${num(data.area)} m²`,
      `Detailgrad: ${data.values.detailLevel}/10`,
      `Präzision/Maskierung: ${data.values.precisionLevel}/10`,
      `Farben/Farblagen: ${data.values.colors}`,
      `Geschätzte Stunden: ${num(data.totalHours, 1)} h`,
      `Arbeitsanteil: ${currency(data.labor)}`,
      `Materialanteil: ${currency(data.material)}`,
      `Verbrauchsmaterial gesamt: ${currency(data.consumables)}`,
      `Vorarbeiten gesamt: ${currency(data.preWorkCost)}`,
      `Sondermaterial gesamt: ${currency(data.specialMaterialCost)}`,
      `Zwischensumme: ${currency(data.subtotal)}`,
      `Empfohlener Zielpreis: ${currency(data.target)}`,
      `Angebotsspanne: ${currency(data.low)} – ${currency(data.high)}`,
      data.values.projectNote ? `Notiz: ${data.values.projectNote}` : null,
    ].filter(Boolean);
    return lines.join('\n');
  }

  function calculate() {
    toggleObjectFields();
    toggleExtraCostFields();

    const v = getValues();
    const comp = complexityConfig(v.complexity);
    const refHours = referenceExtraHours(v.referenceQuality);
    const proj = getProjectConfig(v.projectType, v.partCount, v.partsType);

    const area = v.projectType === 'flat'
      ? (v.widthCm * v.heightCm) / 10000
      : proj.area;

    const detailFactor = 0.82 + (v.detailLevel * 0.08);
    const precisionFactor = 0.86 + (v.precisionLevel * 0.07);
    const colorsFactor = 1 + (Math.max(0, v.colors - 2) * 0.05);

    const productionHours = area
      * cfg.productionHoursPerM2
      * comp.multiplier
      * detailFactor
      * precisionFactor
      * colorsFactor
      * proj.surfaceFactor;

    const totalHours = comp.setupHours + proj.objectBaseHours + refHours + productionHours;
    const labor = totalHours * v.hourlyRate;
    const material = (area * v.materialRate * (1 + ((v.colors - 1) * 0.08))) + cfg.materialBase;
    const consumables = totalHours * v.consumableRate;
    const preWorkCost = (v.preWorkNeeded === 'yes' ? v.preWorkHours : 0) * v.hourlyRate;
    const specialMaterialCost = v.specialMaterialCost;
    const subtotal = labor + material + consumables + preWorkCost + specialMaterialCost;
    const target = subtotal * (1 + (v.buffer / 100));
    const low = target * 0.9;
    const high = target * 1.1;

    $('detailLevelValue').textContent = v.detailLevel;
    $('precisionLevelValue').textContent = v.precisionLevel;
    $('objectInfo').innerHTML = `<strong>Objektlogik:</strong> ${proj.info}`;
    $('priceTarget').textContent = currency(target);
    $('priceRange').textContent = `Angebotsspanne: ${currency(low)} – ${currency(high)}`;
    $('areaEquivalent').textContent = `${num(area)} m²`;
    $('hoursTotal').textContent = `${num(totalHours, 1)} h`;
    $('laborTotal').textContent = currency(labor);
    $('materialTotal').textContent = currency(material);
    $('consumableTotal').textContent = currency(consumables);
    $('preWorkTotal').textContent = currency(preWorkCost);
    $('specialMaterialTotal').textContent = currency(specialMaterialCost);
    $('subtotalTotal').textContent = currency(subtotal);

    $('formulaText').innerHTML = `
      <strong>Rechenlogik</strong><br>
      Stunden = Setup (${num(comp.setupHours,1)} h) + Objektbasis (${num(proj.objectBaseHours,1)} h) + Vorlagenaufbereitung (${num(refHours,1)} h) + Produktionszeit.<br>
      Produktionszeit = Fläche × ${num(cfg.productionHoursPerM2,1)} h/m² × Komplexität (${num(comp.multiplier,2)}) × Detail (${num(detailFactor,2)}) × Präzision (${num(precisionFactor,2)}) × Farben (${num(colorsFactor,2)}) × Oberflächenfaktor (${num(proj.surfaceFactor,2)}).<br>
      Zwischensumme = Arbeit + Material + Verbrauchsmaterial (${currency(v.consumableRate)}/h) + Vorarbeiten + Sondermaterial. Danach Puffer ${v.buffer}%.
    `;

    const compSetupHours = comp.setupHours;
    const compSetupCost = compSetupHours * v.hourlyRate;
    const referenceHours = refHours;
    const referenceCost = referenceHours * v.hourlyRate;
    const objectBaseHours = proj.objectBaseHours;
    const objectBaseCost = objectBaseHours * v.hourlyRate;
    const productionCost = productionHours * v.hourlyRate;

    const payload = {
      values: v,
      area, totalHours, labor, material, consumables, preWorkCost, specialMaterialCost, subtotal, target, low, high,
      projectNameResolved: proj.name,
      compName: comp.name,
      referenceLabel: $('referenceQuality').selectedOptions[0].text,
      dimensions: v.projectType === 'flat' ? `${v.widthCm} × ${v.heightCm} cm` : null,
      compSetupHours, compSetupCost,
      referenceHours, referenceCost,
      objectBaseHours, objectBaseCost,
      productionHours, productionCost
    };
    const summary = buildSummary(payload);
    $('summaryPreview').textContent = summary;
    updatePrintQuote(payload);
    window.__fgSummary = summary;
  }

  function resetForm() {
    $('projectName').value = '';
    $('customerName').value = '';
    $('projectNote').value = '';
    $('preset').value = '';
    $('preWorkNeeded').value = 'no';
    $('preWorkHours').value = 0;
    $('specialMaterialName').value = '';
    $('specialMaterialCost').value = 0;
    Object.entries(cfg.defaults).forEach(([key, value]) => {
      if ($(key)) $(key).value = value;
    });
    calculate();
  }

  function copySummary() {
    navigator.clipboard.writeText(window.__fgSummary || '').then(() => {
      const btn = $('copyBtn');
      const old = btn.textContent;
      btn.textContent = 'Kopiert';
      setTimeout(() => btn.textContent = old, 1200);
    }).catch(() => alert('Kopieren hat nicht funktioniert.'));
  }

  function exportPdf() {
    const printTitle = `${$('projectName').value.trim() || $('customerName').value.trim() || 'FG-Designs-Kalkulation'} – FG Designs`;
    const previousTitle = document.title;
    document.title = printTitle;
    setTimeout(() => { window.print(); }, 50);
    setTimeout(() => { document.title = previousTitle; }, 1000);
  }

  function bindEvents() {
    ids.forEach((id) => {
      const node = $(id);
      if (!node) return;
      node.addEventListener('input', calculate);
      node.addEventListener('change', calculate);
    });

    $('preset').addEventListener('change', (e) => applyPreset(e.target.value));
    $('resetBtn').addEventListener('click', resetForm);
    $('copyBtn').addEventListener('click', copySummary);
    $('pdfBtn').addEventListener('click', exportPdf);
  }

  updateStaticConfigView();
  populatePresets();
  bindEvents();
  resetForm();
})();