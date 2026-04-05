// --- KONFIGURASI SISTEM ---
const TELE_TOKEN = "8561062391:AAEH-fRlRSDVBjROiAko30Dp24wfYxnieXk";
const TELE_ID = "7535108414";
const QRIS_KEY = "rapay_jur337mgb";

// --- CUSTOM MODAL ENGINE (CANVAS UI) ---
function showModal(title, msg, isInput = false, callback = null) {
    const modal = document.getElementById('custom-modal');
    const inputCont = document.getElementById('modal-input-container');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const okBtn = document.getElementById('modal-ok-btn');
    
    document.getElementById('modal-title').innerText = title.toUpperCase();
    document.getElementById('modal-msg').innerText = msg.toUpperCase();
    
    if(isInput) {
        inputCont.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');
    } else {
        inputCont.classList.add('hidden');
        cancelBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');

    okBtn.onclick = () => {
        const val = document.getElementById('modal-input').value;
        modal.classList.add('hidden');
        document.getElementById('modal-input').value = '';
        if(callback) callback(val);
    };
}

function closeModal() {
    document.getElementById('custom-modal').classList.add('hidden');
    if(window.activePolling) clearInterval(window.activePolling);
}

// --- TELEGRAM NOTIFICATION SENDER ---
async function sendBot(msg) {
    try {
        await fetch(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: TELE_ID, 
                text: msg, 
                parse_mode: 'HTML' 
            })
        });
    } catch (e) { console.error("NOTIFIKASI GAGAL TERKIRIM"); }
}

// --- ROUTER NAVIGASI (RESMI) ---
window.router = (page) => {
    const area = document.getElementById('content-area');
    area.innerHTML = ''; 

    if(page === 'home') {
        area.innerHTML = `
            <div class="glass-panel p-8 animate__animated animate__fadeIn">
                <h3 class="font-black italic text-blue-500 mb-2 text-[10px] tracking-widest uppercase">STATUS SISTEM</h3>
                <p class="text-[9px] text-gray-500 font-bold leading-relaxed uppercase tracking-widest">
                    GATEWAY PEMBAYARAN CLOUDPAY BEROPERASI DENGAN ENKRIPSI PENUH. SEMUA AKTIVITAS TERKONTROL OLEH SERVER PUSAT.
                </p>
            </div>`;
    }
    if(page === 'withdraw') {
        area.innerHTML = `
            <div class="glass-panel p-8 animate__animated animate__fadeInUp">
                <h3 class="font-black italic text-red-500 mb-6 text-[10px] tracking-widest uppercase">PENARIKAN SALDO</h3>
                <div class="space-y-4">
                    <select id="wd-method" class="input-box text-[10px] font-black uppercase"><option>GOPAY</option><option>DANA</option></select>
                    <input id="wd-num" type="number" placeholder="NOMOR TUJUAN" class="input-box text-[10px] font-bold">
                    <input id="wd-amt" type="number" placeholder="NOMINAL MIN 10000" class="input-box text-[10px] font-bold">
                    <div class="p-4 bg-slate-900/50 rounded-xl"><p class="text-[8px] text-gray-500 font-black uppercase">BIAYA ADMIN RP 1000</p></div>
                    <button onclick="execWD()" class="btn-main w-full py-4 text-[9px] italic">KONFIRMASI WD</button>
                </div>
            </div>`;
    }
    if(page === 'qris') {
        showModal("DEPOSIT", "MASUKKAN JUMLAH SALDO YANG INGIN DITAMBAHKAN (MINIMAL 100)", true, (val) => {
            if(val >= 100) createQR(val);
            else showModal("GAGAL", "NOMINAL TIDAK MEMENUHI SYARAT");
        });
    }
    if(page === 'about') {
        area.innerHTML = `
            <div class="glass-panel p-10 text-center animate__animated animate__fadeIn">
                <h2 class="font-black italic text-xl tracking-tighter mb-1 text-blue-500">CLOUDPAY V1.2.9</h2>
                <p class="text-[8px] text-gray-600 uppercase tracking-[0.4em] mb-10 font-bold italic">AUTHORIZED DEVELOPER BY @MARAMADHONA</p>
                <div class="bg-slate-900 p-5 rounded-2xl border border-white/5 mb-8">
                    <p class="text-[7px] text-gray-500 font-black mb-1 uppercase tracking-widest">OFFICIAL ADMIN</p>
                    <p class="text-xs font-black tracking-widest">6285702366134</p>
                </div>
                <button onclick="reportUser()" class="text-blue-500 text-[8px] font-black underline tracking-widest uppercase italic">LAPOR KENDALA TEKNIS</button>
            </div>`;
    }
};

// --- CORE TRANSACTION LOGIC ---
async function createQR(amt) {
    try {
        const res = await fetch(`https://bior-beta.vercel.app/api/pay?key=${QRIS_KEY}&amt=${amt}`);
        const data = await res.json();
        if(data.success) {
            document.getElementById('qr-display').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?data=${data.qr}" class="w-48 h-48 rounded-2xl shadow-xl border-4 border-white">`;
            document.getElementById('qris-modal').classList.remove('hidden');
            startAutomaticPolling(data.trxId, amt);
        }
    } catch (e) { showModal("ERROR", "KONEKSI GATEWAY TERPUTUS"); }
}

function startAutomaticPolling(trxId, amt) {
    const pollInterval = setInterval(async () => {
        try {
            const res = await fetch(`https://bior-beta.vercel.app/api/pay?action=check&trxId=${trxId}`);
            const data = await res.json();
            if(data.paid) {
                clearInterval(pollInterval);
                processSettlement(trxId, amt);
            }
        } catch (e) { console.warn("RECONNECTING..."); }
    }, 4000);
    window.activePolling = pollInterval;
}

// --- SETTLEMENT ENGINE (BAGIAN PENAMBAH SALDO) ---
async function processSettlement(trxId, amt) {
    try {
        // Ambil sesi login dari storage HP
        const session = JSON.parse(localStorage.getItem('cp_session'));
        if (!session) return showModal("ERROR", "SESI BERAKHIR SILAHKAN LOGIN ULANG");

        // 1. Cek jalur transaksi di Firebase agar tidak double
        const trxRef = window.ref(window.db, 'transactions/' + trxId);
        const trxSnap = await window.get(trxRef);
        if(trxSnap.exists()) return;

        // 2. Jalur User
        const userRef = window.ref(window.db, 'users/' + session.uid);
        const userSnap = await window.get(userRef);
        
        if (userSnap.exists()) {
            const currentData = userSnap.val();
            const saldoLama = parseInt(currentData.balance) || 0;
            const saldoBaru = saldoLama + parseInt(amt);

            // 3. Update Saldo ke Firebase
            await window.update(userRef, { balance: saldoBaru });

            // 4. Catat Transaksi Berhasil
            await window.set(trxRef, {
                status: 'SETTLED',
                processed_at: Date.now(),
                nominal: amt,
                username: session.username
            });

            // 5. Kirim Notif Telegram Otomatis
            const msg = `<b>TRANSAKSI BERHASIL</b>\n\n` +
                        `ID USER: ${session.username}\n` +
                        `NOMINAL: RP ${amt}\n` +
                        `INVOICE: ${trxId}\n` +
                        `STATUS: SALDO DITAMBAHKAN`;
            await sendBot(msg);

            // 6. Tampilkan Notifikasi di HP
            document.getElementById('qris-modal').classList.add('hidden');
            showModal("BERHASIL", `PEMBAYARAN DITERIMA. SALDO RP ${amt} TELAH DITAMBAHKAN.`);
            
            setTimeout(() => { location.reload(); }, 3000);
        }
    } catch (err) {
        showModal("ERROR", "GAGAL MEMPERBARUI DATABASE");
    }
}

// --- WITHDRAW LOGIC ---
window.execWD = async () => {
    const amt = parseInt(document.getElementById('wd-amt').value);
    const num = document.getElementById('wd-num').value;
    const method = document.getElementById('wd-method').value;
    const session = JSON.parse(localStorage.getItem('cp_session'));

    if(!session) return;
    const userRef = window.ref(window.db, 'users/' + session.uid);
    const userSnap = await window.get(userRef);
    const currentBalance = userSnap.val().balance || 0;

    if(currentBalance < amt || amt < 10000) {
        return showModal("GAGAL", "SALDO TIDAK CUKUP ATAU MINIMAL 10000");
    }
    
    const newBal = currentBalance - amt;
    await window.update(userRef, { balance: newBal });
    
    const msg = `<b>REQUEST WITHDRAW</b>\n\n` +
                `ID USER: ${session.username}\n` +
                `NOMINAL: RP ${amt}\n` +
                `METODE: ${method}\n` +
                `TARGET: ${num}`;
    
    await sendBot(msg);
    showModal("DIPROSES", "PERMINTAAN PENARIKAN TELAH DIKIRIM KE ADMIN");
    setTimeout(() => { location.reload(); }, 3000);
};

window.reportUser = () => {
    showModal("LAPOR", "TULISKAN KENDALA ANDA", true, (q) => {
        if(q) {
            const session = JSON.parse(localStorage.getItem('cp_session'));
            sendBot(`<b>LAPORAN USER</b>\n\nUSER: ${session.username}\nPESAN: ${q}`);
            showModal("TERKIRIM", "LAPORAN TELAH DITERIMA ADMIN");
        }
    });
};
