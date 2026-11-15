
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import { parseCsv, type CsvRow } from "../../utils/parseCsv";
import {
  getExcelSheetNames,
  parseExcel,
} from "../../utils/parseExcel";
import { FileDropzone } from "./FileDropzone";
import styles from "./UploadPage.module.css";

export type ParsedFile = {
  fileName: string;
  sheetName?: string;
  rows: CsvRow[];
};

type UploadPageProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onContinue: (files: ParsedFile[]) => void;
};

type FilePreviewProps = {
  files: File[];
  isLoadingSample: boolean;
  onContinue: (files: ParsedFile[]) => void;
};

type FileSheet = {
  fileName: string;
  sheetNames: string[];
};

const HEADER_ROW_OPTIONS = Array.from({ length: 100 }, (_, index) => index + 1);

type SampleKind = "csv" | "excel";

const samplePaths: Record<SampleKind, string[]> = {
  csv: ["/samples/inventory-old.csv", "/samples/inventory-new.csv"],
  excel: ["/samples/rowmora-reconciliation-sample.xlsx"],
};

function isExcelFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".xlsx");
}

function FilePreview({
  files,
  isLoadingSample,
  onContinue,
}: FilePreviewProps) {
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [fileSheets, setFileSheets] = useState<FileSheet[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([
    "",
    "",
  ]);
  const [headerRows, setHeaderRows] = useState<number[]>([1, 1]);
  const [isParsing, setIsParsing] = useState(true);
  const [error, setError] = useState("");
  const settingsRef = useRef<HTMLElement>(null);
  const hasGuidedToSettings = useRef(false);

  // Step 1: Discover worksheets in Excel files.
  useEffect(() => {
    let cancelled = false;

    async function loadSheets() {
      setIsParsing(true);
      setError("");
      setParsedFiles([]);

      try {
        const results = await Promise.all(
          files.map(async (file) => {
            if (isExcelFile(file)) {
              const sheetNames = await getExcelSheetNames(file);

              if (sheetNames.length === 0) {
                throw new Error(
                  `${file.name} contains no worksheets.`
                );
              }

              return {
                fileName: file.name,
                sheetNames,
              };
            }

            if (file.name.toLowerCase().endsWith(".csv")) {
              return {
                fileName: file.name,
                sheetNames: [],
              };
            }

            throw new Error(
              `${file.name} is not a supported file type.`
            );
          })
        );

        if (!cancelled) {
          setFileSheets(results);
          setSelectedSheets(
            results.map((result, index) => {
              // When the same workbook is used twice, start with two
              // different worksheets so the user can compare them.
              if (
                index === 1 &&
                files[0] === files[1] &&
                result.sheetNames.length > 1
              ) {
                return result.sheetNames.includes("Talent Agreements")
                  ? "Talent Agreements"
                  : result.sheetNames[1];
              }
              return result.sheetNames[0] ?? "";
            })
          );
          setHeaderRows(results.map(() => 1));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't read your files. Please try again."
          );
          setIsParsing(false);
        }
      }
    }

    void loadSheets();

    return () => {
      cancelled = true;
    };
  }, [files]);

  // Step 2: Parse CSV files or selected Excel worksheets.
  useEffect(() => {
    if (fileSheets.length !== files.length) return;

    let cancelled = false;

    async function readFiles() {
      setIsParsing(true);
      setError("");
      setParsedFiles([]);

      try {
        const results = await Promise.all(
          files.map(async (file, index) => {
            let rows: CsvRow[];

            if (isExcelFile(file)) {
              const sheetName = selectedSheets[index];

              if (!sheetName) {
                throw new Error(
                  `Please select a worksheet for ${file.name}.`
                );
              }

              rows = await parseExcel(file, sheetName, headerRows[index]);
            } else {
              rows = await parseCsv(file);
            }

            if (rows.length === 0) {
              throw new Error(
                `${file.name} contains no data rows.`
              );
            }

            return {
              fileName: file.name,
              sheetName: isExcelFile(file) ? selectedSheets[index] : undefined,
              rows,
            };
          })
        );

        if (!cancelled) {
          setParsedFiles(results);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't read your files. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setIsParsing(false);
        }
      }
    }

    void readFiles();

    return () => {
      cancelled = true;
    };
  }, [files, fileSheets, selectedSheets, headerRows]);

  function handleSheetChange(index: number, sheetName: string) {
    setParsedFiles([]);
    setIsParsing(true);
    setError("");
    setHeaderRows((current) => current.map((row, i) => i === index ? 1 : row));
    setSelectedSheets((current) =>
      current.map((value, i) =>
        i === index ? sheetName : value
      )
    );
  }

  function handleHeaderRowChange(index: number, row: number) {
    setParsedFiles([]);
    setIsParsing(true);
    setError("");
    setHeaderRows((current) =>
      current.map((value, i) => (i === index ? row : value))
    );
  }

  // Guide the user once, after both files have been successfully parsed.
  // Do not jump again when they change a worksheet or header row.
  useEffect(() => {
    if (
      hasGuidedToSettings.current ||
      isLoadingSample ||
      isParsing ||
      error ||
      parsedFiles.length !== 2
    ) {
      return;
    }

    hasGuidedToSettings.current = true;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    settingsRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "instant" : "smooth",
      block: "start",
    });
  }, [parsedFiles, isParsing, isLoadingSample, error]);

  const canContinue =
    parsedFiles.length === 2 &&
    !isLoadingSample &&
    !isParsing &&
    !error;

  return (
    <>
      {fileSheets && fileSheets.length === 2 && (
        <section ref={settingsRef} className={`${styles.previewSection} ${styles.settingsSection}`} aria-labelledby="configure-title">
          {!isParsing && !error && parsedFiles.length === 2 && (
            <p className={styles.readyMessage} role="status">
              <span aria-hidden="true">✓</span> Files ready for review
            </p>
          )}
          <h2 id="configure-title">Review your file settings</h2>
          <p className={styles.description}>
            Choose the worksheet and column headings before comparing your data.
          </p>
          <div className={styles.settingsGrid}>
            {fileSheets.map((file, index) => {
              const excel = file.sheetNames.length > 0;
              return (
                <div key={`${file.fileName}-${index}`} className={styles.settingsCard}>
                  <div className={styles.settingsCardHeader}>
                    <span className={styles.fileLabel}>FILE {index + 1}</span>
                    <span className={styles.fileType}>{excel ? "XLSX" : "CSV"}</span>
                  </div>
                  <p className={styles.settingsFileName}>{file.fileName}</p>
                  {excel ? (
                    <div className={styles.settingsFields}>
                      <div className={styles.field}>
                        <label htmlFor={`sheet-${index}`}>Worksheet</label>
                        <select
                          id={`sheet-${index}`}
                          value={selectedSheets[index] ?? ""}
                          onChange={(event) => handleSheetChange(index, event.target.value)}
                        >
                          {file.sheetNames.map((sheetName) => (
                            <option key={sheetName} value={sheetName}>{sheetName}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label htmlFor={`header-${index}`}>Header row</label>
                        <select
                          id={`header-${index}`}
                          value={headerRows[index] ?? 1}
                          onChange={(event) => handleHeaderRowChange(index, Number(event.target.value))}
                        >
                          {HEADER_ROW_OPTIONS.map((row) => (
                            <option key={row} value={row}>Row {row}</option>
                          ))}
                        </select>
                        <p className={styles.fieldHint}>
                          Select the row containing your column names.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.csvNote}>
                      CSV files use the first row as column headings.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {isParsing && (
        <p role="status" className={styles.description}>
          Reading your files...
        </p>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {parsedFiles.length === 2 && !isParsing && (
        <section
          className={styles.previewSection}
          aria-labelledby="preview-title"
        >
          <h2 id="preview-title">Data preview</h2>

          <p className={styles.description}>
            Review your data before comparing the files. Scroll to explore all rows and columns.
          </p>

          {parsedFiles.map((file, index) => {
            const columns = Object.keys(file.rows[0] ?? {});
            const excel = isExcelFile(files[index]);
            const displayName = file.sheetName ?? file.fileName;

            return (
              <div
                key={`${file.fileName}-${index}`}
                className={styles.previewFile}
              >
                <div className={styles.previewFileHeader}>
                  <div>
                    <p className={styles.fileLabel}>
                      FILE {index + 1} · {excel ? "XLSX" : "CSV"}
                    </p>
                    <h3>{displayName}</h3>
                    {excel && (
                      <p className={styles.previewFileName}>{file.fileName}</p>
                    )}
                  </div>

                  <span className={styles.rowCount}>
                    {file.rows.length} data rows
                  </span>
                </div>

                <div
                  className={styles.previewTableWrapper}
                  role="region"
                  aria-label={`${displayName} preview`}
                  tabIndex={0}
                >
                  <table>
                    <thead>
                      <tr>
                        {columns.map((column) => (
                          <th key={column} scope="col">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {file.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {columns.map((column) => (
                            <td key={column}>
                              {row[column] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <div className={styles.actions}>
        <Button
          type="button"
          disabled={!canContinue}
          onClick={() => onContinue(parsedFiles)}
        >
          Continue to comparison
        </Button>
      </div>
    </>
  );
}

export function UploadPage({
  files,
  onFilesChange,
  onContinue,
}: UploadPageProps) {
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [sampleError, setSampleError] = useState("");
  const [activeSample, setActiveSample] = useState<SampleKind | null>(null);

  async function handleTrySample(kind: SampleKind) {
    setIsLoadingSample(true);
    setSampleError("");

    try {
      let sampleFiles: File[];

      if (kind === "excel") {
        const path = samplePaths.excel[0];
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error("Unable to load Excel sample.");
        }
        const blob = await response.blob();
        const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
        if (
          signature[0] !== 0x50 ||
          signature[1] !== 0x4b ||
          signature[2] !== 0x03 ||
          signature[3] !== 0x04
        ) {
          throw new Error("Excel sample not found. Check public/samples/rowmora-reconciliation-sample.xlsx.");
        }
        const workbook = new File(
          [blob],
          "rowmora-reconciliation-sample.xlsx",
          {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );
        // The current comparison workflow accepts two sources.
        // Reuse the same workbook, with a separate sheet for each source.
        sampleFiles = [workbook, workbook];
      } else {
        sampleFiles = await Promise.all(
          samplePaths.csv.map(async (path) => {
            const response = await fetch(path);
            if (!response.ok) {
              throw new Error("Unable to load CSV sample.");
            }
            const blob = await response.blob();
            const name = path.split("/").pop() ?? "sample.csv";
            return new File([blob], name, { type: "text/csv" });
          })
        );
      }

      setActiveSample(kind);
      onFilesChange(sampleFiles);
    } catch (err) {
      setSampleError(err instanceof Error ? err.message : "Couldn't load the sample files. Please try again.");
    } finally {
      setIsLoadingSample(false);
    }
  }

  function handleFilesChange(nextFiles: File[]) {
    setSampleError("");
    setActiveSample(null);
    onFilesChange(nextFiles);
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <p className={styles.step}>STEP 1 OF 2</p>

        <h1>Let's get your files in.</h1>

        <p className={styles.description}>
          Add two CSV or Excel (.xlsx) files to preview
          and compare your data.
        </p>

        <FileDropzone
          files={files}
          onFilesChange={handleFilesChange}
        />

        {activeSample && files.length === 2 ? (
          <section className={styles.sampleCompact} aria-label="Selected sample">
            <div>
              <p className={styles.sampleCompactTitle}>
                {activeSample === "excel"
                  ? "Event reconciliation sample"
                  : "Inventory comparison sample"}
              </p>
              <p className={styles.sampleCompactDescription}>
                {activeSample === "excel"
                  ? "Excel workbook loaded - review the worksheets below."
                  : "CSV files loaded - review the data below."}
              </p>
            </div>
            <button
              type="button"
              className={styles.changeSampleButton}
              onClick={() => setActiveSample(null)}
            >
              Change sample
            </button>
          </section>
        ) : (
          <section className={styles.sampleSection} aria-labelledby="sample-title">
            <div className={styles.sampleIntro}>
              <h2 id="sample-title">Want to try it first?</h2>
              <p>Choose a sample to explore how Rowmora works.</p>
            </div>
            <div className={styles.sampleOptions}>
              <div className={styles.sampleOption}>
                <div className={styles.sampleOptionText}>
                  <div className={styles.sampleOptionHeading}>
                    <h3>Inventory comparison</h3>
                    <span className={styles.sampleFormat}>CSV</span>
                  </div>
                  <p>Compare two inventory files.</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleTrySample("csv")}
                  disabled={isLoadingSample}
                >
                  {isLoadingSample ? "Loading..." : "Use CSV sample"}
                </Button>
              </div>
              <div className={styles.sampleOption}>
                <div className={styles.sampleOptionText}>
                  <div className={styles.sampleOptionHeading}>
                    <h3>Event reconciliation</h3>
                    <span className={styles.sampleFormat}>XLSX</span>
                  </div>
                  <p>Compare bookings, finance records, or agreements.</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleTrySample("excel")}
                  disabled={isLoadingSample}
                >
                  {isLoadingSample ? "Loading..." : "Use Excel sample"}
                </Button>
              </div>
            </div>
          </section>
        )}

        {sampleError && (
          <p role="alert" className={styles.error}>
            {sampleError}
          </p>
        )}

        {files.length === 2 ? (
          <FilePreview
            key={files
              .map(
                (file) =>
                  `${file.name}:${file.size}:${file.lastModified}`
              )
              .join("|")}
            files={files}
            isLoadingSample={isLoadingSample}
            onContinue={onContinue}
          />
        ) : (
          <div className={styles.actions}>
            <Button type="button" disabled>
              Continue to comparison
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
