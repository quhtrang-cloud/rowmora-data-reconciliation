
import readExcelFile, { readSheet } from "read-excel-file/browser";
import type { CsvRow } from "./parseCsv";

export type ExcelSheetInfo = {
  sheetName: string;
};

export async function getExcelSheetNames(
  file: File
): Promise<string[]> {
  const sheets = await readExcelFile(file);

  return sheets.map((sheet) => sheet.sheet);
}

export async function parseExcel(
  file: File,
  sheetName: string,
  headerRow = 1
): Promise<CsvRow[]> {
  if (!Number.isInteger(headerRow) || headerRow < 1) {
    throw new Error("Header row must be a positive whole number.");
  }

  const rows = await readSheet(file, sheetName);

  if (rows.length < headerRow) {
    throw new Error(
      `Row ${headerRow} does not exist in ${sheetName}.`
    );
  }

  const headers = rows[headerRow - 1].map((cell) =>
    String(cell ?? "").trim()
  );

  if (headers.some((header) => header === "")) {
    throw new Error(
      `Row ${headerRow} contains empty column headings. Choose another header row.`
    );
  }

  if (new Set(headers).size !== headers.length) {
    throw new Error(
      `Row ${headerRow} contains duplicate column headings.`
    );
  }

  return rows
    .slice(headerRow)
    .filter((row) =>
      row.some((cell) => cell !== null && cell !== "")
    )
    .map((row) => {
      const record: CsvRow = {};

      headers.forEach((header, index) => {
        const value = row[index];

        record[header] =
          value === null || value === undefined
            ? ""
            : value instanceof Date
              ? value.toISOString()
              : String(value);
      });

      return record;
    });
}
