export type DifferenceSegment = {
  text: string;
  changed: boolean;
};

/**
 * Highlight the differing middle of a value, preserving common prefix/suffix.
 * Uses Unicode code points so surrogate pairs are not split.
 * This is a lightweight visual aid, not a full diff algorithm.
 */
function mergeAdjacentSegments(
  segments: DifferenceSegment[]
): DifferenceSegment[] {
  const merged: DifferenceSegment[] = [];

  for (const segment of segments) {
    if (!segment.text) continue;

    const previous = merged[merged.length - 1];
    if (previous && previous.changed === segment.changed) {
      previous.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
  }

  return merged;
}

export function getDifferenceSegments(
  value: string,
  otherValue: string
): DifferenceSegment[] {
  if (value === otherValue) {
    return value ? [{ text: value, changed: false }] : [];
  }

  const current = Array.from(value);
  const other = Array.from(otherValue);
  let start = 0;

  while (
    start < current.length &&
    start < other.length &&
    current[start] === other[start]
  ) {
    start++;
  }

  let endCurrent = current.length;
  let endOther = other.length;

  while (
    endCurrent > start &&
    endOther > start &&
    current[endCurrent - 1] === other[endOther - 1]
  ) {
    endCurrent--;
    endOther--;
  }

  const segments: DifferenceSegment[] = [];
  const prefix = current.slice(0, start).join("");
  const changed = current.slice(start, endCurrent).join("");
  const suffix = current.slice(endCurrent).join("");

  if (prefix) segments.push({ text: prefix, changed: false });
  if (changed) segments.push({ text: changed, changed: true });
  if (suffix) segments.push({ text: suffix, changed: false });

  return mergeAdjacentSegments(segments);
}
