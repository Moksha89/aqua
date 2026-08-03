# Rules engine fixed-point and rounding conventions

All derived values use explicit fixed-point scales from
`apps/api/src/rules-engine/scales.ts`:

- money: integer paise
- ABW and samples: milligrams
- harvest quantities and biomass: grams
- pond extent: acres × 10,000
- percentages: basis points × 10,000
- ratios (FCR and feeding rate): × 10,000

Daily lease and depreciation rates are rounded half-up to whole paise before they
are multiplied by occupancy days. This models the ledger's posted daily accrual.

For the worked example, this produces daily rates of 32,877 paise lease,
13,386 paise aerators, and 2,774 paise generator share. The exact paise totals
for 135 days are 4,438,395, 1,807,110, and 374,490; displaying those totals in
rupees with half-up rounding gives ₹44,384, ₹18,071, and ₹3,745, and ₹66,200
overall.

The 80-day direct recalculation gives 3,922,960 paise, or ₹39,230. The BPD's
₹39,229 figure comes from prorating the displayed 135-day total
(₹66,200 × 80 / 135), rather than recalculating from the posted daily rates.
The implementation uses direct recalculation and retains the one-rupee
documented divergence.

`breakEvenRatePerKg` is intentionally forward-looking (committed cost plus
projected remaining cost divided by projected harvest weight), because the BPD's
current definition duplicates backward-looking `costPerKg`. This is marked as a
client-confirmation deviation in code.
