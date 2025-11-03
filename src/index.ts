import { writeFile } from "fs/promises";
import { read } from "./readers.js";
import { unzip, getDocumentXml, updateDocumentXml, zip } from "./zip.js";
import {
  parseXml,
  xmlToString,
  extractParagraphs,
  extractTables,
} from "./xml.js";
import {
  extractTextFromParagraph,
  extractRows,
  extractCells,
  extractTextFromCell,
} from "./xml.js";
import { getAllVariables, replaceVariables } from "./variables.js";
import { replaceInAllTables } from "./tables.js";
import {
  processConditionals,
  extractConditionalVariables,
} from "./conditionals.js";
import type { ExtractResult, ReplaceData } from "./types.js";

/**
 * Extract variables from a .docx file
 * @param source - File path or Buffer
 * @returns Object containing all found variables
 */
export const extract = async (
  source: string | Buffer
): Promise<ExtractResult> => {
  const buffer = await read(source);

  const files = await unzip(buffer);
  const documentXml = getDocumentXml(files);

  const xmlDoc = parseXml(documentXml);

  const paragraphs = extractParagraphs(xmlDoc);
  const paragraphTexts = paragraphs.map(extractTextFromParagraph);

  const tables = extractTables(xmlDoc);
  const tableTexts: string[] = [];
  tables.forEach((table) => {
    const rows = extractRows(table);
    rows.forEach((row) => {
      const cells = extractCells(row);
      cells.forEach((cell) => {
        tableTexts.push(extractTextFromCell(cell));
      });
    });
  });

  const fullText = [...paragraphTexts, ...tableTexts].join(" ");

  const variables = getAllVariables(fullText);

  const conditionalVars = extractConditionalVariables(fullText);

  const simpleVariables = [
    ...variables.filter((v) => !v.isTableVariable).map((v) => v.name),
    ...conditionalVars,
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const tableVariables: Record<string, string[]> = {};
  variables
    .filter((v) => v.isTableVariable)
    .forEach((v) => {
      if (v.arrayName && v.fieldName) {
        if (!tableVariables[v.arrayName]) {
          tableVariables[v.arrayName] = [];
        }
        if (!tableVariables[v.arrayName].includes(v.fieldName)) {
          tableVariables[v.arrayName].push(v.fieldName);
        }
      }
    });

  const tableInfo = tables.map((table) => {
    const rows = extractRows(table);
    return {
      rows: rows.map((row) => {
        const cells = extractCells(row);
        return {
          cells: cells.map((cell) => ({
            text: extractTextFromCell(cell),
            variables: [],
          })),
          isTemplate: false,
        };
      }),
      hasTemplateRow: false,
    };
  });

  return {
    variables: simpleVariables,
    tableVariables,
    tables: tableInfo,
  };
};

/**
 * Replace variables in a .docx file
 * @param source - File path or Buffer
 * @param data - Object with variable values
 * @returns Buffer containing the processed .docx file
 */
export const replace = async (
  source: string | Buffer,
  data: ReplaceData
): Promise<Buffer> => {
  const buffer = await read(source);

  const files = await unzip(buffer);
  const documentXml = getDocumentXml(files);

  let xmlDoc = parseXml(documentXml);

  xmlDoc = replaceInAllTables(xmlDoc, data);

  let processedXml = xmlToString(xmlDoc);

  processedXml = processConditionals(processedXml, data);

  processedXml = replaceVariables(data)(processedXml);

  const updatedFiles = updateDocumentXml(processedXml)(files);

  return await zip(updatedFiles);
};

/**
 * Process a .docx file (read, replace, and save)
 * @param source - Input file path or Buffer
 * @param data - Object with variable values
 * @param outputPath - Output file path
 */
export const process = async (
  source: string | Buffer,
  data: ReplaceData,
  outputPath: string
): Promise<void> => {
  const result = await replace(source, data);
  await writeFile(outputPath, result);
};

export type {
  ExtractResult,
  ReplaceData,
  Variable,
  Table,
  TableRow,
  TableCell,
} from "./types.js";

export { parseVariable, extractVariables } from "./variables.js";
export { DEFAULT_PATTERN, TABLE_VARIABLE_PATTERN } from "./variables.js";
export { processConditionals, evaluateCondition } from "./conditionals.js";
