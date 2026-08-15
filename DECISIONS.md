# ActiveCFO Decision Log

## Purpose and Maintenance Rule

`DECISIONS.md` is the **canonical, uppercase** project decision record. It preserves implementation history from the start of the project and must be updated whenever a change alters user access, the database model, analytics, a calculation, an external integration, or a core workflow. The corresponding user-visible journey must be added to `FLOW.md`.

> **Documentation rule:** Every material feature change should update `DECISIONS.md`, `FLOW.md`, `Feature.md`, `Architecture.md`, `constrains.md`, and `rollback.md` when relevant. Source comments should explain non-obvious boundaries and calculations, rather than restating obvious code.

| ID | Decision | Status | Rationale and consequence |
| --- | --- | --- | --- |
| D-001 | ActiveCFO has no authentication or login page. | Active | The interface is a direct household workspace with a fixed selector for **Saquib** and **Rahat** only. Authentication must not be surfaced in the UI without a new product decision. |
| D-002 | Supabase PostgreSQL is the system of record. | Active | All user-entered finance records are stored in the existing `activecfo` Supabase project through the application server. The browser does not receive a Supabase credential. |
| D-003 | The server uses a Supabase service-role credential. | Active | The key remains server-only and is used through the tRPC layer. It must never be added to client code, browser storage, or a public configuration value. |
| D-004 | Data entry is manual by design. | Active | The application has no bank connection, broker sync, price feed, or automatic investment scraper. Values are derived from records the household explicitly enters. |
| D-005 | The monthly plan begins with Needs, Wants, and Investment. | Active | Thresholds are grouped by these three buckets before detailed categories. This creates a consistent hierarchy across setup, ledger, dashboard calculations, and signals. |
| D-006 | Virtual balance is a deterministic calculation. | Active | For the selected profile and month, it is **opening virtual balance + income records − expense records**. It is not a bank balance or a forecast. |
| D-007 | Investments are records, not implied holdings. | Active | Emergency fund, mutual fund, ETF, crypto, and custom allocation rows are added only when the user elects to track them. An empty investment view is a valid starting state. |
| D-008 | Threshold signals are computed; reminders are stored. | Active | Automatic signals are derived from monthly category usage and warning percentages. Manual signals are independently created, edited, resolved, and deleted. |
| D-009 | New finance tables retain RLS with no browser policy. | Active | RLS is enabled and no anon/authenticated policies are supplied because the browser does not query Supabase directly. The server service role performs the controlled access. |
| D-010 | Existing database warnings are not silently remediated. | Active | The pre-existing `public.audit_log` RLS warning and unrelated legacy function warnings require an explicit owner decision; they were not altered by the ActiveCFO implementation. |
| D-011 | The Global Dashboard aggregates the selected profile, year, and month server-side. | Active | A public tRPC query validates the period, fetches the selected-month Supabase rows, and returns derived chart series. No mock data, prediction, or external financial feed is used. |
| D-012 | Detailed analytics use saved ledger descriptions as the lowest available hierarchy level. | Active | The data model does not have a merchant field. Treemap, nested breakdown, and sunburst-style views use bucket, category, and ledger description rather than fabricating merchant information. |
| D-013 | The displayed 50/30/20 and 20% savings targets are references, not advice. | Active | They compare saved income, expense buckets, and net cash flow only when income records exist. They do not recommend a personal allocation or create targets in the database. |
| D-014 | CSV and PDF exports are generated in the browser from selected-month expense records. | Active | The server returns selected profile-month records through tRPC; the client creates a download without exposing the Supabase credential or storing export files server-side. |

## Decision Maintenance Protocol

When a feature is proposed, record the request, the selected option, rejected alternatives where meaningful, its migration impact, and whether `FLOW.md` or `rollback.md` also require revision. When a decision is superseded, keep the previous row and mark it superseded rather than deleting history.

## Explicit Comment Standard

Source comments are required around **security boundaries**, **calculation formulas**, **intentional constraints**, **migration logic**, and **non-obvious failure behavior**. Comments should not repeat JSX labels, CSS class names, or self-evident variable names.
