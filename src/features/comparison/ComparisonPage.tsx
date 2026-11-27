import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import type { ParsedFile } from "../upload/UploadPage";
import {
  compareRows,
  type ColumnMapping,
  type ComparisonIssue,
  type ComparisonResult,
  type RowStatus,
} from "../../utils/compareRows";
import {
  exportComparisonCsv,
  exportIssuesCsv,
  exportComparisonExcel,
} from "../../utils/exportComparison";
import { getDifferenceSegments } from "../../utils/highlightDifferences";
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

function HighlightedValue({
  value,
  otherValue,
}: {
  value: string;
  otherValue: string;
}) {
  if (value === "") {
    return <span>(empty)</span>;
  }

  // Numeric comparisons are easier to scan when the whole value is marked.
  // Only use this mode when both values are plain numbers (not mixed text).
  const numericPattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
  const isNumericChange =
    numericPattern.test(value.trim()) &&
    numericPattern.test(otherValue.trim()) &&
    value !== otherValue;

  if (isNumericChange) {
    return (
      <span className={styles.differenceValue}>
        <mark className={styles.differenceHighlight}>{value}</mark>
      </span>
    );
  }

  const segments = getDifferenceSegments(value, otherValue);

  return (
    <span className={styles.differenceValue}>
      {segments.map((segment, index) =>
        segment.changed ? (
          <mark key={index} className={styles.differenceHighlight}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </span>
  );
}

function getIssueLabel(issue: ComparisonIssue): string {
  return issue.type === "duplicate_key"
    ? "Duplicate matching key"
    : "Missing matching key";
}

function scrollToElement(element: HTMLElement | null) {
  if (!element) return;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  element.scrollIntoView({
    behavior: reducedMotion ? "instant" : "smooth",
    block: "start",
  });
}

export default function ComparisonPage({
  files,
  onBack,
}: ComparisonPageProps) {
  const [isSwapped, setIsSwapped] = useState(false);
  const [matchingColumn, setMatchingColumn] = useState("");
  const [matchingColumnB, setMatchingColumnB] = useState("");
  const [columnMappings, setColumnMappings] = useState<
    ColumnMapping[]
  >([]);
  const [mappingInitialized, setMappingInitialized] =
    useState(false);

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
  const [exportError, setExportError] = useState("");
  const [exportingExcel, setExportingExcel] = useState(false);

  const resultsRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLElement>(null);

  const sourceA = isSwapped ? files[1] : files[0];
  const sourceB = isSwapped ? files[0] : files[1];

  const sourceAColumns = Object.keys(sourceA?.rows[0] ?? {});
  const sourceBColumns = Object.keys(sourceB?.rows[0] ?? {});

  const availableA = sourceAColumns.filter(
    (column) => column !== matchingColumn
  );
  const availableB = sourceBColumns.filter(
    (column) => column !== matchingColumnB
  );

  const effectiveMappings = mappingInitialized
    ? columnMappings
    : availableA
        .filter((column) => availableB.includes(column))
        .map((column) => ({
          sourceA: column,
          sourceB: column,
        }));

  const skippedCount =
    availableA.length - effectiveMappings.length;

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
    setExportError("");
    setActiveFilter("all");
    setIsReviewOpen(false);
    setExpandedIssues([]);
  }

  function updateMappings(next: ColumnMapping[]) {
    setColumnMappings(next);
    setMappingInitialized(true);
    clearResults();
  }

  function handleMappingChange(
    sourceAColumn: string,
    sourceBColumn: string
  ) {
    const remaining = effectiveMappings.filter(
      (item) => item.sourceA !== sourceAColumn
    );

    updateMappings(
      sourceBColumn
        ? [
            ...remaining,
            {
              sourceA: sourceAColumn,
              sourceB: sourceBColumn,
            },
          ]
        : remaining
    );
  }

  function handleSwap() {
    setIsSwapped((current) => !current);
    setMatchingColumn("");
    setMatchingColumnB("");
    setColumnMappings([]);
    setMappingInitialized(false);
    clearResults();
  }

  function handleColumnChange(column: string) {
    setMatchingColumn(column);
    setMatchingColumnB(
      sourceBColumns.includes(column) ? column : ""
    );
    setColumnMappings([]);
    setMappingInitialized(false);
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
      !matchingColumnB ||
      !sourceAColumns.includes(matchingColumn) ||
      !sourceBColumns.includes(matchingColumnB)
    ) {
      setError("Please select a valid matching column.");
      return;
    }

    if (effectiveMappings.length === 0) {
      setError(
        "Map at least one field before comparing records."
      );
      return;
    }

    try {
      const comparison = compareRows(
        sourceA.rows,
        sourceB.rows,
        matchingColumn,
        {
          sourceBMatchingColumn: matchingColumnB,
          columnMappings: effectiveMappings,
        }
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

  async function handleExcelExport() {
    if (!result || exportingExcel) return;

    setExportError("");
    setExportingExcel(true);

    try {
      await exportComparisonExcel(result, {
        sourceAName: getSourceName(sourceA),
        sourceBName: getSourceName(sourceB),
        sourceAKey: matchingColumn,
        sourceBKey: matchingColumnB,
      });
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : "Excel export failed."
      );
    } finally {
      setExportingExcel(false);
    }
  }

  useEffect(() => {
    if (!result) return;

    const frame = requestAnimationFrame(() => {
      scrollToElement(resultsRef.current);
    });

    return () => cancelAnimationFrame(frame);
  }, [result]);

  function handleFilterChange(
    filter: RowStatus | "all"
  ) {
    setActiveFilter(filter);
    scrollToElement(detailsRef.current);
  }

  function handleSummaryClick(status: RowStatus) {
    handleFilterChange(
      activeFilter === status ? "all" : status
    );
  }

  function handleReviewToggle() {
    const nextOpen = !isReviewOpen;
    setIsReviewOpen(nextOpen);

    if (nextOpen) {
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

        <h1 className={styles.title}>
          See what changed.
        </h1>

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

          <div className={styles.sourceSwitcher}>
            <div className={styles.fileGrid}>
              {[sourceA, sourceB].map((file, index) => (
                <div
                  key={index}
                  className={styles.fileInfo}
                >
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
              aria-label="Swap Source A and Source B"
              title="Swap sources"
            >
              <svg
                aria-hidden="true"
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4" />
              </svg>
            </button>
          </div>

          <p className={styles.helper}>
            Differences are shown from Source A to
            Source B. These sources may represent
            different systems, not necessarily earlier
            and later versions.
          </p>

          <div className={styles.matchSection}>
            <h3 className={styles.label}>
              Match records by
            </h3>

            <p className={styles.helper}>
              Choose the identifier in each source.
              Names may differ, but values must identify
              the same records.
            </p>

            <div className={styles.mappingGrid}>
              <div>
                <label
                  className={styles.label}
                  htmlFor="matching-column"
                >
                  Source A key
                </label>

                <select
                  id="matching-column"
                  className={styles.select}
                  value={matchingColumn}
                  onChange={(event) =>
                    handleColumnChange(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select a column
                  </option>

                  {sourceAColumns.map((column) => (
                    <option
                      key={column}
                      value={column}
                    >
                      {column}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className={styles.label}
                  htmlFor="matching-column-b"
                >
                  Source B key
                </label>

                <select
                  id="matching-column-b"
                  className={styles.select}
                  value={matchingColumnB}
                  onChange={(event) => {
                    setMatchingColumnB(
                      event.target.value
                    );
                    setColumnMappings([]);
                    setMappingInitialized(false);
                    clearResults();
                  }}
                >
                  <option value="">
                    Select a column
                  </option>

                  {sourceBColumns.map((column) => (
                    <option
                      key={column}
                      value={column}
                    >
                      {column}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {matchingColumn && matchingColumnB && (
            <section
              className={styles.mappingSection}
              aria-labelledby="mapping-title"
            >
              <div className={styles.mappingHeading}>
                <div className={styles.mappingTitleRow}>
                  <h3
                    id="mapping-title"
                    className={styles.label}
                  >
                    Map columns
                  </h3>

                  <span className={styles.mappingCount}>
                    {effectiveMappings.length} of{" "}
                    {availableA.length} mapped
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.resetMappingButton}
                  onClick={() => {
                    setColumnMappings([]);
                    setMappingInitialized(false);
                    clearResults();
                  }}
                >
                  Reset mapping
                </button>
              </div>

              <p className={styles.helper}>
                Matching column names are mapped
                automatically. Review or adjust the
                pairs below.
              </p>

              <div className={styles.mappingGrid}>
                <span
                  className={styles.mappingColumnTitle}
                >
                  Source A
                </span>

                <span
                  className={styles.mappingColumnTitle}
                >
                  Compare with Source B
                </span>
              </div>

              {availableA.map((column) => {
                const mapped = effectiveMappings.find(
                  (item) =>
                    item.sourceA === column
                );

                const selectedB =
                  mapped?.sourceB ?? "";

                return (
                  <div
                    className={styles.mappingGrid}
                    key={column}
                  >
                    <div
                      className={styles.mappingSource}
                    >
                      <span>{column}</span>

                      <span
                        className={`${
                          styles.mappingStatus
                        } ${
                          selectedB
                            ? styles.mappingStatusMapped
                            : styles.mappingStatusSkipped
                        }`}
                        aria-label={
                          selectedB
                            ? "Column mapped"
                            : "Column skipped"
                        }
                      >
                        <span
                          className={
                            styles.mappingStatusIcon
                          }
                          aria-hidden="true"
                        >
                          {selectedB ? "✓" : "−"}
                        </span>

                        {selectedB
                          ? "Mapped"
                          : "Skipped"}
                      </span>
                    </div>

                    <select
                      className={styles.select}
                      aria-label={`Source B column for ${column}`}
                      value={selectedB}
                      onChange={(event) =>
                        handleMappingChange(
                          column,
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Do not compare
                      </option>

                      {availableB.map((other) => (
                        <option
                          key={other}
                          value={other}
                          disabled={effectiveMappings.some(
                            (item) =>
                              item.sourceB === other &&
                              item.sourceA !== column
                          )}
                        >
                          {other}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}

              <div
                className={styles.mappingFooter}
                aria-live="polite"
              >
                <p className={styles.helper}>
                  {effectiveMappings.length} field{" "}
                  {effectiveMappings.length === 1
                    ? "pair"
                    : "pairs"}{" "}
                  selected. Only mapped fields will
                  be compared.
                </p>

                {skippedCount > 0 && (
                  <p className={styles.mappingNotice}>
                    {skippedCount} Source A{" "}
                    {skippedCount === 1
                      ? "column is"
                      : "columns are"}{" "}
                    not mapped and will be excluded
                    from field comparison.
                  </p>
                )}

                <p className={styles.mappingCaution}>
                  Check that mapped columns have the
                  same meaning and compatible formats.
                </p>
              </div>
            </section>
          )}

          <div className={styles.actions}>
            <Button
              type="button"
              disabled={
                !matchingColumn ||
                !matchingColumnB ||
                effectiveMappings.length === 0 ||
                !sourceAColumns.includes(
                  matchingColumn
                ) ||
                !sourceBColumns.includes(
                  matchingColumnB
                ) ||
                files.length !== 2
              }
              onClick={handleCompare}
            >
              Compare sources
            </Button>
          </div>

          {error && (
            <p
              className={styles.error}
              role="alert"
            >
              {error}
            </p>
          )}
        </section>

        {result && (
          <section
            ref={resultsRef}
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
              className={styles.helper}
              role="status"
            >
              Comparison complete. Your results
              are ready.
            </p>

            {/* DOWNLOAD RESULTS */}

            <section
              className={styles.exportPanel}
              aria-labelledby="export-title"
            >
              <div className={styles.exportIntro}>
                <h3 id="export-title">
                  Download results
                </h3>

                <p>
                  Export your full results, including
                  records hidden by the current filter.
                </p>
              </div>

              <div className={styles.exportChoices}>
                {/* EXCEL WORKBOOK */}

                <div
                  className={`${styles.exportChoice} ${styles.exportChoiceFeatured}`}
                >
                  <div
                    className={styles.exportChoiceHeader}
                  >
                    <span
                      className={styles.exportChoiceIcon}
                      aria-hidden="true"
                    >
                      ▦
                    </span>

                    <div>
                      <h4>Excel workbook</h4>

                      <p>
                        All results in one workbook,
                        with separate sheets for the
                        summary, comparison details,
                        and records needing review.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.exportButtonPrimary
                    }
                    onClick={handleExcelExport}
                    disabled={exportingExcel}
                  >
                    {exportingExcel
                      ? "Preparing Excel…"
                      : "Download Excel"}
                  </button>
                </div>

                {/* COMPARISON CSV */}

                <div className={styles.exportChoice}>
                  <div
                    className={styles.exportChoiceHeader}
                  >
                    <span
                      className={styles.exportChoiceIcon}
                      aria-hidden="true"
                    >
                      ≡
                    </span>

                    <div>
                      <h4>Comparison CSV</h4>

                      <p>
                        Download matched, added, and
                        removed records, including
                        any differences found.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.exportButton}
                    onClick={() =>
                      exportComparisonCsv(result)
                    }
                  >
                    Download comparison CSV
                  </button>
                </div>
              </div>

              {/* REVIEW CSV */}

              {result.issues.length > 0 && (
                <div className={styles.exportReview}>
                  <div>
                    <h4>Records needing review</h4>

                    <p>
                      Records with missing or duplicate
                      matching keys. These were excluded
                      from automatic matching and need
                      to be checked separately.
                    </p>
                  </div>

                  <button
                    type="button"
                    className={styles.exportButton}
                    onClick={() =>
                      exportIssuesCsv(result)
                    }
                  >
                    Download review CSV
                  </button>
                </div>
              )}
            </section>

            {exportError && (
              <p
                role="alert"
                className={styles.error}
              >
                {exportError}
              </p>
            )}

            {/* SUMMARY */}

            <p className={styles.description}>
              <strong>{result.rows.length} records compared.</strong>{" "}
              Records with missing or duplicate matching keys
              are listed separately for review.
            </p>

            <div
              className={styles.summaryGrid}
              aria-label="Filter comparison results by status"
            >
              {statuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`${
                    styles.summaryCard
                  } ${
                    activeFilter === status
                      ? styles.selectedCard
                      : ""
                  }`}
                  aria-pressed={
                    activeFilter === status
                  }
                  aria-label={`Show ${result.summary[status]} ${status} records`}
                  onClick={() =>
                    handleSummaryClick(status)
                  }
                >
                  <span
                    className={styles.summaryNumber}
                  >
                    {result.summary[status]}
                  </span>

                  <span
                    className={styles.summaryLabel}
                  >
                    {status}
                  </span>

                  <span
                    className={styles.summaryHint}
                  >
                    View records
                  </span>
                </button>
              ))}
            </div>

            {/* NEEDS REVIEW */}

            {(issueCount > 0 ||
              hasColumnDifferences) && (
              <section
                ref={reviewRef}
                className={styles.reviewSection}
                aria-labelledby="review-title"
              >
                <div
                  className={styles.reviewHeader}
                >
                  <div
                    className={styles.reviewHeading}
                  >
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
                    <span
                      className={styles.issueBadge}
                    >
                      {issueCount}{" "}
                      {issueCount === 1
                        ? "issue"
                        : "issues"}
                    </span>
                  )}
                </div>

                <p
                  className={
                    styles.reviewDescription
                  }
                >
                  {issueCount > 0
                    ? "Some records couldn't be matched safely. Review these issues before using the results."
                    : "Some columns are not shared between the two sources."}
                </p>

                {!isReviewOpen &&
                  result.issues.length > 0 && (
                    <div
                      className={
                        styles.reviewPreview
                      }
                    >
                      {result.issues
                        .slice(0, 2)
                        .map((issue, index) => (
                          <p
                            key={`${issue.source}-${issue.type}-${index}`}
                            className={
                              styles.reviewPreviewItem
                            }
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
                        ))}

                      {result.issues.length > 2 && (
                        <p
                          className={styles.helper}
                        >
                          And{" "}
                          {result.issues.length - 2}{" "}
                          more issues.
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
                    style={{
                      display: "block",
                      flexShrink: 0,
                      transform: isReviewOpen
                        ? "rotate(180deg)"
                        : "none",
                    }}
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
                    className={
                      styles.reviewContent
                    }
                  >
                    <div
                      className={styles.issueList}
                    >
                      {result.issues.map(
                        (issue, index) => {
                          const expanded =
                            expandedIssues.includes(
                              index
                            );

                          const issueSource =
                            issue.source === "A"
                              ? sourceA
                              : sourceB;

                          const columns =
                            Object.keys(
                              issue.rows[0] ?? {}
                            );

                          const recordCount =
                            issue.rows.length;

                          return (
                            <article
                              key={`${issue.source}-${issue.type}-${issue.key}-${index}`}
                              className={
                                styles.issueCard
                              }
                            >
                              <div
                                className={
                                  styles.issueHeader
                                }
                              >
                                <div
                                  className={
                                    styles.issueHeading
                                  }
                                >
                                  <h4
                                    className={
                                      styles.issueTitle
                                    }
                                  >
                                    {getIssueLabel(
                                      issue
                                    )}
                                  </h4>

                                  <p
                                    className={
                                      styles.issueSource
                                    }
                                  >
                                    Source{" "}
                                    {issue.source} ·{" "}
                                    {getSourceName(
                                      issueSource
                                    )}
                                  </p>
                                </div>

                                <span
                                  className={
                                    styles.recordBadge
                                  }
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
                                  className={
                                    styles.issueDetails
                                  }
                                >
                                  <p
                                    className={
                                      styles.issueKey
                                    }
                                  >
                                    <span>
                                      {issue.source ===
                                      "A"
                                        ? matchingColumn
                                        : matchingColumnB}
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
                                    {issue.rowNumbers
                                      .length === 1
                                      ? "row"
                                      : "rows"}{" "}
                                    {issue.rowNumbers.join(
                                      ", "
                                    )}{" "}
                                    share the same
                                    matching key.
                                  </p>
                                </div>
                              ) : (
                                <div
                                  className={
                                    styles.issueDetails
                                  }
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
                                      {issue.source ===
                                      "A"
                                        ? matchingColumn
                                        : matchingColumnB}
                                    </strong>
                                    . Data{" "}
                                    {issue.rowNumbers
                                      .length === 1
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
                                aria-expanded={
                                  expanded
                                }
                                aria-controls={`issue-records-${index}`}
                              >
                                <svg
                                  style={{
                                    display:
                                      "block",
                                    flexShrink: 0,
                                    transform:
                                      expanded
                                        ? "rotate(180deg)"
                                        : "none",
                                  }}
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
                                    className={
                                      styles.table
                                    }
                                  >
                                    <thead>
                                      <tr>
                                        <th scope="col">
                                          Data row
                                        </th>

                                        {columns.map(
                                          (column) => (
                                            <th
                                              key={
                                                column
                                              }
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
                                        (
                                          row,
                                          rowIndex
                                        ) => (
                                          <tr
                                            key={
                                              rowIndex
                                            }
                                          >
                                            <td>
                                              {
                                                issue
                                                  .rowNumbers[
                                                  rowIndex
                                                ]
                                              }
                                            </td>

                                            {columns.map(
                                              (
                                                column
                                              ) => (
                                                <td
                                                  key={
                                                    column
                                                  }
                                                >
                                                  {formatValue(
                                                    row[
                                                      column
                                                    ]
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
                        }
                      )}
                    </div>

                    {hasColumnDifferences && (
                      <div
                        className={
                          styles.columnNotice
                        }
                      >
                        <h4>
                          Columns not shared
                        </h4>

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

                        <p
                          className={styles.helper}
                        >
                          These columns were not
                          compared.
                        </p>
                      </div>
                    )}

                    {issueCount > 0 && (
                      <p
                        className={
                          styles.reviewNote
                        }
                      >
                        Records with missing or
                        ambiguous matching keys
                        are excluded from automatic
                        matching. Other records can
                        still be compared.
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* COMPARISON DETAILS */}

            <div
              ref={detailsRef}
              className={styles.detailsSection}
            >
              <div
                className={styles.tableHeading}
              >
                <h3
                  className={styles.tableTitle}
                >
                  Comparison details
                </h3>

                <div
                  className={styles.filterGroup}
                >
                  <label htmlFor="status-filter">
                    Show
                  </label>

                  <select
                    id="status-filter"
                    className={
                      styles.filterSelect
                    }
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

              <div className={styles.resultsMeta}>
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

                <p className={styles.highlightLegend}>
                  <span
                    className={styles.highlightLegendSwatch}
                    aria-hidden="true"
                  />
                  Highlighted text shows where values differ between sources.
                </p>
              </div>

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
                        {matchingColumn ===
                        matchingColumnB
                          ? matchingColumn
                          : `${matchingColumn} / ${matchingColumnB}`}
                      </th>

                      <th scope="col">
                        Status
                      </th>

                      <th scope="col">
                        Column
                      </th>

                      <th
                        scope="col"
                        title={getSourceName(
                          sourceA
                        )}
                      >
                        {getSourceName(sourceA)}{" "}
                        (A)
                      </th>

                      <th
                        scope="col"
                        title={getSourceName(
                          sourceB
                        )}
                      >
                        {getSourceName(sourceB)}{" "}
                        (B)
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className={
                            styles.emptyState
                          }
                        >
                          No records match this
                          filter.
                        </td>
                      </tr>
                    ) : (
                      visibleRows.flatMap(
                        (row) => {
                          const differences =
                            row.status ===
                            "changed"
                              ? row.differences
                              : [
                                  {
                                    column: "—",
                                    oldValue: "",
                                    newValue: "",
                                  },
                                ];

                          return differences.map(
                            (
                              difference,
                              index
                            ) => (
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
                                          styles[
                                            row.status
                                          ]
                                        }`}
                                      >
                                        {
                                          row.status
                                        }
                                      </span>
                                    </td>
                                  </>
                                )}

                                <td>
                                  {
                                    difference.column
                                  }
                                </td>

                                <td>
                                  {row.status ===
                                  "changed"
                                    ? <HighlightedValue
                                        value={difference.oldValue}
                                        otherValue={difference.newValue}
                                      />
                                    : row.status ===
                                        "removed"
                                      ? "Only in Source A"
                                      : row.status ===
                                          "added"
                                        ? "Not present"
                                        : "—"}
                                </td>

                                <td>
                                  {row.status ===
                                  "changed"
                                    ? <HighlightedValue
                                        value={difference.newValue}
                                        otherValue={difference.oldValue}
                                      />
                                    : row.status ===
                                        "added"
                                      ? "Only in Source B"
                                      : row.status ===
                                          "removed"
                                        ? "Not present"
                                        : "—"}
                                </td>
                              </tr>
                            )
                          );
                        }
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <p
                className={
                  styles.comparisonNote
                }
              >
                Differences show values recorded
                in each source. They do not
                necessarily indicate a change
                over time or a business error.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
