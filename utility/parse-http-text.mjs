// Shared positional parser for tag-request.mjs / tag-response.mjs, and
// (via create-route.mjs's function-substitution pre-pass) create-route.mjs.
//
// The bugs this exists to fix: create-request.mjs flattens a whole tagged
// template to one string before splitting on "\n" (and splits header
// lines on the literal substring ": ", truncating any value containing a
// second one); create-route.mjs re-feeds a stringified substitution back
// through its own line tokenizer, and uses headers.set() instead of
// .append(), so a second Set-Cookie line overwrites the first instead of
// accumulating. In all three cases, a substituted value containing "\n"
// or ":" can get reinterpreted as if the *caller* had typed new HTTP
// syntax.
//
// The fix: only ever scan the template's literal `strings` pieces for
// structure (the start line, header lines, the blank line that ends
// them). A substitution's value is appended verbatim to whatever's
// currently being built -- never re-split, never re-scanned -- so it
// can't introduce a header line, end the headers early, or do anything
// else the literal text didn't already set up.
const BINARY_BODY_TYPES = (value) =>
  value instanceof Blob ||
  value instanceof Uint8Array ||
  value instanceof ArrayBuffer ||
  value instanceof ReadableStream ||
  value instanceof FormData ||
  value instanceof URLSearchParams;

// options.isStartLine(line): called once, on the first complete line, to
// decide whether it's a real start line (request-line / status-line) or
// whether this template has none at all and that line is actually the
// first line of the body -- create-route.mjs's templates can be
// headers-and-body-only or body-only, falling back to its `init` object
// for status/headers in that case. Defaults to "yes, always" for
// tagRequest/tagResponse, which require a real start line.
// options.trimBodyLines: create-route.mjs's historical behavior trims
// *every* line, including body lines, before accumulating them (so an
// indented template literal's body doesn't carry that indentation into
// the real response body). tagRequest/tagResponse deliberately do NOT do
// this -- body content there is literal, preserved exactly as written,
// since trimming could corrupt meaningful whitespace in a text body.
// Defaults to false (the strict behavior); create-route.mjs passes true.
export const parseHttpText = (strings, substitutions, options = {}) => {
  const { isStartLine = () => true, trimBodyLines = false } = options;

  const stringsArr = [...strings];
  stringsArr[0] = stringsArr[0].replace(/^[ \t\r\n]+/, "");
  stringsArr[stringsArr.length - 1] = stringsArr[stringsArr.length - 1].replace(
    /[ \t\r\n]+$/,
    ""
  );

  let zone = "start"; // "start" -> "headers" -> "body"
  let lineBuffer = "";
  // A binary substitution can't be classified as "body content" the
  // moment it's seen while zone is "start" -- that line might turn out to
  // be a real start line (invalid) or, once nothing else precedes it,
  // the first line of a body-only template (valid, same as it landing in
  // the body zone directly). Held here until the line is flushed and its
  // true zone is known.
  let pendingBinary = null;
  let startLine = null;
  const headerEntries = []; // ordered [{ name, value }], duplicates allowed
  let bodyText = "";
  let binaryBody = null;
  let binaryBodyCount = 0;
  let bodyHasOtherContent = false;

  const commitBodyLine = (rawLine, isFinal) => {
    const line = trimBodyLines ? rawLine.trim() : rawLine;
    if (pendingBinary) {
      if (line.trim() !== "" || bodyHasOtherContent) {
        throw new TypeError(
          "parseHttpText: a binary body substitution must be the sole content of the body zone -- it can't be combined with literal text or another substitution"
        );
      }
      binaryBodyCount++;
      binaryBody = pendingBinary;
      pendingBinary = null;
    } else {
      bodyText += isFinal ? line : line + "\n";
      if (line.trim() !== "") bodyHasOtherContent = true;
    }
  };

  const flushLine = () => {
    if (zone === "start") {
      if (isStartLine(lineBuffer)) {
        if (pendingBinary) {
          throw new TypeError(
            "parseHttpText: a binary substitution cannot appear within the start line"
          );
        }
        startLine = lineBuffer;
        zone = "headers";
      } else {
        zone = "body";
        commitBodyLine(lineBuffer, false);
      }
    } else if (zone === "headers") {
      if (pendingBinary) {
        throw new TypeError(
          "parseHttpText: a binary substitution cannot appear within a header line"
        );
      }
      if (lineBuffer.trim() === "") {
        zone = "body";
      } else {
        const colonIndex = lineBuffer.indexOf(":");
        if (colonIndex > 0) {
          headerEntries.push({
            name: lineBuffer.slice(0, colonIndex).trim(),
            value: lineBuffer.slice(colonIndex + 1).trim(),
          });
        }
      }
    }
    lineBuffer = "";
  };

  for (let i = 0; i < stringsArr.length; i++) {
    const parts = stringsArr[i].split("\n");
    for (let p = 0; p < parts.length; p++) {
      if (p > 0) {
        if (zone === "body") {
          commitBodyLine(lineBuffer, false);
        } else {
          flushLine();
        }
      }
      lineBuffer += parts[p];
    }

    if (i < substitutions.length) {
      const sub = substitutions[i];
      if (sub instanceof Headers) {
        for (const [name, value] of sub) headerEntries.push({ name, value });
      } else if (zone !== "headers" && BINARY_BODY_TYPES(sub)) {
        if (pendingBinary) {
          throw new TypeError(
            "parseHttpText: more than one binary body substitution found -- a binary value must be the sole content of the body"
          );
        }
        pendingBinary = sub;
      } else if (sub !== undefined && sub !== null) {
        if (zone === "body") bodyHasOtherContent = true;
        lineBuffer += String(sub);
      }
    }
  }

  if (zone === "body") {
    commitBodyLine(lineBuffer, true);
  } else {
    flushLine();
  }

  return {
    startLine,
    headerEntries,
    body: binaryBodyCount === 1 ? binaryBody : bodyText.trim(),
  };
};

export default parseHttpText;
