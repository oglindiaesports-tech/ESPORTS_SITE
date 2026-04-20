require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Health check (for Railway)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ✅ Database init
(async () => {
  try {
    await db.ensureTables();
    console.log('✅ Database ready');
  } catch (err) {
    console.error('❌ DB error:', err);
  }
})();

// ❌ REMOVE old "/" sendFile
// ✅ Instead redirect to static file
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// ================= API ROUTES =================

app.post('/api/register', async (req, res) => {
  try {
    const { teamName, captainIgn, player2Ign, player3Ign, player4Ign, player5Ign, contactNumber } = req.body;

    if (!teamName || !captainIgn || !contactNumber) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    const { teamId, uniqueCode } = await db.createTeam({
      teamName, captainIgn, player2Ign, player3Ign, player4Ign, player5Ign, contactNumber
    });

    res.json({ success: true, teamId, uniqueCode });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/confirm-payment', async (req, res) => {
  try {
    const { teamId } = req.body;
    const result = await db.confirmPayment(teamId);
    res.json({ success: true, uniqueCode: result.unique_code });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Confirmation failed' });
  }
});

app.get('/api/team/:code', async (req, res) => {
  try {
    const team = await db.getTeamByCode(req.params.code);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (err) {
    console.error('Fetch team error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= STATIC VIEWS =================

app.get('/payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'payment.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'success.html'));
});

// ✅ Fallback route (VERY IMPORTANT)
app.get('*', (req, res) => {
  res.redirect('/index.html');
});

// ================= START SERVER =================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
