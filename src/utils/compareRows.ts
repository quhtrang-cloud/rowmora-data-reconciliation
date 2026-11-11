
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

export type ComparisonResult = {
  rows: ComparisonRow[];
  summary: Record<RowStatus, number>;
};

function createRowMap(
  rows: CsvRow[],
  matchingColumn: string
): Map<string, CsvRow> {
  const rowMap = new Map<string, CsvRow>();

  for (const row of rows) {
    const key = (row[matchingColumn] ?? "").trim();

    if (!key) {
      throw new Error(
        `The matching column "${matchingColumn}" contains empty values.`
      );
    }

    if (rowMap.has(key)) {
      throw new Error(
        `Duplicate matching value "${key}" found in column "${matchingColumn}".`
      );
    }

    rowMap.set(key, row);
  }

  return rowMap;
}

export function compareRows(
  oldRows: CsvRow[],
  newRows: CsvRow[],
  matchingColumn: string
): ComparisonResult {
  if (!matchingColumn.trim()) {
    throw new Error("Please select a matching column.");
  }

  if (oldRows.length === 0 || newRows.length === 0) {
    throw new Error("Both files must contain data rows.");
  }

  const oldColumns = Object.keys(oldRows[0] ?? {});
  const newColumns = Object.keys(newRows[0] ?? {});

  if (
    !oldColumns.includes(matchingColumn) ||
    !newColumns.includes(matchingColumn)
  ) {
    throw new Error(
      `The matching column "${matchingColumn}" must exist in both files.`
    );
  }

  const oldMap = createRowMap(oldRows, matchingColumn);
  const newMap = createRowMap(newRows, matchingColumn);

  const columns = Array.from(
    new Set([...oldColumns, ...newColumns])
  );

  const keys = new Set([
    ...oldMap.keys(),
    ...newMap.keys(),
  ]);

  const rows: ComparisonRow[] = [];

  for (const key of keys) {
    const oldRow = oldMap.get(key);
    const newRow = newMap.get(key);

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

    for (const column of columns) {
      if (column === matchingColumn) {
        continue;
      }

      const oldValue = oldRow[column] ?? "";
      const newValue = newRow[column] ?? "";

      if (oldValue !== newValue) {
        differences.push({
          column,
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
  };
}
