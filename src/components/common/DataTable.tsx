import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Download,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { ApiResource, fetchResourcePage } from '../../utils/api';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  width?: number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  onAddNew?: () => void;
  addNewLabel?: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  actionsHeader?: string;
  extraHeaderActions?: React.ReactNode;
  rowKey: (item: T) => string;
  emptyMessage?: string;
  settingsKey?: string;
  serverResource?: ApiResource;
}

export function DataTable<T>({
  data,
  columns,
  title,
  subtitle,
  searchPlaceholder = 'Tabloda ara...',
  searchFields,
  onAddNew,
  addNewLabel = 'Yeni Ekle',
  onEdit,
  onDelete,
  onView,
  actionsHeader = 'İşlemler',
  extraHeaderActions,
  rowKey,
  emptyMessage = 'Gösterilecek kayıt bulunamadı.',
  settingsKey,
  serverResource,
}: DataTableProps<T>) {
  const normalizeSearchValue = (value: unknown) => String(value ?? '').toLocaleLowerCase('tr-TR').trim();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [serverData, setServerData] = useState<T[]>(data);
  const [serverTotal, setServerTotal] = useState(data.length);
  const storageKey = `issd_crm_table_settings_${settingsKey || title || 'default'}`;
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed?.visibleColumns) ? parsed.visibleColumns : columns.map((column) => column.key);
    } catch {
      return columns.map((column) => column.key);
    }
  });
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.columnWidths || {};
    } catch {
      return {};
    }
  });
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);

  useEffect(() => {
    if (!serverResource) return;
    let isCancelled = false;
    void fetchResourcePage<T>(serverResource, currentPage, pageSize, searchTerm)
      .then((result) => {
        if (isCancelled) return;
        setServerData(result.data);
        setServerTotal(result.meta.total);
      })
      .catch(() => {
        if (isCancelled) return;
        setServerData(data);
        setServerTotal(data.length);
      });
    return () => {
      isCancelled = true;
    };
  }, [serverResource, currentPage, pageSize, searchTerm, data]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ visibleColumns, columnWidths }));
  }, [storageKey, visibleColumns, columnWidths]);

  const hasActions = Boolean(onEdit || onDelete || onView);
  const activeColumns = columns.filter((column) => visibleColumns.includes(column.key));
  const getColumnWidth = (column: Column<T>) => columnWidths[column.key] || column.width || 160;
  const tableMinWidth = activeColumns.reduce((total, column) => total + getColumnWidth(column), hasActions ? 120 : 0);
  const setColumnWidth = (key: string, width: number) => {
    setColumnWidths((previous) => ({ ...previous, [key]: Math.max(100, Math.min(600, width)) }));
  };

  const startResize = (event: React.MouseEvent, key: string) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = columnWidths[key] || columns.find((column) => column.key === key)?.width || 160;
    const handleMove = (moveEvent: MouseEvent) => setColumnWidth(key, startWidth + moveEvent.clientX - startX);
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  // Filtered & Searched Data
  const filteredData = useMemo(() => {
    if (serverResource) return serverData;
    if (!searchTerm.trim() && Object.values(columnSearch).every((value) => typeof value !== 'string' || !value.trim())) return data;
    const term = normalizeSearchValue(searchTerm);

    return data.filter((item) => {
      const matchesColumnSearch = Object.entries(columnSearch).every(([key, value]) => {
        if (typeof value !== 'string' || !value.trim()) return true;
        return normalizeSearchValue((item as Record<string, unknown>)[key]).includes(normalizeSearchValue(value));
      });
      if (!matchesColumnSearch) return false;
      if (!term) return true;
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field];
          if (val === undefined || val === null) return false;
          return normalizeSearchValue(val).includes(term);
        });
      }
      // Fallback: search all object string/number properties
      return Object.values(item as object).some((val) => {
        if (typeof val === 'string' || typeof val === 'number') {
          return normalizeSearchValue(val).includes(term);
        }
        return false;
      });
    });
  }, [data, searchTerm, searchFields, columnSearch, serverData, serverResource]);

  // Sorted Data
  const sortedData = useMemo(() => {
    if (serverResource) return filteredData;
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];

      if (aVal === undefined || aVal === null) return sortOrder === 'asc' ? -1 : 1;
      if (bVal === undefined || bVal === null) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
      if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortOrder, serverResource]);

  // Pagination
  const totalPages = serverResource ? Math.ceil(serverTotal / pageSize) || 1 : Math.ceil(sortedData.length / pageSize) || 1;
  const totalRecords = serverResource ? serverTotal : sortedData.length;
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    if (serverResource) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, serverResource]);

  const handleSort = (key: string) => {
    setCurrentPage(1);
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const exportToExcel = async () => {
    if (sortedData.length === 0) return;
    const XLSX = await import('xlsx');
    const monetaryColumns = new Set([
      'amount', 'grandTotal', 'price', 'estimatedBudget', 'costPrice', 'salePrice', 'unitPrice', 'total',
    ]);
    const getExportValue = (item: T, key: string) => {
      const value = (item as Record<string, unknown>)[key];
      if (!monetaryColumns.has(key) || value === undefined || value === null || value === '') return value ?? '';
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : value;
    };
    const exportRows = sortedData.map((item) => Object.fromEntries(activeColumns.flatMap((column) => {
      const values: [string, unknown][] = [[column.header, getExportValue(item, column.key)]];
      if (monetaryColumns.has(column.key)) {
        values.push([`${column.header} Para Birimi`, (item as Record<string, unknown>).currency || 'TRY']);
      }
      return values;
    })));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Veriler');
    XLSX.writeFile(workbook, `issd_crm_rapor_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const resetTableSettings = () => {
    setSearchTerm('');
    setSortKey(null);
    setSortOrder('asc');
    setCurrentPage(1);
    setPageSize(10);
    setVisibleColumns(columns.map((column) => column.key));
    setColumnWidths({});
    setColumnSearch({});
    localStorage.removeItem(storageKey);
  };

  return (
    <div className="relative bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col">
      {/* Top Header & Search Bar Bar */}
      <div className="relative z-30 p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-t-xl">
        <div>
          {title && <h2 className="text-lg font-bold text-slate-900">{title}</h2>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="datatable-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Export Excel Button */}
          <button
            id="datatable-export-btn"
            onClick={exportToExcel}
            title="Excel formatında dışa aktar"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Excel'e Aktar</span>
          </button>

          <div className="relative">
            <button type="button" onClick={() => setIsColumnMenuOpen((open) => !open)} title="Tablo sütunlarını ayarla" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sütunlar</span>
            </button>
            {isColumnMenuOpen && (
              <div className="absolute right-0 mt-2 z-[100] w-64 max-h-80 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl shadow-xl">
                <p className="text-[11px] font-bold text-slate-500 uppercase mb-2">Görünen sütunlar</p>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {columns.map((column) => (
                    <label key={column.key} className="flex items-center gap-2 text-xs text-slate-700">
                      <input type="checkbox" checked={visibleColumns.includes(column.key)} disabled={visibleColumns.length === 1 && visibleColumns.includes(column.key)} onChange={() => setVisibleColumns((current) => current.includes(column.key) ? current.filter((key) => key !== column.key) : [...current, column.key])} className="rounded border-slate-300 text-indigo-600" />
                      {column.header}
                    </label>
                  ))}
                </div>
                <button type="button" onClick={resetTableSettings} className="mt-3 pt-2 border-t border-slate-100 w-full text-left text-xs text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Ayarları sıfırla</button>
              </div>
            )}
          </div>

          {/* Extra Header Actions */}
          {extraHeaderActions}

          {/* Add New Button */}
          {onAddNew && (
            <button
              id="datatable-add-new-btn"
              onClick={onAddNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{addNewLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto w-full">
        <table className="table-fixed text-left text-xs sm:text-sm text-slate-600" style={{ width: '100%', minWidth: `${tableMinWidth}px` }}>
          <colgroup>
            {activeColumns.map((column) => (
              <col key={column.key} style={{ width: `${getColumnWidth(column)}px` }} />
            ))}
            {hasActions && <col style={{ width: '120px' }} />}
          </colgroup>
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold text-xs tracking-wider uppercase">
            <tr>
              {activeColumns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={{ width: `${getColumnWidth(col)}px`, minWidth: `${getColumnWidth(col)}px` }}
                  className={`relative py-3.5 px-4 whitespace-nowrap ${col.className || ''}`}
                >
                  {col.sortable !== false ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1.5 group hover:text-indigo-600 focus:outline-hidden font-semibold"
                    >
                      <span>{col.header}</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                  <input
                    value={columnSearch[col.key] || ''}
                    onChange={(event) => {
                      setColumnSearch((current) => ({ ...current, [col.key]: event.target.value }));
                      setCurrentPage(1);
                    }}
                    placeholder="Ara..."
                    aria-label={`${col.header} sütununda ara`}
                    className="mt-2 block w-full min-w-20 px-2 py-1 text-[10px] font-normal normal-case tracking-normal bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-500"
                  />
                  <span onMouseDown={(event) => startResize(event, col.key)} aria-hidden="true" className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize hover:bg-indigo-400" />
                </th>
              ))}
              {hasActions && (
                <th scope="col" className="py-3.5 px-4 text-right whitespace-nowrap font-semibold">
                  {actionsHeader}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr
                  key={rowKey(item)}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {activeColumns.map((col) => (
                    <td
                      key={col.key}
                      style={{ width: `${getColumnWidth(col)}px`, minWidth: `${getColumnWidth(col)}px` }}
                      data-table-cell="true"
                      className={`datatable-cell py-3.5 px-4 align-middle text-slate-800 overflow-hidden ${col.className || ''}`}
                    >
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? '-')}
                    </td>
                  ))}

                  {hasActions && (
                    <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        {onView && (
                          <button
                            type="button"
                            onClick={() => onView(item)}
                            title="Görüntüle"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            title="Düzenle"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(item)}
                            title="Sil"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={activeColumns.length + (hasActions ? 1 : 0)}
                  className="py-12 px-4 text-center text-slate-400 bg-slate-50/30"
                >
                  <p className="text-sm font-medium">{emptyMessage}</p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-xs text-indigo-600 hover:underline"
                    >
                      Aramayı Temizle
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Sayfa başına:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-slate-400">|</span>
          <span>
            Toplam <strong className="text-slate-800">{totalRecords}</strong> kayıttan{' '}
            {totalRecords > 0
              ? `${(currentPage - 1) * pageSize + 1}-${Math.min(
                  currentPage * pageSize,
                  totalRecords
                )}`
              : '0'}{' '}
            gösteriliyor
          </span>
        </div>

        {/* Page Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            title="İlk Sayfa"
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            title="Önceki Sayfa"
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            title="Sonraki Sayfa"
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            title="Son Sayfa"
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
