import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'indigo' | 'amber';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'indigo',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const styles: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    blue: 'bg-sky-50 text-sky-700 border-sky-200/80',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    red: 'bg-rose-50 text-rose-700 border-rose-200/80',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200/80',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
    gray: 'bg-slate-100 text-slate-700 border-slate-200/80',
  };

  const dotColors: Record<string, string> = {
    indigo: 'bg-indigo-500',
    blue: 'bg-sky-500',
    green: 'bg-emerald-500',
    red: 'bg-rose-500',
    yellow: 'bg-amber-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    gray: 'bg-slate-400',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${styles[variant] || styles.indigo} ${sizeClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || dotColors.indigo}`} />}
      {children}
    </span>
  );
};

export const getStatusBadge = (status: string) => {
  const normalized = status?.trim();
  switch (normalized) {
    // Proposal Statuses
    case 'Açık':
      return <Badge variant="indigo" dot>Açık</Badge>;
    case 'Onay':
    case 'Onaylandı':
      return <Badge variant="green" dot>Onay</Badge>;
    case 'Red':
    case 'Reddedildi':
      return <Badge variant="red" dot>Red</Badge>;
    case 'İptal':
    case 'İptal Edildi':
      return <Badge variant="gray" dot>İptal</Badge>;

    // Activity Statuses
    case 'Tamamlandı':
      return <Badge variant="green" dot>Tamamlandı</Badge>;
    case 'Planlandı':
      return <Badge variant="indigo" dot>Planlandı</Badge>;
    case 'Ertelendi':
      return <Badge variant="yellow" dot>Ertelendi</Badge>;

    // Request Statuses
    case 'Yeni':
      return <Badge variant="indigo" dot>Yeni</Badge>;
    case 'İnceleniyor':
      return <Badge variant="amber" dot>İnceleniyor</Badge>;
    case 'İşleme Alındı':
      return <Badge variant="purple" dot>İşleme Alındı</Badge>;

    // Contract Statuses
    case 'Yürürlükte':
      return <Badge variant="green" dot>Yürürlükte</Badge>;
    case 'Yenileme Bekliyor':
      return <Badge variant="yellow" dot>Yenileme Bekliyor</Badge>;
    case 'Süresi Doldu':
      return <Badge variant="red" dot>Süresi Doldu</Badge>;
    case 'Taslak':
      return <Badge variant="gray" dot>Taslak</Badge>;

    // Order Statuses
    case 'Hazırlanıyor':
      return <Badge variant="amber" dot>Hazırlanıyor</Badge>;
    case 'Sevk Edildi':
      return <Badge variant="indigo" dot>Sevk Edildi</Badge>;
    case 'Teslim Edildi':
      return <Badge variant="green" dot>Teslim Edildi</Badge>;

    // User Status
    case 'Aktif':
      return <Badge variant="green" dot>Aktif</Badge>;
    case 'Pasif':
      return <Badge variant="gray" dot>Pasif</Badge>;

    default:
      return <Badge variant="gray">{status}</Badge>;
  }
};
