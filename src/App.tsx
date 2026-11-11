
import { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/Button/Button";
import {
  UploadPage,
  type ParsedFile,
} from "./features/upload/UploadPage";
import ComparisonPage from "./features/comparison/ComparisonPage";
import "./App.css";

type Page = "welcome" | "upload" | "comparison";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("welcome");
  const [files, setFiles] = useState<File[]>([]);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const aboutButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isAboutOpen) return;

    const previousOverflow = document.body.style.overflow;
    const aboutButton = aboutButtonRef.current;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAboutOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const elements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (!first || !last) return;

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      aboutButton?.focus();
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
      return (
        <UploadPage
          files={files}
          onFilesChange={setFiles}
          onContinue={handleContinue}
        />
      );
    }

    if (currentPage === "comparison") {
      return (
        <ComparisonPage
          files={parsedFiles}
          onBack={() => navigateTo("upload")}
        />
      );
    }

    return (
      <main className="welcome">
        <span className="welcome__eyebrow">
          A simpler way to work with data
        </span>

        <h1 className="welcome__title">
          Make sense of your spreadsheets.
        </h1>

        <p className="welcome__description">
          Find missing records, spot differences, and see
          what needs a closer look.
        </p>

        <Button
          type="button"
          onClick={() => navigateTo("upload")}
        >
          Start a comparison
        </Button>
      </main>
    );
  }

  return (
    <div className="app">
      <div
        className="app__layout"
        inert={isAboutOpen}
      >
        <header className="site-header">
          <div className="site-header__inner">
            <button
              type="button"
              className="site-header__brand"
              onClick={() => navigateTo("welcome")}
              aria-label="Rowmora — back to home"
            >
              <svg
                className="site-header__mark"
                viewBox="0 0 36 36"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="1"
                  width="34"
                  height="34"
                  rx="9"
                  fill="currentColor"
                />
                <path
                  d="M10 12H19M10 18H16M10 24H19"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M22 17L25 20L30 14"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <span className="site-header__name">
                rowmora
              </span>
            </button>

            <button
              ref={aboutButtonRef}
              type="button"
              className="site-header__about"
              onClick={() => setIsAboutOpen(true)}
              aria-haspopup="dialog"
            >
              About
            </button>
          </div>
        </header>

        <div className="app__main">
          {renderPage()}
        </div>

        <footer className="site-footer">
          <div className="site-footer__inner">
            <div className="site-footer__identity">
              <span className="site-footer__brand">
                rowmora
              </span>

              <span
                className="site-footer__separator"
                aria-hidden="true"
              >
                ·
              </span>

              <span className="site-footer__tagline">
                CSV comparison made simple.
              </span>
            </div>

            <span className="site-footer__credit">
              © {new Date().getFullYear()} Rowmora
            </span>
          </div>
        </footer>
      </div>

      {isAboutOpen && (
        <div
          className="about-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsAboutOpen(false);
            }
          }}
        >
          <section
            ref={dialogRef}
            className="about-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            aria-describedby="about-description"
          >
            <div className="about-dialog__top">
              <span className="about-dialog__eyebrow">
                ABOUT ROWMORA
              </span>

              <button
                ref={closeButtonRef}
                type="button"
                className="about-dialog__close"
                onClick={() => setIsAboutOpen(false)}
                aria-label="Close About"
              >
                ×
              </button>
            </div>

            <h2 id="about-title">
              A simpler way to compare data.
            </h2>

            <p
              id="about-description"
              className="about-dialog__intro"
            >
              Compare two CSV files, find differences,
              and review changes in one clear view.
            </p>

            <div className="about-dialog__features">
              <div className="about-dialog__feature">
                <span
                  className="about-dialog__featureIcon"
                  aria-hidden="true"
                >
                  01
                </span>

                <div>
                  <h3>Compare files</h3>
                  <p>
                    Upload two CSV files and match records.
                  </p>
                </div>
              </div>

              <div className="about-dialog__feature">
                <span
                  className="about-dialog__featureIcon"
                  aria-hidden="true"
                >
                  02
                </span>

                <div>
                  <h3>Spot differences</h3>
                  <p>
                    Find added, removed, and changed records.
                  </p>
                </div>
              </div>

              <div className="about-dialog__feature">
                <span
                  className="about-dialog__featureIcon"
                  aria-hidden="true"
                >
                  03
                </span>

                <div>
                  <h3>Review results</h3>
                  <p>
                    Filter results to focus on what matters.
                  </p>
                </div>
              </div>
            </div>

            <div className="about-dialog__footer">
              <span>Built for clarity.</span>

              <button
                type="button"
                className="about-dialog__done"
                onClick={() => setIsAboutOpen(false)}
              >
                Got it
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
