import { parseXml, xmlToString } from "./xml.js";
import { processTable } from "./tables.js";
import type { ReplaceData } from "./types.js";

/**
 * Find top-level <w:tbl> blocks in XML string, handling nesting correctly.
 * "Top-level" means not nested inside another <w:tbl> (i.e., not inside a table cell).
 */
function findTableBlocks(xml: string): { start: number; end: number }[] {
  const blocks: { start: number; end: number }[] = [];
  let pos = 0;

  while (pos < xml.length) {
    const openIdx = xml.indexOf("<w:tbl", pos);
    if (openIdx === -1) break;

    // Verify it's a proper tag (followed by > or space)
    const charAfter = xml[openIdx + 6];
    if (charAfter !== ">" && charAfter !== " ") {
      pos = openIdx + 7;
      continue;
    }

    // Find matching </w:tbl> accounting for nesting
    let depth = 1;
    let searchPos = xml.indexOf(">", openIdx) + 1;

    while (depth > 0 && searchPos < xml.length) {
      const nextOpen = xml.indexOf("<w:tbl", searchPos);
      const nextClose = xml.indexOf("</w:tbl>", searchPos);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        const c = xml[nextOpen + 6];
        if (c === ">" || c === " ") {
          depth++;
        }
        searchPos = xml.indexOf(">", nextOpen) + 1;
      } else {
        depth--;
        if (depth === 0) {
          blocks.push({ start: openIdx, end: nextClose + "</w:tbl>".length });
        }
        searchPos = nextClose + "</w:tbl>".length;
      }
    }

    pos = blocks.length > 0 ? blocks[blocks.length - 1].end : openIdx + 7;
  }

  return blocks;
}

/**
 * Process all top-level tables in the XML string in-place,
 * preserving the order of elements in the document.
 * Each table is extracted, parsed individually, processed for
 * template row expansion, rebuilt, and substituted back.
 */
export function processTablesInString(
  xml: string,
  data: ReplaceData
): string {
  const blocks = findTableBlocks(xml);
  if (blocks.length === 0) return xml;

  let result = xml;

  // Process from end to start to maintain string positions
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    const tableXml = result.substring(block.start, block.end);

    try {
      // Parse just this table (wrapped in a root element)
      const wrapped = `<root>${tableXml}</root>`;
      const parsed = parseXml(wrapped);
      const table = parsed.root?.["w:tbl"];
      if (!table) continue;

      // Process the table (expand template rows for arrays)
      const processed = processTable(table, data);

      // Skip rebuild if nothing changed (reference equality)
      if (processed === table) continue;

      // Rebuild just this table
      const rebuilt = xmlToString({ root: { "w:tbl": processed } });
      const rebuiltTable = rebuilt
        .replace(/^<root>/, "")
        .replace(/<\/root>$/, "");

      result =
        result.substring(0, block.start) +
        rebuiltTable +
        result.substring(block.end);
    } catch (err) {
      console.warn(
        `[wordsmith-ts] Warning: failed to process table, skipping. ${err instanceof Error ? err.message : err}`
      );
      continue;
    }
  }

  return result;
}

/**
 * Heal split template tokens in XML string.
 * When Word splits {{varName}} across multiple <w:t> elements
 * (e.g., "{{var" in one run and "Name}}" in the next),
 * merge the text into the first <w:t> and empty subsequent ones.
 * This allows the later string-based replaceVariables() to find
 * and replace the complete tokens.
 */
export function healSplitTokensInString(xml: string): string {
  const tRegex = /<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g;

  interface Segment {
    contentStart: number;
    contentEnd: number;
    text: string;
  }

  const segments: Segment[] = [];
  let m: RegExpExecArray | null;
  while ((m = tRegex.exec(xml)) !== null) {
    const attrs = m[1] || "";
    const text = m[2];
    const openTag = `<w:t${attrs}>`;
    const contentStart = m.index + openTag.length;
    segments.push({
      contentStart,
      contentEnd: contentStart + text.length,
      text,
    });
  }

  if (segments.length === 0) return xml;

  // Find merge groups: consecutive segments where a {{ token is split
  const mergeGroups: { indices: number[]; mergedText: string }[] = [];
  let i = 0;
  while (i < segments.length) {
    const { text } = segments[i];
    const opens = (text.match(/\{\{/g) || []).length;
    const closes = (text.match(/\}\}/g) || []).length;

    if (opens > closes) {
      const indices = [i];
      let accText = text;
      let j = i + 1;

      while (j < segments.length) {
        const totalOpens = (accText.match(/\{\{/g) || []).length;
        const totalCloses = (accText.match(/\}\}/g) || []).length;
        if (totalOpens <= totalCloses) break;

        accText += segments[j].text;
        indices.push(j);
        j++;
      }

      if (indices.length > 1) {
        mergeGroups.push({ indices, mergedText: accText });
      }
      i = j;
    } else {
      i++;
    }
  }

  if (mergeGroups.length === 0) return xml;

  // Build list of text content replacements
  const mods: { start: number; end: number; replacement: string }[] = [];

  for (const group of mergeGroups) {
    // First segment gets the merged text
    const first = segments[group.indices[0]];
    mods.push({
      start: first.contentStart,
      end: first.contentEnd,
      replacement: group.mergedText,
    });

    // Subsequent segments get emptied
    for (let k = 1; k < group.indices.length; k++) {
      const seg = segments[group.indices[k]];
      mods.push({
        start: seg.contentStart,
        end: seg.contentEnd,
        replacement: "",
      });
    }
  }

  // Sort by position descending so we can apply from end to start
  mods.sort((a, b) => b.start - a.start);

  // Apply modifications
  let result = xml;
  for (const mod of mods) {
    result =
      result.substring(0, mod.start) +
      mod.replacement +
      result.substring(mod.end);
  }

  return result;
}
