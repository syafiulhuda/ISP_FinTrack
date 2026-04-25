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

  // Simulate a small delay for better UX
  await new Promise(resolve => setTimeout(resolve, 800));

  try {
    // Shared Regional Mapping for Indonesian DB
    const regionMap: Record<string, string> = {
      "East Java": "Jawa Timur",
      "West Java": "Jawa Barat",
      "Central Java": "Jawa Tengah",
      "Special Region of Yogyakarta": "Yogyakarta",
      "Jakarta": "DKI Jakarta"
    };
    const searchRegion = regionMap[region || ""] || region;

    let whereClause = `WHERE "createdAt"::date >= $1::date AND "createdAt"::date <= $2::date`;
    let queryParams: any[] = [startDate, endDate];

    if (region !== "All Regions (Indonesia)") {
      whereClause += ` AND ("province" = $3 OR "province" ILIKE $4)`;
      queryParams.push(searchRegion);
      queryParams.push(`%${searchRegion}%`);
    }

    if (type === "Revenue") {
      const isFiltered = region && region !== "All Regions (Indonesia)";
      const breakdownColumn = isFiltered ? "city" : "province";

      const mainSql = `
        SELECT DATE(c."createdAt")::text as name, SUM(CAST(REPLACE(REPLACE(s.price, 'Rp ', ''), '.', '') AS INTEGER)) as value
        FROM customers c
        JOIN service_tiers s ON c.service = s.name
        ${whereClause}
        GROUP BY DATE(c."createdAt")
        ORDER BY DATE(c."createdAt") ASC
      `;
      const breakdownSql = `
        SELECT c.${breakdownColumn} as name, SUM(CAST(REPLACE(REPLACE(s.price, 'Rp ', ''), '.', '') AS INTEGER)) as value
        FROM customers c
        JOIN service_tiers s ON c.service = s.name
        ${whereClause}
        GROUP BY c.${breakdownColumn}
        ORDER BY value DESC
      `;
      
      const [mainRes, breakdownRes] = await Promise.all([
        query(mainSql, queryParams),
        query(breakdownSql, queryParams)
      ]);

      return {
        main: mainRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
        breakdown: breakdownRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }))
      };
    }

    if (type === "Inventory") {
      const isFiltered = region && region !== "All Regions (Indonesia)";

      // 1. Inventory Performance Trend: Count by type
      const mainSql = `SELECT type as name, COUNT(*) as value FROM asset_roster GROUP BY type ORDER BY value DESC`;
      
      // 1b. Ownership summary: Dimiliki vs Telah Dijual
      const ownershipSql = `SELECT COALESCE(kepemilikan, 'Dimiliki') as name, COUNT(*) as value FROM asset_roster GROUP BY kepemilikan ORDER BY value DESC`;
      
      // 2. Asset Distribution by Province: Precise mapping based on real data
      const regionalSql = `
        SELECT 
          CASE 
            WHEN location ILIKE '%Jawa Barat%' OR location ILIKE '%West Java%' THEN 'Jawa Barat'
            WHEN location ILIKE '%Jawa Timur%' OR location ILIKE '%East Java%' THEN 'Jawa Timur'
            WHEN location ILIKE '%Jawa Tengah%' OR location ILIKE '%Central Java%' THEN 'Jawa Tengah'
            WHEN location ILIKE '%DKI Jakarta%' OR location ILIKE '%Jakarta%' OR location ILIKE '%Jakarta Pusat%' THEN 'DKI Jakarta'
            WHEN location ILIKE '%DI Yogyakarta%' OR location ILIKE '%Yogyakarta%' THEN 'DI Yogyakarta'
            WHEN location ILIKE '%Sumatera Utara%' THEN 'Sumatera Utara'
            WHEN location ILIKE '%Sulawesi Selatan%' THEN 'Sulawesi Selatan'
            WHEN location ILIKE '%Kalimantan Utara%' THEN 'Kalimantan Utara'
            WHEN location ILIKE '%Kalimantan Timur%' THEN 'Kalimantan Timur'
            WHEN location ILIKE '%Kalimantan Selatan%' THEN 'Kalimantan Selatan'
            WHEN location ILIKE '%Sulawesi Utara%' THEN 'Sulawesi Utara'
            WHEN location ILIKE '%Bali%' THEN 'Bali'
            WHEN location ILIKE '%Riau%' THEN 'Riau'
            WHEN location LIKE '%,%' THEN TRIM(REVERSE(SPLIT_PART(REVERSE(location), ',', 1)))
            ELSE location
          END as name, 
          COUNT(*) as value 
        FROM asset_roster 
        GROUP BY name 
        ORDER BY value DESC
      `;

      // 3. Top 10 National Sites: Site/City level
      let subSql = "";
      if (isFiltered) {
        subSql = `
          SELECT 
            CASE 
              WHEN location LIKE '%,%' THEN TRIM(SPLIT_PART(location, ',', 1))
              ELSE location
            END as name, 
            COUNT(*) as value 
          FROM asset_roster 
          WHERE location ILIKE '%${searchRegion}%'
          GROUP BY name ORDER BY value DESC LIMIT 10
        `;
      } else {
        subSql = `
          SELECT 
            CASE 
              WHEN location LIKE '%,%' THEN TRIM(SPLIT_PART(location, ',', 1))
              ELSE location
            END as name, 
            COUNT(*) as value 
          FROM asset_roster 
          GROUP BY name ORDER BY value DESC LIMIT 10
        `;
      }
      
      const [mainRes, ownershipRes, regionalRes, subRes] = await Promise.all([
        query(mainSql),
        query(ownershipSql),
        query(regionalSql),
        query(subSql)
      ]);

      return {
        main: mainRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
        ownership: ownershipRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
        regional: regionalRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
        subBreakdown: subRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }))
      };
    }

    if (type === "Regional") {
      const isFiltered = region && region !== "All Regions (Indonesia)";
      const mainColumn = isFiltered ? "city" : "province";
      const breakdownColumn = isFiltered ? "district" : "city";

      const mainSql = `SELECT ${mainColumn} as name, COUNT(*) as value FROM customers ${whereClause} GROUP BY ${mainColumn}`;
      const breakdownSql = `SELECT ${breakdownColumn} as name, COUNT(*) as value FROM customers ${whereClause} GROUP BY ${breakdownColumn} ORDER BY value DESC`;
      
      const [mainRes, breakdownRes] = await Promise.all([
        query(mainSql, queryParams),
        query(breakdownSql, queryParams)
      ]);

      return {
        main: mainRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
        breakdown: breakdownRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }))
      };
    }

    return [];
  } catch (error) {
    console.error("Database query failed:", error);
    return [];
  }
}
