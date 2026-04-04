const express = require('express');
const axios = require('axios');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();

app.use(cors());
app.use(express.json());

// --- FIREBASE ADMIN CONFIG ---
if (!admin.apps.length) {
    admin.initializeApp({
        databaseURL: "https://sedabase-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
}
const db = admin.database();

// --- CONFIGURATION ---
const TELE_TOKEN = "8277517895:AAEbF7jLzgRMl8_clyuMdRkt9WK4TlQjTp8";
const TELE_CHAT_ID = "7535108414";
const QRIS_API_KEY = "rapay_jur337mgb";
const QRIS_BASE_URL = "https://bior-beta.vercel.app/api/pay";

app.get('/api/generate-qris', async (req, res) => {
    const { amt } = req.query;
    try {
        const response = await axios.get(`${QRIS_BASE_URL}?key=${QRIS_API_KEY}&amt=${amt}`);
        res.json(response.data);
    } catch (error) { res.status(500).json({ error: "QRIS Error" }); }
});

app.get('/api/check-qris', async (req, res) => {
    const { trxId } = req.query;
    try {
        // LOCK LEVEL 1: Cek apakah ID sudah sukses di database
        const lockRef = db.ref(`processed_trxs/${trxId}`);
        const snapshot = await lockRef.once('value');
        
        if (snapshot.exists()) {
            return res.json({ paid: false, status: "ALREADY_PROCESSED" });
        }

        // Cek ke API Bior
        const response = await axios.get(`${QRIS_BASE_URL}?key=${QRIS_API_KEY}&action=check&trxId=${trxId}`);
        const data = response.data;
        
        // Kirim flag isFirstValid jika benar-benar sukses dan belum pernah diproses
        if (data.paid || data.status === "Success") {
            return res.json({ ...data, isFirstValid: true });
        }
        res.json(data);
    } catch (error) { res.status(500).json({ error: "Check Error" }); }
});

app.post('/api/tele-notif', async (req, res) => {
    const { message } = req.body;
    try {
        await axios.post(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            chat_id: TELE_CHAT_ID, text: message, parse_mode: "Markdown"
        });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Tele Error" }); }
});

module.exports = app;
