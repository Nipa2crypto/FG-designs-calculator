export const BASE = {
  currency: 'CHF',
  hourlyRate: 30,
  materialRatePerM2: 100,
  bufferPercent: 10,
  productionHoursPerM2: 4.6,
  defaultDateLocale: 'de-CH'
};

export const DEFAULTS = {
  projectName: '',
  customerName: '',
  projectNote: '',
  complexity: 'complex',
  referenceQuality: 'usable',
  projectType: 'flat',
  partCount: 2,
  widthCm: 80,
  heightCm: 100,
  detailLevel: 8,
  precisionLevel: 8,
  colors: 4
};

export function complexityConfig(level) {
  if (level === 'normal') return { multiplier: 1.0, setupHours: 1.2, name: 'Normal' };
  if (level === 'complex') return { multiplier: 1.35, setupHours: 2.4, name: 'Komplex' };
  return { multiplier: 1.78, setupHours: 3.9, name: 'Superkomplex' };
}

export function referenceExtraHours(type) {
  if (type === 'clean') return 0;
  if (type === 'usable') return 0.6;
  return 1.4;
}

export function projectConfig(type, partCount = 2) {
  if (type === 'flat') {
    return {
      area: null,
      objectBaseHours: 0,
      surfaceFactor: 1.0,
      name: 'Flächiges Bild / Tafel',
      info: 'Echte Fläche auf Basis Breite × Höhe.',
      areaText: 'Berechnung mit realer Fläche.'
    };
  }
  if (type === 'motoHelmet') {
    return {
      area: 0.40,
      objectBaseHours: 1.8,
      surfaceFactor: 1.20,
      name: 'Motorradhelm',
      info: 'Feste Vergleichsfläche 0.40 m². Zerlegen und Zusammenbauen pauschal enthalten.',
      areaText: 'Fixwert 0.40 m² inkl. Objektzuschlag.'
    };
  }
  if (type === 'snowHelmet') {
    return {
      area: 0.28,
      objectBaseHours: 1.1,
      surfaceFactor: 1.08,
      name: 'Snowboardhelm',
      info: 'Kleinere feste Vergleichsfläche 0.28 m² mit geringerem Handling-Aufwand.',
      areaText: 'Fixwert 0.28 m².'
    };
  }
  if (type === 'tank') {
    return {
      area: 0.46,
      objectBaseHours: 1.2,
      surfaceFactor: 1.18,
      name: 'Tank',
      info: 'Typischer Motorradtank als feste Vergleichsfläche 0.46 m².',
      areaText: 'Fixwert 0.46 m².'
    };
  }
  return {
    area: 0.46 + (partCount * 0.11),
    objectBaseHours: 1.2 + (partCount * 0.45),
    surfaceFactor: 1.24,
    name: `Tank + ${partCount} Teil(e)`,
    info: `Tank mit ${partCount} Zusatzteil(en); pro Teil werden feste Vergleichsfläche und Zusatzstunden ergänzt.`,
    areaText: `Tank-Basis 0.46 m² + ${partCount} × 0.11 m².`
  };
}

export const REFERENCE_LABELS = {
  clean: 'Saubere Vorlage',
  usable: 'Brauchbar, aber Nacharbeit nötig',
  rough: 'Schwach / unsauber / viel Aufbereitung'
};
