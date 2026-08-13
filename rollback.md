# ActiveCFO Rollback Guide

## Purpose

Use this guide when a deployment or change makes the project unreliable. Application code and database schema have different rollback paths and must be treated separately.

## Current Recovery Points

| Checkpoint | Purpose | Appropriate use |
| --- | --- | --- |
| `1d625bce` | Completed no-auth Supabase CRUD workspace | Restore the current completed application state. |
| `fbf4f32c` | Supabase CRUD upgrade checkpoint | Restore the feature-complete state before final delivery bookkeeping. |
| `a27c1d01` | Original static dashboard | Restore the pre-Supabase visual dashboard if the full-stack migration must be abandoned. |

## Code Rollback Procedure

1. Open the project version history in the management interface.
2. Select the appropriate checkpoint based on the scope of the problem.
3. Restore the application checkpoint.
4. Re-run `pnpm test`, `pnpm check`, and `pnpm build`.
5. Verify the direct Saquib/Rahat selector and the dashboard’s Supabase read path before publishing a new checkpoint.

> **Important:** Do not use `git reset --hard` for project recovery. Use the checkpoint rollback workflow so the change is auditable and recoverable.

## Database Rollback Procedure

Application checkpoint rollback does **not** reverse Supabase schema migrations or finance records. If a schema migration must be reverted, create a new, reviewed PostgreSQL migration that reverses only the intended change. Avoid destructive `DROP TABLE` statements unless the owner has explicitly confirmed data loss.

For an incorrect ActiveCFO code change with an unchanged schema, restore the code checkpoint only. For an incorrect table, column, constraint, trigger, or policy, first export or inspect the affected data and then apply a forward corrective migration. Keep the original migration file and document the corrective migration in `decisions.md`.

## Rollback Verification

| Check | Expected outcome |
| --- | --- |
| Client load | No login or authentication page appears. |
| Profile selector | Only Saquib and Rahat are available. |
| Supabase credential test | Server can reach the configured project without exposing a key in the browser. |
| Calculation test | Virtual balance remains opening balance plus income minus expenses. |
| CRUD error handling | A failed mutation keeps the form open and reports an error. |

