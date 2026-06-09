# Website Cloner AI

Website Cloner AI is a production-ready web application cloner platform that accepts a URL, scrapes page content and assets using Playwright, detects structural semantic blocks and text using OpenAI, builds a runnable Next.js template on the fly, provides a live visual text editing interface, and automates deployments to GitHub, Vercel, Render, and Netlify.

## Features

- **High-Fidelity Scraper**: Playwright-based page crawler that clones HTML, stylesheets, images, scripts, and fonts.
- **AI-Powered DOM Analysis**: LangGraph and OpenAI agent identifying UI sections (Hero, Features, Footer) and isolating text blocks for safe visual modification.
- **Next.js 15 Project Generator**: Instant standalone web project boilerplate creation.
- **Live Preview System**: Embedded preview servers running live on dynamic local ports, rendering within the dashboard's responsive frame.
- **Visual Content Editor**: Update headings, buttons, and links with live hot-reloaded changes inside the preview frame.
- **Cloud Git Sync**: One-click GitHub OAuth integration with repository sync.
- **Seamless Deployments**: Connect and publish directly to Vercel, Render, or Netlify.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Zustand, React Query, Framer Motion.
- **Backend**: FastAPI (Python 3.11), SQLAlchemy, PostgreSQL, Redis.
- **AI Agents**: OpenAI APIs, Playwright.
- **DevOps**: Docker, Docker Compose, GitHub Actions.

## Project Structure

```
website-cloner-ai/
├── frontend/             # Next.js 15 web client
├── backend/              # FastAPI Python backend & AI pipelines
│   └── app/
│       ├── agent/        # OpenAI structural DOM analysis agents
│       ├── codegen/      # Next.js code generation engine
│       ├── preview/      # Preview server process manager
│       ├── scraper/      # Playwright web scraper engine
│       └── main.py       # API router and server entrypoint
├── docker/               # Database, Redis, and container configurations
├── docs/                 # API docs, schemas, and usage tutorials
├── scripts/              # Setup, backup, and helper tooling
└── docker-compose.yml    # Main orchestration docker stack
```

## Getting Started

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/RakatiVenukumar/website-cloner-ai.git
   cd website-cloner-ai
   ```

2. **Configure Environment Variables**:
   - Copy `backend/.env.example` to `backend/.env` and supply your `OPENAI_API_KEY`, database URL, Redis URL, and integration credentials.
   - Update `frontend/.env.local` if you are not running the frontend against `http://localhost:8000`.

3. **Spin up Docker Stack**:
   ```bash
   docker-compose up --build
   ```

4. **Navigate to App**:
   - Web App UI: `http://localhost:3000`
   - FastAPI swagger: `http://localhost:8000/docs`

## Runtime Notes

- The backend container installs Node.js so it can run generated preview projects with `npm install` and `npx next dev`.
- The frontend defaults to `NEXT_PUBLIC_API_URL=http://localhost:8000` for local Docker Compose usage.
