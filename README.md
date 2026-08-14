# Activity Tracking Platform - SaaS

A professional SaaS platform for enterprise activity tracking.

## Philosophy

This is not a task manager. This is an **enterprise activity control center**.
Every user should understand the application in less than 5 minutes.

## Tech Stack

### Frontend
- React 18
- Vite
- TypeScript
- TailwindCSS
- Shadcn UI
- TanStack Router
- TanStack Query
- React Hook Form
- Zod

### Backend
- Django 5
- Django REST Framework
- PostgreSQL
- JWT Authentication

### Storage
- S3 Compatible (for file attachments)

## Architecture

```
├── frontend/          # React application
├── backend/           # Django application
└── docs/             # Documentation
```

### Backend Structure
```
backend/
├── config/            # Django, ASGI and Celery configuration
├── domain/            # Domain models
├── services/          # Business logic
├── api/               # REST API endpoints
├── common/            # Shared utilities
└── tests/             # Tests
```

### Frontend Structure
```
frontend/
├── src/
│   ├── domain/        # Domain types and interfaces
│   ├── services/      # API services
│   ├── components/    # UI components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom hooks
│   ├── utils/         # Utilities
│   └── router/        # Routing configuration
```

## Development

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Docker (for PostgreSQL and Redis)

### Quick Start (Local Development with HMR)

For the best development experience with instant HMR (Hot Module Replacement), use the provided PowerShell script:

```powershell
# Run from project root
.\dev.ps1
```

This will:
1. Start PostgreSQL and Redis via Docker
2. Start Django backend on http://localhost:8000
3. Start Vite frontend on http://localhost:8000

Press Ctrl+C to stop all services.

### Manual Setup

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Copy .env.dev to backend/.env or set environment variables
python manage.py migrate
python manage.py runserver
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## User Roles

- **Owner**: manages the company, accounts and subscription.
- **Manager**: manages operational work, teams, projects and employee accounts.
- **Employee**: works on visible tasks and creates personal tasks.
- **Platform super-administrator**: supervises tenants through an explicitly selected company context.

The authoritative permission matrix is documented in [`docs/ROLES.md`](docs/ROLES.md).

## MVP Features

- Authentication (JWT)
- Company management
- User management
- Team management
- Role-based permissions
- Dashboard
- Task management (CRUD)
- Task延期 (report) system
- Comments
- File attachments
- Notifications
- Calendar
- Reports
- User profile
- Settings

## Design Principles

- **Simplicity**: Every screen has a single purpose
- **Performance**: Pagination, lazy loading, caching
- **Security**: Role-based permissions, input validation
- **Scalability**: Modular architecture for future features

## Future Extensions

- AI integration
- WhatsApp integration
- Email integration
- Mobile apps
- Goals and objectives
- Project management
- Workflow automation
- Public API
