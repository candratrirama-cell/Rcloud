const TELE_TOKEN = "8561062391:AAEH-fRlRSDVBjROiAko30Dp24wfYxnieXk";
const TELE_ID = "7535108414";
const QRIS_KEY = "rapay_jur337mgb";

async function sendBot(msg) {
    await fetch(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELE_ID, text: msg, parse_mode: 'HTML' })
    });
}

window.router = (page) => {
    const area = document.getElementById('content-area');
    if(page === 'home') {
        area.innerHTML = `<div class="glass-card p-6"><h3>Selamat Datang di Cloudpay</h3><p class="text-sm text-gray-400">Gunakan navigasi bawah untuk bertransaksi.</p></div>`;
    }
    if(page === 'withdraw') {
        area.innerHTML = `
            <div class="glass-card p-6 animate__animated animate__fadeIn">
                <h3 class="font-bold mb-4">Tarik Saldo</h3>
                <select id="wd-method" class="input-field mb-3"><option>Gopay</option><option>Dana</option></select>
                <input id="wd-num" type="number" placeholder="Nomor E-Wallet" class="input-field mb-3">
                <input id="wd-amt" type="number" placeholder="Nominal (Min 10.000)" class="input-field mb-4">
                <button onclick="execWD()" class="btn-primary w-full py-3">KONFIRMASI WD</button>
            </div>`;
    }
    if(page === 'qris') {
        const amt = prompt("Nominal Topup:");
        if(amt >= 100) createQR(amt);
    }
    if(page === 'about') {
        area.innerHTML = `
            <div class="glass-card p-6 text-center">
                <h2 class="font-black">Cloudpay v1.2.9</h2>
                <p class="text-sm text-gray-400 mb-4">Sistem Pembayaran Digital Aman</p>
                <div class="bg-slate-900 p-4 rounded-2xl mb-4">
                    <p class="text-xs">Admin WA: 6285702366134</p>
                </div>
                <button onclick="reportUser()" class="text-red-400 text-sm font-bold underline">LAPOR KENDALA</button>
            </div>`;
    }
};

async function createQR(amt) {
    const res = await fetch(`https://bior-beta.vercel.app/api/pay?key=${QRIS_KEY}&amt=${amt}`);
    const data = await res.json();
    if(data.success) {
        document.getElementById('qr-display').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?data=${data.qr}" class="w-48 h-48">`;
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
                await window.set(trxRef, { status: 'OK' });
                sendBot(`✅ <b>Transaksi Berhasil!</b>\nUsername: ${window.currentUser.username}\nNominal: ${amt}\nInv: ${id}`);
                alert("Topup Berhasil!");
                location.reload();
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
    if(window.currentUser.balance < amt || amt < 10000) return alert("Saldo kurang atau min 10rb!");
    
    const newBal = window.currentUser.balance - amt;
    await window.update(window.ref(window.db, 'users/' + window.currentUser.uid), { balance: newBal });
    sendBot(`📩 <b>Request Withdraw</b>\nUser: ${window.currentUser.username}\nNominal: ${amt}\nE-Wallet: ${method} (${num})`);
    alert("Withdraw sedang diproses admin!");
    location.reload();
};

window.reportUser = () => {
    const q = prompt("Apa kendala anda?");
    if(q) sendBot(`⚠️ <b>Report User</b>\nUser: ${window.currentUser.username}\nWA: ${window.currentUser.wa}\nInfo: ${q}`);
};
