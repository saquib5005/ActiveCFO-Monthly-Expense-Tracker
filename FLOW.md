# ActiveCFO User and Data Flows

## Documentation Rule

`FLOW.md` is the **canonical, uppercase** flow record. It is maintained alongside `DECISIONS.md` and captures user-visible workflows from the beginning of the project through the current release.

## Primary Navigation Flow

```mermaid
flowchart TD
  A[Open ActiveCFO] --> B[Select Saquib or Rahat]
  B --> C[Overview]
  B --> GD[Global Dashboard]
  C --> D[Monthly Setup]
  D --> E[Set opening virtual balance]
  D --> F[Add Needs, Wants, Investment thresholds]
  C --> G[Ledger]
  G --> H[Create or edit income and expense records]
  C --> I[Investments]
  I --> J[Maintain allocation records]
  C --> K[Insurance]
  C --> L[Guardrails, Strategies, Signals]
  C --> M[Help Center]
  GD --> S[Select year and month]
  S --> T[Server requests selected-month ledger and thresholds]
  H --> N[Supabase record changes]
  J --> N
  K --> N
  L --> N
  N --> O[Server recalculates dashboard and global analytics]
  O --> C
  O --> GD
```

## Monthly Setup Flow

The selected month drives monthly settings, thresholds, the overview calculation window, and computed threshold signals. A user first sets an opening virtual balance and emergency-month target. They then create individual thresholds under **Needs**, **Wants**, or **Investment**. Detailed category names such as Fuel, Shopping, Entertainment, or Mutual Funds are entered at the threshold level.

| Step | User action | Stored record | Resulting behavior |
| --- | --- | --- | --- |
| 1 | Select a month | None | The selected month becomes the active calculation window. |
| 2 | Save monthly settings | `activecfo_monthly_settings` | Creates or updates the opening virtual balance and emergency target. |
| 3 | Add a category threshold | `activecfo_thresholds` | The category becomes available as a measurable monthly limit. |
| 4 | Edit or delete a threshold | `activecfo_thresholds` | Dashboard usage and automatic signals reflect the change after refresh. |

## Ledger and Virtual Balance Flow

The ledger is the source for all monthly cash-flow calculations. Each record requires an entry type, first-level bucket, detailed category, description, amount, and date. The application does not infer transaction direction from the amount.

> **Virtual balance formula**
>
> `opening virtual balance + monthly income entries − monthly expense entries`

An expense is also grouped into Needs, Wants, Investment, or Other. Only matched **expense** records count toward a monthly category threshold. Income rows do not consume a category threshold.

## Investment Flow

Investment rows are separate from the ledger because they carry allocation-specific fields, such as allocation type, cost basis, optional current value, units, platform, and notes. The user may add, edit, or remove records in each of the five sections: Emergency Fund, Mutual Funds, ETFs, Crypto, and Custom Allocation.

## Signal Flow

| Signal source | Trigger | Persistence | User action |
| --- | --- | --- | --- |
| Computed threshold signal | Category usage reaches or exceeds its warning percentage | Recomputed on each dashboard request | Adjust threshold or ledger records. |
| Manual signal | User adds it from Signals | Stored in `activecfo_signals` | Edit, resolve, or delete it. |
| Guardrail | User defines a standing rule | Stored in `activecfo_guardrails` | Edit, pause, or delete it. |

## Global Dashboard Flow

| Step | User action | Server action | Result |
| --- | --- | --- | --- |
| 1 | Open Global Dashboard. | Loads the selected profile’s current year/month analysis. | The dashboard uses actual saved Supabase data. |
| 2 | Choose a year and month. | Validates the period and creates a month window. | The analysis query refreshes. |
| 3 | View charts. | Aggregates expense rows by day, bucket, category, and threshold. | Charts show monthly spending trend, allocation mix, top categories, and threshold usage. |
| 4 | Add or edit a ledger record. | Persists a record through tRPC and Supabase. | Refreshing the Global Dashboard reflects the new analysis. |

## CRUD Outcome Flow

Every form save waits for the server mutation to succeed before the modal closes and before a success message appears. A failed request leaves the form open and displays the server error. Deletes require a browser confirmation, wait for a successful response, and then refresh the relevant data view.
