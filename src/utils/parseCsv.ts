import Papa from "papaparse";

export type CsvRow = Record<string, string>;

export function parseCsv(file: File): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0].message));
          return;
        }

        resolve(results.data);
      },

      error: (error) => {
        reject(error);
      },
    });
  });
}