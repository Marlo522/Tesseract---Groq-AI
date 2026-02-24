const express    = require('express');
const cors       = require('cors');
const dotenv     = require('dotenv');
const path       = require('path');

dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files temporarily
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/applications', require('./routes/applications'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Start ────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));