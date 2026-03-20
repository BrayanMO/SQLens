// File: src/app.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Use lazy loading / inline requires for routes to avoid circular dependencies if they exist
const queriesRoutes = require('./routes/queries.routes');
const searchRoutes = require('./routes/search.routes');
const modulesRoutes = require('./routes/modules.routes');
const errorHandler = require('./middleware/errorHandler');
const { pool } = require('./db/pool');

const app = express();

// Security middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows inline onclick handlers required by our vanilla JS UI
}));
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(morgan('combined'));

// Rate limits to be configured in individual routes if needed
// (Limiter moved to search.routes.js for cleaner isolation)

// Health check endpoint
app.get('/health', async (req, res, next) => {
  try {
    // Check DB connectivity using the raw pool just to ensure alive
    await pool.query('SELECT 1');
    res.json({
      success: true,
      data: {
        status: 'ok',
        db: 'connected'
      }
    });
  } catch (error) {
    console.error('Health check DB error:', error);
    res.status(503).json({
      success: false,
      error: 'Service unavailable',
      details: 'Database connection failed'
    });
  }
});

// Static files for Frontend
app.use(express.static(path.join(__dirname, '../public')));

// App routing
app.use('/queries', queriesRoutes);
app.use('/modules', modulesRoutes);
app.use('/', searchRoutes);

// Global Error Handler
app.use(errorHandler);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`
  });
});

module.exports = app;
