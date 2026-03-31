const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serves the frontend files

// --- MOCK DATABASE ---
let USERS = [
    { id: 'HLO-1234', email: 'demo@healio.com', pass: 'test123', ageGroup: '25–34', doc: null, msgs: [], isEmergency: false },
    { id: 'HLO-7741', email: '1@mock.com', pass: '1', ageGroup: '18-24', doc: 'Dr. Arjun Mehta', severity: 'Severe', badge: 'bs', isEmergency: false,
      msgs: [{sender:'user', text:'Severe tremors, profuse sweating, unable to sleep for 48 hours, heart palpitations.', time:'2 mins ago'}] },
    { id: 'HLO-7739', email: '2@mock.com', pass: '1', ageGroup: '25-34', doc: 'Dr. Priya Nair', severity: 'Moderate', badge: 'bm', isEmergency: false,
      msgs: [{sender:'user', text:'Persistent headache, mild nausea, waves of anxiety, occasional cold sweats.', time:'18 mins ago'}] },
    { id: 'HLO-7735', email: '3@mock.com', pass: '1', ageGroup: '18-24', doc: 'Dr. Rajesh Kumar', severity: 'Mild', badge: 'bml', isEmergency: false,
      msgs: [{sender:'user', text:'Mild irritability, difficulty falling asleep, low appetite, mood changes.', time:'1 hr ago'}] },
    { id: 'HLO-7733', email: '4@mock.com', pass: '1', ageGroup: '25-34', doc: 'Dr. Sneha Thomas', severity: 'Moderate', badge: 'bm', isEmergency: false,
      msgs: [{sender:'user', text:'Intense cravings, severe muscle aches, yawning, watery eyes, goosebumps.', time:'2 hrs ago'}] }
];

const DOC_DB = {
    'arjun.mehta': { pass: 'Psych@2024', name: 'Dr. Arjun Mehta', spec: 'Psychiatrist', ava: '👨‍⚕️' },
    'priya.nair': { pass: 'Addict@2024', name: 'Dr. Priya Nair', spec: 'Addiction Specialist', ava: '👩‍⚕️' },
    'rajesh.kumar': { pass: 'Neuro@2024', name: 'Dr. Rajesh Kumar', spec: 'Neurologist', ava: '👨‍⚕️' },
    'sneha.thomas': { pass: 'Psych@2024', name: 'Dr. Sneha Thomas', spec: 'Psychologist', ava: '👩‍⚕️' },
    'vikram.rao': { pass: 'GenMed@2024', name: 'Dr. Vikram Rao', spec: 'General Medicine', ava: '👨‍⚕️' }
};

// --- API ENDPOINTS ---

// Patient Signup
app.post('/api/signup', (req, res) => {
    const { email, pass, ageGroup, id } = req.body;
    if (USERS.find(u => u.email === email)) return res.status(400).json({ error: 'Email exists' });
    const newUser = { id, email, pass, ageGroup, doc: null, msgs: [], severity: 'Moderate', badge: 'bm', isEmergency: false };
    USERS.push(newUser);
    res.json(newUser);
});

// Patient Login
app.post('/api/login', (req, res) => {
    const user = USERS.find(u => u.email === req.body.email && u.pass === req.body.pass);
    user ? res.json(user) : res.status(401).json({ error: 'Invalid credentials' });
});

// Doctor Login
app.post('/api/doc-login', (req, res) => {
    const doc = DOC_DB[req.body.user];
    (doc && doc.pass === req.body.pass) ? res.json(doc) : res.status(401).json({ error: 'Invalid credentials' });
});

// Fetch Data for Patient Dashboard
app.get('/api/patient/:id', (req, res) => {
    const user = USERS.find(u => u.id === req.params.id);
    user ? res.json(user) : res.status(404).json({ error: 'User not found' });
});

// Patient sets Doctor & sends Message
app.post('/api/patient/:id/message', (req, res) => {
    let user = USERS.find(u => u.id === req.params.id);
    if (!user) return res.status(404).send('User not found');
    user.doc = req.body.docName;
    user.msgs.push(req.body.msg);
    res.json(user);
});

// Doctor fetches all active cases
app.get('/api/doctor/cases', (req, res) => {
    res.json(USERS.filter(u => u.msgs && u.msgs.length > 0));
});

// Doctor sends Message
app.post('/api/doctor/:id/message', (req, res) => {
    let user = USERS.find(u => u.id === req.params.id);
    if (!user) return res.status(404).send('User not found');
    user.msgs.push(req.body.msg);
    res.json(user);
});

// Doctor Toggles Emergency
app.post('/api/doctor/:id/emergency', (req, res) => {
    let user = USERS.find(u => u.id === req.params.id);
    if (user) {
        user.isEmergency = !user.isEmergency;
        res.json({ isEmergency: user.isEmergency });
    } else {
        res.status(404).send('User not found');
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));