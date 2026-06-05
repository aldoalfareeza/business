// ========== BUSINESS MANAGEMENT - REAL-TIME SYNC VERSION ==========
// Integrated with Supabase for multi-device sync

const supabaseUrl = 'https://nwpjxsciuiqugtflaylv.supabase.co';
const supabaseKey = 'sb_publishable_7iz_7-gbo5MI-D_ZPCEnRw_immjLepF';

let supabaseClient;
let App = { user: null, data: {}, charts: {} };

try {
    supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
} catch(e) {
    console.error('Supabase init error:', e.message);
}

// ========== UTILITIES ==========
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
function showSyncStatus(show) {
    const badge = document.getElementById('sync-badge');
    if (badge) badge.style.display = show ? 'inline-block' : 'none';
}

// ========== AUTH ==========
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
    App.data = {};
    document.getElementById('login-blocker').style.display = 'flex';
}

async function checkAuthStatus() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        App.user = session.user;
        document.getElementById('login-blocker').style.display = 'none';
        await loadUserData();
        setupRealTimeListeners();
    } else {
        document.getElementById('login-blocker').style.display = 'flex';
    }
}

// ========== DATA SYNC ==========
async function loadUserData() {
    showSyncStatus(true);
    try {
        const userId = App.user.id;
        const settings = await supabaseClient.from('user_settings').select('*').eq('user_id', userId).single();
        
        App.data = {
            businessName: settings.data?.business_name || 'Bisnis Saya',
            saldoHidden: settings.data?.saldo_hidden || false,
            produk: [],
            penjualan: [],
            pembelian: [],
            pengeluaran: [],
            iklan: [],
            hutang: []
        };
        
        renderDashboard();
        showSyncStatus(false);
    } catch (error) {
        console.log('First load - initializing empty data');
        App.data = {
            businessName: 'Bisnis Saya',
            saldoHidden: false,
            produk: [],
            penjualan: [],
            pembelian: [],
            pengeluaran: [],
            iklan: [],
            hutang: []
        };
        showSyncStatus(false);
    }
}

function setupRealTimeListeners() {
    if (!App.user) return;
    const userId = App.user.id;

    // Real-time subscription untuk semua table
    supabaseClient
        .channel(`public:produk:user_id=eq.${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produk' },
            (payload) => { handleDataChange('produk', payload); })
        .subscribe();

    supabaseClient
        .channel(`public:penjualan:user_id=eq.${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'penjualan' },
            (payload) => { handleDataChange('penjualan', payload); })
        .subscribe();

    supabaseClient
        .channel(`public:pembelian:user_id=eq.${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pembelian' },
            (payload) => { handleDataChange('pembelian', payload); })
        .subscribe();

    supabaseClient
        .channel(`public:pengeluaran:user_id=eq.${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pengeluaran' },
            (payload) => { handleDataChange('pengeluaran', payload); })
        .subscribe();

    supabaseClient
        .channel(`public:iklan:user_id=eq.${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'iklan' },
            (payload) => { handleDataChange('iklan', payload); })
        .subscribe();

    supabaseClient
        .channel(`public:hutang:user_id=eq.${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hutang' },
            (payload) => { handleDataChange('hutang', payload); })
        .subscribe();
}

async function handleDataChange(table, payload) {
    showSyncStatus(true);
    
    if (payload.eventType === 'INSERT') {
        if (!App.data[table].find(item => item.id === payload.new.id)) {
            App.data[table].unshift(payload.new);
        }
    } else if (payload.eventType === 'UPDATE') {
        const idx = App.data[table].findIndex(item => item.id === payload.new.id);
        if (idx !== -1) App.data[table][idx] = payload.new;
    } else if (payload.eventType === 'DELETE') {
        App.data[table] = App.data[table].filter(item => item.id !== payload.old.id);
    }
    
    renderAll();
    showSyncStatus(false);
}

// ========== UI HELPERS ==========
function showPage(id) {
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    
    const backBtn = document.getElementById('back-btn');
    if (id === 'page-dashboard') {
        backBtn.style.display = 'none';
        document.getElementById('bottom-nav').style.display = 'flex';
    } else {
        backBtn.style.display = 'inline-block';
        document.getElementById('bottom-nav').style.display = 'none';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderAll();
}

function openModal(html) {
    const modal = document.getElementById('modal-back');
    modal.classList.add('active');
    document.getElementById('modal-content').innerHTML = html;
    modal.onclick = e => { if (e.target === modal) closeModal(); };
}

function closeModal() {
    document.getElementById('modal-back').classList.remove('active');
}

function openHistory() {
    document.getElementById('history-modal').classList.add('active');
    const list = document.getElementById('history-list');
    
    let items = [];
    App.data.penjualan?.forEach(p => items.push({ type: 'Penjualan', date: p.tanggal, amount: p.total }));
    App.data.pengeluaran?.forEach(p => items.push({ type: 'Pengeluaran', date: p.tanggal, amount: -p.nominal }));
    
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    list.innerHTML = items.map(i => `
        <div class="list-card">
            <div style="display:flex;justify-content:space-between">
                <div><strong>${i.type}</strong><div class="small">${i.date}</div></div>
                <div style="color:${i.amount > 0 ? '#10b981' : '#ef4444'}">${formatRupiah(i.amount)}</div>
            </div>
        </div>
    `).join('');
}

function closeHistory() {
    document.getElementById('history-modal').classList.remove('active');
}

// ========== CALCULATIONS ==========
function calculateSaldo() {
    const income = (App.data.penjualan || []).filter(p => p.status === 'selesai').reduce((s, p) => s + (p.total || 0), 0);
    const expense = (App.data.pembelian || []).reduce((s, p) => s + (p.total || 0), 0) +
                    (App.data.pengeluaran || []).reduce((s, p) => s + (p.nominal || 0), 0) +
                    (App.data.iklan || []).reduce((s, p) => s + (p.nominal || 0), 0);
    return income - expense;
}

// ========== DASHBOARD ==========
function renderDashboard() {
    const saldo = calculateSaldo();
    document.getElementById('saldo-value').innerText = App.data.saldoHidden ? 'Rp ●●●●●' : formatRupiah(saldo);
    renderBarChart();
    renderPieChart();
    renderLineChart();
}

function renderBarChart() {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    
    const data = dates.map(date => 
        (App.data.penjualan || []).filter(p => p.tanggal === date && p.status === 'selesai').reduce((s, p) => s + (p.total || 0), 0)
    );
    
    if (App.charts.bar) App.charts.bar.destroy();
    App.charts.bar = new Chart(document.getElementById('barChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })),
            datasets: [{ label: 'Pendapatan', data, backgroundColor: '#00bcd4' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function renderPieChart() {
    const bahan = (App.data.pembelian || []).reduce((s, p) => s + (p.total || 0), 0);
    const iklan = (App.data.iklan || []).reduce((s, p) => s + (p.nominal || 0), 0);
    const gaji = (App.data.pengeluaran || []).filter(p => p.kategori === 'Gaji').reduce((s, p) => s + (p.nominal || 0), 0);
    
    if (App.charts.pie) App.charts.pie.destroy();
    App.charts.pie = new Chart(document.getElementById('pieChart').getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['Bahan', 'Iklan', 'Gaji'],
            datasets: [{ data: [bahan, iklan, gaji], backgroundColor: ['#00bcd4', '#6f42c1', '#ffb86b'] }]
        },
        options: { responsive: true }
    });
}

function renderLineChart() {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    
    const data = dates.map(date => {
        const income = (App.data.penjualan || []).filter(p => p.tanggal <= date && p.status === 'selesai').reduce((s, p) => s + (p.total || 0), 0);
        const expense = (App.data.pembelian || []).filter(p => p.tanggal <= date).reduce((s, p) => s + (p.total || 0), 0) +
                        (App.data.pengeluaran || []).filter(p => p.tanggal <= date).reduce((s, p) => s + (p.nominal || 0), 0) +
                        (App.data.iklan || []).filter(p => p.tanggal <= date).reduce((s, p) => s + (p.nominal || 0), 0);
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
            datasets: [{ label: 'Aset', data, borderColor: '#00bcd4', backgroundColor: grad, tension: 0.45, fill: true }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

// ========== RENDER FUNCTIONS ==========
function renderProdukList() {
    const out = document.getElementById('produk-list');
    if (!App.data.produk || !App.data.produk.length) {
        out.innerHTML = '<div class="list-card">Belum ada produk.</div>';
    } else {
        out.innerHTML = App.data.produk.map(p => `
            <div class="list-card">
                <div style="display:flex;justify-content:space-between">
                    <div><strong>${escapeHtml(p.nama)}</strong><div class="small">${p.satuan} • ${formatRupiah(p.harga)}</div></div>
                    <div>${p.fee}%</div>
                </div>
            </div>
        `).join('');
    }
}

function renderPenjualanList() {
    const out = document.getElementById('penjualan-list');
    if (!App.data.penjualan || !App.data.penjualan.length) {
        out.innerHTML = '<div class="list-card">Belum ada penjualan.</div>';
    } else {
        out.innerHTML = App.data.penjualan.map(p => `
            <div class="list-card">
                <div style="display:flex;justify-content:space-between">
                    <div><strong>Penjualan</strong><div class="small">${p.tanggal}</div></div>
                    <div>${formatRupiah(p.total)}</div>
                </div>
            </div>
        `).join('');
    }
}

function renderPembelianList() {
    const out = document.getElementById('pembelian-list');
    if (!App.data.pembelian || !App.data.pembelian.length) {
        out.innerHTML = '<div class="list-card">Belum ada pembelian.</div>';
    } else {
        out.innerHTML = App.data.pembelian.map(p => `
            <div class="list-card">
                <div style="display:flex;justify-content:space-between">
                    <div><strong>Pembelian</strong><div class="small">${p.tanggal}</div></div>
                    <div>${formatRupiah(p.total)}</div>
                </div>
            </div>
        `).join('');
    }
}

function renderPengeluaranList() {
    const out = document.getElementById('pengeluaran-list');
    if (!App.data.pengeluaran || !App.data.pengeluaran.length) {
        out.innerHTML = '<div class="list-card">Belum ada pengeluaran.</div>';
    } else {
        out.innerHTML = App.data.pengeluaran.map(p => `
            <div class="list-card">
                <div style="display:flex;justify-content:space-between">
                    <div><strong>${escapeHtml(p.kategori)}</strong><div class="small">${p.tanggal}</div></div>
                    <div>${formatRupiah(p.nominal)}</div>
                </div>
            </div>
        `).join('');
    }
}

function renderIklanList() {
    const out = document.getElementById('iklan-list');
    if (!App.data.iklan || !App.data.iklan.length) {
        out.innerHTML = '<div class="list-card">Belum ada iklan.</div>';
    } else {
        out.innerHTML = App.data.iklan.map(p => `
            <div class="list-card">
                <div style="display:flex;justify-content:space-between">
                    <div><strong>${escapeHtml(p.platform)}</strong><div class="small">${p.tanggal}</div></div>
                    <div>${formatRupiah(p.nominal)}</div>
                </div>
            </div>
        `).join('');
    }
}

function renderHutangList() {
    const out = document.getElementById('hutang-list');
    if (!App.data.hutang || !App.data.hutang.length) {
        out.innerHTML = '<div class="list-card">Belum ada hutang.</div>';
    } else {
        out.innerHTML = App.data.hutang.map(h => `
            <div class="list-card">
                <div><strong>${escapeHtml(h.pemberi)}</strong><div class="small">${h.tanggal}</div></div>
                <div>${formatRupiah(h.nominal_pokok)}</div>
            </div>
        `).join('');
    }
}

function renderAll() {
    const activePage = document.querySelector('main section.active');
    if (!activePage) return;
    
    switch(activePage.id) {
        case 'page-dashboard': renderDashboard(); break;
        case 'page-produk': renderProdukList(); break;
        case 'page-penjualan': renderPenjualanList(); break;
        case 'page-pembelian': renderPembelianList(); break;
        case 'page-pengeluaran': renderPengeluaranList(); break;
        case 'page-iklan': renderIklanList(); break;
        case 'page-hutang': renderHutangList(); break;
    }
}

async function saveSettings() {
    const name = document.getElementById('business-name').value || 'Bisnis Saya';
    App.data.businessName = name;
    
    if (App.user) {
        await supabaseClient.from('user_settings').upsert({
            user_id: App.user.id,
            business_name: name,
            saldo_hidden: App.data.saldoHidden
        });
    }
    
    alert('Pengaturan disimpan!');
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
    
    // Navigation
    document.getElementById('back-btn').addEventListener('click', () => showPage('page-dashboard'));
    document.getElementById('main-menu').addEventListener('click', e => {
        const item = e.target.closest('.menu-item');
        if (item && item.dataset.page) showPage(item.dataset.page);
    });
    document.getElementById('bottom-nav').addEventListener('click', e => {
        const item = e.target.closest('.nav-item');
        if (item && item.dataset.page) showPage(item.dataset.page);
    });
    
    // Auth
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('logout-full').addEventListener('click', handleLogout);
    
    // History
    document.getElementById('history-btn').addEventListener('click', openHistory);
    
    // Toggle
    document.getElementById('toggle-saldo').addEventListener('click', () => {
        App.data.saldoHidden = !App.data.saldoHidden;
        renderDashboard();
    });
    
    // Settings
    document.getElementById('hide-saldo').addEventListener('change', e => {
        App.data.saldoHidden = e.target.checked;
        renderDashboard();
    });
});
