import { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/Button/Button";
import { UploadPage, type ParsedFile } from "./features/upload/UploadPage";
import ComparisonPage from "./features/comparison/ComparisonPage";
import { useTheme } from "./hooks/useTheme";
import "./App.css";

type Page = "welcome" | "upload" | "comparison";

function pageFromHash(): Page {
  if (window.location.hash === "#/upload") return "upload";
  if (window.location.hash === "#/compare") return "comparison";
  return "welcome";
}

function urlForPage(page: Page): string {
  const hash = page === "welcome" ? "" : page === "upload" ? "#/upload" : "#/compare";
  return `${window.location.pathname}${window.location.search}${hash}`;
}

// Illustrative inventory comparison: warehouse (A) vs online store (B).
// These figures are fictional and are not calculated from uploaded files.
const exampleChanges = [
  { key: "SKU-1042", field: "Stock quantity", sourceA: "48", sourceB: "35", status: "Changed", className: "changed" },
  { key: "SKU-1086", field: "Product", sourceA: "—", sourceB: "Desk lamp", status: "Added", className: "added" },
  { key: "SKU-1021", field: "Product", sourceA: "Notebook", sourceB: "—", status: "Removed", className: "removed" },
] as const;

function ThemeIcon({ theme }: { theme: "light" | "dark" }) {
  return theme === "light" ? (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </svg>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => pageFromHash());
  const [files, setFiles] = useState<File[]>([]);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const aboutButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    meta?.setAttribute("content", theme === "dark" ? "#191e1c" : "#f8f6f1");
  }, [theme]);

  useEffect(() => {
    if (!isAboutOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : aboutButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAboutOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      const first = elements[0];
      const last = elements[elements.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isAboutOpen]);

  // Sync browser Back/Forward with the two-step workflow.
  useEffect(() => {
    function handleHistoryChange() {
      const requested = pageFromHash();
      const nextPage = requested === "comparison" && parsedFiles.length !== 2
        ? "upload"
        : requested;

      if (nextPage !== requested) {
        window.history.replaceState(null, "", urlForPage(nextPage));
      }

      setCurrentPage(nextPage);
      setIsAboutOpen(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    window.addEventListener("popstate", handleHistoryChange);
    window.addEventListener("hashchange", handleHistoryChange);
    handleHistoryChange();

    return () => {
      window.removeEventListener("popstate", handleHistoryChange);
      window.removeEventListener("hashchange", handleHistoryChange);
    };
  }, [parsedFiles.length]);

  function navigateTo(page: Page, replace = false) {
    if (replace) {
      window.history.replaceState(null, "", urlForPage(page));
    } else if (pageFromHash() !== page) {
      window.history.pushState(null, "", urlForPage(page));
    }

    setCurrentPage(page);
    setIsAboutOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function handleContinue(nextFiles: ParsedFile[]) {
    setParsedFiles(nextFiles);
    navigateTo("comparison");
  }

  function showHowItWorks() {
    if (currentPage !== "welcome") {
      navigateTo("welcome");
      window.requestAnimationFrame(() => {
        document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderPage() {
    return (
      <>
      <main className="welcome">
        <div className="welcome__inner">
          <div className="welcome__copy">
            <div className="welcome__eyebrow">
              <span className="welcome__eyebrowDot" aria-hidden="true" />
              A simpler way to work with data
            </div>

            <h1 className="welcome__title">
              Make sense of your data. <span className="welcome__titleAccent">See what matters.</span>
            </h1>

            <p className="welcome__description">
              Compare two spreadsheets, find missing records, spot differences, and review issues that need attention.
            </p>

            <div className="welcome__actions">
              <Button type="button" onClick={() => navigateTo("upload")}>Start a comparison</Button>
            </div>

            <p className="welcome__note">Compare CSV and Excel (.xlsx) files. No sign-up required.</p>
          </div>

          <section className="welcome-preview" aria-label="Example file comparison results">
            <div className="welcome-preview__top">
              <div className="welcome-preview__windowDots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className="welcome-preview__eyebrow">EXAMPLE COMPARISON</span>
            </div>

            <div className="welcome-preview__body">
              <div className="welcome-preview__heading">
                <div>
                  <span className="welcome-preview__overline">INVENTORY DATA COMPARISON</span>
                  <h2>Comparison results</h2>
                </div>
                <span className="welcome-preview__fileTag">XLSX</span>
              </div>

              <div className="welcome-preview__stats">
                <div className="welcome-preview__stat welcome-preview__stat--added">
                  <strong>4</strong>
                  <span>Added</span>
                </div>
                <div className="welcome-preview__stat welcome-preview__stat--removed">
                  <strong>1</strong>
                  <span>Removed</span>
                </div>
                <div className="welcome-preview__stat welcome-preview__stat--changed">
                  <strong>2</strong>
                  <span>Changed</span>
                </div>
                <div className="welcome-preview__stat welcome-preview__stat--unchanged">
                  <strong>29</strong>
                  <span>Unchanged</span>
                </div>
              </div>

              <div className="welcome-preview__tableWrapper">
                <table className="welcome-preview__table">
                  <thead>
                    <tr>
                      <th scope="col">Record</th>
                      <th scope="col">Field</th>
                      <th scope="col">Source A</th>
                      <th scope="col">Source B</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exampleChanges.map((change) => (
                      <tr key={change.key}>
                        <td className="welcome-preview__key">{change.key}</td>
                        <td>{change.field}</td>
                        <td>{change.sourceA}</td>
                        <td>{change.sourceB}</td>
                        <td>
                          <span className={`welcome-preview__status welcome-preview__status--${change.className}`}>
                            {change.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="welcome-preview__bottom">
                <span className="welcome-preview__legendDot" aria-hidden="true" />
                Illustrative example · 36 records compared · 3 results shown
              </div>
            </div>
          </section>
        </div>
      </main>
      <section id="how-it-works" className="how-it-works" aria-labelledby="how-it-works-title">
        <div className="how-it-works__inner">
          <span className="how-it-works__eyebrow">A SIMPLE WORKFLOW</span>
          <h2 id="how-it-works-title" className="how-it-works__title">How it works</h2>
          <p className="how-it-works__intro">
            From different data sources to a clearer view of what needs attention.
          </p>
          <div className="how-it-works__grid">
            <article className="how-it-works__step">
              <span className="how-it-works__number" aria-hidden="true">01</span>
              <h3>Choose your sources</h3>
              <p>Upload CSV or Excel files, then choose the worksheets and header rows you need.</p>
            </article>
            <article className="how-it-works__step">
              <span className="how-it-works__number" aria-hidden="true">02</span>
              <h3>Match and map</h3>
              <p>Choose matching keys and map corresponding columns, even when their names differ.</p>
            </article>
            <article className="how-it-works__step">
              <span className="how-it-works__number" aria-hidden="true">03</span>
              <h3>Review and export</h3>
              <p>Explore differences, investigate matching issues, and export results to CSV or Excel.</p>
            </article>
          </div>
        </div>
      </section>
    </>
    );
  }

  return (
    <div className="app">
      <div className="app__layout" inert={isAboutOpen}>
        <header className="site-header">
          <div className="site-header__inner">
            <button type="button" className="site-header__brand" onClick={() => navigateTo("welcome")} aria-label="Rowmora — back to home">
              <img className="site-header__mark" src="/rowmora-mark.svg" alt="" aria-hidden="true" />
              <span className="site-header__name">rowmora</span>
            </button>

            <nav className="site-header__actions" aria-label="Main navigation">
              <button ref={aboutButtonRef} type="button" className="site-header__about" onClick={() => setIsAboutOpen(true)} aria-haspopup="dialog">
                About
              </button>
              <button type="button" className="site-header__about" onClick={showHowItWorks}>
                How it works
              </button>
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              >
                <ThemeIcon theme={theme} />
              </button>
            </nav>
          </div>
        </header>

        <div className="app__main">
          {/* Keep UploadPage mounted so worksheet and header-row choices survive navigation. */}
          <div hidden={currentPage !== "upload"}>
            <UploadPage files={files} onFilesChange={setFiles} onContinue={handleContinue} />
          </div>
          {currentPage === "comparison" && (
            <ComparisonPage files={parsedFiles} onBack={() => navigateTo("upload", true)} />
          )}
          {currentPage === "welcome" && renderPage()}
        </div>

        <footer className="site-footer">
          <div className="site-footer__inner">
            <div className="site-footer__identity">
              <span className="site-footer__brand">rowmora</span>
              <span className="site-footer__separator" aria-hidden="true">·</span>
              <span className="site-footer__tagline">Data clarity, made simple.</span>
            </div>
            <span className="site-footer__credit">© {new Date().getFullYear()} Rowmora</span>
          </div>
        </footer>
      </div>

      {isAboutOpen && (
        <div className="about-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAboutOpen(false); }}>
          <section ref={dialogRef} className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title" aria-describedby="about-description">
            <div className="about-dialog__top">
              <span className="about-dialog__eyebrow">ABOUT ROWMORA</span>
              <button ref={closeButtonRef} type="button" className="about-dialog__close" onClick={() => setIsAboutOpen(false)} aria-label="Close About">×</button>
            </div>

            <h2 id="about-title">A clearer way to work with data.</h2>
            <p id="about-description" className="about-dialog__intro">
              Rowmora is a React and TypeScript application for comparing CSV and Excel datasets from different sources. Match records, map corresponding columns, and examine field-level differences in one place. Records with missing or duplicate matching keys are flagged separately for review. Development is ongoing, with further reconciliation features planned.
            </p>

            <div className="about-dialog__features">
              <div className="about-dialog__feature">
                <span className="about-dialog__featureIcon" aria-hidden="true">01</span>
                <div>
                  <h3>Prepare sources</h3>
                  <p>Upload CSV or Excel files and choose worksheets and header rows.</p>
                </div>
              </div>
              <div className="about-dialog__feature">
                <span className="about-dialog__featureIcon" aria-hidden="true">02</span>
                <div>
                  <h3>Compare records</h3>
                  <p>Match records by identifier and compare mapped fields across sources.</p>
                </div>
              </div>
              <div className="about-dialog__feature">
                <span className="about-dialog__featureIcon" aria-hidden="true">03</span>
                <div>
                  <h3>Investigate issues</h3>
                  <p>Review differences and inspect records with missing or duplicate keys.</p>
                </div>
              </div>
            </div>

            <div className="about-dialog__footer">
              <span>Built for clarity.</span>
              <button type="button" className="about-dialog__done" onClick={() => setIsAboutOpen(false)}>Got it</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
