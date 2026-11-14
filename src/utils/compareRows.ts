
import type { CsvRow } from "./parseCsv";

export type RowStatus =
  | "added"
  | "removed"
  | "changed"
  | "unchanged";

export type RowDifference = {
  column: string;
  oldValue: string;
  newValue: string;
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
};

type IndexedRow = {
  row: CsvRow;
  rowNumber: number;
};

type SourceIndex = {
  records: Map<string, IndexedRow[]>;
  issues: ComparisonIssue[];
  missingKeyRows: IndexedRow[];
};

function indexSource(
  rows: CsvRow[],
  matchingColumn: string,
  source: IssueSource
): SourceIndex {
  const records = new Map<string, IndexedRow[]>();
  const missingKeyRows: IndexedRow[] = [];
  const issues: ComparisonIssue[] = [];

  rows.forEach((row, index) => {
    // Row number here refers to the data row position,
    // not the original Excel worksheet row number.
    const rowNumber = index + 1;
    const key = (row[matchingColumn] ?? "").trim();

    const indexedRow: IndexedRow = {
      row,
      rowNumber,
    };

    if (!key) {
      missingKeyRows.push(indexedRow);
      return;
    }

    const existing = records.get(key) ?? [];
    existing.push(indexedRow);
    records.set(key, existing);
  });

  if (missingKeyRows.length > 0) {
    issues.push({
      type: "missing_key",
      source,
      key: "",
      rowNumbers: missingKeyRows.map(
        (item) => item.rowNumber
      ),
      rows: missingKeyRows.map((item) => item.row),
    });
  }

  for (const [key, matches] of records) {
    if (matches.length > 1) {
      issues.push({
        type: "duplicate_key",
        source,
        key,
        rowNumbers: matches.map(
          (item) => item.rowNumber
        ),
        rows: matches.map((item) => item.row),
      });
    }
  }

  return {
    records,
    issues,
    missingKeyRows,
  };
}

export function compareRows(
  sourceARows: CsvRow[],
  sourceBRows: CsvRow[],
  matchingColumn: string
): ComparisonResult {
  if (!matchingColumn.trim()) {
    throw new Error("Please select a matching column.");
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
    !sourceBColumns.includes(matchingColumn)
  ) {
    throw new Error(
      `The matching column "${matchingColumn}" must exist in both sources.`
    );
  }

  const sharedColumns = sourceAColumns.filter(
    (column) => sourceBColumns.includes(column)
  );

  const sourceAOnlyColumns = sourceAColumns.filter(
    (column) => !sourceBColumns.includes(column)
  );

  const sourceBOnlyColumns = sourceBColumns.filter(
    (column) => !sourceAColumns.includes(column)
  );

  const sourceA = indexSource(
    sourceARows,
    matchingColumn,
    "A"
  );

  const sourceB = indexSource(
    sourceBRows,
    matchingColumn,
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

  const comparisonRows: ComparisonRow[] = [];

  for (const key of allKeys) {
    const sourceAMatches =
      sourceA.records.get(key) ?? [];

    const sourceBMatches =
      sourceB.records.get(key) ?? [];

    // If a key is duplicated in either source,
    // exclude the entire key group from automatic matching.
    if (
      sourceAMatches.length > 1 ||
      sourceBMatches.length > 1
    ) {
      continue;
    }

    const sourceARow = sourceAMatches[0]?.row;
    const sourceBRow = sourceBMatches[0]?.row;

    if (!sourceARow && sourceBRow) {
      comparisonRows.push({
        key,
        status: "added",
        newRow: sourceBRow,
        differences: [],
      });
      continue;
    }

    if (sourceARow && !sourceBRow) {
      comparisonRows.push({
        key,
        status: "removed",
        oldRow: sourceARow,
        differences: [],
      });
      continue;
    }

    if (!sourceARow || !sourceBRow) {
      continue;
    }

    const differences: RowDifference[] = [];

    // Compare only columns present in both sources.
    for (const column of sharedColumns) {
      if (column === matchingColumn) {
        continue;
      }

      const oldValue = sourceARow[column] ?? "";
      const newValue = sourceBRow[column] ?? "";

      if (oldValue !== newValue) {
        differences.push({
          column,
          oldValue,
          newValue,
        });
      }
    }

    comparisonRows.push({
      key,
      status:
        differences.length > 0
          ? "changed"
          : "unchanged",
      oldRow: sourceARow,
      newRow: sourceBRow,
      differences,
    });
  }

  const summary: ComparisonResult["summary"] = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
  };

  for (const row of comparisonRows) {
    summary[row.status] += 1;
  }

  return {
    rows: comparisonRows,
    summary,
    issues,
    sharedColumns,
    sourceAOnlyColumns,
    sourceBOnlyColumns,
  };
}
