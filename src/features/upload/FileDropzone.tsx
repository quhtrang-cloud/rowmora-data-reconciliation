
import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Button } from "../../components/ui/Button/Button";
import styles from "./FileDropzone.module.css";

type FileDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
};

const MAX_FILES = 2;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function FileDropzone({
  files,
  onFilesChange,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const isFull = files.length >= MAX_FILES;

  function addFiles(selectedFiles: File[]) {
    if (selectedFiles.length === 0) return;

    if (isFull) {
      setError("Remove a file before adding another.");
      return;
    }

    if (
      selectedFiles.some(
        (file) => !file.name.toLowerCase().endsWith(".csv")
      )
    ) {
      setError("Only CSV files are currently supported.");
      return;
    }

    if (
      selectedFiles.some((file) => file.size > MAX_FILE_SIZE)
    ) {
      setError("Each file must be 10 MB or less.");
      return;
    }

    if (files.length + selectedFiles.length > MAX_FILES) {
      setError("You can compare a maximum of two files.");
      return;
    }

    onFilesChange([...files, ...selectedFiles]);
    setError("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
    setError("");
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.dropzone} ${
          isDragging ? styles.dragging : ""
        }`}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();

          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
      >
        <p className={styles.heading}>
          {isFull
            ? "Your files are ready"
            : "Drop your CSV files here"}
        </p>

        <p className={styles.hint}>
          CSV only · Maximum 2 files · 10 MB per file
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          onChange={handleFileChange}
          className={styles.hiddenInput}
          aria-label="Choose CSV files"
          disabled={isFull}
        />

        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isFull}
        >
          {isFull ? "2 files selected" : "Choose files"}
        </Button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <section className={styles.fileList}>
          <h2>Selected files ({files.length}/2)</h2>

          <ul>
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <span>{file.name}</span>

                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
