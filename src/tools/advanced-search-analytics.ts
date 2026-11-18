import {
  fetchAllRows,
  getDateRange,
  buildFilterGroups,
  DimensionFilterList,
  SearchAnalyticsRow,
  SearchType,
} from "../analytics.js";

interface Filter {
  dimension: string;
  operator: string;
  expression: string;
}

interface AdvancedSearchResult {
  rows: Array<{
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  totalRows: number;
  dimensions: string[];
  period: { startDate: string; endDate: string };
  filtersApplied: Filter[];
}

export async function advancedSearchAnalytics(
  days: number = 28,
  dimensions: string[] = ["query"],
  filters: Filter[] = [],
  rowLimit: number = 100,
  orderBy: string = "clicks",
  orderDirection: string = "descending",
  siteUrl?: string,
  searchType?: SearchType,
  filterLists: DimensionFilterList[] = []
): Promise<AdvancedSearchResult & { searchType: string; filterListsApplied: DimensionFilterList[] }> {
  const { startDate, endDate } = getDateRange(days);

  const dimensionFilterGroups = buildFilterGroups(filters, filterLists);

  const rows = await fetchAllRows(
    {
      startDate,
      endDate,
      dimensions,
      dimensionFilterGroups,
      type: searchType,
    },
    siteUrl
  );

  // Sort
  const sortKey = orderBy as keyof SearchAnalyticsRow;
  const multiplier = orderDirection === "ascending" ? 1 : -1;
  rows.sort((a, b) => {
    const aVal = typeof a[sortKey] === "number" ? (a[sortKey] as number) : 0;
    const bVal = typeof b[sortKey] === "number" ? (b[sortKey] as number) : 0;
    return (aVal - bVal) * multiplier;
  });

  const limited = rows.slice(0, Math.min(rowLimit, 500));

  return {
    rows: limited.map((r) => ({
      keys: r.keys,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Math.round(r.ctr * 10000) / 100,
      position: Math.round(r.position * 10) / 10,
    })),
    totalRows: rows.length,
    dimensions,
    period: { startDate, endDate },
    filtersApplied: filters,
    filterListsApplied: filterLists,
    searchType: searchType || "web",
  };
}
