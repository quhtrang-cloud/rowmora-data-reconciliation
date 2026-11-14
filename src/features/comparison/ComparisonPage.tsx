
import { useRef, useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import type { ParsedFile } from "../upload/UploadPage";
import {
  compareRows,
  type ComparisonIssue,
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

function getSourceName(file: ParsedFile | undefined): string {
  if (!file) return "No source";
  return file.sheetName || file.fileName;
}

function getSourceType(file: ParsedFile | undefined): string {
  if (!file) return "";

  return file.fileName.toLowerCase().endsWith(".xlsx")
    ? "XLSX"
    : "CSV";
}

function formatValue(value: string | undefined): string {
  return value === undefined || value === ""
    ? "(empty)"
    : value;
}

function getIssueLabel(issue: ComparisonIssue): string {
  return issue.type === "duplicate_key"
    ? "Duplicate matching key"
    : "Missing matching key";
}

export default function ComparisonPage({
  files,
  onBack,
}: ComparisonPageProps) {
  const [isSwapped, setIsSwapped] = useState(false);
  const [matchingColumn, setMatchingColumn] = useState("");
  const [result, setResult] = useState<ComparisonResult | null>(
    null
  );
  const [error, setError] = useState("");

  const [activeFilter, setActiveFilter] = useState<
    RowStatus | "all"
  >("all");

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<
    number[]
  >([]);

  const detailsRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLElement>(null);

  const sourceA = isSwapped ? files[1] : files[0];
  const sourceB = isSwapped ? files[0] : files[1];

  const sourceAColumns = Object.keys(sourceA?.rows[0] ?? {});
  const sourceBColumns = Object.keys(sourceB?.rows[0] ?? {});

  const sharedColumns = sourceAColumns.filter((column) =>
    sourceBColumns.includes(column)
  );

  const visibleRows = result
    ? result.rows.filter(
        (row) =>
          activeFilter === "all" ||
          row.status === activeFilter
      )
    : [];

  const duplicateCount =
    result?.issues.filter(
      (issue) => issue.type === "duplicate_key"
    ).length ?? 0;

  const missingCount =
    result?.issues.reduce(
      (total, issue) =>
        total +
        (issue.type === "missing_key"
          ? issue.rows.length
          : 0),
      0
    ) ?? 0;

  const issueCount = duplicateCount + missingCount;

  const hasColumnDifferences = result
    ? result.sourceAOnlyColumns.length > 0 ||
      result.sourceBOnlyColumns.length > 0
    : false;

  function clearResults() {
    setResult(null);
    setError("");
    setActiveFilter("all");
    setIsReviewOpen(false);
    setExpandedIssues([]);
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

    if (!sourceA || !sourceB) {
      setError("Please upload two data sources first.");
      return;
    }

    if (
      !matchingColumn ||
      !sharedColumns.includes(matchingColumn)
    ) {
      setError("Please select a valid matching column.");
      return;
    }

    try {
      const comparison = compareRows(
        sourceA.rows,
        sourceB.rows,
        matchingColumn
      );

      setResult(comparison);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to compare these sources."
      );
    }
  }

  function scrollToElement(element: HTMLElement | null) {
    if (!element) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    element.scrollIntoView({
      behavior: prefersReducedMotion ? "instant" : "smooth",
      block: "start",
    });
  }

  function handleFilterChange(filter: RowStatus | "all") {
    setActiveFilter(filter);

    // The table remains mounted, so we can scroll immediately.
    scrollToElement(detailsRef.current);
  }

  function handleSummaryClick(status: RowStatus) {
    const nextFilter =
      activeFilter === status ? "all" : status;

    handleFilterChange(nextFilter);
  }

  function handleReviewToggle() {
    const nextOpen = !isReviewOpen;

    setIsReviewOpen(nextOpen);

    if (nextOpen) {
      // Wait until the expanded content has rendered.
      requestAnimationFrame(() => {
        scrollToElement(reviewRef.current);
      });
    }
  }

  function toggleIssue(index: number) {
    setExpandedIssues((current) =>
      current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index]
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.headerNav}>
          <p className={styles.step}>STEP 2 OF 2</p>
          <button
            type="button"
            className={styles.backButton}
            onClick={onBack}
            aria-label="Edit uploaded files and worksheet settings"
          >
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
              <path d="M9 12h12" />
            </svg>
            <span>Edit sources</span>
          </button>
        </div>

        <h1 className={styles.title}>See what changed.</h1>

        <p className={styles.description}>
          Review your data sources, choose how to match
          records, and compare the results.
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
            {[sourceA, sourceB].map((file, index) => (
              <div key={index} className={styles.fileInfo}>
                <span className={styles.fileLabel}>
                  Source {index === 0 ? "A" : "B"} ·{" "}
                  {getSourceType(file)}
                </span>

                <strong className={styles.fileName}>
                  {getSourceName(file)}
                </strong>

                {file?.sheetName && (
                  <span className={styles.helper}>
                    {file.fileName}
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.swapButton}
            onClick={handleSwap}
            disabled={files.length !== 2}
          >
            ⇄ Swap sources
          </button>

          <p className={styles.helper}>
            Differences are shown from Source A to Source B.
            These sources may represent different systems,
            not necessarily earlier and later versions.
          </p>

          <div className={styles.matchSection}>
            <label
              className={styles.label}
              htmlFor="matching-column"
            >
              Match records by
            </label>

            <select
              id="matching-column"
              className={styles.select}
              value={matchingColumn}
              onChange={(event) =>
                handleColumnChange(event.target.value)
              }
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

            <p className={styles.helper}>
              Choose a column that uniquely identifies each
              record in both sources, such as SKU or ID.
            </p>
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
              Compare sources
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

            <p className={styles.description}>
              {result.rows.length} records classified.
              {" "}
              {result.summary.added} only in Source B,{" "}
              {result.summary.removed} only in Source A,{" "}
              {result.summary.changed} different,{" "}
              {result.summary.unchanged} identical.
            </p>

            <div
              className={styles.summaryGrid}
              aria-label="Filter comparison results by status"
            >
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
                  aria-label={`Show ${result.summary[status]} ${status} records`}
                  onClick={() =>
                    handleSummaryClick(status)
                  }
                >
                  <span className={styles.summaryNumber}>
                    {result.summary[status]}
                  </span>

                  <span className={styles.summaryLabel}>
                    {status}
                  </span>

                  <span className={styles.summaryHint}>
                    View records
                  </span>
                </button>
              ))}
            </div>

            {(issueCount > 0 || hasColumnDifferences) && (
              <section
                ref={reviewRef}
                className={styles.reviewSection}
                aria-labelledby="review-title"
              >
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewHeading}>
                    <span
                      className={styles.reviewIcon}
                      aria-hidden="true"
                    >
                      !
                    </span>

                    <h3
                      id="review-title"
                      className={styles.sectionTitle}
                    >
                      Needs review
                    </h3>
                  </div>

                  {issueCount > 0 && (
                    <span className={styles.issueBadge}>
                      {issueCount}{" "}
                      {issueCount === 1 ? "issue" : "issues"}
                    </span>
                  )}
                </div>

                <p className={styles.reviewDescription}>
                  {issueCount > 0
                    ? "Some records couldn't be matched safely. Review these issues before using the results."
                    : "Some columns are not shared between the two sources."}
                </p>

                {!isReviewOpen && result.issues.length > 0 && (
                  <div className={styles.reviewPreview}>
                    {result.issues.slice(0, 2).map(
                      (issue, index) => (
                        <p
                          key={`${issue.source}-${issue.type}-${index}`}
                          className={styles.reviewPreviewItem}
                        >
                          <strong>
                            {getIssueLabel(issue)}
                          </strong>

                          <span>
                            Source {issue.source}
                            {issue.key
                              ? ` · ${issue.key}`
                              : ""}
                          </span>
                        </p>
                      )
                    )}

                    {result.issues.length > 2 && (
                      <p className={styles.helper}>
                        And {result.issues.length - 2} more
                        issues.
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className={styles.reviewToggle}
                  onClick={handleReviewToggle}
                  aria-expanded={isReviewOpen}
                  aria-controls="review-content"
                >
                  <svg
                    style={{ display: "block", flexShrink: 0, transform: isReviewOpen ? "rotate(180deg)" : "none" }}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>

                  {isReviewOpen
                    ? "Hide review details"
                    : "Review issues"}
                </button>

                {isReviewOpen && (
                  <div
                    id="review-content"
                    className={styles.reviewContent}
                  >
                    <div className={styles.issueList}>
                      {result.issues.map((issue, index) => {
                        const expanded =
                          expandedIssues.includes(index);

                        const issueSource =
                          issue.source === "A"
                            ? sourceA
                            : sourceB;

                        const columns = Object.keys(
                          issue.rows[0] ?? {}
                        );

                        const recordCount =
                          issue.rows.length;

                        return (
                          <article
                            key={`${issue.source}-${issue.type}-${issue.key}-${index}`}
                            className={styles.issueCard}
                          >
                            <div className={styles.issueHeader}>
                              <div className={styles.issueHeading}>
                                <h4
                                  className={styles.issueTitle}
                                >
                                  {getIssueLabel(issue)}
                                </h4>

                                <p
                                  className={styles.issueSource}
                                >
                                  Source {issue.source} ·{" "}
                                  {getSourceName(issueSource)}
                                </p>
                              </div>

                              <span
                                className={styles.recordBadge}
                              >
                                {recordCount}{" "}
                                {recordCount === 1
                                  ? "record"
                                  : "records"}
                              </span>
                            </div>

                            {issue.type ===
                            "duplicate_key" ? (
                              <div
                                className={styles.issueDetails}
                              >
                                <p
                                  className={styles.issueKey}
                                >
                                  <span>
                                    {matchingColumn}
                                  </span>

                                  <strong>
                                    {issue.key}
                                  </strong>
                                </p>

                                <p
                                  className={
                                    styles.issueDescription
                                  }
                                >
                                  Data{" "}
                                  {issue.rowNumbers.length ===
                                  1
                                    ? "row"
                                    : "rows"}{" "}
                                  {issue.rowNumbers.join(
                                    ", "
                                  )}{" "}
                                  share the same matching key.
                                </p>
                              </div>
                            ) : (
                              <div
                                className={styles.issueDetails}
                              >
                                <p
                                  className={
                                    styles.issueDescription
                                  }
                                >
                                  {recordCount}{" "}
                                  {recordCount === 1
                                    ? "record has"
                                    : "records have"}{" "}
                                  an empty value in{" "}
                                  <strong>
                                    {matchingColumn}
                                  </strong>
                                  . Data{" "}
                                  {issue.rowNumbers.length ===
                                  1
                                    ? "row"
                                    : "rows"}{" "}
                                  {issue.rowNumbers.join(
                                    ", "
                                  )}
                                  .
                                </p>
                              </div>
                            )}

                            <button
                              type="button"
                              className={
                                styles.viewRecordsButton
                              }
                              onClick={() =>
                                toggleIssue(index)
                              }
                              aria-expanded={expanded}
                              aria-controls={`issue-records-${index}`}
                            >
                              <svg
                                style={{ display: "block", flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none" }}
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>

                              {expanded
                                ? "Hide records"
                                : `View ${recordCount} ${
                                    recordCount === 1
                                      ? "record"
                                      : "records"
                                  }`}
                            </button>

                            {expanded && (
                              <div
                                id={`issue-records-${index}`}
                                className={
                                  styles.issueTableWrapper
                                }
                                role="region"
                                aria-label={`Source ${issue.source} records needing review`}
                                tabIndex={0}
                              >
                                <table
                                  className={styles.table}
                                >
                                  <thead>
                                    <tr>
                                      <th scope="col">
                                        Data row
                                      </th>

                                      {columns.map(
                                        (column) => (
                                          <th
                                            key={column}
                                            scope="col"
                                          >
                                            {column}
                                          </th>
                                        )
                                      )}
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {issue.rows.map(
                                      (row, rowIndex) => (
                                        <tr key={rowIndex}>
                                          <td>
                                            {
                                              issue
                                                .rowNumbers[
                                                rowIndex
                                              ]
                                            }
                                          </td>

                                          {columns.map(
                                            (column) => (
                                              <td
                                                key={column}
                                              >
                                                {formatValue(
                                                  row[column]
                                                )}
                                              </td>
                                            )
                                          )}
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>

                    {hasColumnDifferences && (
                      <div
                        className={styles.columnNotice}
                      >
                        <h4>Columns not shared</h4>

                        <p>
                          <strong>
                            Only in Source A:
                          </strong>{" "}
                          {result.sourceAOnlyColumns.join(
                            ", "
                          ) || "None"}
                        </p>

                        <p>
                          <strong>
                            Only in Source B:
                          </strong>{" "}
                          {result.sourceBOnlyColumns.join(
                            ", "
                          ) || "None"}
                        </p>

                        <p className={styles.helper}>
                          These columns were not compared.
                        </p>
                      </div>
                    )}

                    {issueCount > 0 && (
                      <p className={styles.reviewNote}>
                        Records with missing or ambiguous
                        matching keys are excluded from
                        automatic matching. Other records can
                        still be compared.
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            <div
              ref={detailsRef}
              className={styles.detailsSection}
            >
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
                    onChange={(event) =>
                      handleFilterChange(
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
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p
                className={styles.resultsCount}
                role="status"
                aria-live="polite"
              >
                Showing {visibleRows.length} of{" "}
                {result.rows.length} records
                {activeFilter !== "all"
                  ? ` · ${activeFilter}`
                  : ""}
                .
              </p>

              <div
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
                      <th scope="col">Status</th>
                      <th scope="col">Column</th>
                      <th scope="col" title={getSourceName(sourceA)}>
                        {getSourceName(sourceA)} (A)
                      </th>
                      <th scope="col" title={getSourceName(sourceB)}>
                        {getSourceName(sourceB)} (B)
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className={styles.emptyState}
                        >
                          No records match this filter.
                        </td>
                      </tr>
                    ) : (
                      visibleRows.flatMap((row) => {
                        const differences =
                          row.status === "changed"
                            ? row.differences
                            : [
                                {
                                  column: "—",
                                  oldValue: "",
                                  newValue: "",
                                },
                              ];

                        return differences.map(
                          (difference, index) => (
                            <tr
                              key={`${row.key}-${index}`}
                            >
                              {index === 0 && (
                                <>
                                  <td
                                    rowSpan={
                                      differences.length
                                    }
                                    className={
                                      styles.keyCell
                                    }
                                  >
                                    {row.key}
                                  </td>

                                  <td
                                    rowSpan={
                                      differences.length
                                    }
                                  >
                                    <span
                                      className={`${
                                        styles.statusBadge
                                      } ${
                                        styles[row.status]
                                      }`}
                                    >
                                      {row.status}
                                    </span>
                                  </td>
                                </>
                              )}

                              <td>
                                {difference.column}
                              </td>

                              <td>
                                {row.status === "changed"
                                  ? formatValue(
                                      difference.oldValue
                                    )
                                  : row.status === "removed"
                                    ? "Only in Source A"
                                    : row.status === "added"
                                      ? "Not present"
                                      : "—"}
                              </td>

                              <td>
                                {row.status === "changed"
                                  ? formatValue(
                                      difference.newValue
                                    )
                                  : row.status === "added"
                                    ? "Only in Source B"
                                    : row.status === "removed"
                                      ? "Not present"
                                      : "—"}
                              </td>
                            </tr>
                          )
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <p className={styles.comparisonNote}>
                Differences show values recorded in each
                source. They do not necessarily indicate
                a change over time or a business error.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
