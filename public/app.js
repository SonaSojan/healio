let S = { role: null, id: null, email: null, ageGroup: null, selDoc: null, activeCase: null, loggedDoc: null };
let _previewId = 'HLO-' + Math.floor(1000 + Math.random() * 9000);

// --- NEW VARIABLES FOR NOTIFICATIONS ---
let currentMsgCount = 0; 
let pollInterval = null;

// Navigation
function gotoPage(id) {
    const landingPages = ['home-page', 'user-signup', 'user-login', 'doctor-login', 'yoga-page', 'counselling-page', 'payment-page'];
    if (landingPages.includes(id)) document.getElementById('app').style.display = 'none';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const t = document.getElementById(id);
    if (t) { t.classList.add('active'); window.scrollTo(0, 0); }
}

function scrollTo2(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Launching App & Fetching Fresh Data
async function launchApp() {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('app').style.display = 'flex'; 

    if (S.role === 'user') {
        const res = await fetch(`/api/patient/${S.id}`);
        const u = await res.json();
        
        document.getElementById('ib-id-txt').textContent = S.id;
        document.getElementById('age-display-span').textContent = S.ageGroup || '18-24';
        document.getElementById('dash-id-val').textContent = S.id;
        
        document.getElementById('tab-doc-dash').classList.add('hidden');
        document.getElementById('tab-dashboard').classList.remove('hidden');
        document.getElementById('doc-profile-badge').classList.add('hidden');
        document.getElementById('id-badge').classList.remove('hidden');
        
        if (u.doc) {
            document.querySelectorAll('.doc-card').forEach(c => {
                c.classList.toggle('sel', c.querySelector('.dc-name').textContent === u.doc);
            });
        }

        // --- TRACK MESSAGES AND START POLLING ---
        currentMsgCount = u.msgs ? u.msgs.length : 0;
        startMessagePolling();

        checkEmergencyAlert(u);
        renderPatientChat(u);
        toast('🛡️ Welcome back! ID: ' + S.id);
    } 
    else if (S.role === 'doctor') {
        document.getElementById('tab-dashboard').classList.add('hidden');
        document.getElementById('tab-doc-dash').classList.remove('hidden');
        document.getElementById('id-badge').classList.add('hidden');
        document.getElementById('doc-profile-badge').classList.remove('hidden');
        
        document.getElementById('dt-ava-txt').textContent = S.loggedDoc.ava;
        document.getElementById('dt-name-txt').textContent = S.loggedDoc.name;
        document.getElementById('dt-role-txt').textContent = S.loggedDoc.spec;

        S.activeCase = null; 
        await renderCaseList();
        renderDocChat();
        toast('🩺 Welcome to the portal, ' + S.loggedDoc.name);
    }
}

// --- NEW POLLING FUNCTION ---
function startMessagePolling() {
    if (pollInterval) clearInterval(pollInterval);
    
    // Check the server every 3 seconds for new messages
    pollInterval = setInterval(async () => {
        if (S.role !== 'user' || !S.id) return;
        
        try {
            const res = await fetch(`/api/patient/${S.id}`);
            if (res.ok) {
                const u = await res.json();
                
                // If there are more messages now than we had before
                if (u.msgs && u.msgs.length > currentMsgCount) {
                    const lastMsg = u.msgs[u.msgs.length - 1];
                    
                    // If the last message was from the doctor, trigger notification!
                    if (lastMsg.sender === 'doctor') {
                        toast('💬 New reply from ' + (u.doc || 'your Doctor') + '!');
                    }
                    
                    currentMsgCount = u.msgs.length;
                    renderPatientChat(u); // Auto-update the chat box
                    checkEmergencyAlert(u); // Auto-update emergency alerts
                }
            }
        } catch (e) {
            console.log("Polling error:", e);
        }
    }, 3000);
}

// Auth & Payment
async function doSignup() {
    const age = document.getElementById('sel-age').value;
    const email = document.getElementById('su-email').value;
    const pass = document.getElementById('su-pass').value;
    const pass2 = document.getElementById('su-pass2').value;

    if (!age || !email || !pass) return toast('Please fill all info');
    if (pass !== pass2) return toast('Passwords do not match');

    const res = await fetch('/api/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: _previewId, email, pass, ageGroup: age })
    });

    if (res.ok) {
        S = { role: 'user', id: _previewId, ageGroup: age, email: email };
        toast('✅ Account created successfully!');
        setTimeout(() => gotoPage('payment-page'), 500); 
    } else {
        toast('Email already registered.');
    }
}

async function doLogin() {
    const email = document.getElementById('li-email').value;
    const pass = document.getElementById('li-pass').value;
    if (!email || !pass) return toast('Please enter email and password');

    const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pass })
    });

    if (res.ok) {
        const u = await res.json();
        S = { role: 'user', id: u.id, ageGroup: u.ageGroup, email: u.email };
        gotoPage('payment-page');
    } else {
        toast('Invalid email or password');
    }
}

async function doDocLogin() {
    const user = document.getElementById('dl-user').value.trim();
    const pass = document.getElementById('dl-pass').value;
    if (!user || !pass) return toast('Please enter username and password');

    const res = await fetch('/api/doc-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass })
    });

    if (res.ok) {
        S.role = 'doctor';
        S.loggedDoc = await res.json();
        launchApp();
    } else {
        toast('Invalid doctor credentials');
    }
}

function doPayment() {
    toast('✅ Payment successful!');
    setTimeout(() => launchApp(), 1000);
}

function logout() {
    // Stop polling when logged out
    if (pollInterval) clearInterval(pollInterval);
    
    S = { role: null, id: null, email: null, ageGroup: null, selDoc: null, activeCase: null, loggedDoc: null };
    document.querySelectorAll('.fi-inp').forEach(i => i.value = '');
    gotoPage('home-page');
    toast('Logged out successfully');
}

// Patient Functions
function selectDoctor(el) {
    document.querySelectorAll('.doc-card').forEach(c => c.classList.remove('sel'));
    el.classList.add('sel');
    S.selDoc = el.querySelector('.dc-name').textContent;
}

async function sendPatientReport() {
    if (!S.selDoc) return toast('Please select a doctor first.');
    const symp = document.getElementById('pat-symptoms').value.trim();
    const context = document.getElementById('pat-context').value.trim();
    if (!symp) return toast('Please describe your symptoms.');

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgObj = { sender: 'user', text: symp + (context ? `\n\nContext: ${context}` : ''), time: timeStr };

    const res = await fetch(`/api/patient/${S.id}/message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docName: S.selDoc, msg: msgObj })
    });

    if (res.ok) {
        const u = await res.json();
        currentMsgCount = u.msgs.length; // Update count so it doesn't trigger our own notification
        document.getElementById('pat-symptoms').value = '';
        document.getElementById('pat-context').value = '';
        toast('Report sent securely');
        renderPatientChat(u);
    }
}

async function sendPatientMessage() {
    if (!S.selDoc) return toast('Please select a doctor first.');
    const inp = document.getElementById('pat-chat-input');
    if (!inp.value.trim()) return;

    const msgObj = { sender: 'user', text: inp.value.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    
    const res = await fetch(`/api/patient/${S.id}/message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docName: S.selDoc, msg: msgObj })
    });

    if (res.ok) {
        const u = await res.json();
        currentMsgCount = u.msgs.length; // Update count
        inp.value = '';
        renderPatientChat(u);
    }
}

function renderPatientChat(u) {
    let box = document.getElementById('chat-box');
    if (!u.msgs || u.msgs.length === 0) {
        box.innerHTML = `<div class="chat-empty"><div class="chat-empty-icon">💬</div><div>No messages yet.<br>Select a doctor and send your first report above.</div></div>`;
        return;
    }

    box.innerHTML = u.msgs.map(m => `
        <div class="cmsg ${m.sender === 'user' ? 'user' : 'doctor'}">
            <div class="cava">${m.sender === 'user' ? 'U' : '👨‍⚕️'}</div>
            <div class="cbwrap">
                <div class="csender">${m.sender === 'user' ? 'You' : (u.doc || 'Doctor')}</div>
                <div class="cbub">${m.text.replace(/\n/g, '<br>')}</div>
                <div class="cmeta">${m.time}</div>
            </div>
        </div>`).join('');
    box.scrollTop = box.scrollHeight;
}

function checkEmergencyAlert(u) {
    let container = document.getElementById('patient-emergency-container');
    container.innerHTML = u.isEmergency ? `
        <div class="emg-alert fade-in">
            <div class="ei">🚨</div>
            <div>
                <div class="etit">Emergency Alert Triggered</div>
                <div class="etxt">Your doctor flagged your case as critical. Seek immediate medical assistance.</div>
            </div>
            <button class="eclose" onclick="this.parentElement.remove()">✖</button>
        </div>` : '';
}

// Doctor Functions
async function renderCaseList() {
    const res = await fetch('/api/doctor/cases');
    const cases = await res.json();
    document.getElementById('doc-cases-count').textContent = cases.length + ' Cases';

    document.getElementById('doc-case-list').innerHTML = cases.reverse().map(c => {
        const lastMsg = c.msgs[c.msgs.length - 1];
        const sevIcon = c.severity === 'Severe' ? '🔴' : c.severity === 'Mild' ? '🟢' : '🟠';
        return `
        <div class="ci ${S.activeCase === c.id ? 'active' : ''}" onclick="openDocCase('${c.id}')">
          <div class="ci-top">
            <div class="ci-id">${c.id}</div>
            <div class="badge ${c.badge}">${sevIcon} ${c.severity}</div>
          </div>
          <div class="ci-snip">${lastMsg.text}</div>
          <div class="ci-time">⏱ ${lastMsg.time}</div>
        </div>`;
    }).join('');
}

async function openDocCase(id) {
    S.activeCase = id;
    await renderCaseList();
    renderDocChat();
}

async function renderDocChat() {
    let pane = document.getElementById('doc-right-pane');
    if (!S.activeCase) {
        pane.style.justifyContent = 'center';
        pane.innerHTML = `<div class="no-case"><div class="nc-icon">📋</div><div class="nc-title">No case selected</div><div style="font-size:13px;color:var(--tm)">Click a case to review and respond</div></div>`;
        return;
    }

    const res = await fetch(`/api/patient/${S.activeCase}`);
    const c = await res.json();

    pane.style.justifyContent = 'flex-start';
    const msgsHtml = c.msgs.map(m => `
        <div class="cmsg ${m.sender === 'doctor' ? 'user' : 'doctor'}">
            <div class="cava">${m.sender === 'doctor' ? '👨‍⚕️' : 'U'}</div>
            <div class="cbwrap">
                <div class="csender">${m.sender === 'doctor' ? 'You' : 'Patient ' + c.id}</div>
                <div class="cbub">${m.text.replace(/\n/g, '<br>')}</div>
                <div class="cmeta">${m.time}</div>
            </div>
        </div>`).join('');

    pane.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--bdl); padding-bottom:12px; width: 100%;">
        <div style="font-family:'Sora',sans-serif; font-weight:700; color:var(--t); font-size:16px;">Chat with ${c.id}</div>
        <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-sm" style="background: ${c.isEmergency ? 'var(--er)' : 'var(--w)'}; color: ${c.isEmergency ? '#fff' : 'var(--er)'}; border: 1px solid var(--er);" onclick="toggleEmergency('${c.id}')">
                ${c.isEmergency ? '🚨 Emergency Active' : '🚨 Mark Emergency'}
            </button>
            <div class="badge ${c.badge}">${c.severity}</div>
        </div>
      </div>
      <div class="chat-wrap" style="width: 100%;">
        <div class="chat-box" id="doc-chat-box">${msgsHtml}</div>
        <div class="chat-input-row">
          <textarea class="fta" id="doc-chat-input" placeholder="Type a clinical response..."></textarea>
          <button class="btn btn-p" onclick="sendDocMessage()">Send</button>
        </div>
      </div>`;
    document.getElementById('doc-chat-box').scrollTop = document.getElementById('doc-chat-box').scrollHeight;
}

async function sendDocMessage() {
    const inp = document.getElementById('doc-chat-input');
    if (!inp.value.trim() || !S.activeCase) return;

    const msgObj = { sender: 'doctor', text: inp.value.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    await fetch(`/api/doctor/${S.activeCase}/message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msg: msgObj })
    });

    inp.value = '';
    renderDocChat();
    renderCaseList();
}

async function toggleEmergency(id) {
    const res = await fetch(`/api/doctor/${id}/emergency`, { method: 'POST' });
    if (res.ok) {
        const data = await res.json();
        toast(data.isEmergency ? 'Case marked as Emergency' : 'Emergency status revoked');
        renderDocChat();
    }
}

function selAge(el) {
    document.querySelectorAll('.age-opt').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('sel-age').value = el.dataset.age;
}
function selPlan(el, type) {
    if (type === 'advanced') return toast('Advanced plan is currently unavailable.');
    document.querySelectorAll('.pay-plan').forEach(p => p.classList.remove('sel-plan'));
    el.classList.add('sel-plan');
}
function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('preview-anon-id').textContent = _previewId;
});