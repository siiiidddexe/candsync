<div align="center">

# 🎯 CandSync

**A modern, self-hosted Applicant Tracking System (ATS) with AI-powered resume extraction.**

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![SQLite](https://img.shields.io/badge/SQLite-built--in-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ Features

| Category | Details |
|---|---|
| **Jobs** | Create & manage job postings with client, location, skills, and status |
| **Candidates** | Rich candidate profiles with 17 fields per candidate |
| **AI Extraction** | Auto-fill candidate forms from PDF / image resumes (Gemini + OpenRouter) |
| **Excel Export** | Export candidate lists with or without resume links |
| **Pipeline Statuses** | Fully customizable candidate pipeline stages with color coding |
| **User Management** | Granular per-user permissions (create/read/update/delete per resource) |
| **Job Access Control** | Restrict users to specific jobs only |
| **Resume Access** | Fine-grained control over who can view uploaded resumes |
| **Auth** | JWT-based authentication with 7-day sessions |
| **Responsive UI** | Works on desktop and mobile |

---

## 🏗️ Tech Stack

```
candsync/
├── backend/          # Node.js · Express · SQLite (node:sqlite built-in)
└── frontend/         # React 18 · Vite · TailwindCSS · Heroicons
```

**Backend dependencies:** `express`, `bcryptjs`, `jsonwebtoken`, `multer`, `xlsx`, `uuid`, `node-fetch`, `dotenv`  
**Frontend dependencies:** `react`, `react-router-dom`, `axios`, `react-hot-toast`, `@heroicons/react`

> **Node.js 22+ required** — uses the built-in `node:sqlite` module (no separate sqlite3 install needed).

---

## 🚀 Quick Start

### Prerequisites

- [Node.js 22+](https://nodejs.org) (check with `node --version`)
- Git

### 1. Clone & Install

```bash
git clone https://github.com/siiiidddexe/candsync.git
cd candsync

# Install all dependencies (backend + frontend)
npm run install:all
```

### 2. Configure Environment

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

Edit `backend/.env` and set at minimum:

```env
JWT_SECRET=your-long-random-secret-here
```

To enable **AI resume extraction**, add at least one API key:

```env
GEMINI_API_KEY=AIza...          # Get from https://aistudio.google.com
OPENROUTER_API_KEY=sk-or-...    # Get from https://openrouter.ai
```

> API keys can also be set from the **Settings** page in the UI after first login.

### 3. Start

**Option A — One-click (Windows):**
```
Double-click start.bat
```

**Option B — Manual (two terminals):**
```bash
# Terminal 1 – Backend
cd backend
npm run dev       # dev mode (nodemon)
# npm start       # production mode

# Terminal 2 – Frontend
cd frontend
npm run dev
```

### 4. Open

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |

**Default credentials:**
```
Email:    admin@candsync.com
Password: Admin@123
```

> ⚠️ Change the default password immediately after first login.

---

## 📋 Usage Guide

### Jobs

1. Navigate to **Jobs** (home page)
2. Click **New Job** → fill title, client, location, skills, description
3. Click **N Candidates** on any job card to manage that job's pipeline

### Adding Candidates

1. Open a job → click **Add**
2. *(Optional)* Upload a PDF/image resume and click **Auto-Fill with AI** — fields populate automatically
3. Fill any remaining fields and set the pipeline **Status**
4. Click **Save**

### Exporting

- **Export** — downloads an Excel file with all candidate fields
- **+ Resume** — same but includes a resume URL column (requires `withResume` permission)

### User Management *(Superadmin only)*

Go to **Users** → **New User** and configure:

- **Role**: `viewer` | `editor` | `admin` (purely cosmetic — actual access is permission-based)
- **Permissions**: fine-grained CRUD per resource (Jobs, Candidates, Statuses, Exports)
- **Job Access**: all jobs, or a specific list of jobs
- **Resume Access**: toggle per user

### AI Configuration *(Settings page)*

- Set **Gemini** or **OpenRouter** as primary provider
- Both providers are used as automatic fallback for each other
- Supported resume formats: PDF, JPEG, PNG, GIF, WEBP (up to 10 MB)

---

## 🔒 Security Notes

- JWT tokens expire after **7 days**
- Passwords are hashed with **bcrypt** (10 rounds)
- Resume files are served only to users with `resumeAccess` permission
- Set a strong `JWT_SECRET` in production (32+ random characters)
- Set `FRONTEND_URL` to your actual domain in production to restrict CORS

---

## 📁 Project Structure

```
candsync/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT verification, permission helpers
│   ├── routes/
│   │   ├── auth.js          # Login, /me, change-password
│   │   ├── candidates.js    # CRUD, AI extract, resume serve, export
│   │   ├── jobs.js          # CRUD + candidate count
│   │   ├── settings.js      # AI keys & config
│   │   ├── statuses.js      # Pipeline stages
│   │   └── users.js         # User management
│   ├── uploads/             # Resume files (git-ignored)
│   ├── db.js                # SQLite schema, seed data
│   ├── server.js            # Express app entry point
│   ├── .env.example         # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.js    # Axios instance with auth interceptor
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx   # Sidebar navigation shell
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Jobs.jsx
│   │   │   ├── Candidates.jsx
│   │   │   ├── Statuses.jsx
│   │   │   ├── Users.jsx
│   │   │   └── Settings.jsx
│   │   ├── App.jsx
│   │   └── index.css        # Tailwind + custom components
│   └── package.json
├── start.bat                # Windows one-click launcher
├── install.bat              # Windows one-click installer
└── package.json             # Root convenience scripts
```

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

[MIT](LICENSE) © 2024 CandSync
