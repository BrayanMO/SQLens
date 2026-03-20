// File: src/routes/search.routes.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const rateLimit = require('express-rate-limit');

// Rate limiting for /smart-search (max 30 requests/minute per IP)
const smartSearchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per window
  message: {
    success: false,
    error: 'Too many requests to smart-search from this IP, please try again after a minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/search', searchController.search);
router.post('/smart-search', searchController.smartSearch);
router.post('/generate-metadata', searchController.generateMetadata);
router.post('/chat', searchController.chat);
router.post('/suggest-module-metadata', searchController.suggestMetadata);

module.exports = router;
