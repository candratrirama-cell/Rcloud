const axios = require('axios');

export default async function handler(req, res) {
    // GANTI INI dengan URL Cloudflare dari Termux kamu!
    const TUNNEL_URL = "https://rated-livecam-visible-rooms.trycloudflare.com";

    if (req.method === 'POST') {
        try {
            // Meneruskan data dari Webview ke Bot di Termux
            const response = await axios.post(`${TUNNEL_URL}/api/withdraw`, req.body);
            return res.status(200).json(response.data);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ 
                error: "Termux Offline", 
                message: "Pastikan cloudflared di Termux sedang berjalan!" 
            });
        }
    } else {
        res.status(405).json({ error: "Method Not Allowed" });
    }
}
