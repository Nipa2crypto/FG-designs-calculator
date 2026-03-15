window.FG_CONFIG = {
  currency: 'CHF',
  defaults: {
    hourlyRate: 30,
    materialRate: 100,
    consumableRate: 5,
    buffer: 10,
    complexity: 'complex',
    referenceQuality: 'usable',
    projectType: 'flat',
    widthCm: 80,
    heightCm: 100,
    partCount: 2,
    partsType: 'Fender / Seitendeckel / Covers',
    detailLevel: 8,
    precisionLevel: 8,
    colors: 7
  },
  materialBase: 18,
  productionHoursPerM2: 4.6,
  objects: {
    flat: {
      name: 'Flächiges Bild / Tafel',
      area: null,
      objectBaseHours: 0,
      surfaceFactor: 1.0,
      info: 'Freie Fläche mit echter Breite/Höhe.'
    },
    motoHelmet: {
      name: 'Motorradhelm',
      area: 0.40,
      objectBaseHours: 5.8,
      surfaceFactor: 2.05,
      info: 'Feste Vergleichsfläche 0.40 m². Motorradhelm bewusst deutlich höher angesetzt. Zerlegen/Zusammenbauen pauschal enthalten.'
    },
    snowHelmet: {
      name: 'Snowboardhelm',
      area: 0.28,
      objectBaseHours: 1.5,
      surfaceFactor: 1.15,
      info: 'Kleinere feste Vergleichsfläche 0.28 m². Weniger Demontageaufwand als Motorradhelm.'
    },
    tank: {
      name: 'Tank',
      area: 0.46,
      objectBaseHours: 1.8,
      surfaceFactor: 1.30,
      info: 'Feste Vergleichsfläche 0.46 m² für einen typischen Motorradtank.'
    }
  }
};