# AGENTS

## Coding Conventions
- Use TypeScript and modern ECMAScript.
- Follow the existing ESLint configurations. Run `npm run lint` in any package you modify.
- Format code with Prettier (default settings; see `.prettierignore`).
- Target Node.js 18+ (see `.nvmrc`).

## Lint & Test Commands
- **Client**: `cd client && npm run lint`
- **Server**: `cd server && npm run lint`
- **Server tests**: `cd server && npm test`

## Environment Setup
- Install Node.js 18 and run `nvm use` to switch versions.
- Run `npm install` inside both `client/` and `server/` to install dependencies.
- For the API server, copy `server/.env.example` to `server/.env` and fill in required credentials.
- Development uses two terminals:
  - `cd server && npm run dev` (http://localhost:8787)
  - `cd client && npm run dev` (http://localhost:5173)
