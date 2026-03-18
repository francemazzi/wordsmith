import { writeFile } from "fs/promises";
import { read } from "./readers.js";
import {
  unzip,
  getDocumentXml,
  getHeaderFiles,
  getFooterFiles,
  updateDocumentXml,
  updateMultipleXmlFiles,
  zip,
} from "./zip.js";
import {
  parseXml,
  extractParagraphs,
  extractTables,
  extractParagraphsFromHeaderFooter,
  extractTablesFromHeaderFooter,
} from "./xml.js";
import {
  extractTextFromParagraph,
  extractRows,
  extractCells,
  extractTextFromCell,
} from "./xml.js";
import {
  getAllVariables,
  normalizeQuestionnaireData,
  replaceVariables,
} from "./variables.js";
import {
  processConditionals,
  extractConditionalVariables,
} from "./conditionals.js";
import {
  processTablesInString,
  healSplitTokensInString,
} from "./string-processing.js";
import type { ExtractResult, ReplaceData } from "./types.js";

/**
 * Helper function to extract text from tables
 * @param tables - Array of table elements
 * @returns Array of text strings from all cells
 */
const extractTextFromTables = (tables: any[]): string[] => {
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
  return tableTexts;
};

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

  // Extract from main document
  const documentXml = getDocumentXml(files);
  const xmlDoc = parseXml(documentXml);

  const paragraphs = extractParagraphs(xmlDoc);
  const paragraphTexts = paragraphs.map(extractTextFromParagraph);

  const tables = extractTables(xmlDoc);
  const tableTexts = extractTextFromTables(tables);

  // Extract from headers
  const headerFiles = getHeaderFiles(files);
  const headerTexts: string[] = [];
  for (const [, content] of Object.entries(headerFiles)) {
    const headerXml = parseXml(content);
    const headerParagraphs = extractParagraphsFromHeaderFooter(headerXml);
    headerTexts.push(...headerParagraphs.map(extractTextFromParagraph));

    const headerTables = extractTablesFromHeaderFooter(headerXml);
    headerTexts.push(...extractTextFromTables(headerTables));
  }

  // Extract from footers
  const footerFiles = getFooterFiles(files);
  const footerTexts: string[] = [];
  for (const [, content] of Object.entries(footerFiles)) {
    const footerXml = parseXml(content);
    const footerParagraphs = extractParagraphsFromHeaderFooter(footerXml);
    footerTexts.push(...footerParagraphs.map(extractTextFromParagraph));

    const footerTables = extractTablesFromHeaderFooter(footerXml);
    footerTexts.push(...extractTextFromTables(footerTables));
  }

  // Combine all text
  const fullText = [
    ...paragraphTexts,
    ...tableTexts,
    ...headerTexts,
    ...footerTexts,
  ].join(" ");

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
  const normalizedData = normalizeQuestionnaireData(data);

  const files = await unzip(buffer);

  // Process main document (string-based to preserve element order)
  const documentXml = getDocumentXml(files);
  let processedXml = processTablesInString(documentXml, normalizedData);
  processedXml = healSplitTokensInString(processedXml);
  processedXml = processConditionals(processedXml, normalizedData);
  processedXml = replaceVariables(normalizedData)(processedXml);

  // Process headers
  const headerFiles = getHeaderFiles(files);
  const processedHeaders: Record<string, string> = {};
  for (const [filename, content] of Object.entries(headerFiles)) {
    let processed = processTablesInString(content, normalizedData);
    processed = healSplitTokensInString(processed);
    processed = processConditionals(processed, normalizedData);
    processed = replaceVariables(normalizedData)(processed);
    processedHeaders[filename] = processed;
  }

  // Process footers
  const footerFiles = getFooterFiles(files);
  const processedFooters: Record<string, string> = {};
  for (const [filename, content] of Object.entries(footerFiles)) {
    let processed = processTablesInString(content, normalizedData);
    processed = healSplitTokensInString(processed);
    processed = processConditionals(processed, normalizedData);
    processed = replaceVariables(normalizedData)(processed);
    processedFooters[filename] = processed;
  }

  // Update all files
  let updatedFiles = updateDocumentXml(processedXml)(files);
  updatedFiles = updateMultipleXmlFiles(processedHeaders)(updatedFiles);
  updatedFiles = updateMultipleXmlFiles(processedFooters)(updatedFiles);

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
  QuestionnaireAnswers,
  ReplaceData,
  Variable,
  Table,
  TableRow,
  TableCell,
} from "./types.js";

export { parseVariable, extractVariables } from "./variables.js";
export { DEFAULT_PATTERN, TABLE_VARIABLE_PATTERN } from "./variables.js";
export {
  QUESTIONNAIRE_DSL_PATTERN,
  extractQuestionnaireVariables,
  normalizeQuestionnaireData,
  replaceQuestionnaireDsl,
} from "./variables.js";
export { processConditionals, evaluateCondition } from "./conditionals.js";
