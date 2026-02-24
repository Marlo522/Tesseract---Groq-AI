const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const supabase = require('../config/supabase');
const authMw   = require('../middleware/auth');

const router = express.Router();

/* ─── REGISTER ─────────────────────────────────────────── */
router.post('/register', async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).single();

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password: hashedPassword, full_name })
      .select('id, email, full_name, role')
      .single();

    if (error) throw error;

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });

  } catch (err) {
    console.error('Registration error:', err);
    console.error('Error details:', err.message, err.stack);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

/* ─── LOGIN ────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Don't send hashed password back
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

/* ─── ME (get current user) ────────────────────────────── */
router.get('/me', authMw, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at')
    .eq('id', req.user.id)
    .single();

  res.json({ user });
});

module.exports = router;