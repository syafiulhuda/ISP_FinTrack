-- ============================================================
-- ISP-FINTRACK QA VALIDATION QUERY
-- Verifies DB values vs what is displayed on each web page
-- Period  : 2026-01-01 to 2026-04-30 | Region: All
-- Usage   : Run as-is in pgAdmin/psql — no input required
-- Fixes   : LIMIT-in-UNION, date::text cast, ROW_NUMBER parens,
--           harga_beli safe fallback, removed JS function ref
-- ============================================================
WITH

-- ============================================================
-- [0] PARAMS — edit only this block to change test scope
-- ============================================================
params AS (
  SELECT
    '2026-01-01'::date AS p_start,
    '2026-04-30'::date AS p_end,
    '2026-04'::text    AS p_end_month,
    '2026-03'::text    AS p_prev_month
),

-- ============================================================
-- [1] BASE: VERIFIED TRANSACTIONS  (amount -> numeric, WIB date)
-- ============================================================
base_tx AS (
  SELECT
    id,
    keterangan,
    status,
    CAST(NULLIF(amount, '') AS NUMERIC)                                              AS num_amount,
    (timestamp AT TIME ZONE 'Asia/Jakarta')::date                   AS tx_date,
    TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')       AS tx_month,
    city,
    SPLIT_PART(id, '-', 2)                                          AS cust_id_suffix
  FROM transactions
  WHERE status = 'Verified'
),

-- ============================================================
-- [2] BASE: CUSTOMERS  (join_date safely parsed from text)
-- ============================================================
base_cust AS (
  SELECT
    id::text AS id,
    name, service, city, province, village, district, status,
    CASE
      WHEN "createdAt" IS NULL                  THEN NULL
      WHEN "createdAt" ~ '^\d{4}-\d{2}-\d{2}'
        THEN ("createdAt"::timestamptz AT TIME ZONE 'Asia/Jakarta')::date
      ELSE NULL
    END AS join_date
  FROM customers
),

-- ============================================================
-- [3] DASHBOARD — latest month detected automatically
-- ============================================================
dash_latest AS (
  SELECT MAX(tx_month) AS lm
  FROM base_tx
  WHERE keterangan = 'pemasukan'
),
dash_prev_m AS (
  SELECT lm,
    TO_CHAR((lm || '-01')::date - INTERVAL '1 month', 'YYYY-MM') AS pm
  FROM dash_latest
),
dash_curr AS (
  SELECT
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pemasukan'),  0) AS curr_rev,
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pengeluaran'),0) AS curr_exp
  FROM base_tx
  CROSS JOIN dash_latest d
  WHERE tx_month = d.lm
),
dash_prev AS (
  SELECT
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pemasukan'),  0) AS prev_rev,
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pengeluaran'),0) AS prev_exp
  FROM base_tx
  CROSS JOIN dash_prev_m dp
  WHERE tx_month = dp.pm
),
dash_active AS (
  SELECT COUNT(*) AS active_count
  FROM base_cust
  CROSS JOIN dash_latest d
  WHERE status = 'Active'
    AND TO_CHAR(join_date, 'YYYY-MM') <= d.lm
),
dash_new AS (
  SELECT COUNT(*) AS new_count
  FROM base_cust
  CROSS JOIN dash_latest d
  WHERE TO_CHAR(join_date, 'YYYY-MM') = d.lm
),
-- Revenue Growth chart: last 6 months
dash_chart AS (
  SELECT
    tx_month,
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pemasukan'),  0) AS month_rev,
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pengeluaran'),0) AS month_exp
  FROM base_tx
  WHERE tx_month IN (
    SELECT DISTINCT tx_month FROM base_tx ORDER BY tx_month DESC LIMIT 6
  )
  GROUP BY tx_month
  ORDER BY tx_month
),

-- ============================================================
-- [4] PROFITABILITY — range-based KPIs
-- ============================================================
prof_range AS (
  SELECT
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pemasukan'),  0) AS range_rev,
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pengeluaran'),0) AS range_tx_exp
  FROM base_tx
  CROSS JOIN params p
  WHERE tx_date BETWEEN p.p_start AND p.p_end
),
prof_mom_curr AS (
  SELECT
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pemasukan'),  0) AS curr_rev,
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pengeluaran'),0) AS curr_exp
  FROM base_tx
  CROSS JOIN params p
  WHERE tx_month = p.p_end_month
),
prof_mom_prev AS (
  SELECT
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pemasukan'),  0) AS prev_rev,
    COALESCE(SUM(num_amount) FILTER (WHERE keterangan = 'pengeluaran'),0) AS prev_exp
  FROM base_tx
  CROSS JOIN params p
  WHERE tx_month = p.p_prev_month
),
prof_users AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'Active')                   AS active_users,
    COUNT(*) FILTER (WHERE status IN ('Inactive','Non-Active')) AS inactive_users
  FROM base_cust
  CROSS JOIN params p
  WHERE join_date <= p.p_end
),
-- Waterfall: Revenue bar + expense breakdown from expenses table
prof_waterfall AS (
  SELECT 'Revenue' AS category, pr.range_rev AS amount, FALSE AS is_expense
  FROM prof_range pr
  UNION ALL
  SELECT
    COALESCE(e.category,'General Expense'),
    -SUM(e.amount),
    TRUE
  FROM expenses e
  CROSS JOIN params p
  WHERE e.date BETWEEN p.p_start AND p.p_end
  GROUP BY e.category
),
-- Service Plan Mix: active customers grouped by service
prof_mix AS (
  SELECT
    COALESCE(service,'Unknown')                                      AS service_plan,
    COUNT(*)                                                          AS cust_count,
    ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0), 1)   AS pct
  FROM base_cust
  CROSS JOIN params p
  WHERE status = 'Active' AND join_date <= p.p_end
  GROUP BY service
),

-- ============================================================
-- [5] REGIONAL — asset summary (no date filter)
-- ============================================================
regional_assets AS (
  SELECT
    COUNT(*)                                                          AS total_aset,
    COUNT(*) FILTER (WHERE LOWER(status) = 'online')                AS online_count,
    COUNT(*) FILTER (WHERE kepemilikan IN ('Dijual','Telah Dijual')) AS sold_count
  FROM asset_roster
),
-- Profitability by Kelurahan: revenue from service tier prices
regional_kel AS (
  SELECT
    COALESCE(bc.village,'Unknown')                                   AS node,
    COUNT(bc.id)                                                      AS total_cust,
    COUNT(bc.id) FILTER (WHERE bc.status = 'Active')                 AS active_count,
    COALESCE(SUM(
      CAST(NULLIF(REGEXP_REPLACE(COALESCE(st.price,'0'),'[^0-9]','','g'),'') AS NUMERIC)
    ) FILTER (WHERE bc.status = 'Active'), 0)                        AS revenue_est,
    COALESCE(AVG(
      CAST(NULLIF(REGEXP_REPLACE(COALESCE(st.price,'0'),'[^0-9]','','g'),'') AS NUMERIC)
    ) FILTER (WHERE bc.status = 'Active'), 0)                        AS arpu_est
  FROM base_cust bc
  LEFT JOIN service_tiers st
    ON LOWER(bc.service) = LOWER(st.name)
    OR (LOWER(st.name) = 'gamers node' AND LOWER(bc.service) = 'gamers')
  GROUP BY bc.village
),

-- ============================================================
-- [6] EXECUTIVE — Financial tab
-- Revenue    = tx.pemasukan  in range
-- Net Profit = Revenue - (tx.pengeluaran + ALL expenses table)
-- GrossProfit= Revenue - (tx.pengeluaran + server/maint/listrik only)
-- ============================================================
exec_rev AS (
  SELECT COALESCE(SUM(num_amount), 0) AS total_rev
  FROM base_tx CROSS JOIN params p
  WHERE keterangan = 'pemasukan' AND tx_date BETWEEN p.p_start AND p.p_end
),
exec_tx_exp AS (
  SELECT COALESCE(SUM(num_amount), 0) AS tx_exp
  FROM base_tx CROSS JOIN params p
  WHERE keterangan = 'pengeluaran' AND tx_date BETWEEN p.p_start AND p.p_end
),
exec_tbl_exp AS (
  SELECT
    COALESCE(SUM(amount), 0) AS total_exp,
    COALESCE(SUM(amount) FILTER (
      WHERE LOWER(category) LIKE '%server%'
         OR LOWER(category) LIKE '%maintenance%'
         OR LOWER(category) LIKE '%listrik%'
    ), 0)                    AS direct_costs
  FROM expenses CROSS JOIN params p
  WHERE date BETWEEN p.p_start AND p.p_end
),
exec_fin AS (
  SELECT
    er.total_rev                                          AS revenue,
    er.total_rev - (ete.tx_exp + eta.direct_costs)       AS gross_profit,
    er.total_rev - (ete.tx_exp + eta.total_exp)          AS net_profit,
    ete.tx_exp + eta.total_exp                           AS total_expenses
  FROM exec_rev er
  CROSS JOIN exec_tx_exp ete
  CROSS JOIN exec_tbl_exp eta
),
exec_active AS (
  SELECT COUNT(*) AS active_count
  FROM base_cust CROSS JOIN params p
  WHERE status = 'Active' AND join_date <= p.p_end
),

-- ============================================================
-- [6I] EXECUTIVE — Inventory tab
-- NOTE: harga_beli assumed to exist (added by seed script).
-- If missing, replace harga_beli references below with 0.
-- ============================================================
exec_deployed AS (
  SELECT
    COUNT(*)                                               AS deployed_count,
    COUNT(*) FILTER (WHERE condition = 'Broken')          AS broken_count,
    COALESCE(SUM(
      CAST(NULLIF(REGEXP_REPLACE(
        COALESCE(harga_beli::text,'0'),'[^0-9]','','g'),'') AS NUMERIC)
    ), 0)                                                  AS valuation
  FROM asset_roster
),
exec_stock AS (
  SELECT
    COUNT(*)                                               AS stock_count,
    COUNT(*) FILTER (WHERE condition = 'Broken')          AS broken_count,
    COALESCE(SUM(
      CAST(NULLIF(REGEXP_REPLACE(
        COALESCE(harga_beli::text,'0'),'[^0-9]','','g'),'') AS NUMERIC)
    ), 0)                                                  AS valuation
  FROM stock_asset_roster
),
exec_asset_type AS (
  SELECT type, COUNT(*) AS cnt FROM asset_roster GROUP BY type
),
exec_stock_type AS (
  SELECT type, COUNT(*) AS cnt FROM stock_asset_roster GROUP BY type
),
exec_ownership AS (
  SELECT kepemilikan, COUNT(*) AS cnt FROM asset_roster GROUP BY kepemilikan
),

-- ============================================================
-- [6R] EXECUTIVE — Regional tab
-- ============================================================
exec_prov_subs AS (
  SELECT
    COALESCE(province,'Unknown')                          AS province,
    COUNT(*) FILTER (WHERE status = 'Active')             AS active_subs
  FROM base_cust CROSS JOIN params p
  WHERE join_date <= p.p_end
  GROUP BY province
),
exec_city8 AS (
  SELECT city, active_subs FROM (
    SELECT
      COALESCE(city,'Unknown')                            AS city,
      COUNT(*) FILTER (WHERE status = 'Active')           AS active_subs
    FROM base_cust CROSS JOIN params p
    WHERE join_date <= p.p_end
    GROUP BY city
    ORDER BY active_subs DESC
    LIMIT 8
  ) t
),
exec_prov_rev AS (
  SELECT
    COALESCE(bc.province,'Unknown')                       AS province,
    COALESCE(SUM(bt.num_amount), 0)                      AS province_rev
  FROM base_tx bt
  JOIN base_cust bc ON bt.cust_id_suffix = bc.id
  CROSS JOIN params p
  WHERE bt.keterangan = 'pemasukan'
    AND bt.tx_date BETWEEN p.p_start AND p.p_end
  GROUP BY bc.province
),

-- ============================================================
-- MASTER QA RESULT  (5 columns: sort_key, page, metric, db_value, note)
-- ============================================================
qa AS (

  ----- PAGE 1: DASHBOARD -----
  SELECT 1::bigint, '=== PAGE 1: DASHBOARD ==='::text, ''::text, ''::text, ''::text

  UNION ALL SELECT 2, 'Dashboard', 'Latest Month (auto-detected)',
    (SELECT lm FROM dash_latest),
    'Max tx_month of Verified pemasukan'

  UNION ALL SELECT 3, 'Dashboard', 'Total Revenue (latest month)',
    'Rp ' || REPLACE(TO_CHAR((SELECT curr_rev FROM dash_curr),'FM999,999,999,990'),',','.'),
    'SUM verified pemasukan in latest month'

  UNION ALL SELECT 4, 'Dashboard', 'ARPU',
    'Rp ' || REPLACE(TO_CHAR(ROUND(
      CASE WHEN (SELECT active_count FROM dash_active) = 0 THEN 0::numeric
           ELSE (SELECT curr_rev FROM dash_curr) / (SELECT active_count FROM dash_active)
      END, 0), 'FM999,999,999,990'), ',', '.'),
    'Revenue / cumulative active customers at latest month'

  UNION ALL SELECT 5, 'Dashboard', 'CAC',
    CASE WHEN (SELECT new_count FROM dash_new) = 0 THEN 'N/A (no new customers)'
         ELSE 'Rp ' || REPLACE(TO_CHAR(ROUND(
           (SELECT curr_exp FROM dash_curr) / (SELECT new_count FROM dash_new), 0
         ), 'FM999,999,999,990'), ',', '.')
    END,
    'Expenses / new customers this month'

  UNION ALL SELECT 6, 'Dashboard', 'Active Customers (ARPU denom)',
    (SELECT active_count FROM dash_active)::text,
    'status=Active AND createdAt <= latest_month'

  UNION ALL SELECT 7, 'Dashboard', 'New Customers this month (CAC denom)',
    (SELECT new_count FROM dash_new)::text,
    'createdAt tx_month = latest_month'

  UNION ALL SELECT 8, 'Dashboard', 'Revenue MoM Trend %',
    CASE
      WHEN (SELECT prev_rev FROM dash_prev) = 0
       AND (SELECT curr_rev FROM dash_curr) > 0 THEN '+100.0%'
      WHEN (SELECT prev_rev FROM dash_prev) = 0 THEN '0%'
      ELSE ROUND(
        ((SELECT curr_rev FROM dash_curr) - (SELECT prev_rev FROM dash_prev))
        / (SELECT prev_rev FROM dash_prev) * 100, 1
      )::text || '%'
    END,
    'MoM badge on Total Revenue card'

  UNION ALL SELECT 9, 'Dashboard', 'Prev Month Revenue',
    'Rp ' || REPLACE(TO_CHAR((SELECT prev_rev FROM dash_prev),'FM999,999,999,990'),',','.'),
    'Verified pemasukan in prev month (ARPU trend denominator)'

  -- Revenue Growth chart: last 6 months
  UNION ALL
  SELECT
    10 + (ROW_NUMBER() OVER (ORDER BY tx_month))::bigint,
    'Dashboard [Chart: Revenue Growth]',
    tx_month,
    'Rev: Rp ' || REPLACE(TO_CHAR(month_rev,'FM999,999,999,990'),',','.')
    || ' | Exp: Rp ' || REPLACE(TO_CHAR(month_exp,'FM999,999,999,990'),',','.'),
    'Line chart data point (revenue vs expenses)'
  FROM dash_chart

  ----- PAGE 2: PROFITABILITY -----
  UNION ALL SELECT 20, '=== PAGE 2: PROFITABILITY ===', '',  '',
    'Filter: ' || (SELECT p_start::text FROM params) || ' to ' || (SELECT p_end::text FROM params)

  UNION ALL SELECT 21, 'Profitability', 'REVENUE (RANGE)',
    'Rp ' || REPLACE(TO_CHAR((SELECT range_rev FROM prof_range),'FM999,999,999,990'),',','.'),
    'SUM verified pemasukan in date range'

  UNION ALL SELECT 22, 'Profitability', 'NET PROFIT',
    'Rp ' || REPLACE(TO_CHAR(
      (SELECT range_rev FROM prof_range) - (SELECT range_tx_exp FROM prof_range),
      'FM999,999,999,990'),',','.'),
    'Revenue - tx.pengeluaran (NOT expenses table — matches page logic)'

  UNION ALL SELECT 23, 'Profitability', 'EBITDA MARGIN %',
    CASE WHEN (SELECT range_rev FROM prof_range) = 0 THEN '0.0%'
      ELSE ROUND(
        ((SELECT range_rev FROM prof_range) - (SELECT range_tx_exp FROM prof_range))
        / (SELECT range_rev FROM prof_range) * 100, 1
      )::text || '%'
    END,
    'Net Profit / Revenue * 100'

  UNION ALL SELECT 24, 'Profitability', 'ACTIVE USERS',
    (SELECT active_users FROM prof_users)::text,
    'status=Active, join_date <= p_end'

  UNION ALL SELECT 25, 'Profitability', 'INACTIVE USERS',
    (SELECT inactive_users FROM prof_users)::text,
    'status IN (Inactive, Non-Active), join_date <= p_end'

  UNION ALL SELECT 26, 'Profitability', 'Revenue MoM % (badge)',
    CASE
      WHEN (SELECT prev_rev FROM prof_mom_prev) = 0
       AND (SELECT curr_rev FROM prof_mom_curr) > 0 THEN '+100.0%'
      WHEN (SELECT prev_rev FROM prof_mom_prev) = 0 THEN '0%'
      ELSE ROUND(
        ((SELECT curr_rev FROM prof_mom_curr) - (SELECT prev_rev FROM prof_mom_prev))
        / (SELECT prev_rev FROM prof_mom_prev) * 100, 1
      )::text || '%'
    END,
    'Trend badge on REVENUE card (end_month vs prev_month)'

  UNION ALL SELECT 27, 'Profitability', 'Margin Trend (pp)',
    ROUND(
      CASE WHEN (SELECT curr_rev FROM prof_mom_curr) = 0 THEN 0::numeric
           ELSE ((SELECT curr_rev FROM prof_mom_curr) - (SELECT curr_exp FROM prof_mom_curr))
              / (SELECT curr_rev FROM prof_mom_curr) * 100
      END
      -
      CASE WHEN (SELECT prev_rev FROM prof_mom_prev) = 0 THEN 0::numeric
           ELSE ((SELECT prev_rev FROM prof_mom_prev) - (SELECT prev_exp FROM prof_mom_prev))
              / (SELECT prev_rev FROM prof_mom_prev) * 100
      END
    , 1)::text || ' pp',
    'Percentage-point delta shown on EBITDA MARGIN badge'

  -- Waterfall Chart
  UNION ALL
  SELECT
    28 + (ROW_NUMBER() OVER (ORDER BY is_expense, category))::bigint,
    'Profitability [Chart: Waterfall]',
    category,
    'Rp ' || REPLACE(TO_CHAR(ABS(amount),'FM999,999,999,990'),',','.')
    || CASE WHEN is_expense THEN ' (expense)' ELSE ' (income)' END,
    'expenses table by category; Revenue bar from transactions'
  FROM prof_waterfall

  -- Service Plan Mix
  UNION ALL
  SELECT
    40 + (ROW_NUMBER() OVER (ORDER BY cust_count DESC))::bigint,
    'Profitability [Chart: Service Plan Mix]',
    service_plan,
    cust_count::text || ' customers (' || pct::text || '%)',
    'Active customers at p_end grouped by service'
  FROM prof_mix

  ----- PAGE 3: REGIONAL -----
  UNION ALL SELECT 50, '=== PAGE 3: REGIONAL ANALYSIS ===', '', '', 'No date filter | All regions'

  UNION ALL SELECT 51, 'Regional', 'Total Aset',
    (SELECT total_aset FROM regional_assets)::text,
    'COUNT(*) asset_roster (add location filter for sub-region)'

  UNION ALL SELECT 52, 'Regional', 'Online',
    (SELECT online_count FROM regional_assets)::text,
    'asset_roster WHERE status = Online'

  UNION ALL SELECT 53, 'Regional', 'SOLD',
    (SELECT sold_count FROM regional_assets)::text,
    'kepemilikan IN (Dijual, Telah Dijual) — no location filter!'

  -- Profitability by Kelurahan top 10
  UNION ALL
  SELECT
    54 + (ROW_NUMBER() OVER (ORDER BY revenue_est DESC))::bigint,
    'Regional [Table: Profitability by Kelurahan]',
    node,
    'Active: ' || active_count::text
    || ' | Rev: Rp ' || REPLACE(TO_CHAR(revenue_est,'FM999,999,999,990'),',','.')
    || ' | ARPU: Rp ' || REPLACE(TO_CHAR(ROUND(arpu_est,0),'FM999,999,999,990'),',','.')
    || ' | ' || CASE WHEN arpu_est >= 200000 THEN 'OPTIMAL' ELSE 'ACTION NEEDED' END,
    'Revenue = SUM of tier prices for active customers in village'
  FROM (SELECT * FROM regional_kel ORDER BY revenue_est DESC LIMIT 10) kel_top

  ----- PAGE 4: EXECUTIVE SUMMARY -----
  UNION ALL SELECT 70, '=== PAGE 4: EXECUTIVE SUMMARY ===', '', '',
    'Filter: ' || (SELECT p_start::text FROM params) || ' to ' || (SELECT p_end::text FROM params)

  -- Tab A: Financial & Profitability
  UNION ALL SELECT 71, 'Executive [Financial]', 'Revenue',
    'Rp ' || REPLACE(TO_CHAR((SELECT revenue FROM exec_fin),'FM999,999,999,990'),',','.'),
    'SUM verified tx.pemasukan in range'

  UNION ALL SELECT 72, 'Executive [Financial]', 'Gross Profit',
    'Rp ' || REPLACE(TO_CHAR((SELECT gross_profit FROM exec_fin),'FM999,999,999,990'),',','.'),
    'Revenue - (tx.pengeluaran + server/maintenance/listrik from expenses)'

  UNION ALL SELECT 73, 'Executive [Financial]', 'Net Profit',
    'Rp ' || REPLACE(TO_CHAR((SELECT net_profit FROM exec_fin),'FM999,999,999,990'),',','.'),
    'Revenue - (tx.pengeluaran + ALL expenses categories)'

  UNION ALL SELECT 74, 'Executive [Financial]', 'Expense',
    'Rp ' || REPLACE(TO_CHAR((SELECT total_expenses FROM exec_fin),'FM999,999,999,990'),',','.'),
    'tx.pengeluaran + expenses table combined'

  UNION ALL SELECT 75, 'Executive [Financial]', 'Active Customer',
    (SELECT active_count FROM exec_active)::text,
    'status=Active, join_date <= p_end'

  -- Tab B: Inventory & Assets
  UNION ALL SELECT 76, 'Executive [Inventory]', 'Total Assets',
    ((SELECT deployed_count FROM exec_deployed) + (SELECT stock_count FROM exec_stock))::text,
    'asset_roster + stock_asset_roster'

  UNION ALL SELECT 77, 'Executive [Inventory]', 'Broken Devices',
    ((SELECT broken_count FROM exec_deployed) + (SELECT broken_count FROM exec_stock))::text,
    'condition = Broken in both tables'

  UNION ALL SELECT 78, 'Executive [Inventory]', 'Total Asset Valuation',
    'Rp ' || REPLACE(TO_CHAR(
      (SELECT valuation FROM exec_deployed) + (SELECT valuation FROM exec_stock),
      'FM999,999,999,990'),',','.'),
    'SUM harga_beli both tables'

  -- Assets by Type (Deployed)
  UNION ALL
  SELECT
    79 + (ROW_NUMBER() OVER (ORDER BY cnt DESC))::bigint,
    'Executive [Chart: Assets by Type Deployed]',
    type, cnt::text || ' units',
    'asset_roster grouped by type'
  FROM exec_asset_type

  -- Stock by Type (Unused)
  UNION ALL
  SELECT
    90 + (ROW_NUMBER() OVER (ORDER BY cnt DESC))::bigint,
    'Executive [Chart: Stock by Type Unused]',
    type, cnt::text || ' units',
    'stock_asset_roster grouped by type'
  FROM exec_stock_type

  -- Ownership Model
  UNION ALL
  SELECT
    101 + (ROW_NUMBER() OVER (ORDER BY cnt DESC))::bigint,
    'Executive [Chart: Ownership Model]',
    kepemilikan, cnt::text || ' assets',
    'asset_roster grouped by kepemilikan'
  FROM exec_ownership

  -- Tab C: Regional Analytics — Subscribers by Province
  UNION ALL
  SELECT
    110 + (ROW_NUMBER() OVER (ORDER BY active_subs DESC))::bigint,
    'Executive [Chart: Subscribers by Province]',
    province, active_subs::text || ' active subs',
    'Active customers at p_end by province'
  FROM exec_prov_subs

  -- Top 8 Cities
  UNION ALL
  SELECT
    120 + (ROW_NUMBER() OVER (ORDER BY active_subs DESC))::bigint,
    'Executive [Chart: Distribution by City Top 8]',
    city, active_subs::text || ' active subs',
    'Top 8 cities by subscriber count'
  FROM exec_city8

  -- Profit by Province
  UNION ALL
  SELECT
    131 + (ROW_NUMBER() OVER (ORDER BY province_rev DESC))::bigint,
    'Executive [Chart: Profit by Province]',
    province,
    'Revenue: Rp ' || REPLACE(TO_CHAR(province_rev,'FM999,999,999,990'),',','.'),
    'tx.pemasukan linked to customer province'
  FROM exec_prov_rev

)

-- ============================================================
-- FINAL OUTPUT
-- ============================================================
SELECT
  page     AS "PAGE",
  metric   AS "METRIC",
  db_value AS "DB VALUE  —  compare with web",
  note     AS "LOGIC / SOURCE"
FROM qa
ORDER BY sort_key;
