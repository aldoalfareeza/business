// app.js - Business Management Application
// Production-ready version with security improvements

const KEY = 'bm_v3';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
const STORAGE_CHECK_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Supabase configuration from environment
const supabaseUrl = 'https://nwpjxsciuiqugtflaylv.supabase.co';
const supabaseKey = 'sb_publishable_7iz_7-gbo5MI-D_ZPCEnRw_immjLepF';

let supabaseClient;
try {
  supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
  console.log('✓ Supabase terhubung');
} catch(e) {
  console.error('✗ Supabase error:', e.message);
}

// App state
const App = {
  data: {
    settings: { name: 'Pemilik', profilePic: null, saldoHidden: false },
    produk: [],
    penjualan: [],
    pembelian: [],
    pengeluaran: [],
    iklan: [],
    hutang: []
  },
  charts: {}
};

// ========== STORAGE FUNCTIONS ==========
function getStorageSize() {
  try {
    const appData = JSON.stringify(App.data);
    return new Blob([appData]).size;
  } catch(e) {
    return 0;
  }
}

function checkAndCleanupOldData() {
  try {
    const lastCleanup = localStorage.getItem(KEY + '_cleanup');
    const now = Date.now();
    
    if (!lastCleanup || (now - parseInt(lastCleanup)) > STORAGE_CHECK_INTERVAL) {
      const size = getStorageSize();
      if (size > MAX_STORAGE_SIZE) {
        console.warn('Storage size: ' + Math.round(size / 1024) + 'KB - Consider exporting old data');
      }
      localStorage.setItem(KEY + '_cleanup', now.toString());
    }
  } catch(e) {
    console.warn('Storage check failed:', e.message);
  }
}

function save() {
  try {
    checkAndCleanupOldData();
    localStorage.setItem(KEY, JSON.stringify(App.data));
    console.log('✓ Data tersimpan');
  } catch(e) {
    console.error('✗ Gagal menyimpan data:', e.message);
    alert('Peringatan: Gagal menyimpan data. Silakan periksa storage browser Anda.');
  }
}

function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      App.data = JSON.parse(s);
      console.log('✓ Data dimuat');
    }
  } catch(e) {
    console.error('✗ Gagal memuat data:', e.message);
    App.data = {
      settings: { name: 'Pemilik', profilePic: null, saldoHidden: false },
      produk: [],
      penjualan: [],
      pembelian: [],
      pengeluaran: [],
      iklan: [],
      hutang: []
    };
  }
}

// ========== UTILITY FUNCTIONS ==========
function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function downloadText(text, filename, type = 'text/plain') {
  try {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) {
    console.error('Download failed:', e.message);
    alert('Gagal mengunduh file');
  }
}

function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== UI HELPERS ==========
function showPage(id) {
  try {
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    
    const back = document.getElementById('back-btn');
    const headerTitle = document.getElementById('header-title');
    
    if (id === 'page-dashboard') {
      back.style.display = 'none';
      headerTitle.innerText = 'BUSINESS MANAGEMENT';
      document.getElementById('bottom-nav').style.display = 'flex';
    } else {
      back.style.display = 'inline-block';
      headerTitle.innerText = id.replace('page-', '').toUpperCase();
      document.getElementById('bottom-nav').style.display = 'none';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderAll();
  } catch(e) {
    console.error('Error showing page:', e.message);
  }
}

// ========== MODAL FUNCTIONS ==========
function openModal(html) {
  const mb = document.getElementById('modal-back');
  const mc = document.getElementById('modal-content');
  mc.innerHTML = html;
  mb.classList.add('active');
  mb.onclick = e => {
    if (e.target === mb) closeModal();
  };
}

function closeModal() {
  const mb = document.getElementById('modal-back');
  mb.classList.remove('active');
  document.getElementById('modal-content').innerHTML = '';
}

function openSecondaryModal(html) {
  const mb = document.getElementById('modal-secondary');
  const mc = document.getElementById('modal-secondary-content');
  mc.innerHTML = html;
  mb.classList.add('active');
  mb.onclick = e => {
    if (e.target === mb) closeSecondaryModal();
  };
}

function closeSecondaryModal() {
  const mb = document.getElementById('modal-secondary');
  mb.classList.remove('active');
  document.getElementById('modal-secondary-content').innerHTML = '';
}

// ========== HISTORY MODAL ==========
function openHistory() {
  document.getElementById('history-modal').classList.add('active');
  renderHistory();
}

function closeHistory() {
  document.getElementById('history-modal').classList.remove('active');
}

function renderHistory() {
  const rows = document.getElementById('history-rows');
  rows.innerHTML = '';
  
  const acc = [];
  App.data.penjualan.forEach(p => acc.push({
    type: 'Penjualan',
    date: p.tanggal,
    text: `${(App.data.produk[p.produkIndex]?.nama || '(produk dihapus)')} x${p.jumlah} • ${formatRupiah(p.total)}`
  }));
  
  App.data.pembelian.forEach(p => acc.push({
    type: 'Pembelian',
    date: p.tanggal,
    text: `${(App.data.produk[p.produkIndex]?.nama || '(produk)')} x${p.jumlah} • ${formatRupiah(p.total)}`
  }));
  
  App.data.pengeluaran.forEach(p => acc.push({
    type: 'Pengeluaran',
    date: p.tanggal,
    text: `${p.kategori || 'Pengeluaran'} • ${formatRupiah(p.nominal)}`
  }));
  
  App.data.iklan.forEach(p => acc.push({
    type: 'Iklan',
    date: p.tanggal,
    text: `${p.platform || 'Iklan'} • ${formatRupiah(p.nominal)}`
  }));
  
  App.data.hutang.forEach(p => acc.push({
    type: 'Hutang',
    date: p.tanggal,
    text: `${p.pemberi || 'Hutang'} • ${formatRupiah(p.nominal)} ${p.lunas ? '(Lunas)' : ''}`
  }));
  
  acc.sort((a, b) => b.date.localeCompare(a.date));
  
  let lastMonth = '';
  acc.forEach(item => {
    const d = new Date(item.date + 'T00:00:00');
    const monthKey = d.getFullYear() + '-' + (d.getMonth() + 1);
    
    if (monthKey !== lastMonth) {
      const sep = document.createElement('div');
      sep.style.margin = '10px 0';
      sep.style.fontWeight = '700';
      sep.innerText = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      rows.appendChild(sep);
      lastMonth = monthKey;
    }
    
    const node = document.createElement('div');
    node.className = 'list-card';
    node.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${escapeHtml(item.type)}</strong><div class="small">${item.date}</div><div class="small">${escapeHtml(item.text)}</div></div></div>`;
    rows.appendChild(node);
  });
}

// ========== DASHBOARD & CALCULATIONS ==========
function calculateSaldo() {
  const pemasukanPenjualan = (App.data.penjualan || []).filter(p => p.status === 'selesai').reduce((s, i) => s + (i.total || 0), 0);
  const pemasukanHutang = (App.data.hutang || []).reduce((s, i) => s + (i.nominalPokok || 0), 0);
  
  const pembelian = (App.data.pembelian || []).reduce((s, i) => s + (i.total || 0), 0);
  const pengeluaran = (App.data.pengeluaran || []).reduce((s, i) => s + (i.nominal || 0), 0);
  const iklan = (App.data.iklan || []).reduce((s, i) => s + (i.nominal || 0), 0);
  const pembayaranHutang = (App.data.hutang || []).flatMap(h => h.cicilan || []).reduce((s, c) => s + (c.jumlah || 0), 0);

  App.data.saldo = (pemasukanPenjualan + pemasukanHutang) - (pembelian + pengeluaran + iklan + pembayaranHutang);
  
  const totalHutangDibayar = (App.data.hutang || []).reduce((s, h) => {
    const dibayar = (h.cicilan || []).reduce((cs, c) => cs + (c.jumlah || 0), 0);
    const sisa = (h.totalBayar || h.nominalPokok || 0) - dibayar;
    return s + Math.max(0, sisa);
  }, 0);
  
  App.data.hutangTotal = totalHutangDibayar;
  save();
}

function renderDashboard() {
  const dashImg = document.getElementById('dash-profile-img');
  const dashTxt = document.getElementById('dash-profile-avatar-txt');
  const profileInput = document.getElementById('dash-profile-input');
  const profileTrigger = document.getElementById('dash-profile-trigger');

  if (profileTrigger) {
    if (App.data.settings.profilePic) {
      if (dashImg) {
        dashImg.src = App.data.settings.profilePic;
        dashImg.style.display = 'block';
      }
      if (dashTxt) dashTxt.style.display = 'none';
      profileTrigger.style.background = 'transparent';
    } else {
      if (dashImg) dashImg.style.display = 'none';
      if (dashTxt) {
        dashTxt.style.display = 'block';
        dashTxt.innerText = (App.data.settings.name || 'O').charAt(0).toUpperCase();
      }
      profileTrigger.style.background = '#cbd5e1';
    }

    if (!profileTrigger.dataset.listenerSet) {
      profileTrigger.dataset.listenerSet = 'true';
      profileTrigger.onclick = () => profileInput.click();
    }
  }

  if (profileInput && !profileInput.dataset.listenerSet) {
    profileInput.dataset.listenerSet = 'true';
    profileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          App.data.settings.profilePic = event.target.result;
          save();
          renderDashboard();
        };
        reader.readAsDataURL(file);
      } else {
        alert('Silakan pilih file gambar');
      }
    };
  }

  calculateSaldo();
  
  const saldoEl = document.getElementById('saldo-value');
  saldoEl.innerText = App.data.settings.saldoHidden ? 'Rp ******' : formatRupiah(App.data.saldo);
  
  const hutEl = document.getElementById('hutang-label');
  if (App.data.hutangTotal && App.data.hutangTotal > 0) {
    hutEl.style.display = 'block';
    hutEl.innerText = `Hutang: ${formatRupiah(App.data.hutangTotal)}`;
  } else {
    hutEl.style.display = 'none';
  }

  const profImg = document.getElementById('profile-img');
  if (App.data.settings.profilePic) {
    profImg.src = App.data.settings.profilePic;
  }
  
  document.getElementById('profile-name').value = App.data.settings.name || '';

  // Mini history
  const miniHistoryList = document.getElementById('mini-history-list');
  const miniHistoryMore = document.getElementById('mini-history-more');

  if (miniHistoryMore) {
    miniHistoryMore.onclick = () => openHistory();
  }

  if (miniHistoryList) {
    let semuaTransaksi = [];

    if (App.data.penjualan && Array.isArray(App.data.penjualan)) {
      App.data.penjualan.forEach(item => {
        const namaProd = App.data.produk[item.produkIndex]?.nama || 'Penjualan Produk';
        semuaTransaksi.push({
          tanggal: new Date(item.tanggal || item.date),
          keterangan: `${namaProd} (x${item.jumlah || 1})`,
          tipe: 'masuk',
          nominal: parseFloat(item.total || 0)
        });
      });
    }

    if (App.data.pengeluaran && Array.isArray(App.data.pengeluaran)) {
      App.data.pengeluaran.forEach(item => {
        semuaTransaksi.push({
          tanggal: new Date(item.tanggal || item.date),
          keterangan: item.kategori || item.keterangan || 'Pengeluaran',
          tipe: 'keluar',
          nominal: parseFloat(item.nominal || 0)
        });
      });
    }

    semuaTransaksi.sort((a, b) => b.tanggal - a.tanggal);
    const sepuluhTransaksiTerakhir = semuaTransaksi.slice(0, 10);

    if (sepuluhTransaksiTerakhir.length === 0) {
      miniHistoryList.innerHTML = `<div class="small" style="color: var(--muted); text-align: center; padding: 10px 0;">Belum ada transaksi.</div>`;
    } else {
      miniHistoryList.innerHTML = sepuluhTransaksiTerakhir.map(trx => {
        const formatTgl = trx.tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        const formatUang = Math.abs(trx.nominal).toLocaleString('id-ID');
        const warnaTeks = trx.tipe === 'masuk' ? '#10b981' : '#ef4444';
        const simbol = trx.tipe === 'masuk' ? '+ ' : '- ';

        return `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(0,0,0,0.05); padding-bottom: 8px;">
          <div style="text-align: left;">
            <div style="font-size: 13px; font-weight: 600; color: #0f172a;">${escapeHtml(trx.keterangan)}</div>
            <div style="font-size: 11px; color: var(--muted);">${formatTgl}</div>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: ${warnaTeks}; white-space: nowrap;">
            ${simbol}Rp ${formatUang}
          </div>
        </div>`;
      }).join('');
    }
  }

  renderBarChart();
  renderPieChart();
  renderLineChart();
}

// ========== CHART HELPERS ==========
function daterangeArray(from, to) {
  const arr = [];
  let d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    arr.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return arr;
}

function getRangeByPreset(preset, fromId, toId) {
  if (preset === 'all') return [null, null];
  if (preset === 'custom') {
    const f = document.getElementById(fromId).value;
    const t = document.getElementById(toId).value;
    if (!f || !t) {
      alert('Pilih tanggal');
      return null;
    }
    return [f, t];
  }
  const days = parseInt(preset);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
}

// ========== CHARTS ==========
function renderBarChart() {
  try {
    const preset = document.getElementById('bar-preset').value;
    const range = getRangeByPreset(preset, 'bar-from', 'bar-to');
    if (range === null) return;
    
    let dates = [], labels = [];
    if (range[0] && range[1]) {
      dates = daterangeArray(range[0], range[1]);
      labels = dates.map(d => (new Date(d)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
    } else {
      const days = preset === 'all' ? 14 : parseInt(preset || 7);
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        dates.push(iso);
        labels.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
      }
    }
    
    const data = dates.map(dt => App.data.penjualan.filter(p => p.status === 'selesai' && p.tanggal === dt).reduce((s, x) => s + (x.total || 0), 0));
    
    if (App.charts.bar) App.charts.bar.destroy();
    const ctx = document.getElementById('barChart').getContext('2d');
    App.charts.bar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Pendapatan',
          data,
          backgroundColor: '#00bcd4'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  } catch(e) {
    console.error('Bar chart error:', e.message);
  }
}

function renderPieChart() {
  try {
    const preset = document.getElementById('pie-preset').value;
    const range = getRangeByPreset(preset, 'pie-from', 'pie-to');
    if (range === null) return;
    
    const inRange = (d) => {
      if (!range[0] && !range[1]) return true;
      if (range[0] && d < range[0]) return false;
      if (range[1] && d > range[1]) return false;
      return true;
    };
    
    const bahan = App.data.pembelian.filter(p => inRange(p.tanggal)).reduce((s, x) => s + (x.total || 0), 0);
    const iklan = App.data.iklan.filter(i => inRange(i.tanggal)).reduce((s, x) => s + (x.nominal || 0), 0);
    const gaji = App.data.pengeluaran.filter(p => inRange(p.tanggal) && p.kategori && p.kategori.toLowerCase() === 'gaji').reduce((s, x) => s + (x.nominal || 0), 0);
    const lain = App.data.pengeluaran.filter(p => inRange(p.tanggal)).reduce((s, x) => s + (x.nominal || 0), 0) - gaji;
    
    if (App.charts.pie) App.charts.pie.destroy();
    const ctx = document.getElementById('pieChart').getContext('2d');
    App.charts.pie = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Bahan', 'Iklan', 'Gaji', 'Lain-lain'],
        datasets: [{
          data: [bahan, iklan, gaji, Math.max(0, lain)],
          backgroundColor: ['#00bcd4', '#6f42c1', '#ffb86b', '#7ef7a6']
        }]
      },
      options: { responsive: true }
    });
  } catch(e) {
    console.error('Pie chart error:', e.message);
  }
}

function renderLineChart() {
  try {
    const preset = document.getElementById('line-preset').value;
    const range = getRangeByPreset(preset, 'line-from', 'line-to');
    if (range === null) return;
    
    let dates = [];
    if (range[0] && range[1]) {
      dates = daterangeArray(range[0], range[1]);
    } else {
      const days = preset === 'all' ? 30 : parseInt(preset || 30);
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    
    const data = dates.map(dt => {
      const pen = App.data.penjualan.filter(p => p.status === 'selesai' && p.tanggal <= dt).reduce((s, x) => s + (x.total || 0), 0);
      const pem = App.data.pembelian.filter(p => p.tanggal <= dt).reduce((s, x) => s + (x.total || 0), 0);
      const peng = App.data.pengeluaran.filter(p => p.tanggal <= dt).reduce((s, x) => s + (x.nominal || 0), 0);
      const ik = App.data.iklan.filter(p => p.tanggal <= dt).reduce((s, x) => s + (x.nominal || 0), 0);
      return pen - pem - peng - ik;
    });
    
    const labels = dates.map(d => (new Date(d)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
    
    if (App.charts.line) App.charts.line.destroy();
    const ctx = document.getElementById('lineChart').getContext('2d');
    
    const grad = ctx.createLinearGradient(0, 0, 0, 140);
    grad.addColorStop(0, 'rgba(0,188,212,0.35)');
    grad.addColorStop(1, 'rgba(0,188,212,0.01)');
    
    App.charts.line = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Total Aset',
          data,
          borderColor: '#00bcd4',
          backgroundColor: grad,
          tension: 0.45,
          fill: true,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        elements: { line: { borderWidth: 2 } }
      }
    });
  } catch(e) {
    console.error('Line chart error:', e.message);
  }
}

// ========== PRODUK CRUD ==========
const SATUAN_OPTIONS = ['Kg', 'Gram', 'Pcs', 'Liter', 'Pack', 'Dus', 'Meter', 'Set'];

function renderProdukList() {
  const out = document.getElementById('produk-list');
  out.innerHTML = '';
  
  if (!App.data.produk.length) {
    out.innerHTML = '<div class="list-card">Belum ada produk.</div>';
  } else {
    const tbl = document.createElement('table');
    tbl.innerHTML = '<thead><tr><th>Nama</th><th>Satuan</th><th>Harga</th><th>Fee%</th><th></th></tr></thead><tbody></tbody>';
    out.appendChild(tbl);
    
    const body = tbl.querySelector('tbody');
    App.data.produk.forEach((p, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(p.nama)}</td><td>${escapeHtml(p.satuan || '-')}</td><td>${formatRupiah(p.harga)}</td><td>${p.fee != null ? p.fee + '%' : '-'}</td>
        <td><button class="btn ghost" onclick="openProdukModal(${i})">✏️</button> <button class="btn ghost" onclick="deleteProduk(${i})">🗑️</button></td>`;
      body.appendChild(tr);
    });
  }
}

function openProdukModal(idx = null) {
  const p = (idx != null && App.data.produk[idx]) ? App.data.produk[idx] : { nama: '', satuan: 'Pcs', harga: 0, fee: 0 };
  const opts = SATUAN_OPTIONS.map(s => `<option value="${s}" ${p.satuan === s ? 'selected' : ''}>${s}</option>`).join('');
  
  const html = `<h3>${idx == null ? 'Tambah Produk' : 'Edit Produk'}</h3>
    <div class="row"><input id="prod-nama" placeholder="Nama produk" value="${escapeHtml(p.nama)}" style="flex:1"></div>
    <div class="row"><select id="prod-satuan">${opts}</select></div>
    <div class="row"><input id="prod-harga" type="number" placeholder="Harga satuan" value="${p.harga || 0}" style="flex:1"></div>
    <div class="row"><input id="prod-fee" type="number" placeholder="Fee default (%)" value="${p.fee != null ? p.fee : ''}" style="flex:1"></div>
    <div class="actions"><button class="btn ghost" onclick="closeModal()">Batal</button><button class="btn primary" onclick="saveProduk(${idx == null ? 'null' : idx})">Simpan</button></div>`;
  
  openModal(html);
}

function saveProduk(idx = null) {
  const nama = document.getElementById('prod-nama').value.trim();
  const satuan = document.getElementById('prod-satuan').value;
  const harga = parseFloat(document.getElementById('prod-harga').value) || 0;
  const feeRaw = document.getElementById('prod-fee').value;
  const fee = feeRaw === '' ? null : parseFloat(feeRaw) || 0;
  
  if (!nama || harga <= 0) {
    alert('Nama & harga harus diisi');
    return;
  }
  
  const obj = { nama, satuan, harga, fee };
  
  if (idx == null) {
    App.data.produk.unshift(obj);
  } else {
    App.data.produk[idx] = obj;
  }
  
  save();
  closeModal();
  renderProdukList();
  renderDashboard();
}

function deleteProduk(i) {
  if (!confirm('Hapus produk?')) return;
  App.data.produk.splice(i, 1);
  save();
  renderProdukList();
  renderDashboard();
}

// ========== PENJUALAN ==========
function renderPenjualanList() {
  const out = document.getElementById('penjualan-list');
  out.innerHTML = '';
  
  if (!App.data.penjualan.length) {
    out.innerHTML = '<div class="list-card">Belum ada penjualan.</div>';
  } else {
    out.innerHTML = App.data.penjualan.map((s, idx) => {
      const prod = App.data.produk[s.produkIndex] ? App.data.produk[s.produkIndex].nama : '(Produk dihapus)';
      const status = s.status || 'pending';
      
      return `<div class="list-card"><div style="display:flex;justify-content:space-between;align-items:center">
        <div><strong>${escapeHtml(prod)}</strong> x ${s.jumlah} <div class="small">${s.tanggal} • ${escapeHtml(s.note || '')}</div></div>
        <div style="text-align:right">${formatRupiah(s.total)}<div class="small">Fee: ${s.feePercent}% (${formatRupiah(s.feeNominal)})</div>
        <div style="margin-top:8px"><button class="btn ghost" onclick="openPenjualanModal(${idx})">✏️</button> <button class="btn ghost" onclick="deletePenjualan(${idx})">🗑️</button>
        ${status === 'pending' ? ` <button class="btn primary" onclick="markPenjualanSelesai(${idx})">Selesaikan</button>` : ''}</div></div>
      </div></div>`;
    }).join('');
  }
}

function openPenjualanModal(idx = null) {
  let item;

  if (idx != null && App.data.penjualan[idx]) {
    item = App.data.penjualan[idx];
  } else {
    const firstProd = App.data.produk[0];
    const defaultFee = (firstProd && firstProd.fee != null) ? firstProd.fee : 0;

    item = {
      produkIndex: 0,
      jumlah: 1,
      tanggal: todayISO(),
      note: '',
      feePercent: defaultFee,
      feeNominal: null,
      status: 'pending'
    };
  }

  const prodOpts = App.data.produk.map((p, i) => `<option value="${i}">${escapeHtml(p.nama)} — ${formatRupiah(p.harga)}</option>`).join('') || '<option value="0">(belum ada produk)</option>';
  
  const html = `<h3>${idx == null ? 'Tambah Penjualan' : 'Edit Penjualan'}</h3>
    <div class="row"><select id="pen-prod">${prodOpts}</select></div>
    <div class="row"><input id="pen-jml" type="number" value="${item.jumlah || 1}" style="flex:1"></div>
    <div class="row"><input id="pen-tgl" type="date" value="${item.tanggal}" style="flex:1"></div>
    <div class="row"><input id="pen-note" placeholder="Catatan" value="${escapeHtml(item.note || '')}" style="flex:1"></div>
    <div style="margin-top:8px" class="small">Fee: bisa isi langsung % atau gunakan mode gross/net</div>
    <div class="row"><input id="pen-fee-pct" type="number" placeholder="Fee %" value="${item.feePercent != null ? item.feePercent : ''}" style="flex:1"></div>
    <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
      <button class="btn ghost" onclick="openGrossNetModal()">Gross & Net → hitung %</button>
      <div class="small">atau isi persen di atas</div>
    </div>
    <div style="margin-top:10px"><b>Ringkas</b><div id="pen-summary" class="small">otomatis</div></div>
    <div class="actions"><button class="btn ghost" onclick="closeModal()">Batal</button><button class="btn primary" onclick="savePenjualan(${idx == null ? 'null' : idx})">Simpan</button></div>`;
  
  openModal(html);
  
  try {
    document.getElementById('pen-prod').value = item.produkIndex;
  } catch (e) {}
  
  updatePenjualanSummary();
  document.getElementById('pen-prod').addEventListener('change', updatePenjualanSummary);
  document.getElementById('pen-jml').addEventListener('input', updatePenjualanSummary);
  document.getElementById('pen-fee-pct').addEventListener('input', updatePenjualanSummary);
}

function updatePenjualanSummary() {
  try {
    const pi = parseInt(document.getElementById('pen-prod').value || 0);
    const qty = parseFloat(document.getElementById('pen-jml').value || 1);
    const prod = App.data.produk[pi] || { harga: 0, fee: null };
    const gross = prod.harga * qty;
    const feePctInput = document.getElementById('pen-fee-pct').value;
    const feePercent = feePctInput === '' ? (prod.fee != null ? prod.fee : 0) : parseFloat(feePctInput);
    const feeNominal = Math.round(gross * (feePercent / 100));
    const net = gross - feeNominal;
    document.getElementById('pen-summary').innerText = `Gross ${formatRupiah(gross)} • Fee ${formatRupiah(feeNominal)} (${feePercent}%) • Terima ${formatRupiah(net)}`;
  } catch (e) {}
}

function openGrossNetModal() {
  const html = `<h3>Hitung Fee dari Gross & Net</h3>
    <div class="small">Masukkan harga jual (gross) dan harga yang Anda terima (net) untuk menghitung persentase fee secara otomatis.</div>
    <div class="row"><input id="fee-gross" type="number" placeholder="Harga Jual (Gross)"></div>
    <div class="row"><input id="fee-net" type="number" placeholder="Harga Diterima (Net)"></div>
    <div class="actions">
      <button class="btn ghost" onclick="closeSecondaryModal()">Batal</button>
      <button class="btn primary" onclick="applyFeeFromGrossNet()">Terapkan Fee</button>
    </div>`;
  openSecondaryModal(html);
}

function applyFeeFromGrossNet() {
  const gross = parseFloat(document.getElementById('fee-gross').value) || 0;
  const net = parseFloat(document.getElementById('fee-net').value) || 0;
  
  if (gross <= 0 || net < 0 || net >= gross) {
    alert('Gross & Net tidak valid');
    return;
  }
  
  const feeNominal = gross - net;
  const feePercent = Math.round((feeNominal / gross) * 10000) / 100;
  closeSecondaryModal();
  document.getElementById('pen-fee-pct').value = feePercent;
  updatePenjualanSummary();
}

function savePenjualan(idx = null) {
  const pi = parseInt(document.getElementById('pen-prod').value || 0);
  const qty = parseFloat(document.getElementById('pen-jml').value || 1);
  const tanggal = document.getElementById('pen-tgl').value || todayISO();
  const note = document.getElementById('pen-note').value || '';
  const prod = App.data.produk[pi] || { harga: 0, fee: null };
  const gross = prod.harga * qty;
  const feePercentInput = document.getElementById('pen-fee-pct').value;
  const feePercent = feePercentInput === '' ? (prod.fee != null ? prod.fee : 0) : parseFloat(feePercentInput);
  const feeNominal = Math.round(gross * (feePercent / 100));
  const net = gross - feeNominal;
  const status = (idx != null) ? (App.data.penjualan[idx].status || 'pending') : 'pending';
  
  const obj = { produkIndex: pi, jumlah: qty, gross, feePercent, feeNominal, total: net, tanggal, note, status };
  
  if (idx == null) {
    App.data.penjualan.unshift(obj);
  } else {
    App.data.penjualan[idx] = obj;
  }
  
  save();
  closeModal();
  renderPenjualanList();
  renderDashboard();
}

function deletePenjualan(i) {
  if (!confirm('Hapus penjualan?')) return;
  App.data.penjualan.splice(i, 1);
  save();
  renderPenjualanList();
  renderDashboard();
}

function markPenjualanSelesai(i) {
  App.data.penjualan[i].status = 'selesai';
  save();
  renderPenjualanList();
  renderDashboard();
}

// ========== PEMBELIAN ==========
function renderPembelianList() {
  const out = document.getElementById('pembelian-list');
  out.innerHTML = '';
  
  if (!App.data.pembelian.length) {
    out.innerHTML = '<div class="list-card">Belum ada pembelian.</div>';
  } else {
    out.innerHTML = App.data.pembelian.map((s, idx) => `<div class="list-card"><div style="display:flex;justify-content:space-between"><div><strong>${escapeHtml(App.data.produk[s.produkIndex]?.nama || '(produk)')}</strong> x ${s.jumlah || 0}<div class="small">${s.tanggal}</div></div><div>${formatRupiah(s.total)} <div style="margin-top:8px"><button class="btn ghost" onclick="openPembelianModal(${idx})">✏️</button> <button class="btn ghost" onclick="deletePembelian(${idx})">🗑️</button></div></div></div></div>`).join('');
  }
}

function openPembelianModal(idx = null) {
  const opts = App.data.produk.map((p, i) => `<option value="${i}">${escapeHtml(p.nama)} — ${formatRupiah(p.harga)}</option>`).join('');
  const item = (idx != null && App.data.pembelian[idx]) ? App.data.pembelian[idx] : { produkIndex: 0, jumlah: 1, total: 0, tanggal: todayISO(), note: '' };
  
  const html = `<h3>${idx == null ? 'Tambah Pembelian' : 'Edit Pembelian'}</h3>
    <div class="row"><select id="pem-prod">${opts}</select></div>
    <div class="row"><input id="pem-jml" type="number" value="${item.jumlah || 1}" style="flex:1"></div>
    <div class="row"><input id="pem-total" type="number" value="${item.total || 0}" placeholder="(otomatis)" style="flex:1" readonly></div>
    <div class="row"><input id="pem-tgl" type="date" value="${item.tanggal}" style="flex:1"></div>
    <div class="row"><input id="pem-note" placeholder="Catatan" value="${escapeHtml(item.note || '')}" style="flex:1"></div>
    <div class="actions"><button class="btn ghost" onclick="closeModal()">Batal</button><button class="btn primary" onclick="savePembelian(${idx == null ? 'null' : idx})">Simpan</button></div>`;
  
  openModal(html);
  
  try {
    document.getElementById('pem-prod').value = item.produkIndex;
  } catch (e) {}
  
  updatePembelianTotal();
  document.getElementById('pem-prod').addEventListener('change', updatePembelianTotal);
  document.getElementById('pem-jml').addEventListener('input', updatePembelianTotal);
}

function updatePembelianTotal() {
  try {
    const pi = parseInt(document.getElementById('pem-prod').value || 0);
    const qty = parseFloat(document.getElementById('pem-jml').value || 1);
    const prod = App.data.produk[pi] || { harga: 0 };
    const total = Math.round(prod.harga * qty);
    document.getElementById('pem-total').value = total;
  } catch (e) {}
}

function savePembelian(idx = null) {
  const prodIdx = parseInt(document.getElementById('pem-prod').value || 0);
  const jumlah = parseFloat(document.getElementById('pem-jml').value) || 1;
  const total = parseFloat(document.getElementById('pem-total').value) || 0;
  const tanggal = document.getElementById('pem-tgl').value || todayISO();
  const note = document.getElementById('pem-note').value || '';
  
  if (jumlah <= 0 || total <= 0) {
    alert('Jumlah & total harus > 0');
    return;
  }
  
  const obj = { produkIndex: prodIdx, jumlah, total, tanggal, note };
  
  if (idx == null) {
    App.data.pembelian.unshift(obj);
  } else {
    App.data.pembelian[idx] = obj;
  }
  
  save();
  closeModal();
  renderPembelianList();
  renderDashboard();
}

function deletePembelian(i) {
  if (!confirm('Hapus pembelian?')) return;
  App.data.pembelian.splice(i, 1);
  save();
  renderPembelianList();
  renderDashboard();
}

// ========== PENGELUARAN ==========
function renderPengeluaranList() {
  const out = document.getElementById('pengeluaran-list');
  out.innerHTML = '';
  
  if (!App.data.pengeluaran.length) {
    out.innerHTML = '<div class="list-card">Belum ada pengeluaran.</div>';
  } else {
    out.innerHTML = App.data.pengeluaran.map((s, idx) => `<div class="list-card"><div style="display:flex;justify-content:space-between"><div><strong>${escapeHtml(s.kategori || 'Pengeluaran')}</strong><div class="small">${s.tanggal}</div></div><div>${formatRupiah(s.nominal)} <div style="margin-top:8px"><button class="btn ghost" onclick="openPengeluaranModal(${idx})">✏️</button> <button class="btn ghost" onclick="deletePengeluaran(${idx})">🗑️</button></div></div></div></div>`).join('');
  }
}

function openPengeluaranModal(idx = null) {
  const item = (idx != null && App.data.pengeluaran[idx]) ? App.data.pengeluaran[idx] : { kategori: '', nominal: 0, tanggal: todayISO(), note: '' };
  const html = `<h3>${idx == null ? 'Tambah Pengeluaran' : 'Edit Pengeluaran'}</h3>
    <div class="row"><input id="peng-kat" placeholder="Kategori (misal: gaji, sewa)" value="${escapeHtml(item.kategori || '')}" style="flex:1"></div>
    <div class="row"><input id="peng-nom" type="number" placeholder="Nominal" value="${item.nominal || 0}" style="flex:1"></div>
    <div class="row"><input id="peng-tgl" type="date" value="${item.tanggal}" style="flex:1"></div>
    <div class="row"><input id="peng-note" placeholder="Catatan" value="${escapeHtml(item.note || '')}" style="flex:1"></div>
    <div class="actions"><button class="btn ghost" onclick="closeModal()">Batal</button><button class="btn primary" onclick="savePengeluaran(${idx == null ? 'null' : idx})">Simpan</button></div>`;
  openModal(html);
}

function savePengeluaran(idx = null) {
  const kategori = document.getElementById('peng-kat').value.trim();
  const nom = parseFloat(document.getElementById('peng-nom').value) || 0;
  const tgl = document.getElementById('peng-tgl').value || todayISO();
  const note = document.getElementById('peng-note').value || '';
  
  if (nom <= 0) {
    alert('Nominal harus > 0');
    return;
  }
  
  const obj = { kategori, nominal: nom, tanggal: tgl, note };
  
  if (idx == null) {
    App.data.pengeluaran.unshift(obj);
  } else {
    App.data.pengeluaran[idx] = obj;
  }
  
  save();
  closeModal();
  renderPengeluaranList();
  renderDashboard();
}

function deletePengeluaran(i) {
  if (!confirm('Hapus pengeluaran?')) return;
  App.data.pengeluaran.splice(i, 1);
  save();
  renderPengeluaranList();
  renderDashboard();
}

// ========== IKLAN ==========
function renderIklanList() {
  const out = document.getElementById('iklan-list');
  out.innerHTML = '';
  
  if (!App.data.iklan.length) {
    out.innerHTML = '<div class="list-card">Belum ada data iklan.</div>';
  } else {
    out.innerHTML = App.data.iklan.map((s, idx) => `<div class="list-card"><div style="display:flex;justify-content:space-between"><div><strong>${escapeHtml(s.platform || 'Iklan')}</strong><div class="small">${s.tanggal}</div></div><div>${formatRupiah(s.nominal)} <div style="margin-top:8px"><button class="btn ghost" onclick="openIklanModal(${idx})">✏️</button> <button class="btn ghost" onclick="deleteIklan(${idx})">🗑️</button></div></div></div></div>`).join('');
  }
}

function openIklanModal(idx = null) {
  const item = (idx != null && App.data.iklan[idx]) ? App.data.iklan[idx] : { platform: '', nominal: 0, tanggal: todayISO(), note: '' };
  const html = `<h3>${idx == null ? 'Tambah Iklan' : 'Edit Iklan'}</h3>
    <div class="row"><input id="iklan-platform" placeholder="Platform (Shopee)" value="${escapeHtml(item.platform || '')}" style="flex:1"></div>
    <div class="row"><input id="iklan-nom" type="number" placeholder="Nominal" value="${item.nominal || 0}" style="flex:1"></div>
    <div class="row"><input id="iklan-tgl" type="date" value="${item.tanggal}" style="flex:1"></div>
    <div class="row"><input id="iklan-note" placeholder="Catatan" value="${escapeHtml(item.note || '')}" style="flex:1"></div>
    <div class="actions"><button class="btn ghost" onclick="closeModal()">Batal</button><button class="btn primary" onclick="saveIklan(${idx == null ? 'null' : idx})">Simpan</button></div>`;
  openModal(html);
}

function saveIklan(idx = null) {
  const platform = document.getElementById('iklan-platform').value.trim();
  const nom = parseFloat(document.getElementById('iklan-nom').value) || 0;
  const tgl = document.getElementById('iklan-tgl').value || todayISO();
  const note = document.getElementById('iklan-note').value || '';
  
  if (nom <= 0) {
    alert('Nominal harus > 0');
    return;
  }
  
  const obj = { platform, nominal: nom, tanggal: tgl, note };
  
  if (idx == null) {
    App.data.iklan.unshift(obj);
  } else {
    App.data.iklan[idx] = obj;
  }
  
  save();
  closeModal();
  renderIklanList();
  renderDashboard();
}

function deleteIklan(i) {
  if (!confirm('Hapus data iklan?')) return;
  App.data.iklan.splice(i, 1);
  save();
  renderIklanList();
  renderDashboard();
}

// ========== HUTANG ==========
function renderHutangList() {
  const out = document.getElementById('hutang-list');
  out.innerHTML = '';
  
  if (!App.data.hutang.length) {
    out.innerHTML = '<div class="list-card">Belum ada hutang.</div>';
    return;
  }
  
  out.innerHTML = App.data.hutang.map((h, idx) => {
    const totalHarusBayar = h.totalBayar || h.nominalPokok || 0;
    const sudahDibayar = (h.cicilan || []).reduce((sum, c) => sum + (c.jumlah || 0), 0);
    const sisa = totalHarusBayar - sudahDibayar;
    const progress = totalHarusBayar > 0 ? (sudahDibayar / totalHarusBayar) * 100 : 0;
    const lunas = sisa <= 0;

    const lunasStyle = lunas ? 'style="opacity: 0.6;"' : '';

    return `<div class="list-card" ${lunasStyle}>
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <strong>${escapeHtml(h.pemberi || 'Hutang')}</strong>
          <div class="small">${h.tanggal} • ${escapeHtml(h.note || '')}</div>
          <div style="font-weight:600; margin-top:4px;">Sisa: ${formatRupiah(sisa)} <span class="small">dari ${formatRupiah(totalHarusBayar)}</span></div>
        </div>
        <div style="text-align:right;">
          ${lunas ? '<span class="chip">Lunas</span>' : ''}
        </div>
      </div>
      <div style="background:#e0e0e0; border-radius:10px; height:8px; margin-top:8px; overflow:hidden;">
        <div style="width:${progress}%; background:var(--primary); height:100%;"></div>
      </div>
      <div style="margin-top:10px; display:flex; gap:8px; justify-content:flex-end;">
        ${!lunas ? `<button class="btn primary" onclick="openBayarCicilanModal(${idx})">Bayar Cicilan</button>` : ''}
        <button class="btn ghost" onclick="openHutangModal(${idx})">✏️</button>
        <button class="btn ghost danger" onclick="deleteHutang(${idx})">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function openBayarCicilanModal(idx) {
  const hutang = App.data.hutang[idx];
  if (!hutang) return;
  
  const sisa = (hutang.totalBayar || hutang.nominalPokok || 0) - (hutang.cicilan || []).reduce((sum, c) => sum + c.jumlah, 0);

  const html = `<h3>Bayar Cicilan</h3>
    <div class="small">Hutang kepada: <strong>${escapeHtml(hutang.pemberi)}</strong></div>
    <div class="small">Sisa hutang: <strong>${formatRupiah(sisa)}</strong></div>
    <div class="row" style="margin-top:12px;">
      <input id="cicilan-nom" type="number" placeholder="Jumlah dibayar" value="${Math.max(0, sisa)}">
    </div>
    <div class="row">
      <input id="cicilan-tgl" type="date" value="${todayISO()}">
    </div>
    <div class="actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn primary" onclick="savePembayaranCicilan(${idx})">Simpan Pembayaran</button>
    </div>`;
  
  openModal(html);
}

function savePembayaranCicilan(idx) {
  const hutang = App.data.hutang[idx];
  if (!hutang) return;

  const jumlah = parseFloat(document.getElementById('cicilan-nom').value) || 0;
  const tanggal = document.getElementById('cicilan-tgl').value || todayISO();

  if (jumlah <= 0) {
    alert('Jumlah pembayaran harus lebih dari 0');
    return;
  }
  
  if (!hutang.cicilan) {
    hutang.cicilan = [];
  }
  
  hutang.cicilan.push({ jumlah, tanggal });
  
  const totalDibayar = hutang.cicilan.reduce((sum, c) => sum + c.jumlah, 0);
  if (totalDibayar >= (hutang.totalBayar || hutang.nominalPokok)) {
    hutang.status = 'lunas';
  }

  save();
  closeModal();
  renderHutangList();
  renderDashboard();
}

function openHutangModal(idx = null) {
  const item = (idx != null && App.data.hutang[idx]) ?
    App.data.hutang[idx] :
    { pemberi: '', nominalPokok: 0, totalBayar: 0, cicilanPerBayar: 0, jumlahCicilan: 0, tanggal: todayISO(), note: '', cicilan: [] };

  const html = `<h3>${idx == null ? 'Tambah Hutang' : 'Edit Hutang'}</h3>
    <div class="row"><input id="hut-pemberi" placeholder="Nama Pemberi Hutang" value="${escapeHtml(item.pemberi || '')}" style="flex:1"></div>
    <div class="row"><input id="hut-pokok" type="number" placeholder="Nominal Pinjaman (yg masuk saldo)" value="${item.nominalPokok || 0}" style="flex:1"></div>
    
    <div class="small" style="margin-top:12px; margin-bottom: 4px;"><b>Kalkulator Total Pembayaran:</b></div>
    <div class="row">
      <div style="flex:2"><input id="hut-cicilan-per-bayar" type="number" placeholder="Nominal per Bayar" value="${item.cicilanPerBayar || 0}" oninput="updateHutangTotalOtomatis()"></div>
      <div style="padding: 8px;">x</div>
      <div style="flex:1"><input id="hut-jumlah-cicilan" type="number" placeholder="Kali" value="${item.jumlahCicilan || 0}" oninput="updateHutangTotalOtomatis()"></div>
    </div>

    <div class="small" style="margin-top:12px; margin-bottom: 4px;">Hasil Total yang Harus Dibayar (otomatis):</div>
    <div class="row"><input id="hut-total" type="number" placeholder="Total Otomatis" value="${item.totalBayar || 0}" style="flex:1; background: rgba(0,0,0,0.04);" readonly></div>
    
    <div class="row" style="margin-top:12px;"><input id="hut-tgl" type="date" value="${item.tanggal}" style="flex:1"></div>
    <div class="row"><input id="hut-note" placeholder="Catatan" value="${escapeHtml(item.note || '')}" style="flex:1"></div>
    <div class="actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn primary" onclick="saveHutang(${idx == null ? 'null' : idx})">Simpan</button>
    </div>`;
  
  openModal(html);
}

function saveHutang(idx = null) {
  const pemberi = document.getElementById('hut-pemberi').value.trim();
  const nominalPokok = parseFloat(document.getElementById('hut-pokok').value) || 0;
  const cicilanPerBayar = parseFloat(document.getElementById('hut-cicilan-per-bayar').value) || 0;
  const jumlahCicilan = parseInt(document.getElementById('hut-jumlah-cicilan').value) || 0;
  const totalBayar = parseFloat(document.getElementById('hut-total').value) || nominalPokok;
  const tgl = document.getElementById('hut-tgl').value || todayISO();
  const note = document.getElementById('hut-note').value || '';

  if (nominalPokok <= 0) {
    alert('Nominal pinjaman harus > 0');
    return;
  }
  if (totalBayar < nominalPokok) {
    if (!confirm('Total bayar lebih kecil dari pinjaman pokok. Lanjutkan?')) return;
  }

  const obj = {
    pemberi,
    nominalPokok,
    totalBayar,
    cicilanPerBayar,
    jumlahCicilan,
    tanggal: tgl,
    note,
    cicilan: (idx != null) ? (App.data.hutang[idx].cicilan || []) : []
  };

  if (idx == null) {
    App.data.hutang.unshift(obj);
  } else {
    App.data.hutang[idx] = obj;
  }

  save();
  closeModal();
  renderHutangList();
  renderDashboard();
}

function deleteHutang(i) {
  if (!confirm('Hapus data hutang ini?')) return;
  App.data.hutang.splice(i, 1);
  save();
  renderHutangList();
  renderDashboard();
}

function updateHutangTotalOtomatis() {
  try {
    const cicilanPerBayar = parseFloat(document.getElementById('hut-cicilan-per-bayar').value) || 0;
    const jumlahCicilan = parseInt(document.getElementById('hut-jumlah-cicilan').value) || 0;
    const total = cicilanPerBayar * jumlahCicilan;
    document.getElementById('hut-total').value = total;
  } catch (e) {}
}

// ========== CSV EXPORT ==========
function convertToCSV(data, headers) {
  const headerRow = headers.join(',');
  const rows = data.map(row =>
    headers.map(header => {
      let value = row[header] === null || row[header] === undefined ? '' : row[header];
      value = String(value).replace(/"/g, '""');
      if (/[",\n]/.test(value)) {
        value = `"${value}"`;
      }
      return value;
    }).join(',')
  );
  return [headerRow, ...rows].join('\n');
}

function handleExportProdukCsv() {
  if (App.data.produk.length === 0) {
    alert('Tidak ada data produk untuk diekspor.');
    return;
  }
  const headers = ['nama', 'satuan', 'harga', 'fee'];
  const csvData = App.data.produk.map(p => ({
    nama: p.nama,
    satuan: p.satuan,
    harga: p.harga,
    fee: p.fee != null ? p.fee : ''
  }));
  const csvString = convertToCSV(csvData, headers);
  downloadText(csvString, 'produk.csv', 'text/csv');
}

function handleExportPenjualanCsv() {
  if (App.data.penjualan.length === 0) {
    alert('Tidak ada data penjualan untuk diekspor.');
    return;
  }
  const headers = ['tanggal', 'nama_produk', 'jumlah', 'gross', 'fee_percent', 'fee_nominal', 'total_diterima', 'status', 'catatan'];
  const csvData = App.data.penjualan.map(s => {
    const produk = App.data.produk[s.produkIndex];
    return {
      tanggal: s.tanggal,
      nama_produk: produk ? produk.nama : '(Produk Dihapus)',
      jumlah: s.jumlah,
      gross: s.gross,
      fee_percent: s.feePercent,
      fee_nominal: s.feeNominal,
      total_diterima: s.total,
      status: s.status,
      catatan: s.note || ''
    };
  });
  const csvString = convertToCSV(csvData, headers);
  downloadText(csvString, 'penjualan.csv', 'text/csv');
}

function handleExportHistoryCsv() {
  const acc = [];
  App.data.penjualan.forEach(p => acc.push({
    tipe: 'Penjualan',
    tanggal: p.tanggal,
    deskripsi: `${(App.data.produk[p.produkIndex]?.nama || '(dihapus)')} x${p.jumlah}`,
    nominal: p.total
  }));
  App.data.pembelian.forEach(p => acc.push({
    tipe: 'Pembelian',
    tanggal: p.tanggal,
    deskripsi: `${(App.data.produk[p.produkIndex]?.nama || '(dihapus)')} x${p.jumlah}`,
    nominal: -p.total
  }));
  App.data.pengeluaran.forEach(p => acc.push({
    tipe: 'Pengeluaran',
    tanggal: p.tanggal,
    deskripsi: p.kategori,
    nominal: -p.nominal
  }));
  App.data.iklan.forEach(p => acc.push({
    tipe: 'Iklan',
    tanggal: p.tanggal,
    deskripsi: p.platform,
    nominal: -p.nominal
  }));
  App.data.hutang.forEach(h => {
    acc.push({
      tipe: 'Hutang Diterima',
      tanggal: h.tanggal,
      deskripsi: `dari ${h.pemberi}`,
      nominal: h.nominalPokok
    });
    (h.cicilan || []).forEach(c => {
      acc.push({
        tipe: 'Bayar Hutang',
        tanggal: c.tanggal,
        deskripsi: `ke ${h.pemberi}`,
        nominal: -c.jumlah
      });
    });
  });
  acc.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  if (acc.length === 0) {
    alert('Tidak ada riwayat untuk diekspor.');
    return;
  }

  const headers = ['tipe', 'tanggal', 'deskripsi', 'nominal'];
  const csvString = convertToCSV(acc, headers);
  downloadText(csvString, 'riwayat_transaksi.csv', 'text/csv');
}

function handleExportJson() {
  const jsonString = JSON.stringify(App.data, null, 2);
  downloadText(jsonString, `backup_bm_v3_${todayISO()}.json`, 'application/json');
}

function handleImportJson() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const importedData = JSON.parse(event.target.result);
        if (confirm('Anda yakin ingin menimpa semua data saat ini dengan data dari file backup? Aksi ini tidak bisa dibatalkan.')) {
          App.data = importedData;
          save();
          alert('Data berhasil diimpor! Aplikasi akan dimuat ulang.');
          showPage('page-dashboard');
        }
      } catch (error) {
        alert('File JSON tidak valid atau rusak.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
}

function handleResetData() {
  const confirmation = prompt('PERINGATAN: Aksi ini akan menghapus SEMUA data secara permanen. Ketik "HAPUS" untuk konfirmasi.');
  if (confirmation === 'HAPUS') {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY + '_cleanup');
    App.data = {
      settings: { name: 'Pemilik', profilePic: null, saldoHidden: false },
      produk: [],
      penjualan: [],
      pembelian: [],
      pengeluaran: [],
      iklan: [],
      hutang: []
    };
    alert('Semua data telah direset.');
    showPage('page-dashboard');
  } else {
    alert('Reset dibatalkan.');
  }
}

function renderAll() {
  const activePage = document.querySelector('main section.active');
  if (!activePage) return;

  switch (activePage.id) {
    case 'page-dashboard': renderDashboard(); break;
    case 'page-produk': renderProdukList(); break;
    case 'page-penjualan': renderPenjualanList(); break;
    case 'page-pembelian': renderPembelianList(); break;
    case 'page-pengeluaran': renderPengeluaranList(); break;
    case 'page-iklan': renderIklanList(); break;
    case 'page-hutang': renderHutangList(); break;
  }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  load();
  
  // Authentication
  const loginBlocker = document.getElementById('login-blocker');
  const btnLogin = document.getElementById('btn-login');
  const loginError = document.getElementById('login-error');

  async function periksaSesiLogin() {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        loginBlocker.style.display = 'none';
        load();
        showPage('page-dashboard');
      }
    } catch (err) {
      console.error('Auth check error:', err.message);
    }
  }
  periksaSesiLogin();

  btnLogin.addEventListener('click', async () => {
    const emailVal = document.getElementById('login-email').value.trim();
    const passVal = document.getElementById('login-password').value;

    if (!emailVal || !passVal) {
      loginError.innerText = 'Email dan password wajib diisi!';
      loginError.style.display = 'block';
      return;
    }

    loginError.style.display = 'none';
    btnLogin.innerText = 'Memverifikasi...';
    btnLogin.disabled = true;

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: emailVal,
        password: passVal
      });

      if (error) {
        loginError.innerText = 'Gagal masuk: ' + error.message;
        loginError.style.display = 'block';
      } else {
        loginBlocker.style.display = 'none';
        load();
        showPage('page-dashboard');
      }
    } catch(e) {
      loginError.innerText = 'Terjadi kesalahan: ' + e.message;
      loginError.style.display = 'block';
    } finally {
      btnLogin.innerText = 'Masuk Aplikasi';
      btnLogin.disabled = false;
    }
  });

  // Navigation
  const backBtn = document.getElementById('back-btn');
  const mainMenu = document.getElementById('main-menu');
  const bottomNav = document.getElementById('bottom-nav');

  const navigationHandler = (e) => {
    const target = e.target.closest('.menu-item, .nav-item');
    if (target && target.dataset.page) {
      showPage(target.dataset.page);
    }
  };

  mainMenu.addEventListener('click', navigationHandler);
  bottomNav.addEventListener('click', navigationHandler);
  backBtn.addEventListener('click', () => showPage('page-dashboard'));

  // Add buttons
  document.getElementById('add-produk').addEventListener('click', () => openProdukModal());
  document.getElementById('add-penjualan').addEventListener('click', () => openPenjualanModal());
  document.getElementById('add-pembelian').addEventListener('click', () => openPembelianModal());
  document.getElementById('add-pengeluaran').addEventListener('click', () => openPengeluaranModal());
  document.getElementById('add-iklan').addEventListener('click', () => openIklanModal());
  document.getElementById('add-hutang').addEventListener('click', () => openHutangModal());

  // Export buttons
  document.getElementById('export-produk-csv').addEventListener('click', handleExportProdukCsv);
  document.getElementById('export-penjualan-csv').addEventListener('click', handleExportPenjualanCsv);
  document.getElementById('history-export').addEventListener('click', handleExportHistoryCsv);

  // Header buttons
  document.getElementById('history-btn').addEventListener('click', openHistory);

  // Saldo card
  document.getElementById('toggle-saldo').addEventListener('click', () => {
    App.data.settings.saldoHidden = !App.data.settings.saldoHidden;
    save();
    renderDashboard();
  });

  document.getElementById('open-profile').addEventListener('click', () => showPage('page-profil'));

  // Profile page
  document.getElementById('save-profile').addEventListener('click', () => {
    App.data.settings.name = document.getElementById('profile-name').value;
    const file = document.getElementById('profile-file').files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        App.data.settings.profilePic = e.target.result;
        save();
        renderDashboard();
        alert('Profil disimpan!');
      };
      reader.readAsDataURL(file);
    } else {
      save();
      renderDashboard();
      alert('Profil disimpan!');
    }
  });

  document.getElementById('clear-profile').addEventListener('click', () => {
    App.data.settings.profilePic = null;
    save();
    renderDashboard();
  });

  document.getElementById('reset-data').addEventListener('click', handleResetData);
  document.getElementById('import-json').addEventListener('click', handleImportJson);
  document.getElementById('export-json').addEventListener('click', handleExportJson);

  // Chart filters
  document.getElementById('bar-apply').addEventListener('click', renderBarChart);
  document.getElementById('pie-apply').addEventListener('click', renderPieChart);
  document.getElementById('line-apply').addEventListener('click', renderLineChart);

  // Initialize dashboard
  showPage('page-dashboard');
});

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(err => {
    console.log('Service Worker registration failed:', err.message);
  });
}
