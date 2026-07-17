// analyze.js — API routes for the resume analyzer
const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload');
const { analyzeResume } = require('../controllers/analyzeController');

// POST /api/analyze  — multipart form: "resume" (file), "jobDescription" (text, optional)
router.post('/analyze', upload.single('resume'), analyzeResume);

module.exports = router;
