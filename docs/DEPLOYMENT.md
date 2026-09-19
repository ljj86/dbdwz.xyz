# Generic deployment guide

1. Install the root and `server` dependencies.
2. Build the web client with `npm run build:h5`.
3. Copy `deploy/server.env.example` to `server/.env` and replace every `CHANGE_ME` value.
4. Use a dedicated MySQL account with only the permissions required by this application.
5. Start `server/index.js` with a process manager and reverse-proxy HTTPS traffic to `127.0.0.1:3000`.
6. Keep `server/.env`, uploaded files, user profiles, database exports and signing certificates outside Git.

The application never creates a default user. To create the first administrator, provide `ADMIN_USERNAME`, `ADMIN_PASSWORD` and optionally `ADMIN_NICKNAME`, then run `npm --prefix server run admin:create`. The password must contain 12-72 characters and is never written to the repository.

Production startup fails when `DB_USER`, `DB_PASSWORD`, `DB_NAME` or a sufficiently long `JWT_SECRET` is missing. This is intentional.
