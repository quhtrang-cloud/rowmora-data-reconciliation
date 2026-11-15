
import type { CsvRow } from "./parseCsv";

export type RowStatus =
  | "added"
  | "removed"
  | "changed"
  | "unchanged";

export type ColumnMapping = {
  sourceA: string;
  sourceB: string;
};

export type RowDifference = {
  column: string;
  oldValue: string;
  newValue: string;
  sourceAColumn?: string;
  sourceBColumn?: string;
};

export type ComparisonRow = {
  key: string;
  status: RowStatus;
  oldRow?: CsvRow;
  newRow?: CsvRow;
  differences: RowDifference[];
};

export type IssueType = "duplicate_key" | "missing_key";

export type IssueSource = "A" | "B";

export type ComparisonIssue = {
  type: IssueType;
  source: IssueSource;
  key: string;
  rowNumbers: number[];
  rows: CsvRow[];
};

export type ComparisonResult = {
  rows: ComparisonRow[];
  summary: Record<RowStatus, number>;
  issues: ComparisonIssue[];
  sharedColumns: string[];
  sourceAOnlyColumns: string[];
  sourceBOnlyColumns: string[];
  mappings: ColumnMapping[];
};

type IndexedRow = {
  row: CsvRow;
  rowNumber: number;
};

type SourceIndex = {
  records: Map<string, IndexedRow[]>;
  issues: ComparisonIssue[];
};

function indexSource(
  rows: CsvRow[],
  matchingColumn: string,
  source: IssueSource
): SourceIndex {
  const records = new Map<string, IndexedRow[]>();
  const missing: IndexedRow[] = [];
  const issues: ComparisonIssue[] = [];

  rows.forEach((row, index) => {
    const item: IndexedRow = {
      row,
      rowNumber: index + 1,
    };

    const key = (row[matchingColumn] ?? "").trim();

    if (!key) {
      missing.push(item);
      return;
    }

    const matches = records.get(key) ?? [];
    matches.push(item);
    records.set(key, matches);
  });

  if (missing.length > 0) {
    issues.push({
      type: "missing_key",
      source,
      key: "",
      rowNumbers: missing.map((item) => item.rowNumber),
      rows: missing.map((item) => item.row),
    });
  }

  for (const [key, matches] of records) {
    if (matches.length > 1) {
      issues.push({
        type: "duplicate_key",
        source,
        key,
        rowNumbers: matches.map((item) => item.rowNumber),
        rows: matches.map((item) => item.row),
      });
    }
  }

  return {
    records,
    issues,
  };
}

export function compareRows(
  sourceARows: CsvRow[],
  sourceBRows: CsvRow[],
  matchingColumn: string,
  options?: {
    sourceBMatchingColumn?: string;
    columnMappings?: ColumnMapping[];
  }
): ComparisonResult {
  const sourceBMatchingColumn =
    options?.sourceBMatchingColumn ?? matchingColumn;

  if (
    !matchingColumn.trim() ||
    !sourceBMatchingColumn.trim()
  ) {
    throw new Error(
      "Select matching columns in both sources."
    );
  }

  if (
    sourceARows.length === 0 ||
    sourceBRows.length === 0
  ) {
    throw new Error(
      "Both sources must contain data rows."
    );
  }

  const sourceAColumns = Object.keys(
    sourceARows[0] ?? {}
  );

  const sourceBColumns = Object.keys(
    sourceBRows[0] ?? {}
  );

  if (
    !sourceAColumns.includes(matchingColumn) ||
    !sourceBColumns.includes(sourceBMatchingColumn)
  ) {
    throw new Error(
      "The selected matching columns must exist in their sources."
    );
  }

  // Automatically map columns with identical names.
  const defaultMappings: ColumnMapping[] =
    sourceAColumns
      .filter(
        (column) =>
          column !== matchingColumn &&
          column !== sourceBMatchingColumn &&
          sourceBColumns.includes(column)
      )
      .map((column) => ({
        sourceA: column,
        sourceB: column,
      }));

  const mappings =
    options?.columnMappings ?? defaultMappings;

  const usedA = new Set<string>();
  const usedB = new Set<string>();

  // Validate mappings before comparing records.
  for (const mapping of mappings) {
    if (
      !sourceAColumns.includes(mapping.sourceA) ||
      !sourceBColumns.includes(mapping.sourceB)
    ) {
      throw new Error(
        "A mapped column is missing from its source."
      );
    }

    if (
      mapping.sourceA === matchingColumn ||
      mapping.sourceB === sourceBMatchingColumn
    ) {
      throw new Error(
        "Matching key columns cannot be compared as data fields."
      );
    }

    if (
      usedA.has(mapping.sourceA) ||
      usedB.has(mapping.sourceB)
    ) {
      throw new Error(
        "Each column can only be mapped once."
      );
    }

    usedA.add(mapping.sourceA);
    usedB.add(mapping.sourceB);
  }

  const sharedColumns = sourceAColumns.filter(
    (column) => sourceBColumns.includes(column)
  );

  // Columns not included in the mapping.
  const sourceAOnlyColumns = sourceAColumns.filter(
    (column) =>
      !usedA.has(column) &&
      column !== matchingColumn
  );

  const sourceBOnlyColumns = sourceBColumns.filter(
    (column) =>
      !usedB.has(column) &&
      column !== sourceBMatchingColumn
  );

  const sourceA = indexSource(
    sourceARows,
    matchingColumn,
    "A"
  );

  const sourceB = indexSource(
    sourceBRows,
    sourceBMatchingColumn,
    "B"
  );

  const issues: ComparisonIssue[] = [
    ...sourceA.issues,
    ...sourceB.issues,
  ];

  const allKeys = new Set([
    ...sourceA.records.keys(),
    ...sourceB.records.keys(),
  ]);

  const rows: ComparisonRow[] = [];

  for (const key of allKeys) {
    const a = sourceA.records.get(key) ?? [];
    const b = sourceB.records.get(key) ?? [];

    // Exclude duplicate keys from automatic matching.
    if (a.length > 1 || b.length > 1) {
      continue;
    }

    const oldRow = a[0]?.row;
    const newRow = b[0]?.row;

    if (!oldRow && newRow) {
      rows.push({
        key,
        status: "added",
        newRow,
        differences: [],
      });

      continue;
    }

    if (oldRow && !newRow) {
      rows.push({
        key,
        status: "removed",
        oldRow,
        differences: [],
      });

      continue;
    }

    if (!oldRow || !newRow) {
      continue;
    }

    const differences: RowDifference[] = [];

    // Compare the explicitly mapped column pairs.
    for (const mapping of mappings) {
      const oldValue =
        oldRow[mapping.sourceA] ?? "";

      const newValue =
        newRow[mapping.sourceB] ?? "";

      if (oldValue !== newValue) {
        differences.push({
          column:
            mapping.sourceA === mapping.sourceB
              ? mapping.sourceA
              : `${mapping.sourceA} / ${mapping.sourceB}`,
          sourceAColumn: mapping.sourceA,
          sourceBColumn: mapping.sourceB,
          oldValue,
          newValue,
        });
      }
    }

    rows.push({
      key,
      status:
        differences.length > 0
          ? "changed"
          : "unchanged",
      oldRow,
      newRow,
      differences,
    });
  }

  const summary: ComparisonResult["summary"] = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
  };

  for (const row of rows) {
    summary[row.status] += 1;
  }

  return {
    rows,
    summary,
    issues,
    sharedColumns,
    sourceAOnlyColumns,
    sourceBOnlyColumns,
    mappings,
  };
}
