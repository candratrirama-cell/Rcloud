const express = require('express');
const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update, push, set } = require('firebase/database');

const app = express();
app.use(express.json());

// CONFIG
const API_KEY = "rapay_jur337mgb";
const TELE_TOKEN = "8277517895:AAEbF7jLzgRMl8_clyuMdRkt9WK4TlQjTp8";
const TELE_CHAT_ID = "7535108414";

const firebaseConfig = {
    apiKey: "AIzaSyD1OHn2utYY881b504XEgMAwmhrglqtinQ",
    databaseURL: "https://sedabase-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sedabase"
};

const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);

// API DATA USER
app.get('/api/user-data', async (req, res) => {
    const snap = await get(ref(db, `users/${req.query.wa}`));
    res.json(snap.val() || { balance: 0 });
});

// API GEN QR
app.get('/api/gen-qr', async (req, res) => {
    try {
        const response = await axios.get(`https://bior-beta.vercel.app/api/pay?key=${API_KEY}&amt=${req.query.amt}`);
        res.json(response.data);
    } catch (e) { res.status(500).json({ success: false }); }
});

// API CHECK PAYMENT (FIX DOUBLE BUG)
app.get('/api/check-payment', async (req, res) => {
    const { trxId, wa, amt, uname } = req.query;
    try {
        const checkRef = ref(db, `processed_trxs/${trxId}`);
        const snap = await get(checkRef);
        if (snap.exists()) return res.json({ status: "Success" });

        const resp = await axios.get(`https://bior-beta.vercel.app/api/pay?key=${API_KEY}&action=check&trxId=${trxId}`);
        if (resp.data.paid || resp.data.status === "Success") {
            await set(checkRef, { time: Date.now() }); // Lock ID

            const userRef = ref(db, `users/${wa}`);
            const uSnap = await get(userRef);
            const d = uSnap.val() || { balance: 0 };

            await update(userRef, {
                balance: Number(d.balance) + Number(amt),
                total_in: Number(d.total_in || 0) + Number(amt)
            });

            await push(ref(db, `users/${wa}/riwayat`), { type: 'TOPUP QRIS', amt: Number(amt), time: Date.now() });
            
            await axios.post(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
                chat_id: TELE_CHAT_ID,
                text: `✅ *TOPUP BERHASIL*\n\n👤 User: ${uname}\n💰 Rp ${Number(amt).toLocaleString()}\n🆔 Inv: ${trxId}`,
                parse_mode: "Markdown"
            });
            return res.json({ status: "Success" });
        }
        res.json({ status: "Pending" });
    } catch (e) { res.json({ error: "System Error" }); }
});

// API WITHDRAW
app.post('/api/withdraw', async (req, res) => {
    const { wa, uname, amt, wallet, targetNumber } = req.body;
    const userRef = ref(db, `users/${wa}`);
    const snap = await get(userRef);
    const d = snap.val();

    if (!d || d.balance < amt) return res.json({ success: false, msg: "Saldo Kurang" });

    await update(userRef, { balance: d.balance - amt, total_out: (d.total_out || 0) + Number(amt) });
    await push(ref(db, `users/${wa}/riwayat`), { type: `WD ${wallet}`, amt: amt, time: Date.now() });

    const msg = `⚠️ *REQUEST WD*\n\n👤 User: ${uname}\n💸 Rp ${Number(amt).toLocaleString()}\n💳 Ke: ${wallet}\n🎯 No: ${targetNumber}\n🕒 Estimasi: 120 Jam`;
    await axios.post(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, { chat_id: TELE_CHAT_ID, text: msg, parse_mode: "Markdown" });

    res.json({ success: true });
});

module.exports = app;
