const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- KONFIGURASI SENSITIF ---
const TELE_TOKEN = "8277517895:AAEbF7jLzgRMl8_clyuMdRkt9WK4TlQjTp8";
const TELE_CHAT_ID = "7535108414";
const QRIS_API_KEY = "rapay_jur337mgb";
const QRIS_BASE_URL = "https://bior-beta.vercel.app/api/pay";

// Endpoint untuk kirim Notifikasi Telegram
app.post('/api/tele-notif', async (req, res) => {
    const { message } = req.body;
    try {
        await axios.post(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            chat_id: TELE_CHAT_ID,
            text: message,
            parse_mode: "Markdown"
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Gagal kirim Telegram" });
    }
});

// Endpoint untuk Generate QRIS
app.get('/api/generate-qris', async (req, res) => {
    const { amt } = req.query;
    try {
        const response = await axios.get(`${QRIS_BASE_URL}?key=${QRIS_API_KEY}&amt=${amt}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Gagal generate QRIS" });
    }
});

// Endpoint untuk Check Status Pembayaran
app.get('/api/check-qris', async (req, res) => {
    const { trxId } = req.query;
    try {
        const response = await axios.get(`${QRIS_BASE_URL}?key=${QRIS_API_KEY}&action=check&trxId=${trxId}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Gagal check status" });
    }
});

module.exports = app;
