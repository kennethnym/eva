# Monorepo with Bun

A modern monorepo setup using Bun as the package manager, featuring a Hono backend and React dashboard.

## Project Structure

```
.
├── apps/
│   ├── backend/          # Bun + Hono API server
│   └── dashboard/        # Vite + React frontend
├── .devcontainer/        # Dev Container configuration
├── biome.json           # Biome.js formatter and linter config
└── package.json         # Root workspace configuration
```

## Tech Stack

### Backend (`apps/backend`)
- **Runtime**: Bun
- **Framework**: Hono
- **Port**: 3000

### Dashboard (`apps/dashboard`)
- **Build Tool**: Vite
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **State Management**: Jotai
- **Data Fetching**: TanStack Query (React Query)
- **Port**: 5173

### Development Tools
- **Package Manager**: Bun
- **Formatter/Linter**: Biome.js
- **Dev Container**: Custom Dockerfile with Bun and Node.js

## Getting Started

### Prerequisites
- Docker (for Dev Container)
- Or Bun installed locally

### Using Dev Container (Recommended)
1. Open this project in VS Code
2. When prompted, click "Reopen in Container"
3. Wait for the container to build and dependencies to install
4. Start developing!

### Local Development
If you have Bun installed locally:

```bash
# Install dependencies
bun install

# Run both apps in development mode
bun run dev

# Or run individually:
cd apps/backend && bun run dev
cd apps/dashboard && bun run dev
```

## Available Scripts

### Root Level
- `bun run dev` - Start all apps in development mode
- `bun run build` - Build all apps
- `bun run lint` - Lint all code with Biome
- `bun run lint:fix` - Lint and fix issues
- `bun run format` - Format all code with Biome

### Backend (`apps/backend`)
- `bun run dev` - Start backend in watch mode (port 3000)
- `bun run build` - Build backend for production
- `bun run start` - Run production build

### Dashboard (`apps/dashboard`)
- `bun run dev` - Start Vite dev server (port 5173)
- `bun run build` - Build for production
- `bun run preview` - Preview production build

## API Endpoints

### Backend
- `GET /` - Welcome message
- `GET /api/health` - Health check endpoint

## Features

### Backend
- ✅ Fast Bun runtime
- ✅ Lightweight Hono framework
- ✅ CORS enabled
- ✅ Request logging
- ✅ TypeScript support

### Dashboard
- ✅ Modern React 18 with TypeScript
- ✅ Tailwind CSS for styling
- ✅ Jotai for state management (counter example)
- ✅ TanStack Query for API calls (health check example)
- ✅ Hot Module Replacement (HMR)

## Development Container

The project includes a Dev Container configuration that provides:
- Bun runtime (latest)
- Node.js 20 (for compatibility)
- Git, curl, wget, and build tools
- VS Code extensions:
  - Biome.js (formatter/linter)
  - Bun for VS Code
- Auto-formatting on save
- Port forwarding for backend (3000) and dashboard (5173)

## Code Quality

This project uses Biome.js for:
- Code formatting (consistent style)
- Linting (catch errors and enforce best practices)
- Import organization

Configuration is in `biome.json` at the root level.

## Building for Production

```bash
# Build all apps
bun run build

# Backend output: apps/backend/dist/
# Dashboard output: apps/dashboard/dist/
```

## License

MIT
