# 🚀 TaskFlow — Agile Project Management Board

TaskFlow is a full-stack Kanban-style project management application built with **Django REST Framework** and **React (TypeScript)**. It features real-time updates via WebSockets, JWT authentication, drag-and-drop task management, sprint planning, analytics dashboards, and more.

---

## ✨ Features

- **Kanban Boards** — Create boards with customizable columns and drag-and-drop task ordering
- **Task Management** — Priorities (P0–P3), labels, subtasks, due dates, and multi-assignee support
- **Sprint Planning** — Plan, activate, and complete sprints with goal tracking
- **Activity Log** — Full audit trail of board and task changes
- **Analytics Dashboard** — Visual charts and metrics powered by Recharts
- **Real-Time Updates** — WebSocket-powered live notifications via Django Channels
- **Board Sharing** — Generate shareable links with optional expiration for public read-only access
- **JWT Authentication** — Secure login/register with token refresh
- **Dark / Light Theme** — User-selectable theme with persistence
- **Role-Based Access** — Admin, Member, and Viewer roles per board
- **Responsive UI** — Works seamlessly across desktop and mobile

---

## 🛠️ Tech Stack

| Layer        | Technology                                                              |
| ------------ | ----------------------------------------------------------------------- |
| **Frontend** | React 19, TypeScript, Vite, Zustand, React Query, Framer Motion, Recharts |
| **Backend**  | Django 5, Django REST Framework, Django Channels, Daphne (ASGI)         |
| **Database** | PostgreSQL 16 (Docker) / SQLite (local dev fallback)                    |
| **Real-Time**| Django Channels + WebSockets (InMemory / Redis layer)                   |
| **Auth**     | JWT via `djangorestframework-simplejwt`                                 |
| **Styling**  | Vanilla CSS with custom design tokens, Google Fonts (Syne + DM Sans)    |
| **DevOps**   | Docker, Docker Compose                                                  |

---

## 📁 Project Structure

```
TaskFlow/
├── backend/                   # Django backend
│   ├── core/                  # Main app (models, views, serializers)
│   │   ├── models.py          # User, Board, Column, Task, Sprint, etc.
│   │   ├── views_auth.py      # Registration & login endpoints
│   │   ├── views_boards.py    # Board CRUD & sharing
│   │   ├── views_tasks.py     # Task CRUD & drag-drop reorder
│   │   ├── views_sprints.py   # Sprint management
│   │   ├── views_notifications.py
│   │   ├── serializers.py
│   │   ├── consumers.py       # WebSocket consumers
│   │   └── urls.py
│   ├── taskflow_api/          # Django project config
│   │   ├── settings.py
│   │   ├── asgi.py
│   │   └── urls.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── manage.py
│
├── frontend/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/             # Login, Register, Boards, Board, Analytics, etc.
│   │   ├── components/        # Reusable UI components
│   │   ├── store/             # Zustand state management
│   │   ├── api/               # Axios API client
│   │   ├── hooks/             # Custom React hooks
│   │   ├── layouts/           # Auth & Protected route layouts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **Python** ≥ 3.10
- **Docker** & **Docker Compose** *(optional — for containerized setup)*
- **PostgreSQL 16** *(optional — SQLite works out of the box for local dev)*

---

### Option 1 — Run with Docker Compose (Recommended)

This spins up **PostgreSQL**, **Redis**, the **Django backend**, and the **Vite frontend** in one command.

```bash
# 1. Clone the repository
git clone https://github.com/shushant950273/TaskFlow.git
cd TaskFlow

# 2. Start all services
docker-compose up --build
```

| Service    | URL                        |
| ---------- | -------------------------- |
| Frontend   | http://localhost:5173      |
| Backend    | http://localhost:8000/api/ |
| PostgreSQL | localhost:5432             |
| Redis      | localhost:6379             |

To run migrations inside the container:

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

To stop all services:

```bash
docker-compose down
```

---

### Option 2 — Run Locally (Without Docker)

#### 1. Clone the Repository

```bash
git clone https://github.com/shushant950273/TaskFlow.git
cd TaskFlow
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
# source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create a .env file (or use SQLite defaults)
# Copy the .env.example from the project root and adjust if needed:
copy ..\.env.example .env        # Windows
# cp ../.env.example .env        # macOS / Linux

# Run database migrations
python manage.py migrate

# Create a superuser (admin account)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

> **Note:** By default, if `DATABASE_URL` is not set, the backend falls back to **SQLite** (`db.sqlite3`), so PostgreSQL is not required for local development.

The backend API will be available at **http://localhost:8000/api/**

#### 3. Frontend Setup

Open a **new terminal** and run:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite dev server
npm run dev
```

The frontend will be available at **http://localhost:5173**

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure as needed:

| Variable       | Default                                                          | Description                      |
| -------------- | ---------------------------------------------------------------- | -------------------------------- |
| `DATABASE_URL` | `postgres://taskflow_user:password@localhost:5432/taskflow_db`   | PostgreSQL connection string     |
| `REDIS_URL`    | `redis://localhost:6379/0`                                       | Redis connection string          |
| `SECRET_KEY`   | `dev-secret-key-replace-me-in-production`                        | Django secret key                |
| `DEBUG`        | `True`                                                           | Enable Django debug mode         |
| `CORS_ORIGINS` | `http://localhost:5173`                                          | Allowed CORS origin for frontend |

> ⚠️ **Important:** Change `SECRET_KEY` and set `DEBUG=False` in production!

---

## 📡 API Endpoints

All endpoints are prefixed with `/api/`.

| Method | Endpoint                          | Description                     |
| ------ | --------------------------------- | ------------------------------- |
| POST   | `/api/auth/register/`             | Register a new user             |
| POST   | `/api/auth/login/`                | Login (returns JWT tokens)      |
| POST   | `/api/auth/token/refresh/`        | Refresh access token            |
| GET    | `/api/boards/`                    | List user's boards              |
| POST   | `/api/boards/`                    | Create a new board              |
| GET    | `/api/boards/<id>/`               | Board detail with columns/tasks |
| POST   | `/api/boards/<id>/tasks/`         | Create a task                   |
| PATCH  | `/api/tasks/<id>/`                | Update a task                   |
| POST   | `/api/tasks/<id>/move/`           | Move/reorder a task             |
| GET    | `/api/boards/<id>/sprints/`       | List sprints                    |
| GET    | `/api/boards/<id>/activity/`      | Activity log                    |
| GET    | `/api/notifications/`             | User notifications              |

---

## 🧪 Running Tests

```bash
cd backend

# Run tests with pytest
pytest

# Or with Django's test runner
python manage.py test
```

---

## 🏗️ Production Build

### Frontend

```bash
cd frontend
npm run build
```

The production-ready output will be in `frontend/dist/`.

### Backend

For production, the backend uses **Daphne** (ASGI server):

```bash
daphne -b 0.0.0.0 -p 8000 taskflow_api.asgi:application
```

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  Built with ❤️ using Django & React
</p>
