
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import { parseCsv, type CsvRow } from "../../utils/parseCsv";
import { FileDropzone } from "./FileDropzone";
import styles from "./UploadPage.module.css";

export type ParsedFile = {
  fileName: string;
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

const samplePaths = [
  "/samples/inventory-old.csv",
  "/samples/inventory-new.csv",
];

function FilePreview({
  files,
  isLoadingSample,
  onContinue,
}: FilePreviewProps) {
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [isParsing, setIsParsing] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function readFiles() {
      try {
        const results = await Promise.all(
          files.map(async (file) => {
            if (!file.name.toLowerCase().endsWith(".csv")) {
              throw new Error("Only CSV files are supported.");
            }

            const rows = await parseCsv(file);

            if (rows.length === 0) {
              throw new Error(`${file.name} contains no data rows.`);
            }

            return {
              fileName: file.name,
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
  }, [files]);

  const canContinue =
    parsedFiles.length === 2 &&
    !isLoadingSample &&
    !isParsing &&
    !error;

  return (
    <>
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
            Review your data before comparing the files.
          </p>

          {parsedFiles.map((file, index) => {
            const columns = Object.keys(file.rows[0] ?? {});

            return (
              <div
                key={`${file.fileName}-${index}`}
                className={styles.previewFile}
              >
                <div className={styles.previewFileHeader}>
                  <div>
                    <h3>
                      {index === 0 ? "File 1" : "File 2"}
                    </h3>

                    <p className={styles.previewFileName}>
                      {file.fileName}
                    </p>
                  </div>

                  <span className={styles.rowCount}>
                    {file.rows.length} data rows
                  </span>
                </div>

                <div
                  className={styles.previewTableWrapper}
                  role="region"
                  aria-label={`${file.fileName} preview`}
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

  async function handleTrySample() {
    setIsLoadingSample(true);
    setSampleError("");

    try {
      const sampleFiles = await Promise.all(
        samplePaths.map(async (path) => {
          const response = await fetch(path);

          if (!response.ok) {
            throw new Error("Unable to load sample data.");
          }

          const blob = await response.blob();
          const name = path.split("/").pop() ?? "sample.csv";

          return new File([blob], name, {
            type: "text/csv",
          });
        })
      );

      onFilesChange(sampleFiles);
    } catch {
      setSampleError(
        "Couldn't load the sample files. Please try again."
      );
    } finally {
      setIsLoadingSample(false);
    }
  }

  function handleFilesChange(nextFiles: File[]) {
    setSampleError("");
    onFilesChange(nextFiles);
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <p className={styles.step}>STEP 1 OF 2</p>

        <h1>Let's get your files in.</h1>

        <p className={styles.description}>
          Add two CSV files to see a preview before comparing them.
        </p>

        <FileDropzone
          files={files}
          onFilesChange={handleFilesChange}
        />

        <div className={styles.sampleSection}>
          <div>
            <h2>Want to try it first?</h2>
            <p>See how Rowmora works with sample spreadsheets.</p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleTrySample}
            disabled={isLoadingSample}
          >
            {isLoadingSample
              ? "Loading sample..."
              : "Try sample data"}
          </Button>
        </div>

        {sampleError && (
          <p role="alert" className={styles.error}>
            {sampleError}
          </p>
        )}

        {files.length === 2 ? (
          <FilePreview
            key={files.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join("|")}
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
