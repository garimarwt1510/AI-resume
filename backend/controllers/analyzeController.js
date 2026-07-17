// analyzeController.js — orchestrates parsing + AI analysis for uploaded resumes
const { extractResumeText, cleanupFile } = require('../utils/parseResume');
const { analyzeWithGroq } = require('../utils/groqClient');

const MIN_RESUME_CHARS = 100;

async function analyzeResume(req, res, next) {
  const file = req.file;

  try {
    if (!file) {
      const err = new Error('Please upload a resume file (PDF or DOCX).');
      err.status = 400;
      throw err;
    }

    const jobDescription = (req.body.jobDescription || '').slice(0, 6000);

    const resumeText = await extractResumeText(file.path);

    if (!resumeText || resumeText.length < MIN_RESUME_CHARS) {
      const err = new Error('We could not extract enough readable text from this file. Try a different resume file.');
      err.status = 422;
      throw err;
    }

    // Cap resume text sent to the model to keep requests fast and cheap
    const trimmedText = resumeText.slice(0, 12000);

    const analysis = await analyzeWithGroq(trimmedText, jobDescription);

    cleanupFile(file.path);

    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    if (file) cleanupFile(file.path);
    return next(error);
  }
}

module.exports = { analyzeResume };
