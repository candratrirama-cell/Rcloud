import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyD2QWMBdq_NtNZZSoLzV4QmR4__075p5Gs",
    authDomain: "paybase-1abbd.firebaseapp.com",
    databaseURL: "https://paybase-1abbd-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "paybase-1abbd"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.db = db; // Export ke global untuk api.js
window.ref = ref;
window.set = set;
window.get = get;
window.update = update;

// Logic Session
let user = JSON.parse(localStorage.getItem('cp_session'));
if(user) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').classList.remove('hidden');
    initDashboard(user);
}

window.handleAuth = async () => {
    const username = document.getElementById('reg-user').value.toLowerCase();
    const wa = document.getElementById('reg-wa').value;
    const pass = document.getElementById('reg-pass').value;

    if(!username || !wa || !pass) return alert("Lengkapi data!");

    const userRef = ref(db, 'usernames/' + username);
    const snap = await get(userRef);

    if(snap.exists()) {
        const userData = (await get(ref(db, 'users/' + snap.val()))).val();
        if(userData.password === pass) {
            localStorage.setItem('cp_session', JSON.stringify(userData));
            location.reload();
        } else { alert("Password salah!"); }
    } else {
        const uid = Date.now();
        const newData = { uid, username, wa, password: pass, balance: 0 };
        await set(ref(db, 'users/' + uid), newData);
        await set(ref(db, 'usernames/' + username), uid);
        localStorage.setItem('cp_session', JSON.stringify(newData));
        location.reload();
    }
};

function initDashboard(user) {
    document.getElementById('display-user').innerText = user.username;
    onValue(ref(db, 'users/' + user.uid), (snap) => {
        const data = snap.val();
        document.getElementById('user-balance').innerText = `Rp ${data.balance.toLocaleString()}`;
        window.currentUser = data;
    });
}
