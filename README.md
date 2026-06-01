# CBL-DMS Frontend

React frontend for the CBL Foods International Distribution Management System.

## Setup

1. `npm install`
2. Update `.env` if your backend URL is different
3. `npm run dev`

## Available Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` creates a production build
- `npm run preview` serves the production build locally
- `npm run lint` runs ESLint
- `npm run lint:fix` fixes auto-fixable lint issues
- `npm run format` formats source files with Prettier

## Notes

- API and SignalR endpoints are configured in the single `.env` file through `VITE_*` variables.
- The scaffold includes a demo-friendly auth fallback so the shell can be explored before the backend is fully wired.
