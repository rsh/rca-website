# Important Context

This entire repository was created using AI, except this section and anything in brackets [rsh: like this]. As of the initial date of publication, 2026-02-18, no human being has ever directly edited this code.

Proceed at your own risk!


# RCA Tool

A full-stack Root Cause Analysis (RCA) tool with **Flask (Python) backend** and **TypeScript frontend**. Create RCAs with descriptions and timelines, then build 5 Whys analysis trees rendered as collapsible Reddit-style comment threads.

## Quick Start

```bash
# Run the setup script - it handles everything!
./setup.sh

# Start the backend (in one terminal)
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python app.py

# Start the frontend (in another terminal)
cd frontend
npm run dev

# Open your browser to http://localhost:3000
```

## Project Structure

```
.
├── backend/                 # Flask API server
│   ├── models.py           # Rca, WhyNode, User models
│   ├── api.py              # API routes and endpoints
│   ├── auth.py             # JWT authentication utilities
│   ├── schemas.py          # Pydantic validation schemas
│   ├── app.py              # Application entry point
│   ├── reset_db.py         # Database reset utility
│   └── tests/              # Backend tests
├── frontend/               # TypeScript + Bootstrap frontend
│   └── src/
│       ├── index.ts        # Main application logic (list + detail views)
│       ├── components.ts   # UI components (RCA forms, why tree)
│       ├── auth.ts         # Authentication state
│       └── api/            # API client library
│           ├── client.ts   # Type-safe API client
│           └── types.ts    # TypeScript interfaces
├── infrastructure/         # Terraform deployment configs
├── docs/                   # Documentation
├── setup.sh               # One-command setup script
└── check.sh               # Run all tests and checks
```

## Architecture Overview

### Backend (Flask + PostgreSQL)

- **Flask** web framework with **SQLAlchemy** ORM
- **JWT authentication** with secure password hashing
- **Pydantic** for request/response validation
- **PostgreSQL** database with Docker support
- Full test coverage with **pytest**

### Frontend (TypeScript + Bootstrap)

- **TypeScript** for type safety
- **Bootstrap 5** for responsive UI
- **Webpack** for bundling and dev server
- **Jest** for testing
- Type-safe API client with full backend integration

### Database Models

1. **User** - Authentication and user management
   - Email, username, password (hashed)
   - JWT token generation
   - Owns RCAs

2. **Rca** - Root Cause Analysis
   - Name, description, timeline fields
   - Owner (foreign key to User)
   - Has many WhyNodes (cascade delete)

3. **WhyNode** - A node in the 5 Whys tree
   - Self-referential tree (parent_id foreign key)
   - Node type: "why" or "root_cause"
   - Content text and sibling ordering
   - Top-level nodes must be type "why"
   - Recursive `to_tree_dict()` for nested JSON

### Frontend Views

1. **RCA List View** - Shows all user's RCAs as cards with a create form
2. **RCA Detail View** - Shows editable RCA fields + 5 Whys tree with:
   - Collapsible Reddit-style comment threads (indented, left-bordered)
   - Type badges (Why / Root Cause)
   - Inline add/edit/delete for nodes
   - Collapse/expand toggles

## Key Features

### Authentication & Authorization
- User registration and login
- JWT-based authentication
- Protected API endpoints
- RCA ownership enforcement

### RCA Management
- Create, view, update, delete RCAs
- Name, description, and timeline fields

### 5 Whys Analysis Tree
- Add why nodes and root cause nodes
- Nested tree structure (unlimited depth)
- Top-level constraint: must be "why" type
- Cascade deletion of subtrees
- Collapsible Reddit-style rendering

### Type Safety
- Backend: Pydantic schemas for validation
- Frontend: TypeScript interfaces
- End-to-end type checking

### Testing
- Backend: pytest with fixtures (97% coverage)
- Frontend: Jest (50 tests)
- Run all checks: `./check.sh`

## Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
source venv/bin/activate
pytest

# Frontend tests
cd frontend
npm test

# Run all checks (tests, linting, type-checking)
./check.sh
```

### Database Management

```bash
# Reset database (WARNING: deletes all data)
cd backend
source venv/bin/activate
python reset_db.py
```

### Code Quality

```bash
# Backend
cd backend
mypy .                    # Type checking
black .                   # Format code
flake8                    # Linting

# Frontend
cd frontend
npm run lint              # ESLint
npm run format            # Prettier
npm run type-check        # TypeScript
```

## Security Notes

- Change `SECRET_KEY` in production (use environment variable)
- Use HTTPS in production
- Update CORS settings in `api.py` for production
- Never commit `.env` files
- Use strong passwords (min 8 chars enforced)

## Deployment

The project includes Terraform configurations in `infrastructure/` for deploying to cloud providers.

### Environment Variables

Create `.env` file in backend:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
SECRET_KEY=your-secret-key-here
```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### RCAs

- `GET /api/rcas` - List user's RCAs (requires auth)
- `POST /api/rcas` - Create RCA (requires auth)
- `GET /api/rcas/:id` - Get RCA with full why tree (requires auth)
- `PATCH /api/rcas/:id` - Update RCA fields (requires auth)
- `DELETE /api/rcas/:id` - Delete RCA and all nodes (requires auth)

### Why Nodes

- `POST /api/rcas/:id/nodes` - Add a why/root-cause node (requires auth)
- `PATCH /api/nodes/:id` - Update node content/type (requires auth)
- `DELETE /api/nodes/:id` - Delete node and children (requires auth)

## License

ISC
