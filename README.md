# DB's AI Trainer: an AI personal training platform

**A personal AI fitness coach. It analyses your body type from a photo, builds weekly workout and nutrition plans, and adapts them from your weekly check-ins. A PT Pro mode lets personal trainers manage their own clients.**

[![Live app](https://img.shields.io/badge/live-pt--ai--helper.pages.dev-22c55e?style=flat-square)](https://pt-ai-helper.pages.dev/)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)

**Live:** [pt-ai-helper.pages.dev](https://pt-ai-helper.pages.dev/) · Built for [DB's Workouts](https://dbworkouts.co.uk/ai-plans)

---

## Screenshots

<!-- Add images to docs/screenshots/ and uncomment. -->
<!--
| Landing | Body analysis | My plan | Clients (PT Pro) |
|---|---|---|---|
| ![](docs/screenshots/landing.png) | ![](docs/screenshots/body.png) | ![](docs/screenshots/plan.png) | ![](docs/screenshots/clients.png) |
-->

_Screenshots coming soon. For now, see the [live app](https://pt-ai-helper.pages.dev/)._

---

## Features

### For individuals
- **AI body analysis.** Upload a photo and Gemini Vision identifies your body
  type and gives personalised recommendations.
- **Custom weekly plans** for workouts and nutrition, built around your goals,
  diet, equipment, and time
- **Smart check-ins.** Log weekly progress and the AI compares it and adjusts
  your plan.
- **AI coach on demand** for nutrition, exercise, and motivation questions
- **Challenges** to log and track

### For personal trainers (PT Pro)
- A **client dashboard** where you can invite clients, save plans, and delete
  clients
- **Public check-in links** so clients can submit without logging in
- Trainer notifications for check-ins and meal requests
- **Custom branding** per trainer
- AI check-in insights, call scheduling, and scheduled check-ins

### Platform
- Stripe subscriptions with checkout, verification, and a customer portal
- PDF export (jsPDF and html2canvas) and an installable PWA
- **Multi-provider AI fallback** across Gemini, Groq, Cerebras, and OpenRouter

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, lucide-react, vite-plugin-pwa |
| Backend | Cloudflare Pages Functions (`functions/api`), Firebase Auth and Firestore |
| AI | Google Gemini (including Vision), Groq, Cerebras, and OpenRouter |
| Payments | Stripe |
| Testing | Vitest |

---

## Getting started

```bash
git clone https://github.com/dean1234533/PT-AI_Helper.git
cd PT-AI_Helper
npm install
npm run dev
```

### Environment
Set these in the **Cloudflare Pages dashboard, under Settings, then Environment
variables** (or `.dev.vars` locally):

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Primary AI provider and vision |
| `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` | AI fallbacks |
| Stripe and Firebase keys | Payments and data |

### Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=dbs-app
```

Or connect the repo in the Cloudflare Pages dashboard.

---

## Project structure

```
src/
  pages/          Landing, ProfileSetup, BodyAnalysis, MyPlan, CheckIn, MyChallenges, Clients, Dashboard …
  components/, contexts/, hooks/, firebase/
functions/api/    Cloudflare Pages Functions: plan generation, check-ins, invites, Stripe, AI insights
firestore.rules
```

---

## Author

Built by **Dean Da Dev**, a UK full-stack developer building web apps, websites,
and AI tools.

🌐 [dean-da-dev.co.uk](https://www.dean-da-dev.co.uk/) · 💼 [More projects](https://www.dean-da-dev.co.uk/portfolio) · 🐙 [GitHub](https://github.com/dean1234533)
