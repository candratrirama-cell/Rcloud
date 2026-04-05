const TELE_TOKEN = "8561062391:AAEH-fRlRSDVBjROiAko30Dp24wfYxnieXk";
const TELE_ID = "7535108414";
const QRIS_KEY = "rapay_jur337mgb";

// --- CUSTOM MODAL ENGINE ---
function showModal(title, msg, isInput = false, callback = null) {
    const modal = document.getElementById('custom-modal');
    const inputCont = document.getElementById('modal-input-container');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-msg').innerText = msg;
    
    if(isInput) {
        inputCont.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');
    } else {
        inputCont.classList.add('hidden');
        cancelBtn.classList.add('hidden');
    }
    modal.classList.remove('hidden');

    document.getElementById('modal-ok-btn').onclick = () => {
        const val = document.getElementById('modal-input').value;
        modal.classList.add('hidden');
        document.getElementById('modal-input').value = '';
        if(callback) callback(val);
    };
}

function closeModal() { document.getElementById('custom-modal').classList.add('hidden'); }

// --- AUTOMATED BOT NOTIFICATION ---
async function sendNotification(message) {
    try {
        await fetch(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELE_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (error) { console.error("Notification Error:", error); }
}

// --- NAVIGATION SYSTEM ---
window.router = (page) => {
    const area = document.getElementById('content-area');
    area.innerHTML = '';

    if(page === 'home') {
        area.innerHTML = `
            <div class="glass-panel p-8 animate__animated animate__fadeIn">
                <h3 class="font-black italic text-blue-500 mb-2 uppercase text-xs">Informasi Layanan</h3>
                <p class="text-[10px] text-gray-500 uppercase leading-loose font-bold tracking-widest">
                    Semua sistem berjalan normal. Transaksi menggunakan enkripsi SSL 256-bit untuk keamanan data anda.
                </p>
            </div>`;
    }
    if(page === 'withdraw') {
        area.innerHTML = `
            <div class="glass-panel p-8 animate__animated animate__fadeInUp">
                <h3 class="font-black italic text-red-500 mb-8 uppercase text-xs tracking-widest">Penarikan Dana</h3>
                <div class="space-y-4">
                    <select id="wd-method" class="input-box text-[10px] font-black uppercase"><option>GOPAY</option><option>DANA</option></select>
                    <input id="wd-num" type="number" placeholder="NOMOR TUJUAN" class="input-box text-[10px] font-bold">
                    <input id="wd-amt" type="number" placeholder="NOMINAL (MIN 10000)" class="input-box text-[10px] font-bold">
                    <div class="p-4 bg-slate-900 rounded-xl"><p class="text-[8px] text-gray-500 font-bold uppercase">Biaya Admin: RP 1.000</p></div>
                    <button onclick="execWD()" class="btn-main w-full py-4 text-[9px]">Proses Penarikan</button>
                </div>
            </div>`;
    }
    if(page === 'qris') {
        showModal("REFILL SALDO", "Masukkan jumlah deposit yang anda inginkan. Minimal pengisian RP 100.", true, (val) => {
            if(val >= 100) createQR(val);
            else showModal("GAGAL", "Nominal di bawah batas minimum sistem.");
        });
    }
    if(page === 'about') {
        area.innerHTML = `
            <div class="glass-panel p-10 text-center animate__animated animate__fadeIn">
                <h2 class="font-black italic text-xl tracking-tighter mb-1">CLOUDPAY V1.2.9</h2>
                <p class="text-[8px] text-gray-600 uppercase tracking-[0.4em] mb-10 font-bold">Official Distribution</p>
                <div class="bg-slate-900 p-5 rounded-2xl border border-white/5 mb-8">
                    <p class="text-[7px] text-gray-500 font-black mb-1 uppercase tracking-widest">Kontak Admin</p>
                    <p class="text-xs font-black tracking-widest">6285702366134</p>
                </div>
                <button onclick="reportUser()" class="text-blue-500 text-[8px] font-black underline tracking-widest uppercase italic">Lapor Kendala Teknis</button>
            </div>`;
    }
};

// --- CORE TRANSACTION LOGIC (AUTOMATIC CHECK) ---
async function createQR(amt) {
    const res = await fetch(`https://bior-beta.vercel.app/api/pay?key=${QRIS_KEY}&amt=${amt}`);
    const data = await res.json();
    if(data.success) {
        document.getElementById('qr-display').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?data=${data.qr}" class="w-48 h-48 rounded-2xl">`;
        document.getElementById('qris-modal').classList.remove('hidden');
        startAutomaticPolling(data.trxId, amt);
    }
}

function startAutomaticPolling(trxId, amt) {
    const pollInterval = setInterval(async () => {
        const res = await fetch(`https://bior-beta.vercel.app/api/pay?action=check&trxId=${trxId}`);
        const data = await res.json();

        if(data.paid) {
            clearInterval(pollInterval);
            
            // SECURITY: Idempotency Check (Anti-Double)
            const trxRef = window.ref(window.db, 'transactions/' + trxId);
            const snapshot = await window.get(trxRef);

            if(!snapshot.exists()) {
                const updatedBalance = window.currentUser.balance + parseInt(amt);
                
                // Atomic Update Database
                await window.update(window.ref(window.db, 'users/' + window.currentUser.uid), { balance: updatedBalance });
                await window.set(trxRef, { status: 'SETTLED', timestamp: Date.now(), user: window.currentUser.username });

                // Automatic Telegram Notification
                const msg = `<b>TRANSAKSI BERHASIL</b>\n\nUsername : ${window.currentUser.username}\nNominal  : RP ${amt}\nInvoice  : ${trxId}\nStatus   : TERBAYAR`;
                sendNotification(msg);

                document.getElementById('qris-modal').classList.add('hidden');
                showModal("SUKSES", "Pembayaran terverifikasi. Saldo telah ditambahkan ke akun anda.");
                setTimeout(() => location.reload(), 3000);
            }
        }
    }, 4000); // Check status setiap 4 detik
    window.activePolling = pollInterval;
}

window.closeQRIS = () => {
    clearInterval(window.activePolling);
    document.getElementById('qris-modal').classList.add('hidden');
};

window.execWD = async () => {
    const amt = document.getElementById('wd-amt').value;
    const num = document.getElementById('wd-num').value;
    const method = document.getElementById('wd-method').value;
    
    if(window.currentUser.balance < amt || amt < 10000) {
        return showModal("GAGAL", "Saldo tidak mencukupi atau nominal di bawah batas minimum.");
    }
    
    const newBal = window.currentUser.balance - amt;
    await window.update(window.ref(window.db, 'users/' + window.currentUser.uid), { balance: newBal });
    
    const msg = `<b>REQUEST PENARIKAN</b>\n\nUsername : ${window.currentUser.username}\nNominal  : RP ${amt}\nMetode   : ${method}\nNomor    : ${num}`;
    sendNotification(msg);
    
    showModal("DIPROSES", "Permintaan penarikan dana anda telah diterima dan sedang diproses admin.");
    setTimeout(() => location.reload(), 3000);
};

window.reportUser = () => {
    showModal("LAPOR", "Jelaskan detail kendala anda kepada tim administrasi.", true, (q) => {
        if(q) {
            sendNotification(`<b>LAPORAN PENGGUNA</b>\n\nUsername : ${window.currentUser.username}\nKontak   : ${window.currentUser.wa}\nPesan    : ${q}`);
            showModal("TERKIRIM", "Laporan anda telah berhasil dikirim.");
        }
    });
};
