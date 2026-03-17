import type { ReplaceData } from "./types.js";
import { processConditionals } from "./conditionals.js";
import { replaceVariables } from "./variables.js";
import {
  extractCells,
  extractRows,
  extractTextFromParagraph,
  getHeaderFooterRoot,
  getHeaderFooterRootKey,
  updateParagraphText,
} from "./xml.js";

const hasTemplateToken = (text: string): boolean =>
  text.includes("{{") && text.includes("}}");

const processTemplateText = (text: string, data: ReplaceData): string => {
  const withConditionals = processConditionals(text, data);
  return replaceVariables(data)(withConditionals);
};

const processParagraph = (paragraph: any, data: ReplaceData): any => {
  const originalText = extractTextFromParagraph(paragraph);
  if (!originalText || !hasTemplateToken(originalText)) {
    return paragraph;
  }

  const processedText = processTemplateText(originalText, data);
  if (processedText === originalText) {
    return paragraph;
  }

  return updateParagraphText(paragraph, processedText);
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
