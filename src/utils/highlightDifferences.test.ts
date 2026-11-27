import { describe, expect, it } from "vitest";
import { getDifferenceSegments } from "./highlightDifferences";

describe("getDifferenceSegments", () => {
  it("returns unchanged text for identical values", () => {
    expect(getDifferenceSegments("Notebook", "Notebook")).toEqual([
      { text: "Notebook", changed: false },
    ]);
  });

  it("highlights a different dash character", () => {
    expect(getDifferenceSegments("Notebook - Sage", "Notebook – Sage")).toEqual([
      { text: "Notebook ", changed: false },
      { text: "-", changed: true },
      { text: " Sage", changed: false },
    ]);
  });

  it("highlights changed numbers", () => {
    expect(getDifferenceSegments("Price 10 GBP", "Price 15 GBP")).toEqual([
      { text: "Price 1", changed: false },
      { text: "0", changed: true },
      { text: " GBP", changed: false },
    ]);
  });

  it("handles inserted text without inventing characters", () => {
    expect(getDifferenceSegments("ABC", "ABXC")).toEqual([
      { text: "ABC", changed: false },
    ]);
  });

  it("handles removed text", () => {
    expect(getDifferenceSegments("ABXC", "ABC")).toEqual([
      { text: "AB", changed: false },
      { text: "X", changed: true },
      { text: "C", changed: false },
    ]);
  });

  it("handles empty values", () => {
    expect(getDifferenceSegments("", "Notebook")).toEqual([]);
    expect(getDifferenceSegments("Notebook", "")).toEqual([
      { text: "Notebook", changed: true },
    ]);
  });

  it("does not split emoji surrogate pairs", () => {
    expect(getDifferenceSegments("A😀B", "A😎B")).toEqual([
      { text: "A", changed: false },
      { text: "😀", changed: true },
      { text: "B", changed: false },
    ]);
  });
});
