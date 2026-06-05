// ============================================
// BUSINESS MANAGEMENT - ONLINE SYNC VERSION
// Dengan Supabase Real-Time Database
// ============================================

// Supabase Configuration
const supabaseUrl = 'https://nwpjxsciuiqugtflaylv.supabase.co';
const supabaseKey = 'sb_publishable_7iz_7-gbo5MI-D_ZPCEnRw_immjLepF';
let supabaseClient;

try {
    supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
} catch(e) {
    console.error('Supabase init error:', e.message);
}

// Global App State
const App = {
    user: null,
    businessName: 'Bisnis Saya',
    saldoHidden: false,
    data: {
        produk: [],
        penjualan: [],
        pembelian: [],
        pengeluaran: [],
        iklan: [],
        hutang: []
    },
    charts: {}
};

// ============ UTILITIES ============
function formatRupiah(n) { return 'Rp ' + (n || 0).toLocaleString('id-ID'); }
function todayISO(offsetDays = 0) {
    const d = new Date(); d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
}
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function showSyncStatus(syncing) {
    const el = document.getElementById('sync-badge') || document.getElementById('sync-status');
    if (el) el.style.display = syncing ? 'inline-block' : 'none';
}

// ============ AUTHENTICATION ============
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    if (!email || !password) {
        errorDiv.innerText = 'Email dan password harus diisi';
        errorDiv.style.display = 'block';
        return;
    }

    document.getElementById('btn-login').disabled = true;
    document.getElementById('btn-login').innerText = 'Memverifikasi...';

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        errorDiv.innerText = error.message;
        errorDiv.style.display = 'block';
        document.getElementById('btn-login').disabled = false;
        document.getElementById('btn-login').innerText = 'Masuk';
    } else {
        App.user = data.user;
        document.getElementById('login-blocker').style.display = 'none';
        await loadUserData();
        showPage('page-dashboard');
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    App.user = null;
    document.getElementById('login-blocker').style.display = 'flex';
    showPage('page-dashboard');
}

async function checkAuthStatus() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        App.user = session.user;
        document.getElementById('login-blocker').style.display = 'none';
        await loadUserData();
        setupRealTimeSync();
    } else {
        document.getElementById('login-blocker').style.display = 'flex';
    }
}

// ============ DATA LOADING ============
async function loadUserData() {
    showSyncStatus(true);
    try {
        const userId = App.user.id;

        const [produk, penjualan, pembelian, pengeluaran, iklan, hutang, settings] = await Promise.all([
            supabaseClient.from('produk').select('*').eq('user_id', userId),
            supabaseClient.from('penjualan').select('*').eq('user_id', userId),
            supabaseClient.from('pembelian').select('*').eq('user_id', userId),
            supabaseClient.from('pengeluaran').select('*').eq('user_id', userId),
            supabaseClient.from('iklan').select('*').eq('user_id', userId),
            supabaseClient.from('hutang').select('*').eq('user_id', userId),
            supabaseClient.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
        ]);

        App.data.produk = produk.data || [];
        App.data.penjualan = penjualan.data || [];
        App.data.pembelian = pembelian.data || [];
        App.data.pengeluaran = pengeluaran.data || [];
        App.data.iklan = iklan.data || [];
        App.data.hutang = hutang.data || [];

        if (settings.data) {
            App.businessName = settings.data.business_name || 'Bisnis Saya';
            App.saldoHidden = settings.data.saldo_hidden || false;
            
            // Sync to setting inputs if they exist
            const bNameInput = document.getElementById('business-name');
            const hSaldoInput = document.getElementById('hide-saldo');
            if (bNameInput) bNameInput.value = App.businessName;
            if (hSaldoInput) hSaldoInput.checked = App.saldoHidden;
        }

        renderDashboard();
        renderProdukList();
        renderPenjualanList();
        renderPembelianList();
        renderPengeluaranList();
        renderIklanList();
        renderHutangList();
        
        showSyncStatus(false);
    } catch (error) {
        console.error('Error loading data:', error);
        showSyncStatus(false);
    }
}

// ============ REAL-TIME SYNC ============
async function setupRealTimeSync() {
    const userId = App.user.id;

    supabaseClient
        .channel('public:produk')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produk', filter: `user_id=eq.${userId}` }, 
            payload => { App.data.produk = [...App.data.produk.filter(p => p.id !== payload.new.id), payload.new].sort((a,b) => b.id - a.id); renderProdukList(); renderDashboard(); })
        .subscribe();

    supabaseClient
        .channel('public:penjualan')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'penjualan', filter: `user_id=eq.${userId}` }, 
            payload => { App.data.penjualan = [...App.data.penjualan.filter(p => p.id !== payload.new.id), payload.new].sort((a,b) => b.id - a.id); renderPenjualanList(); renderDashboard(); })
        .subscribe();

    supabaseClient
        .channel('public:pembelian')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pembelian', filter: `user_id=eq.${userId}` }, 
            payload => { App.data.pembelian = [...App.data.pembelian.filter(p => p.id !== payload.new.id), payload.new].sort((a,b) => b.id - a.id); renderPembelianList(); renderDashboard(); })
        .subscribe();

    supabaseClient
        .channel('public:pengeluaran')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pengeluaran', filter: `user_id=eq.${userId}` }, 
            payload => { App.data.pengeluaran = [...App.data.pengeluaran.filter(p => p.id !== payload.new.id), payload.new].sort((a,b) => b.id - a.id); renderPengeluaranList(); renderDashboard(); })
        .subscribe();

    supabaseClient
        .channel('public:iklan')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'iklan', filter: `user_id=eq.${userId}` }, 
            payload => { App.data.iklan = [...App.data.iklan.filter(p => p.id !== payload.new.id), payload.new].sort((a,b) => b.id - a.id); renderIklanList(); renderDashboard(); })
        .subscribe();

    supabaseClient
        .channel('public:hutang')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hutang', filter: `user_id=eq.${userId}` }, 
            payload => { App.data.hutang = [...App.data.hutang.filter(p => p.id !== payload.new.id), payload.new].sort((a,b) => b.id - a.id); renderHutangList(); renderDashboard(); })
        .subscribe();
}

// ============ UI HELPERS ============
function showPage(id) {
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    
    const backBtn = document.getElementById('back-btn');
    const headerTitle = document.getElementById('header-title');
    
    if (id === 'page-dashboard') {
        backBtn.style.display = 'none';
        headerTitle.innerText = 'Business Management';
        document.getElementById('bottom-nav').style.display = 'flex';
    } else {
        backBtn.style.display = 'inline-block';
        headerTitle.innerText = id.replace('page-', '').replace(/-/g, ' ').toUpperCase();
        document.getElementById('bottom-nav').style.display = 'none';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModal(html) {
    const modal = document.getElementById('modal-back');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    modal.classList.add('active');
    modal.onclick = e => { if (e.target === modal) closeModal(); };
}

function closeModal() {
    document.getElementById('modal-back').classList.remove('active');
    document.getElementById('modal-content').innerHTML = '';
}

function openHistory() {
    const modal = document.getElementById('history-modal');
    modal.classList.add('active');
    const list = document.getElementById('history-list');
    
    let transactions = [];
    App.data.penjualan.forEach(p => transactions.push({ type: 'Penjualan', date: p.tanggal, desc: `Penjualan`, amount: p.total }));
    App.data.pembelian.forEach(p => transactions.push({ type: 'Pembelian', date: p.tanggal, desc: `Pembelian`, amount: -p.total }));
    App.data.pengeluaran.forEach(p => transactions.push({ type: 'Pengeluaran', date: p.tanggal, desc: p.kategori, amount: -p.nominal }));
    App.data.iklan.forEach(p => transactions.push({ type: 'Iklan', date: p.tanggal, desc: p.platform, amount: -p.nominal }));
    
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    list.innerHTML = transactions.map(t => `
        <div class="list-card">
            <div style="display:flex;justify-content:space-between">
                <div><strong>${t.type}</strong><div class="small">${t.date} • ${t.desc}</div></div>
                <div style="color:${t.amount > 0 ? '#10b981' : '#ef4444'}">${t.amount > 0 ? '+' : ''}${formatRupiah(t.amount)}</div>
            </div>
        </div>
    `).join('');
}

function closeHistory() {
    document.getElementById('history-modal').classList.remove('active');
}

// ============ CALCULATIONS ============
function calculateSaldo() {
    const income = App.data.penjualan.filter(p => p.status === 'selesai').reduce((s, p) => s + p.total, 0) +
                   App.data.hutang.reduce((s, h) => s + h.nominal_pokok, 0);
    
    const expense = App.data.pembelian.reduce((s, p) => s + p.total, 0) +
                    App.data.pengeluaran.reduce((s, p) => s + p.nominal, 0) +
                    App.data.iklan.reduce((s, p) => s + p.nominal, 0);
    
    return income - expense;
}

// ============ DASHBOARD ============
function renderDashboard() {
    const saldo = calculateSaldo();
    document.getElementById('saldo-value').innerText = App.saldoHidden ? 'Rp ●●●●●' : formatRupiah(saldo);
    
    renderBarChart();
    renderPieChart();
    renderLineChart();
}

function renderBarChart() {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    
    const data = dates.map(date => 
        App.data.penjualan.filter(p => p.tanggal === date && p.status === 'selesai').reduce((s, p) => s + p.total, 0)
    );
    
    if (App.charts.bar) App.charts.bar.destroy();
    const ctx = document.getElementById('barChart').getContext('2d');
    App.charts.bar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })),
            datasets: [{ label: 'Pendapatan', data, backgroundColor: '#00bcd4' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function renderPieChart() {
    const bahan = App.data.pembelian.reduce((s, p) => s + p.total, 0);
    const iklan = App.data.iklan.reduce((s, p) => s + p.nominal, 0);
    const gaji = App.data.pengeluaran.filter(p => p.kategori === 'Gaji').reduce((s, p) => s + p.nominal, 0);
    const lain = App.data.pengeluaran.reduce((s, p) => s + p.nominal, 0) - gaji;
    
    if (App.charts.pie) App.charts.pie.destroy();
    const ctx = document.getElementById('pieChart').getContext('2d');
    App.charts.pie = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Bahan', 'Iklan', 'Gaji', 'Lain'],
            datasets: [{ data: [bahan, iklan, gaji, Math.max(0, lain)], backgroundColor: ['#00bcd4', '#6f42c1', '#ffb86b', '#7ef7a6'] }]
        },
        options: { responsive: true }
    });
}

function renderLineChart() {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    
    const data = dates.map(date => {
        const income = App.data.penjualan.filter(p => p.tanggal <= date && p.status === 'selesai').reduce((s, p) => s + p.total, 0);
        const expense = App.data.pembelian.filter(p => p.tanggal <= date).reduce((s, p) => s + p.total, 0) +
                        App.data.pengeluaran.filter(p => p.tanggal <= date).reduce((s, p) => s + p.nominal, 0) +
                        App.data.iklan.filter(p => p.tanggal <= date).reduce((s, p) => s + p.nominal, 0);
        return income - expense;
    });
    
    if (App.charts.line) App.charts.line.destroy();
    const ctx = document.getElementById('lineChart').getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 140);
    grad.addColorStop(0, 'rgba(0,188,212,0.35)');
    grad.addColorStop(1, 'rgba(0,188,212,0.01)');
    
    App.charts.line = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })),
            datasets: [{ label: 'Total Aset', data, borderColor: '#00bcd4', backgroundColor: grad, tension: 0.45, fill: true, pointRadius: 2 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, elements: { line: { borderWidth: 2 } } }
    });
}

// ============ CRUD MUTATIONS (SUPABASE INSERT) ============
async function addProduk(nama, satuan, harga, fee) {
    showSyncStatus(true);
    const { error } = await supabaseClient.from('produk').insert([{
        user_id: App.user.id,
        nama, satuan, harga, fee: fee || 0
    }]);
    showSyncStatus(false);
    if (error) alert('Gagal simpan produk: ' + error.message);
    else loadUserData();
}

async function addPenjualan(produkIndex, jumlah, tanggal, note, feePercent) {
    showSyncStatus(true);
    const produk = App.data.produk[produkIndex];
    const gross = produk.harga * jumlah;
    const feeNominal = Math.round(gross * (feePercent / 100));
    const total = gross - feeNominal;
    
    const { error } = await supabaseClient.from('penjualan').insert([{
        user_id: App.user.id,
        produk_index: produkIndex,
        jumlah, tanggal, note,
        gross, fee_percent: feePercent, fee_nominal: feeNominal, total,
        status: 'selesai' // Diubah langsung selesai agar langsung masuk ke kalkulasi kas & grafik
    }]);
    showSyncStatus(false);
    if (error) alert('Gagal simpan penjualan: ' + error.message);
    else loadUserData();
}

async function addPembelian(produkIndex, jumlah, total, tanggal, note) {
    showSyncStatus(true);
    const { error } = await supabaseClient.from('pembelian').insert([{
        user_id: App.user.id,
        produk_index: produkIndex,
        jumlah, total, tanggal, note
    }]);
    showSyncStatus(false);
    if (error) alert('Gagal simpan pembelian: ' + error.message);
    else loadUserData();
}

async function addPengeluaran(kategori, nominal, tanggal, note) {
    showSyncStatus(true);
    const { error } = await supabaseClient.from('pengeluaran').insert([{
        user_id: App.user.id,
        kategori, nominal, tanggal, note
    }]);
    showSyncStatus(false);
    if (error) alert('Gagal simpan pengeluaran: ' + error.message);
    else loadUserData();
}

async function addIklan(platform, nominal, tanggal, note) {
    showSyncStatus(true);
    const { error } = await supabaseClient.from('iklan').insert([{
        user_id: App.user.id,
        platform, nominal, tanggal, note
    }]);
    showSyncStatus(false);
    if (error) alert('Gagal simpan iklan: ' + error.message);
    else loadUserData();
}

async function addHutang(pemberi, nominalPokok, totalBayar, tanggal, note) {
    showSyncStatus(true);
    const { error } = await supabaseClient.from('hutang').insert([{
        user_id: App.user.id,
        pemberi, nominal_pokok: nominalPokok, total_bayar: totalBayar, tanggal, note
    }]);
    showSyncStatus(false);
    if (error) alert('Gagal simpan hutang: ' + error.message);
    else loadUserData();
}

// ============ RENDER LIST FUNCTIONS ============
function renderProdukList() {
    const out = document.getElementById('produk-list');
    if(!out) return;
    if (!App.data.produk.length) {
        out.innerHTML = '<div class="list-card">Belum ada produk.</div>';
        return;
    }
    out.innerHTML = App.data.produk.map((p, i) => `
        <div class="list-card">
            <div style="display:flex;justify-content:space-between">
                <div><strong>${escapeHtml(p.nama)}</strong><div class="small">${p.satuan} • ${formatRupiah(p.harga)}</div></div>
                <div>Fee: ${p.fee || 0}%</div>
            </div>
        </div>
    `).join('');
}

function renderPenjualanList() {
    const out = document.getElementById('penjualan-list');
    if(!out) return;
    if (!App.data.penjualan.length) {
        out.innerHTML = '<div class="list-card">Belum ada penjualan.</div>';
        return;
    }
    out.innerHTML = App.data.penjualan.map(p => `
        <div class="list-card">
            <div style="display:flex;justify-content:space-between">
                <div><strong>Penjualan</strong><div class="small">${p.tanggal} • Gross: ${formatRupiah(p.gross)}</div></div>
                <div style="color:#10b981; font-weight:600;">+ ${formatRupiah(p.total)}</div>
            </div>
        </div>
    `).join('');
}

function renderPembelianList() {
    const out = document.getElementById('pembelian-list');
    if(!out) return;
    if (!App.data.pembelian.length) {
        out.innerHTML = '<div class="list-card">Belum ada pembelian.</div>';
        return;
    }
    out.innerHTML = App.data.pembelian.map(p => `
        <div class="list-card">
            <div style="display:flex;justify-content:space-between">
                <div><strong>Pembelian Bahan/Stok</strong><div class="small">${p.tanggal} ${p.note ? '• '+escapeHtml(p.note) : ''}</div></div>
                <div style="color:#ef4444;">- ${formatRupiah(p.total)}</div>
            </div>
        </div>
    `).join('');
}

function renderPengeluaranList() {
    const out = document.getElementById('pengeluaran-list');
    if(!out) return;
    if (!App.data.pengeluaran.length) {
        out.innerHTML = '<div class="list-card">Belum ada pengeluaran.</div>';
        return;
    }
    out.innerHTML = App.data.pengeluaran.map(p => `
        <div class="list-card">
            <div style="display:flex;justify-content:space-between">
                <div><strong>${escapeHtml(p.kategori)}</strong><div class="small">${p.tanggal} ${p.note ? '• '+escapeHtml(p.note) : ''}</div></div>
                <div style="color:#ef4444;">- ${formatRupiah(p.nominal)}</div>
            </div>
        </div>
    `).join('');
}

// Render Iklan
function renderIklanList() {
    const out = document.getElementById('iklan-list');
    if(!out) return;
    if (!App.data.iklan.length) {
        out.innerHTML = '<div class="list-card">Belum ada log iklan.</div>';
        return;
    }
    out.innerHTML = App.data.iklan.map(p => `
        <div class="list-card">
            <div style="display:flex;justify-content:space-between">
                <div><strong>${escapeHtml(p.platform)}</strong><div class="small">${p.tanggal} ${p.note ? '• '+escapeHtml(p.note) : ''}</div></div>
                <div style="color:#ef4444;">- ${formatRupiah(p.nominal)}</div>
            </div>
        </div>
    `).join('');
}

// Render Hutang
function renderHutangList() {
    const out = document.getElementById('hutang-list');
    if(!out) return;
    if (!App.data.hutang.length) {
        out.innerHTML = '<div class="list-card">Belum ada catatan hutang.</div>';
        return;
    }
    out.innerHTML = App.data.hutang.map(h => `
        <div class="list-card">
            <div style="display:flex;justify-content:space-between">
                <div><strong>${escapeHtml(h.pemberi)}</strong><div class="small">${h.tanggal} • Pokok: ${formatRupiah(h.nominal_pokok)}</div></div>
                <div style="font-weight:600;">Harus Bayar: ${formatRupiah(h.total_bayar)}</div>
            </div>
        </div>
    `).join('');
}

// ============ SAVE FORM ACTION TRIGGERS ============
function saveProduk() {
    const nama = document.getElementById('modal-nama').value.trim();
    const satuan = document.getElementById('modal-satuan').value.trim() || 'Pcs';
    const harga = parseFloat(document.getElementById('modal-harga').value) || 0;
    const fee = parseFloat(document.getElementById('modal-fee').value) || 0;
    
    if (!nama || harga <= 0) return alert('Nama dan harga harus diisi!');
    addProduk(nama, satuan, harga, fee);
    closeModal();
}

function savePenjualan() {
    const idx = parseInt(document.getElementById('modal-p-idx').value);
    const jumlah = parseInt(document.getElementById('modal-jumlah').value) || 1;
    const tanggal = document.getElementById('modal-tanggal').value;
    const note = document.getElementById('modal-note').value.trim();
    const feePct = parseFloat(document.getElementById('modal-fee-pct').value) || App.data.produk[idx].fee || 0;

    if (isNaN(idx)) return alert('Pilih produk valid!');
    addPenjualan(idx, jumlah, tanggal, note, feePct);
    closeModal();
}

function savePembelian() {
    const idx = parseInt(document.getElementById('modal-pembelian-idx').value);
    const jumlah = parseInt(document.getElementById('modal-pembelian-jumlah').value) || 1;
    const total = parseFloat(document.getElementById('modal-pembelian-total').value) || 0;
    const tanggal = document.getElementById('modal-pembelian-tanggal').value;
    const note = document.getElementById('modal-pembelian-note').value.trim();

    if (isNaN(idx) || total <= 0) return alert('Pilih produk/bahan dan masukkan total biaya!');
    addPembelian(idx, jumlah, total, tanggal, note);
    closeModal();
}

function savePengeluaran() {
    const kategori = document.getElementById('modal-ops-kategori').value;
    const nominal = parseFloat(document.getElementById('modal-ops-nominal').value) || 0;
    const tanggal = document.getElementById('modal-ops-tanggal').value;
    const note = document.getElementById('modal-ops-note').value.trim();

    if (nominal <= 0) return alert('Nominal harus diisi dengan benar!');
    addPengeluaran(kategori, nominal, tanggal, note);
    closeModal();
}

function saveIklan() {
    const platform = document.getElementById('modal-ads-platform').value;
    const nominal = parseFloat(document.getElementById('modal-ads-nominal').value) || 0;
    const tanggal = document.getElementById('modal-ads-tanggal').value;
    const note = document.getElementById('modal-ads-note').value.trim();

    if (nominal <= 0) return alert('Nominal iklan harus valid!');
    addIklan(platform, nominal, tanggal, note);
    closeModal();
}

function saveHutang() {
    const pemberi = document.getElementById('modal-debt-pemberi').value.trim();
    const nominalPokok = parseFloat(document.getElementById('modal-debt-pokok').value) || 0;
    const totalBayar = parseFloat(document.getElementById('modal-debt-bayar').value) || 0;
    const tanggal = document.getElementById('modal-debt-tanggal').value;
    const note = document.getElementById('modal-debt-note').value.trim();

    if (!pemberi || nominalPokok <= 0) return alert('Nama pemberi dan nominal pokok harus diisi!');
    addHutang(pemberi, nominalPokok, totalBayar, tanggal, note);
    closeModal();
}

async function saveSettings() {
    const name = document.getElementById('business-name').value || 'Bisnis Saya';
    App.businessName = name;
    
    showSyncStatus(true);
    const { error } = await supabaseClient.from('user_settings').upsert({
        user_id: App.user.id,
        business_name: name,
        saldo_hidden: App.saldoHidden
    });
    showSyncStatus(false);
    
    if (!error) alert('Pengaturan disimpan!');
    else alert('Gagal simpan pengaturan: ' + error.message);
}

// ========== INITIALIZE EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
    
    // Navigation Routing
    document.getElementById('back-btn').addEventListener('click', () => showPage('page-dashboard'));
    document.getElementById('main-menu').addEventListener('click', e => {
        const item = e.target.closest('.menu-item');
        if (item && item.dataset.page) showPage(item.dataset.page);
    });
    document.getElementById('bottom-nav').addEventListener('click', e => {
        const item = e.target.closest('.nav-item');
        if (item && item.dataset.page) showPage(item.dataset.page);
    });
    
    // Auth Actions
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('logout-full').addEventListener('click', handleLogout);
    
    // Global History Modal
    document.getElementById('history-btn').addEventListener('click', openHistory);
    
    // Toggle View & Setting Listeners
    document.getElementById('toggle-saldo').addEventListener('click', () => {
        App.saldoHidden = !App.saldoHidden;
        renderDashboard();
    });
    document.getElementById('hide-saldo').addEventListener('change', e => {
        App.saldoHidden = e.target.checked;
        renderDashboard();
    });
    
    // --- MODAL POPUP FORM GENERATORS ---
    
    // 1. Modal Tambah Produk
    document.getElementById('add-produk').addEventListener('click', () => {
        const html = `<h3>Tambah Produk</h3>
            <div class="row"><input id="modal-nama" placeholder="Nama produk (misal: Standing QRIS Akrilik)"></div>
            <div class="row"><input id="modal-satuan" placeholder="Satuan (Pcs/Lembar)"></div>
            <div class="row"><input id="modal-harga" type="number" placeholder="Harga Jual (Rp)"></div>
            <div class="row"><input id="modal-fee" type="number" placeholder="Fee Admin Kelola % (Opsional)"></div>
            <div class="actions">
                <button class="btn ghost" onclick="closeModal()">Batal</button>
                <button class="btn primary" onclick="saveProduk()">Simpan</button>
            </div>`;
        openModal(html);
    });

    // 2. Modal Catat Penjualan
    document.getElementById('add-penjualan')?.addEventListener('click', () => {
        if (App.data.produk.length === 0) return alert('Buat produk terlebih dahulu di menu Produk!');
        const opsiProduk = App.data.produk.map((p, idx) => `<option value="${idx}">${escapeHtml(p.nama)} (${formatRupiah(p.harga)})</option>`).join('');
        
        const html = `<h3>Catat Penjualan</h3>
            <div class="row" style="margin-top:8px;"><label class="small">Pilih Produk</label></div>
            <select id="modal-p-idx" style="width:100%; padding:8px; border-radius:6px; margin-top:4px;">${opsiProduk}</select>
            <div class="row"><input id="modal-jumlah" type="number" value="1" placeholder="Jumlah Qty"></div>
            <div class="row"><input id="modal-tanggal" type="date" value="${todayISO()}"></div>
            <div class="row"><input id="modal-fee-pct" type="number" placeholder="Override % Potongan Fee Admin (Opsional)"></div>
            <div class="row"><input id="modal-note" placeholder="Catatan Pemesan / No. Invoice"></div>
            <div class="actions">
                <button class="btn ghost" onclick="closeModal()">Batal</button>
                <button class="btn primary" onclick="savePenjualan()">Simpan</button>
            </div>`;
        openModal(html);
    });

    // 3. Modal Catat Pembelian Bahan / Restock
    document.getElementById('add-pembelian')?.addEventListener('click', () => {
        if (App.data.produk.length === 0) return alert('Buat produk/kategori terlebih dahulu!');
        const opsiProduk = App.data.produk.map((p, idx) => `<option value="${idx}">${escapeHtml(p.nama)}</option>`).join('');
        
        const html = `<h3>Catat Pembelian Bahan / Stok</h3>
            <div class="row"><label class="small">Pilih Alokasi Produk/Bahan</label></div>
            <select id="modal-pembelian-idx" style="width:100%; padding:8px; border-radius:6px; margin-top:4px;">${opsiProduk}</select>
            <div class="row"><input id="modal-pembelian-jumlah" type="number" placeholder="Jumlah kuantitas"></div>
            <div class="row"><input id="modal-pembelian-total" type="number" placeholder="Total Biaya Keluar (Rp)"></div>
            <div class="row"><input id="modal-pembelian-tanggal" type="date" value="${todayISO()}"></div>
            <div class="row"><input id="modal-pembelian-note" placeholder="Nama Supplier / Toko Acrylic"></div>
            <div class="actions">
                <button class="btn ghost" onclick="closeModal()">Batal</button>
                <button class="btn primary" onclick="savePembelian()">Simpan</button>
            </div>`;
        openModal(html);
    });

    // 4. Modal Catat Pengeluaran Operasional
    document.getElementById('add-pengeluaran')?.addEventListener('click', () => {
        const html = `<h3>Catat Pengeluaran</h3>
            <select id="modal-ops-kategori" style="width:100%; padding:8px; border-radius:6px; margin-top:8px;">
                <option value="Gaji">Gaji Admin / Tukang Produksi</option>
                <option value="Alat">Pembelian Alat (Cutter, Mini Table Saw, dll)</option>
                <option value="Listrik">Listrik & Internet Workshop</option>
                <option value="Sewa">Sewa Tempat</option>
                <option value="Lainnya">Lain-lain</option>
            </select>
            <div class="row"><input id="modal-ops-nominal" type="number" placeholder="Nominal Pengeluaran (Rp)"></div>
            <div class="row"><input id="modal-ops-tanggal" type="date" value="${todayISO()}"></div>
            <div class="row"><input id="modal-ops-note" placeholder="Keterangan Pengeluaran Detail"></div>
            <div class="actions">
                <button class="btn ghost" onclick="closeModal()">Batal</button>
                <button class="btn primary" onclick="savePengeluaran()">Simpan</button>
            </div>`;
        openModal(html);
    });

    // 5. Modal Catat Iklan
    document.getElementById('add-iklan')?.addEventListener('click', () => {
        const html = `<h3>Catat Biaya Iklan (Marketing)</h3>
            <select id="modal-ads-platform" style="width:100%; padding:8px; border-radius:6px; margin-top:8px;">
                <option value="Meta Ads">Meta Ads (Facebook / Instagram)</option>
                <option value="TikTok Ads">TikTok Ads</option>
                <option value="Shopee Ads">Shopee Ads</option>
                <option value="Tokopedia Ads">Tokopedia Ads</option>
                <option value="Google Ads">Google Ads</option>
            </select>
            <div class="row"><input id="modal-ads-nominal" type="number" placeholder="Nominal Top-Up Iklan (Rp)"></div>
            <div class="row"><input id="modal-ads-tanggal" type="date" value="${todayISO()}"></div>
            <div class="row"><input id="modal-ads-note" placeholder="Nama Campaign / Keterangan Toko Online"></div>
            <div class="actions">
                <button class="btn ghost" onclick="closeModal()">Batal</button>
                <button class="btn primary" onclick="saveIklan()">Simpan</button>
            </div>`;
        openModal(html);
    });

    // 6. Modal Catat Suntikan Modal / Hutang
    document.getElementById('add-hutang')?.addEventListener('click', () => {
        const html = `<h3>Catat Hutang / Modal Masuk</h3>
            <div class="row"><input id="modal-debt-pemberi" placeholder="Nama Pemberi Hutang / Investor"></div>
            <div class="row"><input id="modal-debt-pokok" type="number" placeholder="Nominal Pokok Diterima Kas (Rp)"></div>
            <div class="row"><input id="modal-debt-bayar" type="number" placeholder="Total Target Pengembalian (Rp)"></div>
            <div class="row"><input id="modal-debt-tanggal" type="date" value="${todayISO()}"></div>
            <div class="row"><input id="modal-debt-note" placeholder="Catatan Jatuh Tempo / Syarat"></div>
            <div class="actions">
                <button class="btn ghost" onclick="closeModal()">Batal</button>
                <button class="btn primary" onclick="saveHutang()">Simpan</button>
            </div>`;
        openModal(html);
    });
});
