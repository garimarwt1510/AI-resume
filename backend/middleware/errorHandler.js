// errorHandler.js — centralized Express error handler
const multer = require('multer');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[Resuno Error]', err.message);

  // Multer-specific errors (file too large, wrong type, etc.)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `File is too large. Max upload size is ${process.env.MAX_UPLOAD_MB || 5}MB.`
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  // Custom validation errors thrown in controllers/utils
  if (err.status) {
    return res.status(err.status).json({ success: false, message: err.message });
  }

  // Fallback: unexpected server error
  res.status(500).json({
    success: false,
    message: 'Something went wrong while processing your request. Please try again.'
  });
}

module.exports = errorHandler;
