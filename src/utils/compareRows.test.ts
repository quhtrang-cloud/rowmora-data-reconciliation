import { describe, expect, it } from "vitest";
import { compareRows } from "./compareRows";

describe("compareRows", () => {
  it("marks identical records as unchanged", () => {
    const sourceA = [{ SKU: "001", Product: "Notebook" }];
    const sourceB = [{ SKU: "001", Product: "Notebook" }];

    const result = compareRows(sourceA, sourceB, "SKU");

    expect(result.summary.unchanged).toBe(1);
    expect(result.summary.changed).toBe(0);
    expect(result.rows[0].status).toBe("unchanged");
    expect(result.rows[0].differences).toEqual([]);
  });

  it("detects changed field values", () => {
    const sourceA = [{ SKU: "001", Price: "10" }];
    const sourceB = [{ SKU: "001", Price: "15" }];

    const result = compareRows(sourceA, sourceB, "SKU");

    expect(result.summary.changed).toBe(1);
    expect(result.rows[0].differences).toEqual([
      {
        column: "Price",
        sourceAColumn: "Price",
        sourceBColumn: "Price",
        oldValue: "10",
        newValue: "15",
      },
    ]);
  });

  it("detects added and removed records", () => {
    const sourceA = [
      { SKU: "001", Product: "Notebook" },
      { SKU: "002", Product: "Pen" },
    ];
    const sourceB = [
      { SKU: "002", Product: "Pen" },
      { SKU: "003", Product: "Pencil" },
    ];

    const result = compareRows(sourceA, sourceB, "SKU");

    expect(result.summary).toEqual({
      added: 1,
      removed: 1,
      changed: 0,
      unchanged: 1,
    });
  });

  it("flags duplicate matching keys", () => {
    const sourceA = [
      { SKU: "001", Product: "Notebook" },
      { SKU: "001", Product: "Pen" },
    ];
    const sourceB = [{ SKU: "001", Product: "Notebook" }];

    const result = compareRows(sourceA, sourceB, "SKU");

    expect(result.issues).toEqual([
      {
        type: "duplicate_key",
        source: "A",
        key: "001",
        rowNumbers: [1, 2],
        rows: sourceA,
      },
    ]);
    expect(result.rows).toHaveLength(0);
  });

  it("flags missing matching keys", () => {
    const sourceA = [
      { SKU: "", Product: "Notebook" },
      { SKU: "002", Product: "Pen" },
    ];
    const sourceB = [{ SKU: "002", Product: "Pen" }];

    const result = compareRows(sourceA, sourceB, "SKU");

    expect(result.issues[0]).toMatchObject({
      type: "missing_key",
      source: "A",
      rowNumbers: [1],
    });
    expect(result.summary.unchanged).toBe(1);
  });

  it("supports different column names", () => {
    const sourceA = [{ SKU: "001", Price: "10" }];
    const sourceB = [{ "Product SKU": "001", Cost: "15" }];

    const result = compareRows(sourceA, sourceB, "SKU", {
      sourceBMatchingColumn: "Product SKU",
      columnMappings: [{ sourceA: "Price", sourceB: "Cost" }],
    });

    expect(result.summary.changed).toBe(1);
    expect(result.rows[0].differences[0]).toMatchObject({
      sourceAColumn: "Price",
      sourceBColumn: "Cost",
      oldValue: "10",
      newValue: "15",
    });
  });

  it("treats different dash characters as changes", () => {
    const sourceA = [{ SKU: "001", Product: "Notebook - Sage" }];
    const sourceB = [{ SKU: "001", Product: "Notebook – Sage" }];

    const result = compareRows(sourceA, sourceB, "SKU");

    expect(result.summary.changed).toBe(1);
  });

  it("rejects empty data sources", () => {
    expect(() => compareRows([], [{ SKU: "001" }], "SKU")).toThrow(
      "Both sources must contain data rows."
    );
  });

  it("rejects an invalid matching column", () => {
    expect(() =>
      compareRows([{ SKU: "001" }], [{ SKU: "001" }], "ID")
    ).toThrow("The selected matching columns must exist in their sources.");
  });

  it("trims whitespace from matching keys", () => {
    const sourceA = [{ SKU: " 001 ", Product: "Notebook" }];
    const sourceB = [{ SKU: "001", Product: "Notebook" }];

    const result = compareRows(sourceA, sourceB, "SKU");

    expect(result.summary.unchanged).toBe(1);
    expect(result.rows[0].key).toBe("001");
  });

  it("rejects duplicate column mappings", () => {
    expect(() =>
      compareRows(
        [{ SKU: "001", Price: "10" }],
        [{ SKU: "001", Cost: "10", Amount: "10" }],
        "SKU",
        {
          columnMappings: [
            { sourceA: "Price", sourceB: "Cost" },
            { sourceA: "Price", sourceB: "Amount" },
          ],
        }
      )
    ).toThrow("Each column can only be mapped once.");
  });
});
