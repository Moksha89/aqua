# AE Farm & Financial Management — Technical Architecture

Derived from *AE Farm & Financial Management Application — Business Process Document v2.0* and the
*Aqua Farm Management App* presentation blueprint. This document is the engineering counterpart to
the BPD: it fixes the stack, the data model, the API surface, the sync protocol and the calculation
engine. Where the BPD states a binding business rule, this document names the mechanism that
enforces it.

---

## 1. Constraints that drive every decision

| # | Constraint (from BPD) | Architectural consequence |
|---|---|---|
| C1 | Pond-side entry with unreliable connectivity; feed, tray, water, sampling and expenses must all work offline | A real local relational DB + durable outbox on mobile. Not a cache — a source of truth until synced. |
| C2 | "All computation is performed server-side and returned to clients; clients never compute financial figures independently" (§7) | One calculation engine, on the server. Clients render numbers; they never derive money. |
| C3 | A full day's feed log for one pond in under 15 seconds (§11.2) | Local-first writes with zero network in the interaction path; previous-value defaults resolved locally. |
| C4 | Financial conflicts must never be silently overwritten; operational conflicts may use last-write-wins with a marker (§11.1) | Per-entity conflict policy in the sync protocol, not a single global strategy. |
| C5 | Records are never hard-deleted; full audit trail on financial records (§3, §11.4) | Soft delete + append-only audit tables at the DB layer, not in application code. |
| C6 | Any allocated amount must be tappable to reveal how it was derived (§7.4) | Allocations are persisted with their inputs, not recomputed on demand. Derivations are data. |
| C7 | English, Telugu, Tamil, Bengali, Odia, Hindi; lakh/crore grouping | i18n in all three clients + server-side message catalogues for push/PDF. |
| C8 | Money must not drift | All monetary values are `bigint` **paise**. No floats anywhere in the money path. |
| C9 | v2 must add a farm-level stock location without migrating transaction history (§10) | Inventory movements modelled now with a nullable `location_id`, defaulted to the crop. |

---

## 2. Stack

### 2.1 Mobile — Flutter 3.x (Android + iOS)

- **Local DB:** Drift (SQLite). Typed queries, migrations, and the ability to hold the whole
  business schema locally, which a key-value cache cannot.
- **State:** Riverpod. **Routing:** go_router.
- **Offline:** Drift tables + an `outbox` table; a background sync isolate drains it.
- **Media:** `camera` + `image_picker`, on-device compression before queueing uploads.
- **Voice:** `speech_to_text` for remarks fields only (never for numeric fields).
- **Push:** Firebase Cloud Messaging.
- **i18n:** ARB files + `intl`; Indian digit grouping via a custom `NumberFormat` wrapper.

*Why Flutter over React Native:* consistent complex-script rendering (Telugu/Odia/Bengali
conjuncts) across cheap Android devices, predictable performance on long pond lists, and a
single rendering pipeline for the high-contrast outdoor theme. React Native + WatermelonDB is a
viable alternative if code sharing with the web client outweighs the above.

### 2.2 Backend — NestJS (TypeScript) + PostgreSQL 16 + Prisma

- **NestJS** modular monolith. Modules map 1:1 to BPD sections (see §4).
- **PostgreSQL** for transactional integrity, date arithmetic (occupancy days), `numeric`-free
  integer money, partial indexes and materialized views for dashboards.
- **Prisma** for schema and type-safe access; raw SQL for the reporting views.
- **Redis + BullMQ** for scheduled jobs: month-end allocation runs, alert evaluation, PDF/Excel
  generation, sync-conflict notifications.
- **S3-compatible object storage** (MinIO in dev) for bill/tray/lab photos, via presigned uploads.
- **Auth:** OTP (mobile) → JWT access + refresh; device registration table (`device_id` is required
  on every write, per §3).

*Alternative:* Laravel 11 + MySQL is fully capable of everything here and matches the existing team
stack. The only thing NestJS buys is one language across mobile-adjacent tooling, web and server.
The architecture below is stack-neutral apart from naming.

### 2.3 Web — Next.js (App Router) + TypeScript + Tailwind + TanStack Query

Bulk master data entry, accountant screens, detailed reports, admin. PWA with a limited offline
cache (BPD §11.3 already scopes web offline as "Limited"). Charts via Recharts / ECharts.

### 2.4 Cross-cutting

| Concern | Choice |
|---|---|
| API | REST + JSON, versioned `/api/v1`, OpenAPI generated from NestJS decorators |
| Client SDKs | Generated from OpenAPI (Dart + TS) so the three clients cannot drift |
| Files | Presigned PUT to object storage; the API only stores keys |
| Exports | Server-side PDF (Puppeteer) + Excel (ExcelJS); WhatsApp share = share the generated file/link |
| Observability | OpenTelemetry traces, structured logs, Sentry on all three clients |
| CI/CD | GitHub Actions → containerised API, Fastlane for mobile, Vercel/containers for web |
| Testing | Golden-value test suite for the rules engine (§6.6) — the non-negotiable one |

---

## 3. System shape

```
 Flutter app (Android/iOS)          Next.js web
   SQLite (Drift) + outbox            PWA cache
        │  delta sync                     │ REST
        └──────────────┬──────────────────┘
                       ▼
               NestJS API (modular monolith)
   ┌───────────────────────────────────────────────┐
   │ auth │ masters │ crop │ operations │ finance  │
   │ sync │ rules-engine │ reports │ alerts │ audit│
   └───────────────────────────────────────────────┘
         │              │                 │
   PostgreSQL      Redis/BullMQ      Object storage
                        │
                  FCM push / email
```

The rules engine is a **library module with no HTTP surface**, called by the crop, finance and
report modules. It is pure: inputs in, derived values out, no I/O. That is what makes it testable
against the BPD's worked examples.

---

## 4. Backend module map

| Module | Owns | BPD ref |
|---|---|---|
| `auth` | OTP login, JWT, devices, business switching, role grants | §3 |
| `masters` | business, farm, pond, lease, species, feed, medicine, party, labour, asset, cost head, rate cards | §4 |
| `crop` | crop lifecycle, stocking batches, preparation pool transfer, closure | P3–P5, P14 |
| `operations` | feed logs, check trays, growth samples, water readings, medicine applications, health events, attendance | P6–P10 |
| `finance` | expenses, payments, party ledger, supplier credit, lease schedules, depreciation schedules, common pool | P11, §7 |
| `harvest` | harvest events, count/grade lines, deductions, scrap sales, market rate cards | P12–P13 |
| `rules-engine` | every formula in §6 below | §7 |
| `allocation` | month-end + closure allocation runs, apportionment postings | §7.4, P15 |
| `reports` | crop / pond / business reports, exports | §8 |
| `alerts` | alert evaluation, preferences, channels, quiet hours | §9 |
| `sync` | pull/push delta endpoints, conflict resolution | §11.1 |
| `audit` | audit log, void/reverse, reopen tracking | §3, §12 |

---

## 5. Data model

All tables carry: `id uuid` (client-generatable), `business_id uuid`, `created_at`, `updated_at`,
`created_by`, `updated_by`, `device_id`, `rev bigint`, `voided_at`, `voided_by`, `void_reason`.
`rev` is a per-business monotonic counter (Postgres sequence) used by delta sync — not a timestamp,
so clock skew on cheap Android devices cannot lose records.

Money columns are `bigint` paise and suffixed `_paise`. Quantities are `numeric(14,3)`.

### 5.1 Organisation & masters

```
ae_business(id, name, mobile, state, district, village, language, currency='INR',
            fy_start_month, business_type, gstin, pan)

user_account(id, mobile, name, default_language, status)
user_business_role(user_id, business_id, role, financial_access boolean default false,
                   pond_scope uuid[] null)      -- non-owner financial access OFF by default (§3)
device(id, user_id, platform, push_token, last_seen_at)

farm(id, business_id, name, address, lat, lng, total_extent_acres,
     water_source_type, electricity_service_numbers text[])

pond(id, farm_id, code, name, extent_acres numeric(10,4), ownership_type,   -- 'LEASED'|'OWN'
     water_depth_m, pond_type, shape, geo_boundary jsonb,
     status,                                   -- IDLE|UNDER_PREPARATION|STOCKED|HARVESTING|CLOSED
     lease_agreement_id null)

lease_agreement(id, business_id, landlord_name, landlord_contact, extent_acres,
                rate_per_acre_per_annum_paise, start_date, end_date,
                payment_frequency,             -- HALF_YEARLY|ANNUAL|CUSTOM
                advance_paise, advance_refundable, escalation_json, document_key)
lease_pond(lease_agreement_id, pond_id)        -- one agreement may cover many ponds
lease_payment_schedule(id, lease_agreement_id, due_date, amount_paise, status)
lease_payment(id, schedule_id, paid_on, amount_paise, mode, reference)

species(id, business_id null, category, name, default_doc_days,
        default_target_size_g, default_survival_pct, water_param_ranges jsonb)
        -- business_id NULL = system pre-seeded; non-null = AE extension

feed_item(id, business_id, brand, feed_type, grade_code, bag_weight_kg, supplier_id)
feed_rate_history(id, feed_item_id, effective_from, rate_per_kg_paise)
medicine_item(id, business_id, name, category, unit, pack_size, supplier_id)
medicine_rate_history(id, medicine_item_id, effective_from, rate_per_unit_paise)

party(id, business_id, name, type[], mobile, address, opening_balance_paise)
      -- type: HATCHERY|FEED_DEALER|MEDICINE_DEALER|TRADER|LANDLORD|LABOUR_CONTRACTOR|OTHER
supplier_credit_limit(id, party_id, limit_paise, credit_period_days, effective_from)

labour(id, business_id, name, mobile, engagement_type, default_rate_paise, rate_basis)
attendance_log(id, business_id, labour_id, pond_id null, crop_id null, work_date,
               days numeric(4,2), amount_paise)

asset(id, business_id, name, category, pond_id null,     -- null = shared/common
      purchase_date, cost_paise, salvage_pct, useful_life_years,
      disposal_date null, disposal_value_paise null)

cost_head(id, business_id null, code, name, classification, default_allocation_basis)
      -- classification: DIRECT|COMMON|TIME_APPORTIONED|PRE_CROP|IDLE

market_rate_reference(id, business_id, rate_date, region, species_id,
                      basis,                    -- COUNT | GRADE
                      key,                      -- '30','40',... or '1.0-1.5kg'
                      rate_per_kg_paise)
```

### 5.2 Crop — the aggregate root

Nothing that belongs to a crop is recorded without `crop_id` (BPD §10, engineering note 1).

```
crop(id, pond_id, code, species_category,             -- SHRIMP | FISH
     status,                                          -- PLANNED|ACTIVE|HARVESTING|CLOSED
     preparation_start_date,                          -- occupancy clock starts here
     stocking_date,                                   -- DOC clock starts here (first batch)
     weighted_stocking_date,                          -- for growth analysis (multi-batch)
     expected_harvest_date, target_size_g,
     survival_assumption_pct, feed_logging_enabled boolean,
     final_harvest_date null, closed_at null, closed_by null,
     reopened_count int default 0,
     stocking_flags jsonb)   -- e.g. {"stocked_while_water_not_ready": true, "params": [...]}

crop_species_line(id, crop_id, species_id)            -- polyculture (fish)
stocking_batch(id, crop_id, species_id, stocked_on, quantity_pieces,
               pl_stage, seed_size_g, supplier_party_id,
               rate_basis, rate_paise, seed_cost_paise, transport_cost_paise,
               acclimatisation_notes)

preparation_activity(id, pond_id, crop_id null,       -- null until stocking transfers the pool
                     template_item_id null, name, start_date, completion_date,
                     labour_cost_paise, material_cost_paise, amount_paise,
                     payee_party_id, attachment_key, remarks)
preparation_template(id, business_id, species_category, name, items jsonb)
```

**Preparation pool transfer (P3 → P5).** Preparation rows are written with `crop_id = NULL` and
`pond_id` set. On stocking, the transaction sets `crop_id` on every open row for that pond and
copies `MIN(start_date)` into `crop.preparation_start_date`. If preparation is abandoned, the rows
are re-tagged to an `ABANDONED_PREPARATION` business-level cost head with a reason.

### 5.3 Operations

```
feed_log(id, crop_id, log_date, meal_slot, feed_item_id, quantity_kg,
         bags int, loose_kg, feeder_labour_id, remarks, photo_key)
check_tray(id, crop_id, tray_code, position, feed_placed_kg, check_interval_min)
check_tray_reading(id, check_tray_id, crop_id, read_at, feed_placed_kg,
                   residual_code,          -- EMPTY|TRACE|PARTIAL_25|PARTIAL_50|PARTIAL_75|FULL
                   residual_weight_g null, gut_fullness, colour, activity,
                   moulting, dead_seen int, shell_condition, photo_key)
growth_sample(id, crop_id, species_id null, sampled_on, doc int,
              animals_in_sample int, sample_weight_g,
              individual_weights_g numeric[] null,
              abw_g,                       -- computed server-side, stored
              revised_survival_pct null, revision_reason, health_notes)
water_reading(id, crop_id null, pond_id, read_at, slot,   -- MORNING|EVENING
              salinity_ppt, ph, alkalinity, hardness, do_mgl, temperature_c,
              ammonia, nitrite, transparency_cm, vibrio_total, vibrio_green,
              plankton_note, lab_report_key, source)      -- INHOUSE|LAB
medicine_application(id, crop_id, applied_on, medicine_item_id, quantity, unit,
                     method, reason,        -- ROUTINE | CORRECTIVE
                     cost_paise)
health_event(id, crop_id, event_date, doc, symptoms text[], mortality_count,
             mortality_pct, suspected_cause, lab_tested, lab_report_key,
             treatment, technician_party_id, outcome)
```

### 5.4 Finance

```
expense(id, business_id, expense_date, cost_head_id,
        allocation_target,                 -- POND_CROP | COMMON   (no third option, Rule 6)
        pond_id null, crop_id null, common_pool_id null,
        amount_paise, quantity, rate_paise, party_id,
        payment_status,                    -- PAID | UNPAID | PART_PAID
        paid_amount_paise, payment_mode, payment_reference,
        bill_key, remarks,
        rate_pending boolean default false)
CHECK: (allocation_target='POND_CROP' AND pond_id IS NOT NULL)
    OR (allocation_target='COMMON'    AND common_pool_id IS NOT NULL)

payment(id, business_id, party_id, paid_on, direction,   -- OUT | IN
        amount_paise, mode, reference, notes)
payment_allocation(payment_id, expense_id null, harvest_event_id null,
                   lease_schedule_id null, amount_paise)
        -- payments never re-book the expense (Rule: P11)

common_expense_pool(id, business_id, period_month, cost_head_id, basis,
                    amount_paise, status)              -- OPEN | ALLOCATED
allocation_run(id, business_id, period_start, period_end, trigger,  -- MONTH_END | CLOSURE
               status, executed_at, executed_by)
apportioned_cost(id, crop_id, allocation_run_id null, kind,
                 -- LEASE | DEPRECIATION | COMMON
                 cost_head_id, amount_paise, from_date, to_date, days int,
                 derivation jsonb)         -- C6: the tappable working, persisted
depreciation_schedule(id, asset_id, period_start, period_end,
                      daily_depreciation_paise, method='SLM')

crop_input_balance(id, crop_id, item_type, item_id,     -- FEED | MEDICINE
                   qty_purchased, qty_consumed, qty_on_hand,
                   weighted_avg_rate_paise, carried_in_qty, carried_in_value_paise,
                   location_id null)                     -- C9: v2 stock-location seam
```

### 5.5 Harvest, closure, P&L

```
harvest_event(id, crop_id, harvest_date, doc, type,     -- PARTIAL | FINAL
              buyer_party_id, reason,                    -- TARGET_SIZE|MARKET_RATE|DISEASE|SEASON_END|OTHER
              sample_taken boolean, sample_count int, sample_weight_g,
              abw_g null,                                -- computed, never typed (§14.1)
              rate_card_id null,
              gross_value_paise, deductions_paise, net_realisation_paise,
              receivable_paise, receivable_due_date)
harvest_line(id, harvest_event_id, species_id null, basis,  -- COUNT | GRADE
             key, quantity_kg, rate_per_kg_paise, line_value_paise)
harvest_deduction(id, harvest_event_id, kind, amount_paise)
             -- LABOUR|ICE|TRANSPORT|COMMISSION|WEIGHMENT|TRADER_DEDUCTION|OTHER
scrap_sale(id, business_id, crop_id null, pond_id null, sale_date, item,
           quantity, rate_paise, buyer_party_id, amount_paise)

crop_pnl(id, crop_id, version int, generated_at, generated_by,
         payload jsonb,          -- the full §7.5 statement, frozen
         is_current boolean)
crop_closure_checklist(id, crop_id, step, status, note)
idle_pond_cost(id, pond_id, from_date, to_date, days, lease_paise,
               depreciation_paise, other_paise)
```

### 5.6 Sync & audit

```
audit_log(id, business_id, entity, entity_id, action,   -- CREATE|UPDATE|VOID|REOPEN|CLOSE
          user_id, device_id, at, before jsonb, after jsonb, reason)
sync_conflict(id, business_id, entity, entity_id, class,  -- OPERATIONAL | FINANCIAL
              server_rev, client_payload jsonb, server_payload jsonb,
              status, resolved_by, resolved_at, resolution)
outbox_receipt(id, business_id, device_id, idempotency_key unique, entity,
               entity_id, applied_rev, received_at)
```

---

## 6. The rules engine

Pure functions, one module, exhaustively unit-tested against the BPD's stated formulas and worked
example. Nothing else in the codebase is allowed to compute a derived number.

### 6.1 Operational

```
stocking_density_per_acre = Σ batch.quantity_pieces / pond.extent_acres
abw_g                     = sample_weight_g / animals_in_sample
count_shrimp              = 1000 / abw_g
adg_g_per_day             = (abw_now − abw_prev) / days_between
estimated_survivors       = seed_stocked × survival_assumption_pct / 100
                            − Σ partial-harvest animals removed
estimated_biomass_kg      = estimated_survivors × abw_g / 1000
feeding_rate_pct          = daily_feed_kg / estimated_biomass_kg × 100
fcr_period                = feed_in_period_kg / biomass_gained_in_period_kg
fcr_cumulative            = total_feed_kg / (current_biomass_kg − stocked_biomass_kg)
projected_harvest_date    = date at which abw reaches target_size_g at current adg
```

Every one of these is returned tagged `{ value, status: "ESTIMATED" | "ACTUAL", derivation }`
before harvest. The `status` field is part of the API contract, not a UI concern — BPD Rule:
all pre-harvest biomass/FCR/profitability figures are labelled Estimated.

### 6.2 Time-apportioned costs (P15)

```
occupancy_days   = (final_harvest_date − preparation_start_date) + 1
lease_to_crop    = (rate_per_acre_per_annum × pond_acres / 365) × occupancy_days
annual_depn      = (asset_cost − salvage) / useful_life_years
daily_depn       = annual_depn / 365
depn_to_crop     = daily_depn × occupancy_days                       -- pond-assigned asset
shared_depn      = (daily_depn × pond_basis_share) × occupancy_days  -- shared asset
```

Enforced invariants:
- Occupancy **starts at preparation start**, not stocking. DOC and occupancy are separate columns
  and separate code paths.
- Occupancy **ends at actual final harvest**. Nothing may reference a planned duration.
- Depreciation stops at `disposal_date`; starts at `purchase_date` for mid-crop purchases; assets
  under repair keep depreciating.
- Days between final harvest and the next preparation start are written to `idle_pond_cost` and are
  never reachable from any crop query. A DB-level check plus a nightly reconciliation job assert
  that, for each pond, `Σ crop occupancy days + Σ idle days = calendar days`.

Regression test: the BPD worked example must return exactly ₹44,384 lease, ₹18,071 aerators,
₹3,745 generator share, ₹66,200 total; and the early-harvest variant ₹39,229 with 55 idle days.

### 6.3 Input valuation (§7.2, §7.3)

```
1. weighted average rate of quantity purchased into that crop to date
2. else latest item-master rate effective on or before consumption date
3. else prompt AE → row flagged rate_pending, excluded from headline cost/kg
```

Rate history changes never revalue consumption already recorded — `feed_log` stores the applied
rate at write time. With feed logging ON the log is the *sole* source of feed cost; with it OFF,
purchases book directly to the crop and all log-derived analytics are hidden, not shown empty.

### 6.4 Common cost allocation (§7.4)

```
pond_share = common_cost_for_period
           × (pond_basis_value / Σ basis values of participating ponds)
           × (crop_active_days_in_period / days_in_period)
```

Runs at month-end and again at closure for the residual period. Basis is AE-selected — pond extent
(acres) or active aerator count — with equal split as an alternative. **The full input set of every
allocation is written to `apportioned_cost.derivation`** so the "tap to see the working" screen
reads persisted facts rather than re-deriving them from data that may have since changed.

### 6.5 Harvest and P&L

```
gross_harvest_value   = Σ (quantity_kg × rate_per_kg)
net_realisation       = gross − deductions
abw_at_harvest_g      = sample_weight_g / sample_count      -- computed, never typed
actual_count          = 1000 / abw_at_harvest_g
animals_harvested     = total_harvested_weight_g / abw_at_harvest_g
actual_survival_pct   = animals_harvested / seed_stocked × 100
actual_fcr            = total_feed_kg / (harvested_biomass_kg − stocked_biomass_kg)
yield_per_acre_kg     = total_harvested_kg / pond_acres
cost_per_kg           = total_crop_cost / total_harvested_kg
realised_rate_per_kg  = gross_harvest_value / total_harvested_kg
margin_per_kg         = realised_rate_per_kg − cost_per_kg
profit_per_acre       = net_profit / pond_acres
roi_pct               = net_profit / total_crop_cost × 100
```

The P&L is generated in the §7.5 layout (Revenue → Direct costs → Gross margin → Time-apportioned →
Net profit) and **frozen into `crop_pnl.payload` with a version number** at closure. Reopening a
crop creates a new version; the old one is never mutated.

**The ABW guard (§14.1).** Because survival, actual FCR and actual count all hang off one field:
- the harvest screen takes `sample_count` and `sample_weight_g` separately and computes ABW;
- a plausibility check compares it against the last growth sample and warns on an implausible jump;
- an explicit "sample not taken" path sets `sample_taken = false`, and the API then returns
  `survival: { status: "NOT_DETERMINABLE" }` rather than a number.

### 6.6 Test suite (the acceptance gate)

Golden-value tests, one file per rule: lease and occupancy dates · depreciation (incl. mid-crop
purchase and disposal) · weighted average rates · feed balance and carry-forward · partial harvest
biomass reduction · ABW plausibility · survival and FCR · common allocation · full P&L · idle-day
reconciliation · duplicate prevention · roles and audit trail. The BPD's Phase-1/Phase-2 success
criteria become end-to-end tests: one full crop from preparation to P&L, and a one-pond daily feed
entry under 15 seconds measured on a low-end device.

---

## 7. Offline sync protocol

### 7.1 Identifiers and idempotency

Clients generate UUIDv7 primary keys offline, so a record's identity never changes on sync — no
temp-ID remapping, and photos/child rows can reference the parent before it reaches the server.
Every push carries an `Idempotency-Key`; the server records it in `outbox_receipt` and replays the
prior result on retry.

### 7.2 Endpoints

```
GET  /api/v1/sync/pull?since_rev=<n>&scope=<pondIds>
      → { changes: [{entity, id, rev, op, payload}], server_rev, has_more }

POST /api/v1/sync/push
      { device_id, mutations: [{ idempotency_key, entity, id, op, base_rev, payload }] }
      → { results: [{ id, status: APPLIED|CONFLICT|REJECTED, rev, conflict_id? }],
          server_rev }
```

Pull is scoped by role: a pond operator pulls only assigned ponds, and pulls no financial entities
at all when `financial_access = false` (enforced server-side, §11.4).

### 7.3 Conflict policy — per entity class

| Class | Entities | Policy |
|---|---|---|
| Operational | feed_log, check_tray_reading, water_reading, growth_sample, attendance | Last-write-wins by server receipt order; a `sync_conflict` row is created with `class=OPERATIONAL` and the record is flagged in the UI with a visible conflict marker |
| Financial | expense, payment, harvest_event/line, lease_payment, scrap_sale, apportioned_cost | **Never overwritten.** The mutation is parked as `CONFLICT`, surfaced in an AE resolution queue; the server state stands until the AE chooses |
| Derived | crop_pnl, apportioned_cost, crop_input_balance | Server-owned. Client writes are rejected outright |

`base_rev` mismatch is what triggers the classification. Duplicate prevention beyond idempotency:
a unique partial index on `(crop_id, log_date, meal_slot, feed_item_id) WHERE voided_at IS NULL`
for feed logs, and equivalents for tray readings and water readings.

### 7.4 Client state machine

`PENDING → SYNCING → SYNCED | CONFLICT | REJECTED`, always visible in the UI (BPD §19 of the deck:
"show Synced or Conflict"). Photos upload separately via presigned URLs with resumable retry; a row
is `SYNCED` only when its attachments are too.

---

## 8. API surface (representative, not exhaustive)

```
POST /auth/otp/request           POST /auth/otp/verify         POST /auth/refresh
GET  /businesses                 POST /businesses/:id/switch

CRUD /masters/{farms,ponds,leases,species,feed-items,medicine-items,
                parties,labour,assets,cost-heads,preparation-templates}
GET  /masters/rate-cards?date=&region=          POST /masters/rate-cards

POST /ponds/:id/preparation-activities
GET  /ponds/:id/readiness                       -- advisory verdict + out-of-range params
POST /ponds/:id/stock                           -- creates the crop; the pivotal transaction

GET  /crops/:id                                 -- header + live estimated KPIs
POST /crops/:id/feed-logs        POST /crops/:id/feed-logs/same-as-yesterday
POST /crops/:id/tray-readings    GET  /crops/:id/tray-verdict
POST /crops/:id/growth-samples   POST /crops/:id/water-readings
POST /crops/:id/medicine         POST /crops/:id/health-events
POST /crops/:id/harvests         POST /crops/:id/scrap-sales
GET  /crops/:id/closure-checklist   POST /crops/:id/close   POST /crops/:id/reopen
GET  /crops/:id/pnl              GET /crops/:id/estimate-vs-actual

POST /expenses                   POST /payments
GET  /finance/party-ledger/:partyId      GET /finance/payables  GET /finance/receivables
GET  /finance/credit-utilisation         GET /finance/cash-forecast
GET  /finance/allocations/:id/derivation -- the tap-to-see-working payload

GET  /reports/dashboard          GET /reports/pond/:id/history
GET  /reports/business/pnl       GET /reports/business/cashflow
GET  /reports/comparisons/{crop-vs-crop,pond-vs-pond,cost-head,count-realisation,break-even}
POST /reports/:key/export        -- { format: PDF|XLSX } → job id → file URL

GET  /alerts                     PUT /alerts/preferences
GET  /sync/pull                  POST /sync/push
GET  /conflicts                  POST /conflicts/:id/resolve
```

Every response carrying a derived number uses the envelope
`{ value, unit, status: ESTIMATED|ACTUAL|NOT_DETERMINABLE, derivation_ref }`.

---

## 9. Mobile app structure

Five tabs, per the deck: **Home · My Ponds · Daily Entry · Money · More**, plus a global Quick Add
(Expense | Feed | Sampling | Water | Medicine | Health Event | Harvest | Payment).

Speed measures for the 15-second target:
- "Same as yesterday" resolves entirely from the local DB; the write is a single SQLite insert.
- Bulk feed entry: one screen, all assigned ponds, numeric keypad, no navigation between ponds.
- Defaults (feed brand/grade, feeder, meal slots) are denormalised onto the local crop row so no
  joins or lookups sit in the interaction path.
- Every numeric field opens the numeric keypad; free text is voice-enabled and always optional.

Theme: high-contrast outdoor palette, minimum 48dp touch targets, no colour-only status encoding
(green/amber/red always paired with an icon and a label).

---

## 10. Security & compliance

- Role checks are server-side on every endpoint; `financial_access` gates both endpoints *and* the
  sync pull scope, so a device with an operator token never receives financial rows to begin with.
- Local SQLite encrypted (SQLCipher) with the key in Keychain/Keystore; local data is wiped on
  logout or remote device revocation.
- Soft delete only; `audit_log` is append-only (revoked UPDATE/DELETE at the role level).
- Photos are private-bucket objects served via short-lived presigned GETs.
- Account data export on request; historical crops are never purged.

---

## 11. Delivery plan

| Phase | Scope | Engineering emphasis |
|---|---|---|
| **0 — Validate** | Farmer interviews, Telugu terminology, wireframes, formula sign-off, crab workflow scoping | Lock the rules-engine test vectors *before* code |
| **1 — Foundation v1.0** | Onboarding, masters, pond & lease setup, preparation, stocking, expenses, supplier credit, harvest, closure, P&L, dashboard | Rules engine, apportionment, allocation, audit, basic sync |
| **2 — Operations v1.5** | Feed logging + crop input balance, check trays, growth/FCR, water, health, alerts | Hardened offline sync, conflict queue, 15-second feed entry |
| **3 — Insights v1.8** | Comparisons, break-even tracking, projections, cash forecast, count-realisation analysis, full multilingual rollout | Reporting views, export pipeline |
| **4 — Expansion v2.0** | Godown/stock locations, loans, regional benchmarking, IoT, supplier/buyer connectivity, crab module | Introduce `StockLocation` via the seam left at §5.4 |

---

## 12. Open items for the business

1. **§7.6 defines cost per kg and break-even rate per kg with the identical formula**
   (`total crop cost ÷ harvested kg`). As written, break-even carries no information beyond
   cost/kg. The useful definition is forward-looking — the rate at which the crop breaks even given
   *projected* harvest weight and *committed* remaining cost — which is what §8.5's "break-even
   tracking against today's market rate" actually needs. Needs a decision before the insight layer.
2. **Crab** appears in the deck as a new module but has no process definition in the BPD (no
   preparation checklist, no pricing basis, no growth metric). Scoped to v2 here.
3. **Cumulative FCR** uses estimated biomass pre-harvest and actual post-harvest; the transition
   point at each partial harvest needs an explicit convention so the FCR chart does not step.
4. **Idle cost ownership** is defined at AE level; confirm whether it should also be attributed to a
   pond in the pond-lifetime-profitability report (this document assumes yes, per §8.3's
   "idle days and idle cost per pond").
