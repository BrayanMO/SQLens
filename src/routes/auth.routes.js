const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required'
    });
  }

  // Compare with the APP_PASSWORD environment variable
  if (password === process.env.APP_PASSWORD) {
    // Sign a new JWT token
    const token = jwt.sign(
      { role: 'admin' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '12h' } // Token valid for 12 hours
    );

    return res.json({
      success: true,
      data: {
        token
      }
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid password'
  });
});

// Endpoint to verify if token is still valid (useful for frontend initialization)
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET);
    
    return res.json({ success: true, valid: true });
  } catch (err) {
    return res.status(401).json({ success: false, valid: false });
  }
});

module.exports = router;
