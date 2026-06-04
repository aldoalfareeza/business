# Business Management v3 - Production Ready 🚀

Aplikasi manajemen kas untuk bisnis Anda dengan fitur lengkap dan aman.

## ✨ Fitur Utama

- 📦 **Manajemen Produk** - Kelola produk dengan harga, satuan, dan fee default
- 💰 **Penjualan** - Catat penjualan dengan kalkulasi fee otomatis (Gross & Net)
- 🛒 **Pembelian** - Kelola pembelian dengan total otomatis
- 📤 **Pengeluaran** - Catat pengeluaran operasional (gaji, sewa, dll)
- 📈 **Iklan** - Pisahkan biaya iklan per platform
- 📚 **Hutang** - Manajemen hutang dengan sistem cicilan
- 📊 **Dashboard** - Visualisasi dengan chart (bar, pie, line)
- 📜 **Riwayat** - Rekam aktivitas lengkap semua transaksi
- 💾 **Export/Import** - Backup data dalam format JSON & CSV
- 🔐 **Autentikasi** - Login admin dengan Supabase
- 📱 **PWA Ready** - Bisa diakses offline & install sebagai app

## 🚀 Quick Start

### 1. Download/Clone Repository
```bash
git clone https://github.com/aldoalfareeza/business-.git
cd business-
```

### 2. Setup Supabase (Opsional)
Jika ingin menggunakan fitur autentikasi:
1. Buat akun di [supabase.com](https://supabase.com)
2. Buat project baru
3. Update `app.js` dengan URL dan public key Anda:
```javascript
const supabaseUrl = 'YOUR_PROJECT_URL';
const supabaseKey = 'YOUR_PUBLIC_KEY';
```

### 3. Jalankan Aplikasi
- **Local Development**: Buka `index.html` di browser
- **Production**: Deploy ke hosting (Netlify, Vercel, Firebase Hosting, dll)

## 📋 Struktur File

```
business-/
├── index.html          # File HTML utama
├── app.js              # Logika aplikasi (dipisah untuk maintainability)
├── styles.css          # CSS styling (terpisah)
├── manifest.json       # PWA manifest
├── service-worker.js   # Service worker untuk offline support
└── README.md           # Dokumentasi ini
```

## 💻 Code Examples

### Menambah Produk Baru
```javascript
// Data produk baru
const newProduct = {
  nama: 'Kopi Premium',
  satuan: 'Kg',
  harga: 75000,
  fee: 10  // Fee default 10%
};

// Tambahkan ke array
App.data.produk.push(newProduct);
save(); // Simpan ke localStorage
```

### Membuat Penjualan
```javascript
// Data penjualan
const sale = {
  produkIndex: 0,      // Index produk
  jumlah: 5,
  gross: 375000,       // Harga total sebelum fee
  feePercent: 10,
  feeNominal: 37500,
  total: 337500,       // Harga yang diterima (setelah fee)
  tanggal: '2026-06-04',
  note: 'Penjualan via Shopee',
  status: 'selesai'
};

App.data.penjualan.push(sale);
save();
```

### Export Data ke CSV
```javascript
// Sudah built-in, tinggal klik tombol di UI
// Atau manual:
const csvData = convertToCSV(App.data.produk, ['nama', 'harga', 'satuan']);
downloadText(csvData, 'produk.csv', 'text/csv');
```

### Backup/Restore Data
```javascript
// Backup (Export JSON)
const backup = JSON.stringify(App.data, null, 2);
downloadText(backup, `backup_${todayISO()}.json`, 'application/json');

// Restore (Import JSON)
const importedData = JSON.parse(jsonString);
App.data = importedData;
save();
```

## 🔒 Keamanan

✅ Input sanitization untuk XSS protection
✅ Error handling yang proper
✅ Local storage dengan size check
✅ Validasi data di setiap operasi
✅ Logout otomatis saat session berakhir

### Contoh Input Sanitization:
```javascript
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Penggunaan
const safeName = escapeHtml(userInput);
```

## 💾 Penyimpanan Data

- **Local Storage**: Data disimpan di browser Anda secara lokal
- **Max Size**: ~5MB (cukup untuk ribuan transaksi)
- **Auto-cleanup**: Monitoring storage setiap 7 hari
- **Backup Manual**: Export JSON kapan saja

```javascript
// Cek ukuran storage
function getStorageSize() {
  const appData = JSON.stringify(App.data);
  return new Blob([appData]).size;
}

const sizeKB = Math.round(getStorageSize() / 1024);
console.log(`Storage: ${sizeKB}KB`);
```

## 📊 Export Data

### Format CSV
- `produk.csv` - Daftar produk
- `penjualan.csv` - Detail penjualan dengan fee
- `riwayat_transaksi.csv` - Semua aktivitas transaksi

### Format JSON
- `backup_bm_v3_YYYY-MM-DD.json` - Backup lengkap (dapat di-import kembali)

## 🎨 Customization

### Ubah Warna Theme
Edit di `styles.css`:
```css
:root {
  --primary: #00bcd4;        /* Warna utama */
  --accent: #6f42c1;         /* Warna aksen */
  --danger: #e63946;         /* Warna warning */
  --bg: linear-gradient(135deg,#f7fbff,#eef6ff);
}
```

### Ubah Nama Aplikasi
Edit di `index.html`:
```html
<title>BUSINESS MANAGEMENT</title>
```

Dan di `manifest.json`:
```json
{
  "name": "Business Management",
  "short_name": "BM",
  "description": "Aplikasi manajemen kas untuk bisnis"
}
```

### Tambah Menu Baru
```javascript
// Di index.html
<div class="menu-item" data-page="page-custom">
  <div class="icon">🎯</div>
  <div class="label">Menu Baru</div>
</div>

// Di app.js
function renderCustomPage() {
  const out = document.getElementById('custom-list');
  // tambahkan logic
}

// Tambah ke renderAll()
case 'page-custom': renderCustomPage(); break;
```

## 🐛 Troubleshooting

### Data tidak tersimpan?
```javascript
// Check localStorage di console
console.log(localStorage.getItem('bm_v3'));

// Clear dan reset
localStorage.removeItem('bm_v3');
location.reload();
```

### Login tidak bekerja?
- Pastikan koneksi internet stabil
- Cek Supabase credentials di `app.js`
- Buat user di Supabase dashboard terlebih dahulu
- Check console untuk error details

### Chart tidak muncul?
- Pastikan Chart.js library terimport: `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`
- Periksa console (F12) untuk error messages
- Refresh halaman (Ctrl+Shift+R)

## 📱 PWA Installation

1. Buka aplikasi di mobile/desktop Chrome
2. Klik menu (⋮) → "Install app" atau "Add to Home Screen"
3. Aplikasi akan tersimpan di device Anda
4. Bisa diakses offline tanpa internet

```json
// manifest.json memungkinkan PWA features
{
  "name": "Business Management",
  "display": "standalone",
  "start_url": "/",
  "background_color": "#ffffff",
  "theme_color": "#00bcd4"
}
```

## 🚀 Deployment

### Netlify (Recommended)
```bash
npm install -g netlify-cli
netlify deploy
```

### Vercel
```bash
npm install -g vercel
vercel deploy
```

### GitHub Pages
Push ke branch `gh-pages` atau setup di repository settings

### Firebase Hosting
```bash
firebase deploy
```

## 📝 API Reference

### Core Functions

```javascript
// Load data dari localStorage
load()

// Simpan data ke localStorage
save()

// Format uang ke Rupiah
formatRupiah(1000000)  // "Rp 1.000.000"

// Dapatkan tanggal hari ini (ISO format)
todayISO()  // "2026-06-04"

// Escape HTML untuk XSS protection
escapeHtml("<script>alert('xss')</script>")

// Download file
downloadText(content, 'filename.txt', 'text/plain')

// Render halaman
showPage('page-dashboard')
```

### Chart Functions

```javascript
renderBarChart()   // Grafik penghasilan harian
renderPieChart()   // Grafik komposisi pengeluaran
renderLineChart()  // Grafik total aset kumulatif
```

## 📱 Browser Support

✅ Chrome/Edge 90+
✅ Firefox 88+
✅ Safari 14+
✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 📄 License

Free to use for personal & commercial projects

---

## 🤝 Support

Jika ada pertanyaan atau bug:
1. Periksa console browser (F12)
2. Cek data struktur di Local Storage
3. Lakukan export/import untuk reset
4. Report issue di GitHub

## 📞 Contact

- **GitHub**: https://github.com/aldoalfareeza/business-
- **Email**: aldoalfareezanasrullah@gmail.com

---

**Dibuat dengan ❤️ menggunakan Vanilla JavaScript**

**Versi**: 3.0.0 (Production Ready)
**Last Updated**: 2026-06-04
