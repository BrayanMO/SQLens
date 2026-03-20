// File: src/middleware/errorHandler.js

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error("Error encountered:", err);

  // Default error message and status code
  let statusCode = 500;
  let errorMessage = 'Internal Server Error';
  let errorDetails = null;

  // Check if it's a Joi validation error
  if (err.isJoi || err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation error';
    errorDetails = err.details ? err.details.map((d) => d.message) : err.message;
  } 
  // Custom business error structures if present
  else if (err.status) {
    statusCode = err.status;
    errorMessage = err.message || errorMessage;
    if (err.details) errorDetails = err.details;
  } 
  // Postgres unique violation
  else if (err.code === '23505') { 
    statusCode = 400;
    errorMessage = 'A record with this unique attribute already exists';
  }

  // Send the required standard response envelope
  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    ...(errorDetails && { details: errorDetails })
  });
};

module.exports = errorHandler;
