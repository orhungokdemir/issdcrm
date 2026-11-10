import { ProductItem } from '../types';

/**
 * Standard default categories and their predefined numbers.
 * 1: EDS (Elektronik Denetleme Sistemleri)
 * 2: Akıllı Kavşak Sistemleri
 * 3: Görüntü İşleme & ANPR / Kamera
 * 4: Trafik Bilgilendirme Sistemleri / VMS
 * 5: Algılama ve Sensör
 * 6: Haberleşme & Network
 * 7: Hız Uyarı Sistemleri
 * 8: Yazılım ve Lisans / Yapay Zeka
 * 9: Saha, Montaj ve Hizmet / SLA
 */
export const DEFAULT_CATEGORY_NUMBERS: Record<string, number> = {
  'Elektronik Denetleme Sistemleri (EDS)': 1,
  'EDS Sistemi': 1,
  'EDS': 1,
  'Akıllı Kavşak Sistemleri': 2,
  'Akıllı Kavşak': 2,
  'Görüntü İşleme & ANPR': 3,
  'Kamera': 3,
  'Trafik Bilgilendirme Sistemleri': 4,
  'Trafik Bilgilendirme': 4,
  'VMS': 4,
  'Algılama ve Sensör': 5,
  'Sensör': 5,
  'Haberleşme & Network': 6,
  'Kontrolör & Donanım': 6,
  'Hız Uyarı Sistemleri': 7,
  'Radar': 7,
  'Yazılım ve Lisans': 8,
  'Yazılım & Lisans': 8,
  'Yapay Zeka': 8,
  'Hizmet ve SLA': 9,
  'Saha & Montaj': 9,
  'Hizmet': 9,
};

/**
 * Normalizes a category string for reliable comparison
 */
export function normalizeCategoryName(cat: string): string {
  return (cat || '')
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/**
 * Scans all products and determines the assigned category number for a category.
 * If the category is brand new, assigns the next available sequential number (e.g. 10, 11...).
 */
export function getCategoryNumber(
  categoryName: string,
  existingProducts: ProductItem[] = []
): number {
  const trimmed = (categoryName || '').trim();
  if (!trimmed) return 1;

  // 1. Check exact match in existing products first
  const existingWithSameCat = existingProducts.find(
    (p) => normalizeCategoryName(p.category) === normalizeCategoryName(trimmed)
  );

  if (existingWithSameCat) {
    const match = (existingWithSameCat.id || existingWithSameCat.code || '').match(/^KLM-(\d+)/i);
    if (match && match[1]) {
      const numStr = match[1];
      // If e.g. "10001", the category number is the leading digit(s) before the last 4 digits
      if (numStr.length >= 5) {
        const catNum = parseInt(numStr.slice(0, numStr.length - 4), 10);
        if (!isNaN(catNum) && catNum > 0) return catNum;
      }
    }
  }

  // 2. Check predefined defaults map
  for (const [key, num] of Object.entries(DEFAULT_CATEGORY_NUMBERS)) {
    if (normalizeCategoryName(key) === normalizeCategoryName(trimmed)) {
      return num;
    }
  }

  // Check partial keyword matching in predefined defaults
  const norm = normalizeCategoryName(trimmed);
  if (norm.includes('eds') || norm.includes('denetleme') || norm.includes('hiz koridor')) return 1;
  if (norm.includes('kavsak') || norm.includes('sinyalizasyon')) return 2;
  if (norm.includes('anpr') || norm.includes('kamera') || norm.includes('lpr') || norm.includes('plaka')) return 3;
  if (norm.includes('vms') || norm.includes('bilgilendirme') || norm.includes('mesaj isareti')) return 4;
  if (norm.includes('sensor') || norm.includes('lidar') || norm.includes('algilama')) return 5;
  if (norm.includes('network') || norm.includes('haberlesme') || norm.includes('kontrolor') || norm.includes('donanim')) return 6;
  if (norm.includes('radar') || norm.includes('hiz uyari')) return 7;
  if (norm.includes('yazilim') || norm.includes('lisans') || norm.includes('yapay zeka') || norm.includes('ai')) return 8;
  if (norm.includes('hizmet') || norm.includes('sla') || norm.includes('montaj') || norm.includes('saha')) return 9;

  // 3. New Category: Find the maximum category number currently used across all products & defaults
  let maxCatNum = Math.max(...Object.values(DEFAULT_CATEGORY_NUMBERS));

  existingProducts.forEach((p) => {
    const match = (p.id || p.code || '').match(/^KLM-(\d+)/i);
    if (match && match[1]) {
      const numStr = match[1];
      if (numStr.length >= 5) {
        const parsedCat = parseInt(numStr.slice(0, numStr.length - 4), 10);
        if (!isNaN(parsedCat) && parsedCat > maxCatNum) {
          maxCatNum = parsedCat;
        }
      }
    }
  });

  return maxCatNum + 1;
}

/**
 * Calculates the next unique Product ID based on category and current database records.
 * Format: KLM-[CategoryNumber][4-digit sequence]
 * e.g., Category 1 -> KLM-10001, KLM-10002...
 *       Category 2 -> KLM-20001, KLM-20002...
 */
export function generateNextProductId(
  categoryName: string,
  existingProducts: ProductItem[] = []
): string {
  const catNum = getCategoryNumber(categoryName, existingProducts);

  let maxSeq = 0;
  const prefix = `KLM-${catNum}`;

  existingProducts.forEach((p) => {
    const rawId = (p.id || p.code || '').toUpperCase().trim();
    const match = rawId.match(/^KLM-(\d+)(\d{4})$/);
    if (match && parseInt(match[1], 10) === catNum) {
      const seq = parseInt(match[2], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });

  const nextSeq = maxSeq + 1;
  const formattedSeq = String(nextSeq).padStart(4, '0');

  return `KLM-${catNum}${formattedSeq}`;
}

/**
 * Parses and explains a KLM Product ID for user tooltips and badges.
 */
export function parseProductIdDetails(id: string, categoryName?: string) {
  const match = (id || '').match(/^KLM-(\d+)/i);
  if (!match) {
    return {
      isValidFormat: false,
      rawId: id,
      categoryNumber: null,
      sequenceNumber: null,
      label: id,
    };
  }

  const numStr = match[1];
  let catNum: number;
  let seqNum: number;

  if (numStr.length >= 5) {
    catNum = parseInt(numStr.slice(0, numStr.length - 4), 10);
    seqNum = parseInt(numStr.slice(numStr.length - 4), 10);
  } else {
    catNum = parseInt(numStr[0], 10);
    seqNum = parseInt(numStr.slice(1), 10) || 1;
  }

  return {
    isValidFormat: true,
    rawId: id,
    categoryNumber: catNum,
    sequenceNumber: seqNum,
    label: `KLM (Kalem) - Kategori ${catNum} - Sıra ${String(seqNum).padStart(4, '0')}`,
    categoryName: categoryName || `Kategori ${catNum}`,
  };
}
