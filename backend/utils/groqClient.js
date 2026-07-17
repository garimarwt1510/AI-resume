// groqClient.js — thin wrapper around the Groq chat completions API
const axios = require('axios');
const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompt');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Sends resume text (and optional job description) to Groq and
 * returns the parsed JSON analysis object.
 */
async function analyzeWithGroq(resumeText, jobDescription) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    const err = new Error('Server is missing GROQ_API_KEY. Add it to your .env file.');
    err.status = 500;
    throw err;
  }

  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  let response;
  try {
    response = await axios.post(
      GROQ_URL,
      {
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(resumeText, jobDescription) }
        ],
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );
  } catch (error) {
    console.error('[Resuno] Groq API error:', error.response?.data || error.message);
    const err = new Error('The AI analysis service is temporarily unavailable. Please try again shortly.');
    err.status = 502;
    throw err;
  }

  const raw = response.data?.choices?.[0]?.message?.content;
  if (!raw) {
    const err = new Error('Received an empty response from the AI service.');
    err.status = 502;
    throw err;
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    const err = new Error('The AI service returned an unexpected format. Please try again.');
    err.status = 502;
    throw err;
  }
}

module.exports = { analyzeWithGroq };
