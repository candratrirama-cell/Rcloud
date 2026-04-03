const axios = require('axios');

export default async function handler(req, res) {
    // GANTI LINK INI SETIAP KALI RESTART CLOUDFLARED DI TERMUX
    const TUNNEL_URL = "https://rated-livecam-visible-rooms.trycloudflare.com";

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        try {
            const response = await axios.post(`${TUNNEL_URL}${req.url}`, req.body);
            return res.status(200).json(response.data);
        } catch (error) {
            return res.status(500).json({ error: "Termux Offline" });
        }
    } else {
        return res.status(200).send("<h1>Bridge GoR 1.1 Aktif!</h1>");
    }
}
