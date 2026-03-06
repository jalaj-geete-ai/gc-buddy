# Your GC Buddy 🇩🇪
**German Language Learning App for Indian Nurses — by Global Careers, Testbook**

---

## 🚀 Deploy to Vercel in 5 Steps

### Prerequisites
- A [GitHub](https://github.com) account (free)
- A [Vercel](https://vercel.com) account (free)
- Your Anthropic API key → get one at [console.anthropic.com](https://console.anthropic.com)

---

### Step 1 — Upload to GitHub

1. Go to [github.com/new](https://github.com/new)
2. Create a new repo named `gc-buddy` (set to **Public** or **Private**, your choice)
3. On your computer, open Terminal and run:

```bash
# If you don't have Git installed: https://git-scm.com/downloads
cd path/to/gc-buddy-folder
git init
git add .
git commit -m "Initial commit — GC Buddy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gc-buddy.git
git push -u origin main
```

---

### Step 2 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use your GitHub account)
2. Click **"Add New Project"**
3. Click **"Import"** next to your `gc-buddy` repo
4. Vercel will auto-detect it as a React app
5. Click **"Deploy"** — don't change any settings yet

---

### Step 3 — Add your API Key (IMPORTANT)

Without this, the app will not work.

1. In your Vercel project dashboard, go to **Settings → Environment Variables**
2. Click **"Add New"**
3. Set:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your Anthropic API key (starts with `sk-ant-...`)
   - **Environments:** check Production, Preview, Development
4. Click **Save**

---

### Step 4 — Redeploy

1. Go to the **Deployments** tab in your Vercel project
2. Click the **three dots** next to the latest deployment
3. Click **"Redeploy"**
4. Wait ~1 minute

---

### Step 5 — Share your link! 🎉

Vercel gives you a public URL like:
```
https://gc-buddy.vercel.app
```

Share this with anyone — no login needed on their end.

---

## 🔑 How the API Key stays secure

The app never sends your API key to users' browsers.
All Claude API calls go through `/api/claude.js` — a serverless function that runs on Vercel's servers.
The key is stored as an environment variable, invisible to the public.

---

## 📁 Project Structure

```
gc-buddy/
├── api/
│   └── claude.js        ← Serverless proxy (keeps API key secret)
├── public/
│   └── index.html       ← HTML entry point
├── src/
│   ├── index.js         ← React entry point
│   └── App.js           ← Full app (all components)
├── vercel.json          ← Vercel routing config
├── package.json         ← Dependencies
└── .gitignore
```

---

## 🛠 Run Locally (optional)

```bash
npm install
npm start
# Opens at http://localhost:3000
```

For local dev, create a `.env` file:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

---

## ✨ Features

- 🎯 Placement test (10 questions, auto-detects level)
- 📚 Structured curriculum — A1 → B2 (20 topics)
- 💬 AI tutor "Luca" with personalized lessons
- 🏋️ Daily exercises linked to curriculum topics
- 🔤 Translations with Hindi + English meanings & pronunciation
- 📊 Progress tracking dashboard
