# ISSD B2B CRM

ISSD Akıllı Ulaşım Sistemleri için geliştirilmiş; ihale/fırsat, müşteri, ürün, aktivite, talep, teklif, sipariş, sözleşme, teminat mektubu ve kullanıcı yönetimini destekleyen React + Express + SQLite tabanlı CRM uygulamasıdır.

## Özellikler

- Kullanıcı girişi ve oturum yönetimi
- Şifre değiştirme akışı
- Rol ve izin tabanlı erişim kontrolü
- Müşteri takibi
- Kurum hiyerarşisi, karar rolleriyle paydaş rehberi ve kuruma bağlı görüşme geçmişi
- Ürün ve stok bilgisi yönetimi
- Aktivite, teklif, sipariş ve sözleşme takibi
- İhale/fırsat Kanban panosu, ihale bilgileri ve sunucu kaynaklı aşama geçmişi
- Teminat mektubu yönetimi
- Rapor ekranları
- İşlem günlüğü (audit log)
- SQLite ile yerel veri saklama
- Demo verileri ile hızlı başlangıç

## Teknoloji Yığını

- React 19
- Vite
- TypeScript
- Express
- SQLite (node:sqlite)
- Xlsx (excel içe aktarma desteği)
- Recharts (grafikler)
- TailwindCSS

## Proje Yapısı

```text
.
├── server/               # Express API ve veritabanı katmanı
│   ├── audit.ts
│   ├── auth.ts
│   ├── db.ts
│   ├── index.ts
│   └── seed.ts
├── src/                  # React arayüzü
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── data/                 # SQLite veritabanı klasörü
├── assets/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── metadata.json
```

## Ön Koşullar

- Node.js 22 veya üzeri
- npm

## Kurulum

```bash
npm install
```

## Çalıştırma

1. API sunucusunu başlatın:

```bash
npm run server
```

2. Ayrı bir terminalde frontend'i çalıştırın:

```bash
npm run dev
```

Uygulama şu adreslerde çalışır:

- Frontend: http://localhost:3000
- API: http://localhost:4000

Vite geliştirme sunucusu, `/api` isteklerini yerel Express sunucusuna yönlendirir.

## Kullanım

Varsayılan demo kullanıcılar, `src/data/mockData.ts` içindeki verilerden oluşturulur. Seed işlemi otomatik olarak çalışır. Giriş ekranında kullanıcı e-postası ve şifresi ile oturum açılır.

Varsayılan yönetici hesabı için örnek bilgiler:

- E-posta: orhun.gokdemir@issd.com.tr
- Şifre: admin123

## API

### Genel uçlar

- `GET /api/health` → sunucu durumunu döner
- `GET /api/bootstrap` → tüm kaynak verilerini tek seferde döner
- `POST /api/reset` → demo verilerini sıfırlar
- `GET /api/audit-logs` → işlem kayıtlarını listeler

### Kimlik doğrulama

- `POST /api/auth/login` → kullanıcı girişi
- `GET /api/auth/me` → oturum bilgisi
- `POST /api/auth/logout` → oturumu kapat
- `POST /api/auth/change-password` → şifre değiştir

### Kaynak istekleri

- `GET /api/:resource`
- `GET /api/:resource/:id`
- `POST /api/:resource`
- `PUT /api/:resource/:id`
- `DELETE /api/:resource/:id`

Desteklenen kaynaklar:

- users
- customers
- stakeholders
- products
- activities
- opportunities
- requests
- proposals
- orders
- contracts
- guaranteeLetters

## Veritabanı

Veri tabanı SQLite kullanır. API uyumluluğu için mevcut `records` tablosu korunurken workflow kayıtları ilişkisel tablolarda da tutulur:

- `crm_customers`
- `crm_stakeholders`
- `crm_activities`
- `crm_opportunities`
- `crm_requests`
- `crm_proposals`
- `crm_orders`
- `crm_contracts`
- `crm_guarantee_letters`

Kurum-paydaş, fırsat, talep, teklif, sipariş, sözleşme ve teminat mektubu ilişkileri foreign key'ler ile korunur. Kurumlar `parentCustomerId` ile hiyerarşik bağlanır; faaliyetler kurum içi paydaşlara bağlanabilir. Fırsat aşama geçmişini API sunucusu kullanıcı ve zaman bilgisiyle ekler. Mevcut JSON kayıtları sunucu başlarken ilişkisel tabakalara aktarılır; yeni ve sıfırlanan demo kayıtları ilişkisel senkronizasyon üzerinden oluşturulur.

Varsayılan veri yolu:

```text
data/crm.sqlite
```

İsterseniz farklı bir konum kullanmak için ortam değişkeni tanımlayabilirsiniz:

```bash
CRM_DATABASE_PATH=./data/custom-crm.sqlite npm run server
```

## Yetkilendirme

Sunucu tarafında belirli endpoint'ler için izin kontrolü uygulanır. Kullanıcı rolü ve `permissions` alanı dikkate alınır. `Admin` kullanıcılar genel yönetim işlemlerini yapabilir.

## Kurumsal Kayıt ve Parola Sıfırlama

Login ekranındaki kayıt akışı yalnızca `@issd.com.tr` adreslerini kabul eder. Kullanıcı önce şirket e-postasına gönderilen 6 haneli, 10 dakika geçerli kodu doğrular; ardından en az 8 karakterli parolasını belirler. Parola sıfırlama da aynı tek kullanımlık kod altyapısını kullanır.

Mail gönderimi için CRM adına özel bir SMTP hesabı kullanılmalıdır. SMTP bilgileri kaynak koda yazılmaz; `.env` dosyasındaki `CRM_SMTP_HOST`, `CRM_SMTP_PORT`, `CRM_SMTP_USER`, `CRM_SMTP_PASSWORD` ve `CRM_MAIL_FROM` değişkenleriyle sağlanır. Örnek hesap: `crm@issd.com.tr`.

Mail taslağı:

- Gönderen: `ISSD CRM <crm@issd.com.tr>`
- Konu: `ISSD CRM hesap doğrulama` veya `ISSD CRM parola sıfırlama`
- İçerik: 6 haneli kod, 10 dakika geçerlilik bilgisi ve işlem kullanıcı tarafından başlatılmadıysa dikkate alınmaması uyarısı

## Script'ler

```bash
npm run dev        # Vite frontend çalıştırır
npm run server     # Express API sunucusunu çalıştırır
npm run server:watch # API'yi watch modunda çalıştırır
npm run build      # production build oluşturur
npm run lint       # TypeScript kontrolü yapar
```

## Notlar

- Uygulama demo verilerle başlatılır ve SQLite veritabanı dosyası yerel olarak tutulur.
- `audit_logs` tablosu tüm önemli işlemleri kaydeder.
- Excel ürün içe aktarma ve raporlama ekranları mevcut arayüz bileşenleri ile birlikte çalışmaktadır.

## Geliştirme Durumu

Proje aktif geliştirme halinde olup, temel CRM iş akışları, kimlik doğrulama, yetkilendirme ve veritabanı katmanı hazır hale gelmiştir. Arayüz ve API entegrasyonu, raporlama ve yönetim akışları sürdürülmektedir.
