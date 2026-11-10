import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  RefreshCw,
  Info,
  HelpCircle,
} from 'lucide-react';
import { ProductItem, ProductUnit } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { generateNextProductId, getCategoryNumber } from '../../utils/productUtils';

interface ExcelProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: (Omit<ProductItem, 'id'> & { id?: string })[], updateExisting: boolean) => void;
  activeCompany: string;
  existingProducts: ProductItem[];
  formatMoney: (val: number) => string;
}

interface ParsedProductRow {
  id: string;
  code: string;
  company: string;
  category: string;
  name: string;
  brand: string;
  model: string;
  costPrice: number;
  salePrice: number;
  unit: ProductUnit;
  stock: number;
  description: string;
  isValid: boolean;
  validationMessage?: string;
  isExisting: boolean;
  rawRowIndex: number;
}

export const TEMPLATE_COLUMNS = [
  {
    header: 'Ürün ID',
    required: false,
    example: 'KLM-10008',
    description: 'KLM-[KategoriNo][SıraNo] (Örn: KLM-10008 EDS için, KLM-20003 Akıllı Kavşak için). Boşsa kategoriye göre otomatik üretilir.',
  },
  {
    header: 'Firma',
    required: false,
    example: 'ISSD Bilişim A.Ş.',
    description: 'Ürünün ait olduğu şirket adı',
  },
  {
    header: 'Kategori',
    required: true,
    example: 'Elektronik Denetleme Sistemleri (EDS)',
    description: '1: EDS, 2: Akıllı Kavşak, 3: Görüntü İşleme/Kamera, 4: VMS, 5: Sensör, 6: Network, 7: Radar, 8: Yazılım, 9: SLA (Yeni kategori girilirse sıradaki numara otomatik verilir)',
  },
  {
    header: 'Ürün Adı',
    required: true,
    example: 'ISSD Ortalama Hız Tespit Sistemi (EDS OHTS)',
    description: 'Ürün veya hizmetin tam ticari tanımı (Zorunlu)',
  },
  {
    header: 'Marka',
    required: false,
    example: 'ISSD',
    description: 'Ürün markası (ISSD, AXIS, Bosch, Siemens vb.)',
  },
  {
    header: 'Model',
    required: false,
    example: 'OHTS-Pro-V4',
    description: 'Model / Versiyon numarası',
  },
  {
    header: 'Maliyet Fiyatı',
    required: true,
    example: '85000',
    description: 'Birim maliyet tutarı (₺ cinsinden sayı)',
  },
  {
    header: 'Satış Fiyatı',
    required: true,
    example: '145000',
    description: 'Birim liste satış fiyatı (₺ cinsinden sayı)',
  },
  {
    header: 'Birim',
    required: true,
    example: 'Adet',
    description: 'Adet, Set, Paket, Kavşak, Nokta, Yıllık Lisans, Metre, Adam/Gün',
  },
  {
    header: 'Stok',
    required: false,
    example: '25',
    description: 'Mevcut depo stok adedi',
  },
  {
    header: 'Açıklama',
    required: false,
    example: 'EGM Onaylı Tip Onay Belgeli, 4K LPR Gece Görüşlü EDS Paketi',
    description: 'Teknik şartname, sertifika ve paket kapsam detayları',
  },
];

export const SAMPLE_TEMPLATE_DATA = [
  {
    'Ürün ID': 'KLM-10003',
    'Firma': 'ISSD Bilişim A.Ş.',
    'Kategori': 'Elektronik Denetleme Sistemleri (EDS)',
    'Ürün Adı': 'ISSD Koridor Hız İhlal Tespit Sistemi (EDS OHTS)',
    'Marka': 'ISSD',
    'Model': 'OHTS-Pro-V4',
    'Maliyet Fiyatı': 85000,
    'Satış Fiyatı': 145000,
    'Birim': 'Adet',
    'Stok': 15,
    'Açıklama': 'EGM Onaylı Tip Onay Belgeli, 4K LPR Gece Görüşlü EDS Paketi (Kategori: 1)',
  },
  {
    'Ürün ID': 'KLM-20003',
    'Firma': 'ISSD Bilişim A.Ş.',
    'Kategori': 'Akıllı Kavşak Sistemleri',
    'Ürün Adı': 'CHAOS-AI Dinamik Kavşak Sinyalizasyon Kontrolörü',
    'Marka': 'CHAOS AI',
    'Model': 'CHAOS-Edge-2026',
    'Maliyet Fiyatı': 35000,
    'Satış Fiyatı': 75000,
    'Birim': 'Lisans',
    'Stok': 999,
    'Açıklama': 'Derin öğrenme tabanlı dinamik sinyal süre optimizasyonu (Kategori: 2)',
  },
  {
    'Ürün ID': 'KLM-30002',
    'Firma': 'ISSD Bilişim A.Ş.',
    'Kategori': 'Görüntü İşleme & ANPR',
    'Ürün Adı': '4K Yapay Zeka Tabanlı LPR Plaka Tanıma Kamerası',
    'Marka': 'AXIS / ISSD',
    'Model': 'Q1700-LPR-AI',
    'Maliyet Fiyatı': 18500,
    'Satış Fiyatı': 32000,
    'Birim': 'Adet',
    'Stok': 40,
    'Açıklama': '250 km/s hızda %99.4 plaka okuma doğruluğu, dahili IR LED (Kategori: 3)',
  },
  {
    'Ürün ID': 'KLM-40002',
    'Firma': 'ISSD Bilişim A.Ş.',
    'Kategori': 'Trafik Bilgilendirme Sistemleri',
    'Ürün Adı': 'Dinamik Şerit Kontrol ve Hız Uyarı LED Paneli',
    'Marka': 'ISSD Matrix',
    'Model': 'LCS-FullColor-P10',
    'Maliyet Fiyatı': 45000,
    'Satış Fiyatı': 78000,
    'Birim': 'Adet',
    'Stok': 16,
    'Açıklama': 'Tünel ve otoyollar için NTCIP uyumlu şerit açma/kapama paneli (Kategori: 4)',
  },
  {
    'Ürün ID': 'KLM-50002',
    'Firma': 'ISSD Bilişim A.Ş.',
    'Kategori': 'Algılama ve Sensör',
    'Ürün Adı': 'Kavşak Alanı 3D Lazer Yaya Güvenlik Sensörü',
    'Marka': 'ISSD SensorTech',
    'Model': 'LIDAR-PED-200',
    'Maliyet Fiyatı': 55000,
    'Satış Fiyatı': 92000,
    'Birim': 'Adet',
    'Stok': 22,
    'Açıklama': 'Yaya geçidi bekleme alanı otomatik algılama ünitesi (Kategori: 5)',
  },
];

export const ExcelProductImportModal: React.FC<ExcelProductImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  activeCompany,
  existingProducts,
  formatMoney,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'formatGuide'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'invalid' | 'updates'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening
  const handleClose = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setParseError(null);
    setActiveTab('upload');
    onClose();
  };

  // 1. Download Excel Template (.xlsx)
  const downloadExcelTemplate = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_DATA);
      
      // Auto column widths
      const colWidths = [
        { wch: 14 }, // Kod
        { wch: 22 }, // Firma
        { wch: 20 }, // Kategori
        { wch: 45 }, // Ürün Adı
        { wch: 16 }, // Marka
        { wch: 18 }, // Model
        { wch: 15 }, // Maliyet Fiyatı
        { wch: 15 }, // Satış Fiyatı
        { wch: 14 }, // Birim
        { wch: 10 }, // Stok
        { wch: 55 }, // Açıklama
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Urunler');

      // Instructions Sheet
      const instructionsData = [
        { 'Alan / Sütun': 'Kod', 'Zorunlu': 'Evet', 'Açıklama': 'Benzersiz ürün kodu. Boşsa sistem otomatik kod atar. Mevcut kod varsa güncellenir.' },
        { 'Alan / Sütun': 'Firma', 'Zorunlu': 'Hayır', 'Açıklama': 'Örn: ISSD Bilişim A.Ş.' },
        { 'Alan / Sütun': 'Kategori', 'Zorunlu': 'Evet', 'Açıklama': 'EDS Sistemi, Yapay Zeka, Kontrolör & Donanım, Kamera, Yazılım & Lisans, Saha & Montaj vb.' },
        { 'Alan / Sütun': 'Ürün Adı', 'Zorunlu': 'Evet (ZORUNLU)', 'Açıklama': 'Ürün/Hizmetin tam adı (boş bırakılamaz)' },
        { 'Alan / Sütun': 'Marka', 'Zorunlu': 'Hayır', 'Açıklama': 'Örn: ISSD, AXIS, Siemens, Bosch' },
        { 'Alan / Sütun': 'Model', 'Zorunlu': 'Hayır', 'Açıklama': 'Örn: OHTS-Pro-V4, CHAOS-Edge' },
        { 'Alan / Sütun': 'Maliyet Fiyatı', 'Zorunlu': 'Evet', 'Açıklama': 'Sayı formatında (₺ cinsinden). Örn: 85000' },
        { 'Alan / Sütun': 'Satış Fiyatı', 'Zorunlu': 'Evet', 'Açıklama': 'Sayı formatında (₺ cinsinden). Örn: 145000' },
        { 'Alan / Sütun': 'Birim', 'Zorunlu': 'Evet', 'Açıklama': 'Adet, Set, Paket, Kavşak, Nokta, Yıllık Lisans, Metre, Adam/Gün' },
        { 'Alan / Sütun': 'Stok', 'Zorunlu': 'Hayır', 'Açıklama': 'Depo stok miktarı. Sayı formatında.' },
        { 'Alan / Sütun': 'Açıklama', 'Zorunlu': 'Hayır', 'Açıklama': 'Ürün özellikleri, şartname detayları, garanti süresi vb.' },
      ];
      const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
      instructionsSheet['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Doldurma_Kilavuzu');

      XLSX.writeFile(workbook, 'ISSD_Urun_Ekleme_Sablonu.xlsx');
    } catch (err) {
      console.error('Template download error:', err);
    }
  };

  // 2. Download CSV Template (.csv)
  const downloadCsvTemplate = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_DATA);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'ISSD_Urun_Ekleme_Sablonu.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV template download error:', err);
    }
  };

  // 3. Normalize string for smart header matching
  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .trim()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '');
  };

  // 4. Parse Excel / CSV File
  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setParseError(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel dosyasında sayfa bulunamadı.');
      }

      // Use first sheet or sheet named 'Urunler' / 'Ürünler'
      let targetSheetName = workbook.SheetNames[0];
      const urunlerSheet = workbook.SheetNames.find((name) =>
        ['urunler', 'ürünler', 'products', 'sheet1', 'sayfa1'].includes(name.toLowerCase().trim())
      );
      if (urunlerSheet) {
        targetSheetName = urunlerSheet;
      }

      const sheet = workbook.Sheets[targetSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (rawJson.length === 0) {
        throw new Error('Seçilen Excel sayfasında veri satırı bulunamadı.');
      }

      // Map rows with smart header recognition
      const existingCodes = new Set(
        existingProducts.map((p) => (p.id || p.code || '').trim().toUpperCase())
      );

      // Track running list of products so multi-row imports generate sequential KLM IDs
      const runningProducts: ProductItem[] = [...existingProducts];

      const parsed: ParsedProductRow[] = rawJson.map((row, index) => {
        // Find fields by key normalization
        const getField = (aliases: string[]): string => {
          const matchedKey = Object.keys(row).find((k) =>
            aliases.some((alias) => normalizeKey(k) === normalizeKey(alias))
          );
          if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
            return String(row[matchedKey]).trim();
          }
          return '';
        };

        const getNumberField = (aliases: string[], fallback: number = 0): number => {
          const str = getField(aliases);
          if (!str) return fallback;
          // Clean currency symbols or spaces: 85.000,50 or 85000.50
          const cleaned = str
            .replace(/₺|\$|€|TL/gi, '')
            .replace(/\s+/g, '')
            .trim();
          
          let num: number;
          if (cleaned.includes(',') && cleaned.includes('.')) {
            // e.g. 1.250,50 -> 1250.50
            num = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
          } else if (cleaned.includes(',')) {
            num = parseFloat(cleaned.replace(',', '.'));
          } else {
            num = parseFloat(cleaned);
          }
          return isNaN(num) ? fallback : num;
        };

        const providedId = getField(['Urun ID', 'Ürün ID', 'ID', 'Kod', 'Urun Kodu', 'Ürün Kodu', 'Code', 'Product Code', 'Stok Kodu']);
        const name = getField(['Urun Adi', 'Ürün Adı', 'Ad', 'Name', 'Product Name', 'Baslik', 'Hizmet']);
        const company = getField(['Firma', 'Sirket', 'Company', 'Kurum']) || activeCompany;
        const category = getField(['Kategori', 'Category', 'Tur', 'Grup']) || 'Elektronik Denetleme Sistemleri (EDS)';
        const brand = getField(['Marka', 'Brand', 'Uretici']) || 'ISSD';
        const model = getField(['Model', 'Versiyon', 'Model No', 'Tip']);
        const costPrice = getNumberField(['Maliyet Fiyati', 'Maliyet', 'Cost', 'Alis Fiyati', 'Birim Maliyet'], 0);
        const salePrice = getNumberField(['Satis Fiyati', 'Satis', 'Price', 'Fiyat', 'Birim Satis'], 0);
        
        let unit = getField(['Birim', 'Unit', 'Olcu']) as ProductUnit;
        if (!['Adet', 'Set', 'Metre', 'Lisans', 'Paket', 'Yıllık Hizmet', 'Kavşak', 'Nokta', 'Yıllık Lisans', 'Adam/Gün'].includes(unit)) {
          unit = 'Adet';
        }

        const stock = getNumberField(['Stok', 'Stok Miktari', 'Stock', 'Adet Miktar'], 0);
        const description = getField(['Aciklama', 'Açıklama', 'Description', 'Notlar', 'Ozellikler']);

        // Validation
        let isValid = true;
        let validationMessage = '';

        if (!name) {
          isValid = false;
          validationMessage = 'Ürün Adı boş bırakılamaz.';
        } else if (salePrice < 0) {
          isValid = false;
          validationMessage = 'Satış Fiyatı negatif olamaz.';
        }

        const upperId = providedId ? providedId.toUpperCase() : '';
        const isExisting = Boolean(upperId && existingCodes.has(upperId));

        // Generate next ID if none provided
        const finalId = providedId || generateNextProductId(category, runningProducts);

        // Add dummy to running list for sequence tracking
        if (!providedId) {
          runningProducts.push({
            id: finalId,
            code: finalId,
            company,
            category,
            name,
            brand,
            model,
            costPrice,
            salePrice,
            unit,
            stock,
            description,
          });
        }

        return {
          id: finalId,
          code: finalId,
          company,
          category,
          name,
          brand,
          model,
          costPrice,
          salePrice,
          unit,
          stock,
          description,
          isValid,
          validationMessage,
          isExisting,
          rawRowIndex: index + 2, // Excel row 1 is header
        };
      });

      setParsedRows(parsed);
    } catch (err: unknown) {
      console.error('File parsing error:', err);
      setParseError(
        err instanceof Error
          ? err.message
          : 'Excel dosyası işlenirken bir hata oluştu. Lütfen dosya formatını kontrol edin.'
      );
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  // Perform Import
  const handleConfirmImport = () => {
    const validItems = parsedRows.filter((r) => r.isValid);
    if (validItems.length === 0) return;

    const itemsToImport = validItems.map((r) => ({
      id: r.id,
      code: r.code,
      company: r.company,
      name: r.name,
      brand: r.brand,
      model: r.model,
      costPrice: r.costPrice,
      salePrice: r.salePrice,
      unit: r.unit,
      description: r.description,
      category: r.category,
      stock: r.stock,
    }));

    onImport(itemsToImport, updateExisting);
    handleClose();
  };

  // Filtered preview rows
  const filteredPreviewRows = parsedRows.filter((r) => {
    if (filterView === 'valid') return r.isValid;
    if (filterView === 'invalid') return !r.isValid;
    if (filterView === 'updates') return r.isExisting && r.isValid;
    return true;
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const updateCount = parsedRows.filter((r) => r.isExisting && r.isValid).length;
  const newCount = validCount - updateCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Excel ile Ürün / Hizmet Yükleme"
      subtitle="Excel şablonunu indirin, ürün bilgilerinizi doldurun ve sisteme doğrudan aktarın"
      maxWidth="4xl"
    >
      <div className="space-y-5 text-xs sm:text-sm">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Excel Yükle & Aktar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('formatGuide')}
              className={`px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'formatGuide'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Tablo Formatı & Şablon Bilgisi</span>
            </button>
          </div>

          {/* Quick Download Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
              title="Örnek verilerle doldurulmuş Excel dosyasını indir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel Şablonunu İndir (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
              title="CSV formatında şablon indir"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>.CSV İndir</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Format Guide */}
        {activeTab === 'formatGuide' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-950 flex items-start gap-2.5 text-xs">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-indigo-900 block mb-0.5">
                  Excel Tablosu Sütun Yapısı ve Kuralları:
                </strong>
                <span>
                  Aşağıdaki sütun başlıklarını içeren bir Excel (.xlsx / .xls) veya .csv dosyası hazırlayabilirsiniz.
                  Zorunlu alan <strong>Ürün Adı</strong>'dır. Kod belirtilmezse otomatik PRD kodu üretilir.
                </span>
              </div>
            </div>

            {/* Table Columns Reference */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Sütun Adı</th>
                    <th className="py-2.5 px-3">Zorunluluk</th>
                    <th className="py-2.5 px-3">Örnek Değer</th>
                    <th className="py-2.5 px-3">Açıklama & Kabul Edilen Değerler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {TEMPLATE_COLUMNS.map((col, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900 font-mono text-[11px]">
                        {col.header}
                      </td>
                      <td className="py-2 px-3">
                        {col.required ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-sm border border-rose-200">
                            Zorunlu
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                            Otomatik
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-indigo-700 font-medium">
                        {col.example}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{col.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Category ID Coding System Info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
              <p className="font-bold text-slate-900">
                🔢 Otomatik Ürün ID Kodlama Mantığı (KLM-[KategoriNo][SıraNo]):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="font-mono font-bold text-indigo-700">KLM-1xxxx</span>: Elektronik Denetleme Sistemleri (EDS)
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="font-mono font-bold text-indigo-700">KLM-2xxxx</span>: Akıllı Kavşak Sistemleri
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="font-mono font-bold text-indigo-700">KLM-3xxxx</span>: Görüntü İşleme & ANPR Kamera
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="font-mono font-bold text-indigo-700">KLM-4xxxx</span>: Trafik Bilgilendirme Sistemleri (VMS)
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="font-mono font-bold text-indigo-700">KLM-5xxxx</span>: Algılama ve Sensör (LiDAR/Radar)
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="font-mono font-bold text-indigo-700">KLM-6xxxx+</span>: Network, Yazılım, Hizmet ve Yeni Kategoriler
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Excel dosyasında "Ürün ID" sütununu boş bırakırsanız, sistem her ürünün kategorisine göre bir sonraki benzersiz ID numarasını otomatik olarak türetecektir.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Hazır, Dosya Yüklemeye Geç</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Upload & Parse Screen */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* Step 1: Drag & Drop Zone */}
            {!selectedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-indigo-600 bg-indigo-50/60 scale-[0.99]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1">
                  Excel veya CSV Dosyanızı Buraya Sürükleyin
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
                  veya bilgisayarınızdan seçmek için{' '}
                  <span className="text-indigo-600 font-semibold underline underline-offset-2">tıklayın</span>
                </p>

                <div className="inline-flex items-center gap-2 text-[11px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                  <span>Desteklenen formatlar:</span>
                  <strong className="text-slate-700">.xlsx, .xls, .csv</strong>
                </div>
              </div>
            ) : (
              /* Selected File Info Card */
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Toplam {parsedRows.length} satır okundu
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-500" />
                    <span className="hidden sm:inline">Değiştir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setParsedRows([]);
                      setParseError(null);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                    title="Dosyayı Kaldır"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* Error Banner */}
            {parseError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-0.5">Dosya Okuma Hatası</strong>
                  <span>{parseError}</span>
                </div>
              </div>
            )}

            {/* Parsing State */}
            {isProcessing && (
              <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Excel verileri ayrıştırılıyor ve doğrulanıyor...</span>
              </div>
            )}

            {/* Preview & Import Dashboard */}
            {parsedRows.length > 0 && !isProcessing && (
              <div className="space-y-3">
                {/* Stats & Filters Bar */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-2xs">
                  {/* Stats Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700">Özet:</span>
                    <Badge variant="indigo">Toplam: {parsedRows.length}</Badge>
                    <Badge variant="green" dot>
                      Geçerli: {validCount}
                    </Badge>
                    {newCount > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                        +{newCount} Yeni
                      </span>
                    )}
                    {updateCount > 0 && (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                        {updateCount} Güncellenecek
                      </span>
                    )}
                    {invalidCount > 0 && (
                      <Badge variant="red" dot>
                        {invalidCount} Hatalı
                      </Badge>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterView('all')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        filterView === 'all'
                          ? 'bg-white text-slate-900 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tümü ({parsedRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterView('valid')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        filterView === 'valid'
                          ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Geçerli ({validCount})
                    </button>
                    {invalidCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterView('invalid')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                          filterView === 'invalid'
                            ? 'bg-white text-rose-700 font-bold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Hatalı ({invalidCount})
                      </button>
                    )}
                  </div>
                </div>

                {/* Import Options Checkbox */}
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80">
                  <input
                    id="chk-update-existing"
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="chk-update-existing" className="cursor-pointer select-none">
                    Mevcut ürün kodlarıyla eşleşen kayıtları <strong>otomatik güncelle</strong> (fiyat, stok ve açıklamaları revize eder)
                  </label>
                </div>

                {/* Data Preview Table */}
                <div className="overflow-x-auto max-h-[300px] border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700 z-10">
                      <tr>
                        <th className="py-2.5 px-3 whitespace-nowrap">Durum</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Ürün ID</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Ürün Adı</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Kategori</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Marka / Model</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right">Maliyet</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right">Satış</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center">Birim</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center">Stok</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredPreviewRows.map((row, i) => (
                        <tr
                          key={i}
                          className={`hover:bg-slate-50/80 ${
                            !row.isValid ? 'bg-rose-50/40' : row.isExisting ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="py-2 px-3 whitespace-nowrap">
                            {!row.isValid ? (
                              <span
                                title={row.validationMessage}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-sm"
                              >
                                <AlertCircle className="w-3 h-3" /> Hata
                              </span>
                            ) : row.isExisting ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded-sm">
                                <RefreshCw className="w-3 h-3" /> Güncellenecek
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded-sm">
                                <CheckCircle2 className="w-3 h-3" /> Yeni
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700 text-[11px] whitespace-nowrap">
                            {row.code}
                          </td>
                          <td className="py-2 px-3 max-w-[220px]">
                            <p className="font-semibold text-slate-900 truncate" title={row.name}>
                              {row.name || <span className="text-rose-500 italic">Boş</span>}
                            </p>
                            {row.description && (
                              <span className="text-[10px] text-slate-400 truncate block">
                                {row.description}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                              {row.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            <span className="font-medium text-slate-800">{row.brand}</span>
                            {row.model && <span className="text-slate-400 font-mono text-[10px] block">{row.model}</span>}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                            {formatMoney(row.costPrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                            {formatMoney(row.salePrice)}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600 whitespace-nowrap">
                            {row.unit}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700 whitespace-nowrap">
                            {row.stock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 && (
              <span>
                Aktarılmaya hazır: <strong className="text-emerald-700 font-bold">{validCount}</strong> ürün
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors font-medium text-xs sm:text-sm"
            >
              Kapat
            </button>

            {parsedRows.length > 0 && validCount > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-semibold shadow-xs text-xs sm:text-sm inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sisteme Aktar ({validCount} Ürün)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
