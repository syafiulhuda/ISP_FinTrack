'use server';

import { query } from '@/lib/db';

export async function getReportData(params: {
  type: string | null;
  startDate: string;
  endDate: string;
  region: string;
  granularity: string;
}) {
  const { type, startDate, endDate, region, granularity } = params;
  await new Promise(resolve => setTimeout(resolve, 800));

  try {
    const isAllRegions = region === "All Regions (Indonesia)";
    const regionMap: Record<string, string> = {
      "East Java": "Jawa Timur",
      "West Java": "Jawa Barat",
      "Central Java": "Jawa Tengah",
      "Special Region of Yogyakarta": "Yogyakarta",
      "Jakarta": "DKI Jakarta"
    };
    const searchProvince = regionMap[region] || region;

    if (type === "Revenue") {
      const amountParser = `SUM(CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT))`;
      let queryParams: any[] = [startDate, endDate];

      if (isAllRegions) {
        // NATIONAL VIEW
        const format = granularity === 'Monthly' ? "TO_CHAR(t.timestamp, 'Mon YYYY')" : "TO_CHAR(t.timestamp, 'YYYY-MM-DD')";
        const group = granularity === 'Monthly' ? "GROUP BY 1, DATE_TRUNC('month', t.timestamp) ORDER BY DATE_TRUNC('month', t.timestamp)" : "GROUP BY 1 ORDER BY 1";
        
        const mainSql = `SELECT ${format} as name, ${amountParser} as value FROM transactions t WHERE t.status ILIKE 'verified' AND t.timestamp::date >= $1::date AND t.timestamp::date <= $2::date ${group}`;
        
        const breakdownSql = `
          WITH base AS (
            -- INCOME (Pemasukan)
            SELECT
                c.province,
                c.city,
                TO_CHAR(DATE_TRUNC('month', t.timestamp), 'Mon YYYY') as month_year,
                ${amountParser} as total_value
            FROM customers c
            LEFT JOIN transactions t ON c.id = split_part(t.id,'-',2)
               AND t.status ILIKE 'verified'
               AND t.timestamp::date BETWEEN $1::date AND $2::date
            WHERE c.status = 'Active'
            GROUP BY 1, 2, 3
            UNION ALL
            -- EXPENSE (Pengeluaran)
            SELECT
                c.province,
                e.city,
                TO_CHAR(e.date, 'Mon YYYY') as month_year,
                e.amount as total_value
            FROM expenses e
            LEFT JOIN (SELECT DISTINCT city, province FROM customers WHERE status = 'Active') c ON c.city = e.city
            WHERE e.date BETWEEN $1::date AND $2::date -- Perbaikan: Menggunakan e.date dan klausa WHERE
          ),
          final AS (
            SELECT
                COALESCE(b.province, 
                    CASE 
                        WHEN b.city LIKE 'Jakarta%' THEN 'DKI Jakarta'
                        WHEN b.city IN ('Bandung') THEN 'Jawa Barat'
                        WHEN b.city IN ('Semarang','Solo') THEN 'Jawa Tengah'
                        WHEN b.city IN ('Surabaya','Malang') THEN 'Jawa Timur'
                        WHEN b.city IN ('Yogyakarta','Sleman') THEN 'DI Yogyakarta'
                        WHEN b.city = 'Makassar' THEN 'Sulawesi Selatan'
                        WHEN b.city = 'Manado' THEN 'Sulawesi Utara'
                        WHEN b.city = 'Medan' THEN 'Sumatera Utara'
                        WHEN b.city = 'Pekanbaru' THEN 'Riau'
                        WHEN b.city = 'Balikpapan' THEN 'Kalimantan Timur'
                        WHEN b.city = 'Banjarmasin' THEN 'Kalimantan Selatan'
                        WHEN b.city = 'Tarakan' THEN 'Kalimantan Utara'
                        WHEN b.city IN ('Denpasar','Badung') THEN 'Bali'
                    END
                ) as name,
                total_value
            FROM base b
          )
          SELECT name, SUM(total_value) as value FROM final GROUP BY 1 HAVING SUM(total_value) != 0 ORDER BY 2 DESC
        `;
        
        const [mainRes, breakdownRes] = await Promise.all([
          query(mainSql, queryParams),
          query(breakdownSql, queryParams)
        ]);
        return {
          main: mainRes.rows.map(r => ({ name: r.name, value: parseInt(r.value || '0') })),
          breakdown: breakdownRes.rows.map(r => ({ name: r.name, value: parseInt(r.value || '0') }))
        };
      } else {
        // REGIONAL VIEW (Updated to match National View rules)
        queryParams.push(searchProvince);
        const format = granularity === 'Monthly' ? "TO_CHAR(ts, 'Mon YYYY')" : "TO_CHAR(ts, 'YYYY-MM-DD')";
        const group = granularity === 'Monthly' ? "GROUP BY 1, DATE_TRUNC('month', ts) ORDER BY DATE_TRUNC('month', ts)" : "GROUP BY 1, DATE_TRUNC('day', ts) ORDER BY DATE_TRUNC('day', ts)";
        
        const mainSql = `
          WITH base AS (
            -- INCOME
            SELECT t.timestamp as ts, CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT) as val
            FROM transactions t 
            JOIN customers c ON c.id = split_part(t.id,'-',2)
            WHERE t.status ILIKE 'verified' 
              AND c.province = $3 
              AND t.timestamp::date BETWEEN $1::date AND $2::date
            UNION ALL
            -- EXPENSE
            SELECT e.date::timestamp as ts, e.amount as val
            FROM expenses e
            WHERE e.date BETWEEN $1::date AND $2::date
              AND e.city IN (SELECT city FROM customers WHERE province = $3)
          )
          SELECT ${format} as name, SUM(val) as value FROM base ${group}
        `;

        const breakdownSql = `
          WITH base AS (
            -- INCOME (Pemasukan)
            SELECT
                c.province,
                c.city,
                TO_CHAR(DATE_TRUNC('month', t.timestamp), 'Mon YYYY') as month_year,
                ${amountParser} as total_value
            FROM customers c
            LEFT JOIN transactions t ON c.id = split_part(t.id,'-',2)
               AND t.status ILIKE 'verified'
               AND t.timestamp::date BETWEEN $1::date AND $2::date
            WHERE c.status = 'Active' AND c.province = $3
            GROUP BY 1, 2, 3
            UNION ALL
            -- EXPENSE (Pengeluaran)
            SELECT
                c.province,
                e.city,
                TO_CHAR(e.date, 'Mon YYYY') as month_year,
                e.amount as total_value
            FROM expenses e
            LEFT JOIN (SELECT DISTINCT city, province FROM customers WHERE status = 'Active') c ON c.city = e.city
            WHERE e.date BETWEEN $1::date AND $2::date AND c.province = $3
          )
          SELECT city as name, SUM(total_value) as value FROM base GROUP BY 1 HAVING SUM(total_value) != 0 ORDER BY 2 DESC
        `;

        const [mainRes, breakdownRes] = await Promise.all([
          query(mainSql, queryParams),
          query(breakdownSql, queryParams)
        ]);
        return {
          main: mainRes.rows.map(r => ({ name: r.name, value: parseInt(r.value || '0') })),
          breakdown: breakdownRes.rows.map(r => ({ name: r.name, value: parseInt(r.value || '0') }))
        };
      }
    } else if (type === "Inventory") {
      // INVENTORY AUDIT
      let mainSql = "";
      let ownershipSql = "";
      let regionalSql = "";
      let subBreakdownSql = "";
      let queryParams: any[] = [];

      if (isAllRegions) {
        mainSql = `SELECT type as name, COUNT(*) as value FROM asset_roster GROUP BY 1 ORDER BY 2 DESC`;
        ownershipSql = `SELECT kepemilikan as name, COUNT(*) as value FROM asset_roster GROUP BY 1`;
        regionalSql = `
          SELECT 
            trim(split_part(location, ',', array_length(string_to_array(location, ','), 1))) as name,
            COUNT(*) as value
          FROM asset_roster
          GROUP BY 1
          ORDER BY 2 DESC
        `;
        subBreakdownSql = `SELECT condition as name, COUNT(*) as value FROM asset_roster GROUP BY 1`;
      } else {
        queryParams.push(`%${searchProvince}%`);
        mainSql = `SELECT type as name, COUNT(*) as value FROM asset_roster WHERE location ILIKE $1 GROUP BY 1 ORDER BY 2 DESC`;
        ownershipSql = `SELECT kepemilikan as name, COUNT(*) as value FROM asset_roster WHERE location ILIKE $1 GROUP BY 1`;
        regionalSql = `SELECT type as name, COUNT(*) as value FROM asset_roster WHERE location ILIKE $1 GROUP BY 1`;
        subBreakdownSql = `
          SELECT 
            CASE 
              WHEN location LIKE '%, %, %' THEN trim(split_part(location, ',', 2))
              ELSE trim(split_part(location, ',', 1))
            END as name,
            COUNT(*) as value
          FROM asset_roster
          WHERE location ILIKE $1
          GROUP BY 1
          ORDER BY 2 DESC
        `;
      }

      const [mainRes, ownershipRes, regionalRes, subRes] = await Promise.all([
        query(mainSql, queryParams),
        query(ownershipSql, queryParams),
        query(regionalSql, queryParams),
        query(subBreakdownSql, queryParams)
      ]);

      return {
        main: mainRes.rows.map(r => ({ name: r.name, value: parseInt(r.value || '0') })),
        ownership: ownershipRes.rows.map(r => ({ name: r.name, value: parseInt(r.value || '0') })),
        regional: regionalRes.rows.map(r => ({ name: r.name, value: parseInt(r.value || '0') })),
        subBreakdown: subRes.rows.map(r => ({ name: r.name, value: parseInt(r.value || '0') }))
      };
    } else if (type === "Regional") {
      // REGIONAL ANALYSIS (Subscriber Distribution)
      let mainSql = "";
      let breakdownSql = "";
      let queryParams: any[] = [];

      if (isAllRegions) {
        mainSql = `SELECT province as name, COUNT(*) as value FROM customers GROUP BY 1 ORDER BY 2 DESC`;
        breakdownSql = `SELECT city as name, COUNT(*) as value FROM customers GROUP BY 1 ORDER BY 2 DESC`;
      } else {
        queryParams.push(searchProvince);
        mainSql = `SELECT city as name, COUNT(*) as value FROM customers WHERE province = $1 GROUP BY 1 ORDER BY 2 DESC`;
        breakdownSql = `SELECT district as name, COUNT(*) as value FROM customers WHERE province = $1 GROUP BY 1 ORDER BY 2 DESC`;
      }

      const [mainRes, breakdownRes] = await Promise.all([
        query(mainSql, queryParams),
        query(breakdownSql, queryParams)
      ]);

      return {
        main: mainRes.rows.map(r => ({ name: r.name, value: parseInt(r.value || '0') })),
        breakdown: breakdownRes.rows.map(r => ({ name: r.name, value: parseInt(r.value || '0') }))
      };
    }

    return { main: [], breakdown: [] };
  } catch (error) {
    console.error("REPORT ERROR:", error);
    return { main: [], breakdown: [] };
  }
}
