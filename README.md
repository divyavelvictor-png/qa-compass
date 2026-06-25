# QA Compass — Test Management App

React + Vite + Supabase + Tailwind CSS

---

## Quick start (5 minutes)

### 1. Install dependencies
```
npm install
```

### 2. Add your Supabase credentials
Copy the example file and fill in your values:
```
cp .env.example .env
```
Open `.env` and replace with your real credentials from
Supabase → Project Settings → API:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Run the database schema
Paste the contents of `schema.sql` into Supabase → SQL Editor → Run.

### 4. Start the dev server
```
npm run dev
```
Open http://localhost:5173

---

## Deploy to Netlify

```
npm run build
```
Drag the generated `dist/` folder to app.netlify.com.

Or connect your Git repo to Netlify and set:
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
  in Netlify → Site settings → Environment variables

---

## Project structure

```
src/
  lib/
    supabase.js     Supabase client (reads .env)
    db.js           All database helper functions
    constants.js    Shared constants + colour maps
  components/
    ui.jsx          Toast, ChipInput, Pagination, Modal, form helpers
    CreateTCModal.jsx
    TagCell.jsx
  sections/
    TestCaseRepository.jsx
    TestPlan.jsx
    TestExecution.jsx
    Dashboard.jsx
  App.jsx           Sidebar layout + Supabase Realtime subscriptions
  SetupScreen.jsx   Shown when .env is not configured
  main.jsx          React entry point
  index.css         Tailwind directives
```
