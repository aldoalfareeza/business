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

## 🔒 Keamanan

✅ Input sanitization untuk XSS protection
✅ Error handling yang proper
✅ Local storage dengan size check
✅ Validasi data di setiap operasi
✅ Logout otomatis saat session berakhir

## 💾 Penyimpanan Data

- **Local Storage**: Data disimpan di browser Anda secara lokal
- **Max Size**: ~5MB (cukup untuk ribuan transaksi)
- **Auto-cleanup**: Monitoring storage setiap 7 hari
- **Backup Manual**: Export JSON kapan saja

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
}
```

### Ubah Nama Aplikasi
Edit di `index.html`:
```html
<title>BUSINESS MANAGEMENT</title>
```

Dan di `manifest.json`:
```json
"name": "Business Management",
"short_name": "BM"
```

## 🐛 Troubleshooting

### Data tidak tersimpan?
- Periksa localStorage di DevTools (F12 > Application > Local Storage)
- Pastikan browser tidak dalam mode Private/Incognito
- Clear cache jika perlu

### Login tidak bekerja?
- Pastikan koneksi internet stabil
- Cek Supabase credentials di `app.js`
- Buat user di Supabase dashboard terlebih dahulu

### Chart tidak muncul?
- Pastikan Chart.js library terimport dengan benar
- Periksa console (F12) untuk error messages
- Refresh halaman

## 📱 PWA Installation

1. Buka aplikasi di mobile/desktop Chrome
2. Klik menu (⋮) → "Install app" atau "Add to Home Screen"
3. Aplikasi akan tersimpan di device Anda
4. Bisa diakses offline tanpa internet

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

## 📝 Notes

- Semua data disimpan di local storage browser Anda
- Silakan backup data secara berkala dengan export JSON
- Untuk production, sebaiknya setup HTTPS
- Untuk PWA, host harus HTTPS

## 🤝 Support

Jika ada pertanyaan atau bug:
1. Periksa console browser (F12)
2. Cek data struktur di Local Storage
3. Lakukan export/import untuk reset
4. Report issue di GitHub

## 📄 License

Free to use for personal & commercial projects

---

**Dibuat dengan ❤️ menggunakan Vanilla JavaScript**

**Versi**: 3.0.0 (Production Ready)
**Last Updated**: 2026-06-04
