# Resuno — AI Resume Analyzer

Resuno is a full-stack AI resume analysis app. Upload a PDF or DOCX resume (with
an optional job description) and get an instant AI-generated report: resume
score, ATS compatibility score, job-match percentage, skills gap analysis,
section-by-section feedback, and actionable recommendations — downloadable as
a PDF report.

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript (no framework/build step)
- **Backend:** Node.js + Express
- **AI:** Groq API (`llama-3.3-70b-versatile` by default)
- **Resume parsing:** `pdf-parse` (PDF), `mammoth` (DOCX)

## Project Structure

```
resuno/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── routes/
│   │   └── analyze.js         # /api/analyze route
│   ├── controllers/
│   │   └── analyzeController.js
│   ├── middleware/
│   │   ├── upload.js          # multer config + file validation
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── parseResume.js     # PDF/DOCX text extraction
│   │   ├── prompt.js          # Groq system/user prompt builder
│   │   └── groqClient.js      # Groq API request wrapper
│   └── uploads/                # temp storage, auto-cleaned after each request
├── frontend/
│   └── public/
│       ├── index.html          # Home page
│       ├── analyzer.html       # Resume Analyzer page
│       ├── css/style.css
│       └── js/
│           ├── main.js         # navbar, reveal animations, FAQ, toasts
│           └── analyzer.js     # upload, API call, results, PDF export
├── .env.example
├── package.json
└── README.md
```

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and add your Groq API key:

   ```bash
   cp .env.example .env
   ```

   ```
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   PORT=5000
   MAX_UPLOAD_MB=5
   ```

   Get a free API key at [console.groq.com/keys](https://console.groq.com/keys).
   **Never commit your `.env` file** — it's already covered by `.gitignore`.

3. **Run the app**

   ```bash
   npm start        # production
   npm run dev       # with nodemon, auto-restarts on changes
   ```

4. Open **http://localhost:5000** in your browser.

## API

### `POST /api/analyze`

Multipart form data:

| Field           | Type   | Required | Notes                        |
|-----------------|--------|----------|-------------------------------|
| `resume`        | file   | yes      | PDF or DOCX, up to 5MB        |
| `jobDescription`| text   | no       | Improves match-score accuracy |

Response:

```json
{
  "success": true,
  "data": {
    "resumeScore": 82,
    "atsScore": 76,
    "matchScore": 68,
    "summary": "...",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "missingSkills": ["..."],
    "presentSkills": ["..."],
    "sections": {
      "contact": { "score": 90, "feedback": "..." },
      "summary": { "score": 70, "feedback": "..." },
      "experience": { "score": 80, "feedback": "..." },
      "education": { "score": 85, "feedback": "..." },
      "skills": { "score": 75, "feedback": "..." }
    },
    "recommendations": ["..."]
  }
}
```

Errors return `{ "success": false, "message": "..." }` with an appropriate
HTTP status code (400/413/422/429/500/502).

## Security notes

- The Groq API key lives only in `.env` on the server and is never sent to
  the frontend or included in any client-side bundle.
- Uploaded files are stored temporarily in `backend/uploads/` and deleted
  immediately after text extraction (success or failure).
- File type/size are validated both by extension/MIME type and by a hard
  5MB size limit (`multer`).
- `/api/analyze` is rate-limited (30 requests / 15 minutes / IP) to protect
  your Groq quota.
- `helmet` and `cors` are enabled on the Express app.

## Notes

- Resuno is a single Express app serving both the API and the static
  frontend — no separate frontend server or build step needed.
- The PDF report is generated entirely client-side with jsPDF from the
  already-returned analysis JSON — no extra server round-trip.
