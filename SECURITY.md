# Security Policy

## ActiveCFO security model

ActiveCFO is a **no-login**, two-profile workspace for Saquib and Rahat. This selector is a product constraint rather than an identity or authorization system. Application data is accessed through the server-side tRPC layer; the browser must never receive the Supabase service-role key, a database URL containing credentials, or another privileged secret.

| Area | Required control |
| --- | --- |
| Credentials | Keep all real values in managed secrets or untracked local `.env` files. Never commit populated environment files, keys, certificates, tokens, or database dumps. |
| Supabase access | Use the service-role key only in server code. Do not make direct browser requests to Supabase or add a credential to a `VITE_*` variable. |
| Exports | CSV and PDF exports are generated in the browser from the selected response. They are not written back to the database or a public file store. |
| Logging | Do not log authorization headers, environment variables, complete request bodies containing finance records, or exported files. |
| Dependencies | Review dependency updates before merging them and run `pnpm test`, `pnpm check`, and `pnpm build`. |

## Reporting a concern

Do not open a public issue containing a key, token, database URL, financial record, or export. Remove any exposed credential immediately, rotate it in the managed secrets interface, and review GitHub history before sharing a remediation summary privately with the repository owner.
