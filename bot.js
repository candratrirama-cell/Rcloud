const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Inisialisasi Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            // Masukkan serviceAccountKey kamu di sini jika diperlukan, 
            // atau gunakan databaseURL jika rules database terbuka
        }),
        databaseURL: "https://sedabase-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
}

const db = admin.database();
const API_KEY = "rapay_jur337mgb";
const BASE_URL = "https://bior-beta.vercel.app/api/pay";

// Endpoint untuk Generate QRIS
app.get('/api/deposit', async (req, res) => {
    const { user, amt } = req.query;
    try {
        const response = await fetch(`${BASE_URL}?key=${API_KEY}&amt=${amt}`);
        const data = await response.json();
        
        if(data.success) {
            res.json({ success: true, qr: data.qr, trxId: data.trxId });
            // Jalankan pengecekan otomatis di background (opsional) atau biarkan frontend memicu cek
        } else {
            res.status(400).json({ success: false });
        }
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Endpoint Cek Status & Update Saldo Otomatis
app.get('/api/check-payment', async (req, res) => {
    const { trxId, user, amt } = req.query;
    try {
        const response = await fetch(`${BASE_URL}?action=check&trxId=${trxId}`);
        const data = await response.json();

        if (data.paid) {
            const userRef = db.ref('users/' + user);
            const snapshot = await userRef.once('value');
            const currentBalance = snapshot.val().balance || 0;
            
            await userRef.update({ balance: currentBalance + parseInt(amt) });
            res.json({ paid: true, message: "Saldo berhasil ditambahkan" });
        } else {
            res.json({ paid: false });
        }
    } catch (e) {
        res.status(500).send(e.message);
    }
});

module.exports = app;
