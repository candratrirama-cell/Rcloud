const { initializeApp } = require("firebase/app");
const { getDatabase, ref, onChildAdded, update, get, remove } = require("firebase/database");
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyD1OHn2utYY881b504XEgMAwmhrglqtinQ",
  authDomain: "sedabase.firebaseapp.com",
  databaseURL: "https://sedabase-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sedabase",
  storageBucket: "sedabase.firebasestorage.app",
  messagingSenderId: "921144451877",
  appId: "1:921144451877:web:f37ec5e4de4ff4fc4870cc"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const token = "8277517895:AAEbF7jLzgRMl8_clyuMdRkt9WK4TlQjTp8";
const myChatId = "7535108414";
const qrisKey = "rapay_jur337mgb";
const bot = new TelegramBot(token, { polling: true });

console.log("🚀 Bot CloudPay Berjalan di Termux...");

// --- LOGIKA GENERATE QRIS & AUTO TOPUP ---
onChildAdded(ref(db, "requests/topup"), async (snapshot) => {
    const reqId = snapshot.key;
    const { username, nominal } = snapshot.val();

    try {
        // Generate QRIS via API
        const res = await axios.get(`https://bior-beta.vercel.app/api/pay?key=${qrisKey}&amt=${nominal}`);
        
        if (res.data.success) {
            // Kirim data QR ke Firebase untuk ditampilkan di WebView
            await update(ref(db, `users/${username}`), { 
                current_qr: res.data.qr,
                current_inv: res.data.trxId 
            });

            // Cek status pembayaran otomatis
            const checkPay = setInterval(async () => {
                const check = await axios.get(`https://bior-beta.vercel.app/api/pay?action=check&trxId=${res.data.trxId}`);
                if (check.data.paid) {
                    clearInterval(checkPay);
                    
                    const userSnap = await get(ref(db, `users/${username}`));
                    const newSaldo = (userSnap.val().saldo || 0) + nominal;

                    // Update Saldo & Hapus Data QR
                    await update(ref(db, `users/${username}`), { 
                        saldo: newSaldo, 
                        current_qr: null,
                        current_inv: null 
                    });
                    await remove(ref(db, `requests/topup/${reqId}`));

                    // Kirim Notifikasi ke Telegram
                    bot.sendMessage(myChatId, `Transaksi berhasil\nUsername : ${username}\nINV : ${res.data.trxId}\nnominal : ${nominal}\nTotal saldo : ${newSaldo}\nNomor wa : ${userSnap.val().whatsapp}`);
                }
            }, 10000); // Cek tiap 10 detik
        }
    } catch (e) { console.log("Error processing Topup"); }
});

// --- LOGIKA WITHDRAW ---
onChildAdded(ref(db, "requests/withdraw"), (snapshot) => {
    const wdId = snapshot.key;
    const d = snapshot.val();
    const nominalBersih = d.nominal - 1000 + 500;

    bot.sendMessage(myChatId, `Request withdraw:\nUsername : ${d.username}\nNominal : ${nominalBersih}\nKode ID : ${wdId}\nNomor rekening : ${d.norek}\nJenis rekening : ${d.jenis}\n\nKetik .ya ${wdId} atau .no ${wdId}`);
});

// --- COMMAND ADMIN (.ya / .no) ---
bot.on("message", async (msg) => {
    const txt = msg.text;
    if (!txt) return;

    if (txt.startsWith(".ya ")) {
        const id = txt.split(" ")[1];
        bot.sendMessage(myChatId, `✅ WD ${id} Berhasil dikirim!`);
    }

    if (txt.startsWith(".no ")) {
        const id = txt.split(" ")[1];
        const snap = await get(ref(db, `requests/withdraw/${id}`));
        if (snap.exists()) {
            const d = snap.val();
            const uSnap = await get(ref(db, `users/${d.username}`));
            await update(ref(db, `users/${d.username}`), { saldo: uSnap.val().saldo + d.nominal });
            await remove(ref(db, `requests/withdraw/${id}`));
            bot.sendMessage(myChatId, `❌ WD ${id} Refunded ke ${d.username}`);
        }
    }
});
