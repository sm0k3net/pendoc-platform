# PenDoc Platform

Self-hosted reporting and collaboration for security assessment teams. Organize engagements, import findings from supported report formats, retain evidence and review history, publish reports to clients, and track retests.

[English installation and configuration](docs/installation.en.md) · [Установка и настройка на русском](docs/installation.ru.md)

## Local quick start

Requirements are Node.js 22.12 or newer, npm and a running Docker engine.

```bash
npm ci
npx supabase@3.3.0 start
npx supabase@3.3.0 status
cp .env.example .env.local
```

Copy the displayed local API URL and **publishable or anon** key into `.env.local`. Then start the frontend and Edge Functions in separate terminals.

```bash
npm run dev
npx supabase@3.3.0 functions serve
```

Open http://localhost:5173. Register an auditor, open the local mail inbox shown by `supabase status` to verify the account, then create a client and a project. Local data stays on the local stack.

For database reset, server deployment, optional integrations, backups and the client sign-in flow, see the installation guide in your language. The first community release line is **0.1.0**. Use a dedicated environment and validate both the install and restore procedures before onboarding production material.

## License and contributions

Apache-2.0. See [LICENSE](LICENSE), [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
