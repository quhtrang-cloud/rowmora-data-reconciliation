
import type { ComparisonResult } from "./compareRows";

type ExportRow = Record<string, string>;
type ExportContext = {
  sourceAName: string;
  sourceBName: string;
  sourceAKey: string;
  sourceBKey: string;
};

const statuses = ["added", "removed", "changed", "unchanged"] as const;
const clean = (value: unknown): string => value == null ? "" : String(value);

// Protect values that Excel may interpret as formulas when opening a CSV.
function safeCsvValue(value: unknown): string {
  const raw = clean(value);
  return /^\s*[=+\-@]/.test(raw) ? "'" + raw : raw;
}

function csvCell(value: unknown): string {
  return '"' + safeCsvValue(value).replace(/"/g, '""') + '"';
}

function toCsv(headers: string[], rows: ExportRow[]): string {
  return "\uFEFF" + [
    headers.map(csvCell).join(","),
    ...rows.map(row => headers.map(header => csvCell(row[header])).join(",")),
  ].join("\r\n");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const comparisonHeaders = [
  "Matching key", "Status", "Column", "Source A value", "Source B value",
  "Source A record", "Source B record",
];

export function buildComparisonRows(result: ComparisonResult): ExportRow[] {
  return result.rows.flatMap(row => {
    const changes = row.status === "changed" ? row.differences : [null];
    return changes.map(change => ({
      "Matching key": row.key,
      "Status": row.status,
      "Column": change?.column ?? "",
      "Source A value": change?.oldValue ?? "",
      "Source B value": change?.newValue ?? "",
      "Source A record": JSON.stringify(row.oldRow ?? {}),
      "Source B record": JSON.stringify(row.newRow ?? {}),
    }));
  });
}

// Each source field becomes its own column rather than one unreadable JSON cell.
function issueFieldHeaders(result: ComparisonResult): string[] {
  const names = new Set<string>();
  for (const issue of result.issues) {
    for (const record of issue.rows) {
      for (const name of Object.keys(record)) names.add(name);
    }
  }
  return [...names].map(name => `Field: ${name}`);
}

const issueBaseHeaders = ["Issue", "Source", "Matching key", "Data row"];

export function buildIssueRows(result: ComparisonResult): ExportRow[] {
  return result.issues.flatMap(issue => issue.rows.map((record, index) => {
    const values: ExportRow = {
      "Issue": issue.type === "duplicate_key" ? "Duplicate matching key" : "Missing matching key",
      "Source": `Source ${issue.source}`,
      "Matching key": issue.key,
      "Data row": clean(issue.rowNumbers[index]),
    };
    for (const [name, value] of Object.entries(record)) {
      values[`Field: ${name}`] = clean(value);
    }
    return values;
  }));
}

export function exportComparisonCsv(result: ComparisonResult): void {
  downloadBlob(
    new Blob([toCsv(comparisonHeaders, buildComparisonRows(result))], { type: "text/csv;charset=utf-8" }),
    "rowmora-comparison.csv"
  );
}

export function exportIssuesCsv(result: ComparisonResult): void {
  downloadBlob(
    new Blob([toCsv([...issueBaseHeaders, ...issueFieldHeaders(result)], buildIssueRows(result))], {
      type: "text/csv;charset=utf-8",
    }),
    "rowmora-needs-review.csv"
  );
}

export async function exportComparisonExcel(result: ComparisonResult, context: ExportContext): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Rowmora";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  const summaryRows: string[][] = [
    ["Rowmora comparison summary", ""],
    ["Source A", context.sourceAName],
    ["Source B", context.sourceBName],
    ["Source A matching key", context.sourceAKey],
    ["Source B matching key", context.sourceBKey],
    ["Mapped field pairs", String(result.mappings.length)],
    ...statuses.map(status => [status[0].toUpperCase() + status.slice(1), String(result.summary[status])]),
    ["Records classified", String(result.rows.length)],
    ["Records needing review", String(buildIssueRows(result).length)],
    ["Note", "Records with missing or duplicate matching keys are excluded from automatic matching."],
    ["Source A unmapped columns", result.sourceAOnlyColumns.join(", ")],
    ["Source B unmapped columns", result.sourceBOnlyColumns.join(", ")],
  ];
  summaryRows.forEach(values => summary.addRow(values));
  summary.getColumn(1).width = 31;
  summary.getColumn(2).width = 80;
  summary.getRow(1).font = { bold: true, size: 15, color: { argb: "FF214B38" } };
  summary.getColumn(2).alignment = { vertical: "top", wrapText: true };
  summary.getRow(11).height = 32;

  function addTable(name: string, headers: string[], rows: ExportRow[]) {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(headers);
    for (const row of rows) {
      sheet.addRow(headers.map(header => clean(row[header])));
    }
    const header = sheet.getRow(1);
    header.height = 29;
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF486C57" } };
    header.alignment = { vertical: "middle", wrapText: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: headers.length },
    };
    sheet.columns.forEach((column, index) => {
      const label = headers[index];
      column.width = label === "Issue" ? 27 : label === "Data row" ? 13
        : label === "Source" ? 16 : label === "Status" ? 15
        : label === "Matching key" ? 21 : label?.startsWith("Field:") ? 26
        : label?.includes("record") ? 54 : 25;
    });
    for (let i = 2; i <= rows.length + 1; i++) {
      const row = sheet.getRow(i);
      row.alignment = { vertical: "top" };
      if (i % 2 === 0) {
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7F4" } };
      }
      // Force imported identifiers and dates to remain text, not formulas or numbers.
      row.eachCell(cell => { cell.numFmt = "@"; });
    }
    return sheet;
  }

  addTable("Comparison Details", comparisonHeaders, buildComparisonRows(result));
  addTable("Needs Review", [...issueBaseHeaders, ...issueFieldHeaders(result)], buildIssueRows(result));
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }), "rowmora-comparison.xlsx");
}
