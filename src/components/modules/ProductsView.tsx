import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, Plus, Sparkles } from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { ProductItem, ProductUnit } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { ExcelProductImportModal } from './ExcelProductImportModal';
import { generateNextProductId, getCategoryNumber } from '../../utils/productUtils';

const DEFAULT_CATEGORIES = [
  'Elektronik Denetleme Sistemleri (EDS)',
  'Akıllı Kavşak Sistemleri',
  'Görüntü İşleme & ANPR',
  'Trafik Bilgilendirme Sistemleri',
  'Algılama ve Sensör',
  'Haberleşme & Network',
  'Hız Uyarı Sistemleri',
  'Yazılım ve Lisans',
  'Hizmet ve SLA',
];

export const ProductsView: React.FC = () => {
  const {
    products,
    addProduct,
    addProductsBatch,
    updateProduct,
    deleteProduct,
    activeCompany,
    formatMoney,
  } = useCrm();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // Form State
  const [company, setCompany] = useState(activeCompany);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('ISSD');
  const [model, setModel] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [unit, setUnit] = useState<ProductUnit>('Adet');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Elektronik Denetleme Sistemleri (EDS)');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [stock, setStock] = useState(0);

  // Active calculated category name
  const effectiveCategory = isCustomCategory ? customCategoryInput.trim() || 'Yeni Kategori' : category;

  // Real-time computed KLM ID when adding a product
  const calculatedNextId = useMemo(() => {
    if (selectedProduct) {
      return selectedProduct.id;
    }
    return generateNextProductId(effectiveCategory, products);
  }, [selectedProduct, effectiveCategory, products]);

  const activeCategoryNumber = useMemo(() => {
    return getCategoryNumber(effectiveCategory, products);
  }, [effectiveCategory, products]);

  const openAddModal = () => {
    setSelectedProduct(null);
    setCompany(activeCompany);
    setName('');
    setBrand('ISSD');
    setModel('');
    setCostPrice(0);
    setSalePrice(0);
    setUnit('Adet');
    setDescription('');
    setCategory('Elektronik Denetleme Sistemleri (EDS)');
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setStock(0);
    setIsAddEditOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setSelectedProduct(p);
    setCompany(p.company);
    setName(p.name);
    setBrand(p.brand);
    setModel(p.model);
    setCostPrice(p.costPrice);
    setSalePrice(p.salePrice);
    setUnit(p.unit);
    setDescription(p.description);
    const isKnown = DEFAULT_CATEGORIES.includes(p.category || '');
    if (isKnown) {
      setCategory(p.category || 'Elektronik Denetleme Sistemleri (EDS)');
      setIsCustomCategory(false);
      setCustomCategoryInput('');
    } else {
      setIsCustomCategory(true);
      setCustomCategoryInput(p.category || '');
      setCategory('Diğer');
    }
    setStock(p.stock ?? 10);
    setIsAddEditOpen(true);
  };

  const openDeleteModal = (p: ProductItem) => {
    setSelectedProduct(p);
    setIsDeleteOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? customCategoryInput.trim() || 'Genel' : category;
    const finalId = selectedProduct ? selectedProduct.id : calculatedNextId;

    if (selectedProduct) {
      updateProduct(selectedProduct.id, {
        code: selectedProduct.code || selectedProduct.id,
        company,
        name,
        brand,
        model,
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        unit,
        description,
        category: finalCategory,
        stock: Number(stock),
      });
    } else {
      addProduct({
        code: finalId,
        company: company || activeCompany,
        name,
        brand,
        model,
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        unit,
        description,
        category: finalCategory,
        stock: Number(stock),
      });
    }
    setIsAddEditOpen(false);
  };

  // Table columns: Ürün ID (KLM-xxxx), Firma, Ürün Adı, Marka, Model, Maliyet Fiyatı, Satış Fiyatı, Birim, Açıklama
  const columns: Column<ProductItem>[] = [
    {
      key: 'id',
      header: 'Ürün ID',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <span
            className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80 text-xs inline-block"
            title={`Ürün ID: ${item.id}`}
          >
            {item.id}
          </span>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Firma',
      render: (item) => <span className="text-slate-600 text-xs">{item.company}</span>,
    },
    {
      key: 'name',
      header: 'Ürün Adı',
      render: (item) => (
        <div className="max-w-[260px]">
          <p className="font-bold text-slate-900 line-clamp-2" title={item.name}>
            {item.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.category && (
              <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm font-medium">
                {item.category}
              </span>
            )}
            {item.stock !== undefined && (
              <span className="text-[10px] text-emerald-700 font-semibold">
                Stok: {item.stock} {item.unit}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Marka',
      render: (item) => <span className="font-semibold text-slate-800 text-xs">{item.brand}</span>,
    },
    {
      key: 'model',
      header: 'Model',
      render: (item) => <span className="text-slate-600 text-xs font-mono">{item.model || '-'}</span>,
    },
    {
      key: 'costPrice',
      header: 'Maliyet Fiyatı',
      render: (item) => (
        <span className="text-slate-600 text-xs font-medium whitespace-nowrap">
          {formatMoney(item.costPrice)}
        </span>
      ),
    },
    {
      key: 'salePrice',
      header: 'Satış Fiyatı',
      render: (item) => {
        const margin =
          item.costPrice > 0 ? Math.round(((item.salePrice - item.costPrice) / item.costPrice) * 100) : 0;
        return (
          <div className="whitespace-nowrap">
            <span className="font-black text-slate-900 text-xs block">{formatMoney(item.salePrice)}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Marj: +%{margin}</span>
          </div>
        );
      },
    },
    {
      key: 'unit',
      header: 'Birim',
      render: (item) => <span className="text-slate-600 text-xs">{item.unit}</span>,
    },
    {
      key: 'description',
      header: 'Açıklama',
      render: (item) => (
        <span className="text-slate-500 text-xs max-w-[220px] truncate block" title={item.description}>
          {item.description || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={products}
        columns={columns}
        title="Ürünler ve Hizmetler"
        subtitle="ISSD Akıllı Ulaşım Sistemleri (Kategori bazlı KLM-ID kodlama ile yönetilir)"
        searchPlaceholder="Ürün ID, ürün adı veya model ara..."
        onAddNew={openAddModal}
        addNewLabel="Yeni Ürün / Hizmet Ekle"
        extraHeaderActions={
          <button
            id="btn-excel-import-products"
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/90 rounded-lg shadow-2xs transition-colors"
            title="Excel şablonu ile toplu ürün yükleyin veya güncelleyin"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel ile İçe Aktar</span>
          </button>
        }
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        rowKey={(item) => item.id}
        serverResource="products"
      />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedProduct ? 'Ürün / Hizmeti Düzenle' : 'Yeni Ürün veya Hizmet Tanımla'}
        subtitle="Otomatik kategoriye bağlı ID üretimi, maliyet-satış fiyatları ve teknik detaylar"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          {/* Dynamic ID Display Card */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                KLM
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-indigo-700 font-semibold uppercase tracking-wider">
                    {selectedProduct ? 'Kayıtlı Ürün ID' : 'Otomatik Atanacak Ürün ID'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-sm">
                    <Sparkles className="w-3 h-3" /> Kategori No: {activeCategoryNumber}
                  </span>
                </div>
                <p className="font-mono font-black text-indigo-950 text-base">
                  {calculatedNextId}
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] text-indigo-800 hidden sm:block">
              <p className="font-medium">Formül: <span className="font-mono font-bold">KLM-{activeCategoryNumber}xxxx</span></p>
              <p className="text-indigo-600">Kalem + Kategori No + Artan Sayaç</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori Seçimi *</label>
              <select
                value={isCustomCategory ? 'custom' : category}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomCategory(true);
                  } else {
                    setIsCustomCategory(false);
                    setCategory(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                {DEFAULT_CATEGORIES.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {idx + 1}. {cat} (KLM-{idx + 1}xxxx)
                  </option>
                ))}
                <option value="custom">+ Yeni Kategori Ekle...</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Firma</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          {isCustomCategory && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
              <label className="block font-bold text-amber-900 text-xs">Yeni Kategori Adı *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder="Örn: Otonom Araçlar & V2X Haberleşme"
                  className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-hidden text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(false)}
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg"
                >
                  Vazgeç
                </button>
              </div>
              <p className="text-[11px] text-amber-700">
                Yeni kategorilere sıradaki ilk boş numara (Örn: {activeCategoryNumber}) atanır ve ID bu numarayla başlar.
              </p>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ürün / Hizmet Adı *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: ISSD Ortalama Hız İhlal Tespit Sistemi (EDS OHTS)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Marka</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="ISSD / AXIS / Bosch / Siemens"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Model / Versiyon</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="OHTS-Pro-V4"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Maliyet Fiyatı (₺)</label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Satış Fiyatı (₺)</label>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Birim</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Adet">Adet</option>
                <option value="Set">Set</option>
                <option value="Paket">Paket</option>
                <option value="Kavşak">Kavşak</option>
                <option value="Nokta">Nokta</option>
                <option value="Yıllık Lisans">Yıllık Lisans</option>
                <option value="Adam/Gün">Adam/Gün</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stok Miktarı</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ürün Açıklaması & Şartname Özellikleri</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Teknik özellikleri, sertifikaları (EGM Onaylı, CE, TSE vb.) ve paket kapsamı..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors font-medium text-xs sm:text-sm"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-semibold shadow-xs text-xs sm:text-sm"
            >
              {selectedProduct ? 'Değişiklikleri Kaydet' : 'Ürünü Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => selectedProduct && deleteProduct(selectedProduct.id)}
        itemName={selectedProduct?.name}
      />

      {/* Excel Bulk Product Import Modal */}
      <ExcelProductImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImport={(items, updateExisting) => addProductsBatch(items, updateExisting)}
        activeCompany={activeCompany}
        existingProducts={products}
        formatMoney={formatMoney}
      />
    </div>
  );
};

