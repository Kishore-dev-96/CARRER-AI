# CARRER-AI
AI Interview Platform —
Project:
          AI Interview Platform — an end-to-end mock interview and career-prep system with timed rounds (aptitude/verbal/reasoning, typing, coding, voice/PPT/JAM), a coding playground, resume-driven question generation, AI feedback, and a dashboard for skill tracking. Goal: Give users realistic interview practice and actionable feedback so they become job-ready.

Table of Contents
Overview
Key Features
Architecture & Data Flow
Tech Stack & APIs (what the project uses)
Getting Started (dev setup)
Environment variables (exact names to set)
Database / schema & migrations (important tables)
How the rounds work (detailed behavior)
Coding playground (behavior & Judge0 integration)
Voice, PPT & JAM (behavior & transcription flow)
Dashboard & skill tracking (auto updates)
Deployment notes (Vercel + backend best practices)
Troubleshooting (common errors you reported & fixes)
Testing & QA checklist
Security & privacy notes
Contributing & roadmap
FAQ / Known limitations
License & credits
1. Overview
This repository contains the code and assets for an AI-driven interview preparation platform that simulates realistic multi-round interviews. The system automatically generates and scores tasks, transcribes live speech, provides AI explanations and improvement suggestions, and updates a central dashboard so users can track progress over time.

2. Key Features (what the platform delivers)
Full Mock Interview Flow: Aptitude → Typing → Coding → Voice (resume-driven).
Aptitude / Verbal / Reasoning: Randomized, non-repeating question sets, immediate per-question feedback and final scoring.
Typing Test: Monkeytype-like 6-line paragraphs, real-time WPM & accuracy, scoring rules.
Coding Playground: Multi-language editor (Python/JS/Java/C++/C etc.), run + submit workflow, test cases, execution time & pass/fail breakdown.
Voice Interview / PPT / JAM: Live audio capture → transcription → AI evaluation (fluency, grammar, confidence), auto-submit rules.
AI Coach Chatbot: Practice area, explains code & aptitude solutions outside tests.
Dashboard & Skill Overview: Auto-updated after attempts, radar charts, per-round breakdowns, pass/eligibility animation for high scorers.
Resume Parsing: Extract skills and generate personalized questions for voice interview.
Non-repeating question logic: Track attempted question IDs per user to avoid repeats.
3. Architecture & Data Flow (high level)
Frontend (React + Vite + Tailwind): UI cards for each round, editor, recorder, dashboard. UI remains unchanged — new functionality plugs into existing components.

Backend (Node/Express or separate service): Orchestration endpoints for:

Judge0 proxy (submissions)
Resume parsing (PDF → JSON)
Storing submissions/results
Calling AI services (Gemini/OpenAI/Whisper/YouTube)
AI Services:

Language model for explanations, score heuristics, follow-ups.
Speech-to-text for transcription.
Database: SQLite (dev) — consider Supabase / Postgres for production to persist results.

Storage: Clerk (auth) + cloud storage or Clerk file store for resume files.

Dashboard reads consolidated results to show skill progress.

4. Tech Stack & APIs
(Use what's already in your project; listed for clarity)

Frontend: React + Vite + TypeScript + Tailwind CSS
Auth: Clerk
Code Execution: Judge0 (judge0-ce via RapidAPI) — Run & get test case output/execution time
Speech ➜ Text: OpenAI Whisper (or equivalent) / browser Web Speech API as fallback
Large Language Model: Gemini / OpenAI GPT for explanations, scoring, follow-up Qs
Video suggestions: YouTube Data API v3 (for recommended learning videos)
Resume parsing: Python script using PyMuPDF / lightweight NLP
DB: SQLite for dev; Supabase/Postgres for production recommended
Note: If you prefer only free options, consider using the free Judge0 CE endpoints, browser SpeechRecognition API, open-source Whisper locally, and Firestore for production storage.

5. Getting Started — Local Development (quick guide)
Clone repo:
git clone <your-repo-url>
cd your-repo
Install frontend dependencies:
cd frontend
npm install
(If you have a backend/API service) install backend deps:
cd ../backend
npm install
Create .env.local (see next section for exact env keys).
Start dev:
# frontend
npm run dev

# backend (if present)
npm run dev
6. Environment variables (exact names to set)
Set these locally in .env.local and in Vercel environment settings for production:

# Clerk (Auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key
CLERK_SECRET_KEY=sk_your_clerk_secret

# Gemini (Google AI) / LLM
VITE_GEMINI_API_KEY=your_gemini_or_llm_api_key

# Judge0 (compiler/uploader)
NEXT_PUBLIC_JUDGE0_API=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_judge0_rapidapi_key

# OpenAI Whisper (or OpenAI key if using whisper api)
OPENAI_API_KEY=your_openai_api_key

# YouTube Data API
YOUTUBE_API_KEY=your_youtube_api_key

# (Optional) Database URL or Supabase keys for production
DATABASE_URL=postgres://...
Important:

For Clerk use the real publishable key (not pk_test_your_clerk_key_here). If you get a Clerk error that publishable key is invalid, copy it from your Clerk dashboard and set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY properly. On Next.js, env variable naming conventions differ — ensure your runtime matches (see your framework docs).
7. Database & Migrations
Minimum tables (examples):

-- users: created by Clerk, local mirror if needed
users (id, name, email, ...)

aptitude_results (
  id, userId, questionId, selectedOption, correctOption,
  explanation, score, createdAt
)

typing_results (
  id, userId, paragraphId, wpm, accuracy, errors, time, score, createdAt
)

code_submissions (
  id, userId, questionId, language, code, output, testCaseResult,
  executionTimeMs, geminiFeedback, score, createdAt
)

voice_answers (
  id, userId, type, questionText, transcript, wordCount, aiScore, aiFeedback,
  autoSubmitted, createdAt
)

interview_sessions (
  id, userId, aptitudeScore, typingScore, codingScore, voiceScore, totalScore, passed, completedAt
)
Migration tip: If you see no such column: last_login, add the column via a SQL migration:

ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT NULL;
Or update the DB initialization script to include last_login in CREATE TABLE.

8. How rounds work — detailed behaviors
Aptitude / Verbal / Reasoning
Pool: 1000+ questions (mix of topics).
Round: each attempt randomly selects 10 unseen questions for that user.
Interaction: user selects option → clicks Check Answer (per question) → UI shows correct/incorrect + explanation (LLM-generated).
Final: user submits exam → total score stored.
Typing
Presents 6-line paragraph (varies each attempt).
Starts on first keypress.
Timer: 60s.
Live WPM & accuracy displayed. Score computed to max 20.
Coding Playground
User chooses language and problem.
Run Code: sends submission to Judge0 → returns output, status, execution time and passed test cases.
Submit: after run and acceptance you get a Submit button to lock answer; then Next Challenge becomes available.
Scoring: per test-case pass percentage and correctness.
Voice / PPT / JAM
JAM: 1 minute auto-record, auto-transcribe, auto-submit. Score by grammar/fluency/coherence.
PPT: 2–5 minutes; allow submit after 2 mins; auto-submit at 5 mins. Live transcript shown and stored (max 800 words).
Voice interview: resume parsed → 5–8 dynamic questions; LLM follow-ups based on responses; each answer transcribed & scored.
9. Coding Playground & Judge0 integration (practical notes)
Use Judge0 CE endpoint via RapidAPI or host a local Judge0 instance.

Request flow:

POST submission (source_code, language_id, stdin, expected_output if you want).
Get token → Poll or wait for wait=true to get results.
Display the stdout, stderr, time, and memory.

Test cases: keep up to 6 per question; compute test pass count and percentage.

UI behavior: do not auto-advance. Only show “Next Problem” after successful run + user clicks Submit (this matches HackerRank style).

10. Voice, PPT & JAM transcription flow & reliability
Primary: server-side Whisper or hosted speech model (good for accuracy).
Fallback: Browser Web Speech API for quick demos (less accurate, only in browsers that support it).
Live display: stream partial transcripts to the UI; buffer them and update the box. Final transcript must be saved in DB after submission/auto-submit.
Limits: JAM: ~1 min, PPT: up to 5 min, Voice Interview answers: 2–5 min per question, max 800 words saving.
Reliable UX: show friendly messages if mic permission denied. Auto-retry the transcription if transient errors happen.
11. Dashboard & Skill Overview
After each completed round, run the scoring aggregator to compute per-skill averages and totals.
Save into performance_summary table and read into the Dashboard to render charts (radar, bar).
If a user scores ≥ threshold (e.g., 270/300), show animated congratulatory UI and mark as “eligible”.
12. Deployment notes (Vercel, backend hosting, envs)
Frontend: Deploy on Vercel. Add required env vars on Vercel dashboard (same names as in .env).
Backend: If you have Python/LLM workloads or Whisper running server-side, host them on Render / Railway / Fly / Heroku — Vercel is frontend-only (unless you use serverless functions).
Database: For production use Supabase/Postgres (Vercel ephemeral storage is not permanent).
Clerk: ensure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set in Vercel envs and not only .env.local.
13. Troubleshooting — fixes for common errors you reported
1. Clerk publishable key invalid
Error: @clerk/clerk-react: The publishableKey passed to Clerk is invalid.

Fix:

Get publishable key from Clerk dashboard.
Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... in .env.local and in Vercel envs.
Restart dev server.
2. SQL: no such column: last_login
Error: no such column: last_login

Fix:

Add migration to create the column:

ALTER TABLE users ADD COLUMN last_login DATETIME;
Or update DB seed script to include this column on CREATE TABLE.

3. Vite/Babel missing semicolon / syntax error
Example: Missing semicolon. (437:1) or parse errors

Fix:

Open the reported file/line and correct the JS/TS syntax (unclosed braces, missing ;).
Run npm run lint if linter available.
4. esbuild transform error: malformed object
Example: Expected "}" but found "allScore" suggests a typo like over allScore: ...

Fix:

Locate the file & correct the object property syntax:

// wrong
{ averageTime: ..., maxMemory, over allScore: ... }
// right
{ averageTime: ..., maxMemory, overallScore: ... }
5. Voice recognition error: "A voice recognition error occurred"
Causes:

Mic permission denied
STT service timeout or rate limit
Browser API unsupported
Fix:

Show user-friendly message and fallback to Web Speech API or upload audio flow.
Add retries and exponential backoff for cloud STT calls.
Check server logs for STT errors (auth, quota).
6. Judge0 submissions not returning output
Causes:

Missing RapidAPI key or incorrect endpoint
Not waiting for submission to finish
Fix:

Ensure JUDGE0_API_KEY is set and the headers x-rapidapi-key & x-rapidapi-host are configured.
Use wait=true parameter or poll the submission token until status != In Queue.
14. Testing & QA checklist
 Per-question check button works in aptitude round (select & check answer)
 Typing box shows 6 lines and wraps top→bottom (no horizontal scroll)
 Coding: Run -> output shows, execution time shows, test cases results show
 Coding: Submit locks the solution and enables Next problem button
 Voice: Start recording → live transcript appears & auto-submit behavior works
 PPT/JAM: min/max durations enforce and auto-submit behavior
 Dashboard updated after every session
 No raw error popups exposed to users
15. Security & Privacy
Auth: Keep Clerk keys private. Use publishable keys only in client side where required.
Secrets: Never commit .env with secret keys.
Resumes: Store resumes encrypted in cloud storage. Retain data only as needed.
User data: Follow GDPR-like best practices for deletion & consent.
Code execution: Sandbox judge (Judge0) or isolate code runner to prevent server compromise.
16. Contributing & Roadmap
How to contribute:

Fork repo → feature branch → PR to main
Tests & lint must pass
Describe the module and migrations in PR
Planned improvements:

Offline LLM fallback
Granular per-test-case scoring improvements
More question imports & curated MNC lists
Load testing and performance optimization for scrolling/UX
17. FAQ / Known limitations
Q: Does the platform keep state between deployments? A: Use persistent DB (Supabase/Postgres) for production. Local SQLite gets reset.
Q: Are all LLM calls free? A: Some services have quotas and billing. Use local or open models where possible for offline demos.
Q: Why is the UI lagging on home page scroll? A: Likely heavy synchronous operations or large DOM - optimize images, use lazy loading, and avoid heavy work on render.
18. License & Credits
License: Add your chosen license (e.g., MIT) file to repo.
Credits: List third-party libraries and data sources (Judge0, Whisper, Gemini/OpenAI, Clerk, Tailwind, Recharts, PyMuPDF, etc.)
Quick Appendix — Example .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_xxx
VITE_GEMINI_API_KEY=sk_gemini_xxx
NEXT_PUBLIC_JUDGE0_API=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=YOUR_RAPIDAPI_KEY
OPENAI_API_KEY=your_openai_key
YOUTUBE_API_KEY=your_youtube_key
DATABASE_URL=sqlite:./db.sqlite
Final notes / Recommendations
Before deploying to Vercel, fix syntax errors and migrations locally. Ensure DB migrations are applied.
Keep the frontend layout unchanged (as requested) — implement logic behind existing buttons/components.
If the project feels slow in dev, profile the app and offload heavy processing (STT, LLM) to backend services and run them asynchronously.
About
A simplified version of our AI-powered Mock Interview Platform showcasing Aptitude Test, Coding Playground, and Voice Interview with live transcription.

carrer-ai-lovat.vercel.app
Resources
 Readme
 Activity
Stars
 0 stars
Watchers
 0 watching
Forks
 0 forks
Releases
No releases published
Create a new release
Packages
No packages published
Publish your first package
Deployments
2
 Production – carrer-ai-zo3s 18 minutes ago
 Production 24 minutes ago
Languages
TypeScript
96.2%
 
CSS
3.5%
 
Other
0.3%
Suggested workflows
Based on your tech stack
Grunt logo
Grunt
Build a NodeJS project with npm and grunt.
Gulp logo
Gulp
Build a NodeJS project with npm and gulp.
SLSA Generic generator logo
SLSA Generic generator
Generate SLSA3 provenance for your existing release workflows
More workflows
Footer
© 2025 GitHu
