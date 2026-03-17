import type { ReplaceData } from "./types.js";
import { processConditionals } from "./conditionals.js";
import { replaceVariables } from "./variables.js";
import {
  extractCells,
  extractRows,
  extractRunText,
  extractTextFromParagraph,
  getHeaderFooterRoot,
  getHeaderFooterRootKey,
} from "./xml.js";

const hasTemplateToken = (text: string): boolean =>
  text.includes("{{") && text.includes("}}");

const hasPartialToken = (text: string): boolean =>
  (text.includes("{{") && !text.includes("}}")) ||
  (!text.includes("{{") && text.includes("}}"));

const processTemplateText = (text: string, data: ReplaceData): string => {
  const withConditionals = processConditionals(text, data);
  return replaceVariables(data)(withConditionals);
};

const updateRunText = (run: any, newText: string): any => ({
  ...run,
  "w:t": {
    "@_xml:space": "preserve",
    "#text": newText,
  },
});

/**
 * Heal split tokens across adjacent runs.
 * When Word splits {{varName}} across multiple runs (e.g., "{{var" in run1 and "Name}}" in run2),
 * merge only those specific runs while preserving the first run's formatting.
 */
const healSplitTokenRuns = (runs: any[]): any[] => {
  const result: any[] = [];
  let i = 0;

  while (i < runs.length) {
    const text = extractRunText(runs[i]);

    if (hasPartialToken(text) && text.includes("{{")) {
      // Start of a split token — merge forward until we close all open tokens
      let merged = text;
      let j = i + 1;
      while (j < runs.length && !hasTemplateToken(merged)) {
        merged += extractRunText(runs[j]);
        j++;
      }
      // If we found a complete token, create a merged run with first run's formatting
      if (hasTemplateToken(merged)) {
        result.push(updateRunText(runs[i], merged));
        i = j;
      } else {
        // Could not heal — keep original runs
        result.push(runs[i]);
        i++;
      }
    } else {
      result.push(runs[i]);
      i++;
    }
  }

  return result;
};

const processParagraph = (paragraph: any, data: ReplaceData): any => {
  const runs = paragraph["w:r"];
  if (!runs) return paragraph;

  const runArray = Array.isArray(runs) ? runs : [runs];
  const originalText = runArray.map(extractRunText).join("");

  if (!originalText || !hasTemplateToken(originalText)) {
    return paragraph;
  }

  // Step 1: Heal split tokens (merge only runs that split a {{...}} token)
  const healedRuns = healSplitTokenRuns(runArray);

  // Step 2: Process each run individually, preserving formatting of untouched runs
  let anyChanged = false;
  const processedRuns = healedRuns.map((run) => {
    const runText = extractRunText(run);
    if (!runText || !hasTemplateToken(runText)) return run;

    const processed = processTemplateText(runText, data);
    if (processed === runText) return run;

    anyChanged = true;
    return updateRunText(run, processed);
  });

  if (!anyChanged) return paragraph;

  return {
    ...paragraph,
    "w:r": processedRuns.length === 1 ? processedRuns[0] : processedRuns,
  };
};

const processParagraphContainer = (
  container: Record<string, any>,
  key: string,
  data: ReplaceData
): Record<string, any> => {
  const paragraphs = container[key];
  if (!paragraphs) return container;

  const paragraphArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
  const processed = paragraphArray.map((paragraph) =>
    processParagraph(paragraph, data)
  );

  return {
    ...container,
    [key]: processed.length === 1 ? processed[0] : processed,
  };
};

const processTableCell = (cell: any, data: ReplaceData): any => {
  let updatedCell = processParagraphContainer(cell, "w:p", data);

  const tables = updatedCell["w:tbl"];
  if (!tables) return updatedCell;

  const tableArray = Array.isArray(tables) ? tables : [tables];
  const processedTables = tableArray.map((table) => processTable(table, data));
  updatedCell = {
    ...updatedCell,
    "w:tbl": processedTables.length === 1 ? processedTables[0] : processedTables,
  };

  return updatedCell;
};

const processTableRow = (row: any, data: ReplaceData): any => {
  const cells = extractCells(row);
  if (cells.length === 0) return row;

  const processedCells = cells.map((cell) => processTableCell(cell, data));
  return {
    ...row,
    "w:tc": processedCells.length === 1 ? processedCells[0] : processedCells,
  };
};

const processTable = (table: any, data: ReplaceData): any => {
  const rows = extractRows(table);
  if (rows.length === 0) return table;

  const processedRows = rows.map((row) => processTableRow(row, data));
  return {
    ...table,
    "w:tr": processedRows.length === 1 ? processedRows[0] : processedRows,
  };
};

export const processInlineTemplateTokensInDocument = (
  xmlDoc: any,
  data: ReplaceData
): any => {
  const body = xmlDoc["w:document"]?.["w:body"];
  if (!body) return xmlDoc;

  let updatedBody = processParagraphContainer(body, "w:p", data);

  const tables = updatedBody["w:tbl"];
  if (tables) {
    const tableArray = Array.isArray(tables) ? tables : [tables];
    const processedTables = tableArray.map((table) => processTable(table, data));
    updatedBody = {
      ...updatedBody,
      "w:tbl": processedTables.length === 1 ? processedTables[0] : processedTables,
    };
  }

  return {
    ...xmlDoc,
    "w:document": {
      ...xmlDoc["w:document"],
      "w:body": updatedBody,
    },
  };
};

export const processInlineTemplateTokensInHeaderFooter = (
  xmlDoc: any,
  data: ReplaceData
): any => {
  const root = getHeaderFooterRoot(xmlDoc);
  const rootKey = getHeaderFooterRootKey(xmlDoc);
  if (!root || !rootKey) return xmlDoc;

  let updatedRoot = processParagraphContainer(root, "w:p", data);

  const tables = updatedRoot["w:tbl"];
  if (tables) {
    const tableArray = Array.isArray(tables) ? tables : [tables];
    const processedTables = tableArray.map((table) => processTable(table, data));
    updatedRoot = {
      ...updatedRoot,
      "w:tbl": processedTables.length === 1 ? processedTables[0] : processedTables,
    };
  }

  return {
    ...xmlDoc,
    [rootKey]: updatedRoot,
  };
};
