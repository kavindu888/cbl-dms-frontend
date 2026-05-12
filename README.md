# CBL-DMS Frontend

Production-grade React + TypeScript frontend scaffold for the CBL Foods International Distribution Management System.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.development`
3. `npm run dev`

## Available Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` runs TypeScript checks and creates a production build
- `npm run preview` serves the production build locally
- `npm run type-check` runs the TypeScript compiler without emitting output
- `npm run lint` runs ESLint
- `npm run lint:fix` fixes auto-fixable lint issues
- `npm run format` formats source files with Prettier

## Notes

- API and SignalR endpoints are configured through the `VITE_*` environment variables.
- The scaffold includes a demo-friendly auth fallback so the shell can be explored before the backend is fully wired.
