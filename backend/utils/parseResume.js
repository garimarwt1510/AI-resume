// parseResume.js — extracts raw text from an uploaded PDF or DOCX resume
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts plain text from a resume file on disk.
 * @param {string} filePath - absolute path to the uploaded file
 * @returns {Promise<string>} extracted text
 */
async function extractResumeText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return cleanText(data.text);
    }

    if (ext === '.docx') {
      const { value } = await mammoth.extractRawText({ path: filePath });
      return cleanText(value);
    }

    const err = new Error('Unsupported file format. Please upload a PDF or DOCX file.');
    err.status = 400;
    throw err;
  } catch (error) {
    if (error.status) throw error;
    const parseErr = new Error('Could not read the uploaded resume. The file may be corrupted or unreadable.');
    parseErr.status = 422;
    throw parseErr;
  }
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Deletes a temp upload after processing, ignoring errors */
function cleanupFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) console.warn('[Resuno] Could not delete temp file:', filePath);
  });
}

module.exports = { extractResumeText, cleanupFile };
