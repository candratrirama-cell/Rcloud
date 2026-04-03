const axios = require('axios');

export default async function handler(req, res) {
    // ⚠️ GANTI LINK INI SETIAP KALI RESTART CLOUDFLARED DI TERMUX
    const TUNNEL_URL = "https://rated-livecam-visible-rooms.trycloudflare.com";

    // --- PENGATURAN IZIN (CORS) ---
    // Agar APK Sketchware tidak kena blokir saat kirim data
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Respon cepat untuk cek koneksi (Preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // --- PROSES DATA (POST) ---
    if (req.method === 'POST') {
        try {
            // Meneruskan request dari Sketchware ke Termux
            // req.url akan otomatis berisi /api/generate-qris atau /api/withdraw
            const response = await axios.post(`${TUNNEL_URL}${req.url}`, req.body, {
                timeout: 10000 // Maksimal nunggu 10 detik
            });
            
            // Kirim balik jawaban dari Termux ke APK Sketchware
            return res.status(200).json(response.data);
        } catch (error) {
            console.error("Tunnel Error:", error.message);
            return res.status(500).json({ 
                success: false, 
                error: "Termux Offline",
                message: "Pastikan cloudflared di Termux sedang berjalan!" 
            });
        }
    } 

    // --- TAMPILAN DI BROWSER (GET) ---
    else {
        return res.status(200).send(`
            <body style="background:#000;color:#0f0;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="border:2px solid #0f0;padding:30px;box-shadow:8px 8px 0px #0f0;text-align:center;">
                    <h1 style="margin:0;">GoR 1.1 BRIDGE</h1>
                    <p style="color:#fff;">STATUS: ONLINE</p>
                    <hr border="1" style="border-color:#0f0;">
                    <p>Targeting Tunnel:<br><small style="color:#aaa;">${TUNNEL_URL}</small></p>
                    <p style="font-size:12px;">Waiting for Sketchware Requests...</p>
                </div>
            </body>
        `);
    }
}
