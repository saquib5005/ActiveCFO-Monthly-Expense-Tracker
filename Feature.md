# ActiveCFO Feature Inventory

## Feature Scope

ActiveCFO is a manual personal-finance workspace for exactly two selectable profiles: **Saquib** and **Rahat**. It is intentionally not an authentication product, bank-aggregation product, brokerage product, or investment recommendation engine.

| Area | Implemented capability | CRUD coverage | Data source |
| --- | --- | --- | --- |
| Profile selection | Switch direct workspace between Saquib and Rahat | Read/select only | `activecfo_profiles` |
| Overview | Shows computed balance, investment values, emergency fund, outflow, threshold pulse, and signals | Read | Aggregated server query |
| Global Dashboard | Select a year and month to analyse daily spend, bucket mix, categories, and threshold health | Read | Supabase ledger and threshold records through `globalDashboard` |
| Monthly setup | Opening balance, emergency-month target, thresholds | Create, update, delete | Monthly settings and thresholds tables |
| Categories | Needs, Wants, Investment taxonomy with detailed suggested categories | Create custom threshold or ledger category | User-entered records |
| Ledger | Income and expense records, categories, payment methods, notes | Create, read, update, delete | Ledger table |
| Investments | Emergency Fund, Mutual Funds, ETFs, Crypto, Custom Allocation | Create, read, update, delete | Investment records table |
| Insurance | Term, Health, Corporate policy sections | Create, read, update, delete | Insurance records table |
| Guardrails | Spend caps, balance floors, runway, investment caps, insurance reviews | Create, read, update, delete; pause | Guardrails table |
| Strategies | Review cadence, trigger, action, status | Create, read, update, delete | Strategies table |
| Signals | Computed threshold warnings and manual reminders | Manual: CRUD; computed: read | Signals table plus calculation layer |
| Help Center | Operational quick-start guidance and workspace-specific articles | Custom articles: CRUD | Help articles table |

## Detailed Category Suggestions

The application presents category suggestions but does not prevent other detailed categories. This preserves a user’s ability to create categories later without schema changes.

| First-level bucket | Suggested detailed categories |
| --- | --- |
| Needs | Housing, Groceries, Utilities, Fuel, Transport, Healthcare, Education, Insurance, Household, Debt repayment |
| Wants | Entertainment, Dining, Shopping, Travel, Personal care, Subscriptions, Gifts, Hobbies |
| Investment | Emergency Fund, Mutual Funds, ETFs, Crypto, Custom Allocation |

## Calculation Definitions

| Metric | Definition |
| --- | --- |
| Virtual balance | Opening virtual balance plus income minus expenses for the selected month. |
| Invested capital | Sum of the cost basis of active investment records. |
| Investment value | Sum of current value where supplied; otherwise cost basis for each active investment record. |
| Emergency fund | Sum of active Emergency Fund records using current value where supplied, otherwise cost basis. |
| Category usage | Sum of matching monthly expense rows divided by that threshold’s amount. |
| Wants usage | Total Wants expenses divided by the sum of all Wants thresholds. |
| Global monthly spend | Sum of selected-month expense rows for the selected profile. |
| Global category and bucket mix | Selected-month expense rows grouped by their saved category and first-level bucket. |
| Daily outflow trend | Selected-month expense rows grouped by calendar day; zero values represent days with no recorded expense. |

## Expected Empty States

An empty workspace is a valid state. Overview values begin at zero until a user enters settings, ledger records, or allocations. The application must not fabricate transactions, investment positions, ratings, recommendations, or household finance data.
