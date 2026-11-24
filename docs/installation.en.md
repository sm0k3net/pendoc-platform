# Installation and configuration

## Deployment profiles

| Profile | Frontend | Backend |
| --- | --- | --- |
| Local development | Vite on localhost | Supabase CLI and Docker |
| Small team or VPS | Static frontend behind an HTTPS reverse proxy | Dedicated managed Supabase project or official self-hosted Supabase Docker stack |
| On premise | Static frontend behind the organization's private HTTPS entry point | Official self-hosted Supabase Docker stack with private DB and object storage |

## Local development

1. Install Node.js 22.12+, npm and Docker. Run `npm ci` and `npx supabase@3.3.0 start` at the repository root.
2. Copy `.env.example` to `.env.local`. Run `npx supabase@3.3.0 status` and set the URL and publishable or anon key shown for this local stack.
3. In separate terminals, run `npx supabase@3.3.0 functions serve` and `npm run dev`. Open http://localhost:5173.
4. Sign up and verify your email using the local mail inbox from `supabase status`. For a local test-only reset use `npx supabase@3.3.0 db reset`. It deletes local application data.

## Frontend configuration

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Browser-accessible Supabase gateway URL. For hosted or self-hosted deployments use its HTTPS address. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public browser key. A project publishable key or legacy anon key. |
| `VITE_PUBLIC_ORIGIN` | Frontend origin without a path, for example `https://reports.example.org`. Defaults to the origin serving the SPA. |

Frontend variables are baked into the build and visible in browser assets. Keep service-role keys, provider credentials and database connection strings on the server. Build with `npm run build` and serve `dist/`. Configure history fallback to `/index.html` for application routes and serve assets as static files. An [Nginx example](../deploy/nginx.conf) is provided.

## Managed backend

1. Create a dedicated Supabase project with PostgreSQL 15 or newer. Confirm Auth email verification is enabled and configure a mail relay.
2. Apply the community migrations to the dedicated database. With CLI v3, link the dedicated project and run `npx supabase@3.3.0 db push --remote`. Review the displayed target and migration list before confirming. Deploy from the same root with `npx supabase@3.3.0 functions deploy`.
3. In Auth settings set the Site URL to the frontend origin and allow the exact `/auth?type=client` and `/auth` redirect URLs at that origin. Use the supported signing keys and deploy the functions according to the repository's `supabase/config.toml`. Routes with gateway verification disabled perform their own authorization, including the API token endpoint.
4. Build the frontend with the dedicated URL and browser key, publish the dist directory, then complete the acceptance steps below.

The application migrations are designed for a new database. Import or upgrade from the historical hosted PenDoc schema requires a separate schema and object migration.

## On-premise and single VPS

1. Follow the [Supabase Docker guide](https://supabase.com/docs/guides/self-hosting/docker) for composition and infrastructure settings. Pin the upstream stack version and use generated, non-default keys and passwords. Restrict Studio, database and internal service ports. Configure the reverse proxy with TLS and set the public API URL and site URL.
2. Apply `supabase/migrations/` in order to the dedicated stack using the CLI's database URL mode on a trusted host. Example: `npx supabase@3.3.0 db push --remote="$PENDOC_DATABASE_URL"`. Keep the connection string outside this repository. Copy the contents of `supabase/functions/` into the upstream Edge Runtime's functions volume, preserving the directory names. Keep the upstream gateway's main router and configure it to expose the function directories with the matching JWT behavior from `supabase/config.toml`. Restart only the Edge Runtime after installing the files. Match upstream's documented filesystem permissions.
3. Configure the Auth SMTP relay, sender and redirects. Add a private or managed object-storage backend appropriate for your organization. Build and serve the frontend as described above. Permit SMTP and approved provider traffic only when needed.
4. Verify the complete deployment. One VPS contains a single failure domain. Keep encrypted backups on independent storage, and test recovery on a separate host.

## Optional server integrations

| Environment variable | Purpose |
| --- | --- |
| `RESEND_API_KEY`, `PENDOC_EMAIL_FROM`, `PENDOC_PUBLIC_ORIGIN` | Event-driven invitation and retest emails. All three are required to send. Copy the invitation token manually if Resend is disabled. Auth email delivery uses its own SMTP configuration. |
| `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` | Optional report analysis and writing assistance. These integrations can send report or finding context to the configured provider. Leave both unset when using confidential data unless the transfer is approved. |
| `NVD_API_KEY` | Optional NVD API key for CVE enrichment. The enrichment action may use the public NVD service even without a key. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Runtime-injected by Supabase or supplied by the trusted standalone Edge Runtime. Never put these server settings in the Vite environment. |

For local optional credentials, use an ignored functions env file and `functions serve --env-file`. For a hosted backend use Supabase secrets. Docker operators set the Edge Runtime environment on the host.

## Acceptance and operations

- Register an auditor, verify their email, create a client and project, import a supported report, upload a private attachment, and generate/download the report and project archive.
- In **Client Access**, invite a second email. Send the invitation token securely. The client chooses **Client Access**, enters the invited email and token, then opens the email sign-in link in the same browser. Returning clients can use the same email without a token.
- Check that a draft stays internal. Publish a chosen report, confirm the client sees it, and request a retest. Revoke the assignment, then confirm a new read is denied from the existing client session. Previously downloaded copies cannot be revoked.
- Back up the database, Storage objects, and configuration. Test restoration on an isolated instance and verify reporting, authentication and attachment access there.
- For changes to the historical SaaS schema, use the private deployment procedure and stage the migration together with the frontend and Edge Functions changes.

Official references are the [CLI guide](https://supabase.com/docs/guides/local-development/cli/getting-started), [Docker guide](https://supabase.com/docs/guides/self-hosting/docker), [Edge Function deployment guide](https://supabase.com/docs/guides/functions/deploy), and [backup guide](https://supabase.com/docs/guides/platform/backups).
