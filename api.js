const TELE_TOKEN = "8561062391:AAEH-fRlRSDVBjROiAko30Dp24wfYxnieXk";
const TELE_ID = "7535108414";
const QRIS_KEY = "rapay_jur337mgb";

// --- CUSTOM MODAL SYSTEM ---
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

function closeModal() {
    document.getElementById('custom-modal').classList.add('hidden');
}

// --- TELEGRAM SENDER ---
async function sendBot(msg) {
    try {
        await fetch(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELE_ID, text: msg, parse_mode: 'HTML' })
        });
    } catch (e) { console.error(e); }
}

// --- APP ROUTER ---
window.router = (page) => {
    const area = document.getElementById('content-area');
    area.innerHTML = ''; // Clear

    if(page === 'home') {
        area.innerHTML = `<div class="glass-card p-8 animate__animated animate__fadeIn">
            <h3 class="font-black italic text-blue-500 mb-2">CLOUDPAY DASHBOARD</h3>
            <p class="text-[10px] text-gray-500 uppercase tracking-widest leading-loose">Sistem gateway pembayaran otomatis sedang berjalan. Semua transaksi dipantau secara realtime oleh sistem keamanan.</p>
        </div>`;
    }
    if(page === 'withdraw') {
        area.innerHTML = `
            <div class="glass-card p-8 animate__animated animate__fadeInUp">
                <h3 class="font-black italic text-red-500 mb-6 uppercase tracking-tighter">TARIK SALDO</h3>
                <div class="space-y-4">
                    <select id="wd-method" class="input-field text-[10px] font-black uppercase tracking-widest"><option>GOPAY</option><option>DANA</option></select>
                    <input id="wd-num" type="number" placeholder="NOMOR E-WALLET" class="input-field text-[10px] font-bold">
                    <input id="wd-amt" type="number" placeholder="NOMINAL (MIN 10000)" class="input-field text-[10px] font-bold">
                    <div class="p-4 bg-slate-900/50 rounded-xl mb-2">
                        <p class="text-[9px] text-gray-500">BIAYA ADMIN: RP 1.000</p>
                    </div>
                    <button onclick="execWD()" class="btn-primary w-full py-4 text-[10px] italic tracking-widest">KONFIRMASI PENARIKAN</button>
                </div>
            </div>`;
    }
    if(page === 'qris') {
        showModal("DEPOSIT SALDO", "Masukkan jumlah saldo yang ingin anda tambahkan. Minimal pengisian adalah 100.", true, (val) => {
            if(val >= 100) createQR(val);
            else showModal("GAGAL", "Nominal tidak memenuhi syarat minimal.");
        });
    }
    if(page === 'about') {
        area.innerHTML = `
            <div class="glass-card p-10 text-center animate__animated animate__fadeIn">
                <h2 class="font-black italic text-2xl tracking-tighter mb-1">CLOUDPAY V1.2.9</h2>
                <p class="text-[9px] text-gray-600 uppercase tracking-[0.3em] mb-8">Digital Assets Management</p>
                <div class="space-y-3 mb-8">
                    <div class="bg-slate-900 p-4 rounded-2xl border border-white/5">
                        <p class="text-[8px] text-gray-500 font-black mb-1">ADMIN WHATSAPP</p>
                        <p class="text-xs font-bold tracking-widest">6285702366134</p>
                    </div>
                </div>
                <button onclick="reportUser()" class="text-blue-500 text-[9px] font-black underline tracking-widest uppercase">LAPOR KENDALA</button>
            </div>`;
    }
};

// --- TRANSACTION LOGIC ---
async function createQR(amt) {
    const res = await fetch(`https://bior-beta.vercel.app/api/pay?key=${QRIS_KEY}&amt=${amt}`);
    const data = await res.json();
    if(data.success) {
        document.getElementById('qr-display').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?data=${data.qr}" class="w-44 h-44 rounded-2xl shadow-xl">`;
        document.getElementById('qris-modal').classList.remove('hidden');
        startCheck(data.trxId, amt);
    }
}

function startCheck(id, amt) {
    const i = setInterval(async () => {
        const res = await fetch(`https://bior-beta.vercel.app/api/pay?action=check&trxId=${id}`);
        const d = await res.json();
        if(d.paid) {
            clearInterval(i);
            const trxRef = window.ref(window.db, 'transactions/' + id);
            const check = await window.get(trxRef);
            if(!check.exists()) {
                const newBal = window.currentUser.balance + parseInt(amt);
                await window.update(window.ref(window.db, 'users/' + window.currentUser.uid), { balance: newBal });
                await window.set(trxRef, { status: 'PAID' });
                sendBot(`<b>TRANSAKSI BERHASIL</b>\nUsername: ${window.currentUser.username}\nNominal: ${amt}\nInv: ${id}`);
                showModal("SUKSES", "Pembayaran terverifikasi. Saldo telah ditambahkan.");
                setTimeout(() => location.reload(), 2500);
            }
        }
    }, 4000);
    window.currentInterval = i;
}

window.closeQRIS = () => {
    clearInterval(window.currentInterval);
    document.getElementById('qris-modal').classList.add('hidden');
};

window.execWD = async () => {
    const amt = document.getElementById('wd-amt').value;
    const num = document.getElementById('wd-num').value;
    const method = document.getElementById('wd-method').value;
    if(window.currentUser.balance < amt || amt < 10000) return showModal("GAGAL", "Saldo anda tidak mencukupi atau nominal dibawah minimal.");
    
    const newBal = window.currentUser.balance - amt;
    await window.update(window.ref(window.db, 'users/' + window.currentUser.uid), { balance: newBal });
    sendBot(`<b>REQUEST WITHDRAW</b>\nUser: ${window.currentUser.username}\nNominal: ${amt}\nMethod: ${method}\nTarget: ${num}`);
    showModal("PROSES", "Permintaan penarikan saldo telah dikirim ke sistem admin.");
    setTimeout(() => location.reload(), 2500);
};

window.reportUser = () => {
    showModal("LAPORAN", "Tuliskan kendala teknis yang anda alami.", true, (q) => {
        if(q) {
            sendBot(`<b>REPORT USER</b>\nUser: ${window.currentUser.username}\nWA: ${window.currentUser.wa}\nPesan: ${q}`);
            showModal("TERKIRIM", "Laporan anda telah kami terima.");
        }
    });
};
