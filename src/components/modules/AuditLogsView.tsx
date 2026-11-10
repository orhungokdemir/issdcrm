import React, { useMemo, useState } from 'react';
import { History, RefreshCw, ShieldAlert } from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { AuditLogItem } from '../../types';
import { Column, DataTable } from '../common/DataTable';

const formatDateTime = (value: string) => new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

const formatDetails = (details: unknown) => {
  if (details === undefined || details === null) return '-';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
};

export const AuditLogsView: React.FC = () => {
  const { auditLogs, users, refreshAuditLogs, hasPermission } = useCrm();
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const uniqueActions = useMemo(() => [...new Set(auditLogs.map((log) => log.action))].sort(), [auditLogs]);
  const uniqueResources = useMemo(() => [...new Set(auditLogs.map((log) => log.resource))].sort(), [auditLogs]);

  const filteredLogs = useMemo(() => auditLogs.filter((log) => {
    const createdAt = new Date(log.createdAt);
    const afterFrom = !fromDate || createdAt >= new Date(`${fromDate}T00:00:00`);
    const beforeTo = !toDate || createdAt <= new Date(`${toDate}T23:59:59.999`);
    return (!actionFilter || log.action === actionFilter)
      && (!resourceFilter || log.resource === resourceFilter)
      && (!userFilter || log.userId === userFilter)
      && afterFrom
      && beforeTo;
  }), [auditLogs, actionFilter, resourceFilter, userFilter, fromDate, toDate]);

  const clearFilters = () => {
    setActionFilter('');
    setResourceFilter('');
    setUserFilter('');
    setFromDate('');
    setToDate('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAuditLogs();
    } finally {
      setIsRefreshing(false);
    }
  };

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'createdAt',
      header: 'Tarih',
      width: 180,
      render: (item) => <span className="whitespace-nowrap text-xs">{formatDateTime(item.createdAt)}</span>,
    },
    {
      key: 'userId',
      header: 'Kullanıcı',
      width: 180,
      render: (item) => {
        const user = users.find((candidate) => candidate.id === item.userId);
        return <span className="font-semibold text-slate-800">{user?.fullName || item.userId}</span>;
      },
    },
    { key: 'action', header: 'İşlem', width: 140 },
    { key: 'resource', header: 'Kaynak', width: 150 },
    { key: 'recordId', header: 'Kayıt', width: 160, render: (item) => <span className="font-mono text-[11px]">{item.recordId || '-'}</span> },
    {
      key: 'details',
      header: 'Detay',
      width: 360,
      render: (item) => <span className="block max-w-[340px] truncate text-xs text-slate-500" title={formatDetails(item.details)}>{formatDetails(item.details)}</span>,
    },
  ];

  if (!hasPermission('users.manage')) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <ShieldAlert className="w-8 h-8 mx-auto text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900 mt-3">Yetkisiz Erişim</h2>
        <p className="text-sm text-slate-500 mt-2">Audit log kayıtları yalnızca sistem yöneticileri tarafından görüntülenebilir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600"><History className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Audit Log Yönetimi</h1>
            <p className="text-xs text-slate-500 mt-1">Kim, hangi kaynağı, ne zaman ve hangi işlemle değiştirdi?</p>
          </div>
        </div>
        <button type="button" onClick={() => void handleRefresh()} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Yenile
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} aria-label="İşlem filtresi" className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg">
          <option value="">Tüm işlemler</option>
          {uniqueActions.map((action) => <option key={action} value={action}>{action}</option>)}
        </select>
        <select value={resourceFilter} onChange={(event) => setResourceFilter(event.target.value)} aria-label="Kaynak filtresi" className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg">
          <option value="">Tüm kaynaklar</option>
          {uniqueResources.map((resource) => <option key={resource} value={resource}>{resource}</option>)}
        </select>
        <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)} aria-label="Kullanıcı filtresi" className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg">
          <option value="">Tüm kullanıcılar</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Başlangıç tarihi" className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg" />
        <div className="flex gap-2">
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Bitiş tarihi" className="min-w-0 flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg" />
          <button type="button" onClick={clearFilters} title="Filtreleri temizle" className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Temizle</button>
        </div>
      </div>

      <DataTable
        data={filteredLogs}
        columns={columns}
        title="İşlem Kayıtları"
        subtitle={`${filteredLogs.length} kayıt gösteriliyor`}
        searchPlaceholder="İşlem, kaynak, kullanıcı veya kayıt ara..."
        searchFields={['action', 'resource', 'userId', 'recordId']}
        rowKey={(item) => item.id}
        emptyMessage="Seçilen filtrelere uygun audit kaydı bulunamadı."
        settingsKey="audit-logs"
      />
    </div>
  );
};
