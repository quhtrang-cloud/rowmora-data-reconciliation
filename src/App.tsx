
import { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/Button/Button";
import { UploadPage, type ParsedFile } from "./features/upload/UploadPage";
import ComparisonPage from "./features/comparison/ComparisonPage";
import { useTheme } from "./hooks/useTheme";
import "./App.css";

type Page = "welcome" | "upload" | "comparison";

const exampleChanges = [
  { key: "P002", field: "Quantity", before: "36", after: "29", status: "Changed", className: "changed" },
  { key: "P046", field: "New product", before: "—", after: "Added", status: "Added", className: "added" },
  { key: "P007", field: "Product record", before: "Present", after: "—", status: "Removed", className: "removed" },
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
  const [currentPage, setCurrentPage] = useState<Page>("welcome");
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

  function navigateTo(page: Page) {
    setCurrentPage(page);
    setIsAboutOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function handleContinue(nextFiles: ParsedFile[]) {
    setParsedFiles(nextFiles);
    navigateTo("comparison");
  }

  function renderPage() {
    if (currentPage === "upload") {
      return <UploadPage files={files} onFilesChange={setFiles} onContinue={handleContinue} />;
    }

    if (currentPage === "comparison") {
      return <ComparisonPage files={parsedFiles} onBack={() => navigateTo("upload")} />;
    }

    return (
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
              Compare datasets, spot differences, and review changes with clarity and confidence.
            </p>

            <div className="welcome__actions">
              <Button type="button" onClick={() => navigateTo("upload")}>Start a comparison</Button>
            </div>

            <p className="welcome__note">Currently supporting CSV comparisons.</p>
          </div>

          <section className="welcome-preview" aria-label="Example CSV comparison results">
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
                  <span className="welcome-preview__overline">INVENTORY REVIEW</span>
                  <h2>See what changed.</h2>
                </div>
                <span className="welcome-preview__fileTag">CSV</span>
              </div>

              <div className="welcome-preview__stats">
                <div className="welcome-preview__stat welcome-preview__stat--added">
                  <strong>8</strong>
                  <span>Added</span>
                </div>
                <div className="welcome-preview__stat welcome-preview__stat--removed">
                  <strong>5</strong>
                  <span>Removed</span>
                </div>
                <div className="welcome-preview__stat welcome-preview__stat--changed">
                  <strong>18</strong>
                  <span>Changed</span>
                </div>
              </div>

              <div className="welcome-preview__tableWrapper">
                <table className="welcome-preview__table">
                  <thead>
                    <tr>
                      <th scope="col">Record</th>
                      <th scope="col">Field</th>
                      <th scope="col">Before</th>
                      <th scope="col">After</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exampleChanges.map((change) => (
                      <tr key={change.key}>
                        <td className="welcome-preview__key">{change.key}</td>
                        <td>{change.field}</td>
                        <td>{change.before}</td>
                        <td>{change.after}</td>
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
                A clearer picture, row by row.
              </div>
            </div>
          </section>
        </div>
      </main>
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

            <div className="site-header__actions">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              >
                <ThemeIcon theme={theme} />
              </button>

              <button ref={aboutButtonRef} type="button" className="site-header__about" onClick={() => setIsAboutOpen(true)} aria-haspopup="dialog">
                About
              </button>
            </div>
          </div>
        </header>

        <div className="app__main">{renderPage()}</div>

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
              Rowmora helps you compare datasets, uncover differences, and understand what has changed. Start by comparing two CSV files, matching records, and reviewing results in one clear view.
            </p>

            <div className="about-dialog__features">
              <div className="about-dialog__feature">
                <span className="about-dialog__featureIcon" aria-hidden="true">01</span>
                <div>
                  <h3>Compare files</h3>
                  <p>Upload two CSV files and match records.</p>
                </div>
              </div>
              <div className="about-dialog__feature">
                <span className="about-dialog__featureIcon" aria-hidden="true">02</span>
                <div>
                  <h3>Spot differences</h3>
                  <p>Find added, removed, and changed records.</p>
                </div>
              </div>
              <div className="about-dialog__feature">
                <span className="about-dialog__featureIcon" aria-hidden="true">03</span>
                <div>
                  <h3>Review results</h3>
                  <p>Filter results to focus on what matters.</p>
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
