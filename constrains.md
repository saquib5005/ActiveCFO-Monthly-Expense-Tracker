# ActiveCFO Constraints and Guardrails

## Product Constraints

| Constraint | Requirement |
| --- | --- |
| User access | Do not add an authentication or login page. The UI exposes exactly Saquib and Rahat. |
| Data entry | Finance, insurance, investment, and balance records are manual. Do not invent household data. |
| External sync | Do not connect bank accounts, brokerages, wallets, or transaction scrapers unless explicitly requested in a future change. |
| Investment posture | Do not present records or calculated values as investment advice, price predictions, returns, or recommendations. |
| Reviews | Do not create fabricated reviews, ratings, testimonials, or user-generated content. |
| Credentials | Keep the Supabase service-role key server-only. Never add it to a Vite variable, frontend code, documentation example, or browser storage. |

## Technical Constraints

The project was upgraded to the full-stack template to provide a server and tRPC runtime. The template’s optional OAuth support remains infrastructure only and must not be used by ActiveCFO screens or procedures. All ActiveCFO API operations use `publicProcedure` because the user deliberately requested no login flow.

Supabase’s existing project contains legacy tables and linter findings unrelated to this implementation. ActiveCFO tables use a separate `activecfo_` prefix to avoid silently changing existing data structures. RLS is enabled on ActiveCFO tables; there are intentionally no browser-access policies because the server service role performs the database access.

> **Known database warning:** The existing `public.audit_log` table has RLS disabled. It was not changed because it predates ActiveCFO and enabling RLS without reviewing policies can interrupt its current use. The Supabase advisor’s remediation guidance is available at [RLS Disabled in Public](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).

## Operational Constraints

The dashboard calculation applies the selected calendar month. It does not carry untracked records across months, forecast future balances, or reconcile against external accounts. Users must set an opening virtual balance for each month when they need one.

Never use production data as test data. Database tests may read the fixed profile list and validate a server credential, but should not insert sample financial records into the household workspace.

