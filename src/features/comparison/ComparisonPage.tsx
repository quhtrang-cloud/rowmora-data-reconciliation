
import { useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import type { ParsedFile } from "../upload/UploadPage";
import {
  compareRows,
  type ComparisonResult,
  type RowStatus,
} from "../../utils/compareRows";
import styles from "./ComparisonPage.module.css";

type ComparisonPageProps = {
  files: ParsedFile[];
  onBack: () => void;
};

const statuses: RowStatus[] = [
  "added",
  "removed",
  "changed",
  "unchanged",
];

function formatValue(value: string) {
  return value === "" ? "(empty)" : value;
}

function getDetails(row: ComparisonResult["rows"][number]) {
  if (row.status === "added") return "New record";
  if (row.status === "removed") return "Record removed";
  if (row.status === "unchanged") return "No changes";

  return row.differences
    .map(
      ({ column, oldValue, newValue }) =>
        `${column}: ${formatValue(oldValue)} → ${formatValue(newValue)}`
    )
    .join("; ");
}

export default function ComparisonPage({
  files,
  onBack,
}: ComparisonPageProps) {
  const [isSwapped, setIsSwapped] = useState(false);
  const [matchingColumn, setMatchingColumn] = useState("");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    RowStatus | "all"
  >("all");

  const originalFile = isSwapped ? files[1] : files[0];
  const updatedFile = isSwapped ? files[0] : files[1];

  const originalColumns = Object.keys(originalFile?.rows[0] ?? {});
  const updatedColumns = Object.keys(updatedFile?.rows[0] ?? {});

  const sharedColumns = originalColumns.filter((column) =>
    updatedColumns.includes(column)
  );

  const visibleRows = result
    ? result.rows.filter(
        (row) =>
          activeFilter === "all" || row.status === activeFilter
      )
    : [];

  function clearResults() {
    setResult(null);
    setError("");
    setActiveFilter("all");
  }

  function handleSwap() {
    setIsSwapped((current) => !current);
    clearResults();
  }

  function handleColumnChange(column: string) {
    setMatchingColumn(column);
    clearResults();
  }

  function handleCompare() {
    clearResults();

    if (!originalFile || !updatedFile) {
      setError("Please upload two files first.");
      return;
    }

    if (!matchingColumn || !sharedColumns.includes(matchingColumn)) {
      setError("Please select a valid matching column.");
      return;
    }

    if (
      originalFile.rows.length === 0 ||
      updatedFile.rows.length === 0
    ) {
      setError(
        "Both files must contain at least one data row."
      );
      return;
    }

    try {
      const comparison = compareRows(
        originalFile.rows,
        updatedFile.rows,
        matchingColumn
      );

      setResult(comparison);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to compare these files."
      );
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
        >
          ← Back to upload
        </button>

        <p className={styles.step}>STEP 2 OF 2</p>

        <h1 className={styles.title}>See what changed.</h1>

        <p className={styles.description}>
          Choose how to match records, then compare your files.
        </p>

        <section
          className={styles.card}
          aria-labelledby="comparison-settings-title"
        >
          <h2
            id="comparison-settings-title"
            className={styles.sectionTitle}
          >
            Comparison settings
          </h2>

          <div className={styles.fileGrid}>
            <div className={styles.fileInfo}>
              <span className={styles.fileLabel}>
                Original file
              </span>

              <strong className={styles.fileName}>
                {originalFile?.fileName ?? "No file"}
              </strong>
            </div>

            <div className={styles.fileInfo}>
              <span className={styles.fileLabel}>
                Updated file
              </span>

              <strong className={styles.fileName}>
                {updatedFile?.fileName ?? "No file"}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className={styles.swapButton}
            onClick={handleSwap}
            disabled={files.length !== 2}
          >
            ⇄ Swap files
          </button>

          <div className={styles.matchSection}>
            <label
              className={styles.label}
              htmlFor="matching-column"
            >
              Match rows by
            </label>

            <select
              id="matching-column"
              className={styles.select}
              value={matchingColumn}
              onChange={(event) =>
                handleColumnChange(event.target.value)
              }
              aria-describedby="matching-column-help"
              aria-invalid={Boolean(error && !matchingColumn)}
              disabled={sharedColumns.length === 0}
            >
              <option value="">
                {sharedColumns.length === 0
                  ? "No shared columns available"
                  : "Select a column"}
              </option>

              {sharedColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>

            <p
              id="matching-column-help"
              className={styles.helper}
            >
              Choose a column with a unique value for each
              record, such as SKU or ID.
            </p>

            {files.length === 2 &&
              sharedColumns.length === 0 && (
                <p className={styles.error} role="alert">
                  No matching column names were found in
                  both files. Please upload files with at
                  least one shared column.
                </p>
              )}
          </div>

          <div className={styles.actions}>
            <Button
              type="button"
              disabled={
                !matchingColumn ||
                !sharedColumns.includes(matchingColumn) ||
                files.length !== 2
              }
              onClick={handleCompare}
            >
              Compare files
            </Button>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </section>

        {result && (
          <section
            className={styles.results}
            aria-labelledby="results-title"
          >
            <h2
              id="results-title"
              className={styles.sectionTitle}
            >
              Comparison results
            </h2>

            <p
              className={styles.description}
              role="status"
              aria-live="polite"
            >
              {result.rows.length} records compared.{" "}
              {result.summary.added} added,{" "}
              {result.summary.removed} removed,{" "}
              {result.summary.changed} changed,{" "}
              {result.summary.unchanged} unchanged.
            </p>

            <div className={styles.summaryGrid}>
              {statuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`${styles.summaryCard} ${
                    activeFilter === status
                      ? styles.selectedCard
                      : ""
                  }`}
                  aria-pressed={activeFilter === status}
                  aria-controls="comparison-details-table"
                  onClick={() =>
                    setActiveFilter(
                      activeFilter === status
                        ? "all"
                        : status
                    )
                  }
                >
                  <span className={styles.summaryNumber}>
                    {result.summary[status]}
                  </span>

                  <span className={styles.summaryLabel}>
                    {status}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.tableHeading}>
              <h3 className={styles.tableTitle}>
                Comparison details
              </h3>

              <div className={styles.filterGroup}>
                <label htmlFor="status-filter">
                  Show
                </label>

                <select
                  id="status-filter"
                  className={styles.filterSelect}
                  value={activeFilter}
                  aria-controls="comparison-details-table"
                  onChange={(event) =>
                    setActiveFilter(
                      event.target.value as
                        | RowStatus
                        | "all"
                    )
                  }
                >
                  <option value="all">
                    All records
                  </option>

                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p
              className={styles.helper}
              role="status"
              aria-live="polite"
            >
              Showing {visibleRows.length} of{" "}
              {result.rows.length} records.
            </p>

            <div
              id="comparison-details-table"
              className={styles.tableWrapper}
              role="region"
              aria-label="Comparison details"
              tabIndex={0}
            >
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">
                      {matchingColumn}
                    </th>
                    <th scope="col">
                      Status
                    </th>
                    <th scope="col">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.length > 0 ? (
                    visibleRows.map((row) => (
                      <tr key={row.key}>
                        <td className={styles.keyCell}>
                          {row.key}
                        </td>

                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              styles[row.status]
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>

                        <td className={styles.detailsCell}>
                          {getDetails(row)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className={styles.emptyState}
                      >
                        No records match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
