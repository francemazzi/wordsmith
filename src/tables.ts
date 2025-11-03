import {
  extractRows,
  extractCells,
  extractTextFromCell,
  updateCellText,
} from "./xml.js";
import {
  hasTableVariables,
  getTableArrayName,
  replaceInText,
} from "./variables.js";
import { deepClone } from "./utils.js";
import type { ReplaceData } from "./types.js";

export const isTemplateRow = (row: any): boolean => {
  const cells = extractCells(row);
  const cellTexts = cells.map(extractTextFromCell).join("");
  return hasTableVariables(cellTexts);
};

export const findTemplateRowIndex = (rows: any[]): number => {
  return rows.findIndex(isTemplateRow);
};

export const cloneRow = (row: any): any => {
  return deepClone(row);
};

export const processTemplateRow = (
  row: any,
  arrayName: string,
  dataItem: Record<string, any>,
  index: number
): any => {
  const clonedRow = cloneRow(row);
  const cells = extractCells(clonedRow);

  const updatedCells = cells.map((cell: any) => {
    const originalText = extractTextFromCell(cell);
    const newText = replaceInText(originalText, arrayName, dataItem, index);
    return updateCellText(cell, newText);
  });

  return {
    ...clonedRow,
    "w:tc": updatedCells.length === 1 ? updatedCells[0] : updatedCells,
  };
};

export const processTable = (table: any, data: ReplaceData): any => {
  const rows = extractRows(table);
  const templateRowIndex = findTemplateRowIndex(rows);

  if (templateRowIndex === -1) {
    return table;
  }

  const templateRow = rows[templateRowIndex];

  const cells = extractCells(templateRow);
  const cellTexts = cells.map(extractTextFromCell).join("");
  const arrayName = getTableArrayName(cellTexts);

  if (!arrayName) {
    return table;
  }

  const arrayData = data[arrayName];

  if (!Array.isArray(arrayData) || arrayData.length === 0) {
    const newRows = rows.filter((_, index) => index !== templateRowIndex);
    return {
      ...table,
      "w:tr": newRows.length === 1 ? newRows[0] : newRows,
    };
  }

  const newRows: any[] = [];

  newRows.push(...rows.slice(0, templateRowIndex));

  arrayData.forEach((item, index) => {
    const processedRow = processTemplateRow(
      templateRow,
      arrayName,
      item,
      index
    );
    newRows.push(processedRow);
  });

  newRows.push(...rows.slice(templateRowIndex + 1));

  return {
    ...table,
    "w:tr": newRows.length === 1 ? newRows[0] : newRows,
  };
};

export const processAllTables = (tables: any[], data: ReplaceData): any[] => {
  return tables.map((table) => processTable(table, data));
};

export const updateTablesInDocument = (
  xmlDoc: any,
  processedTables: any[]
): any => {
  const body = xmlDoc["w:document"]["w:body"];

  if (!processedTables || processedTables.length === 0) {
    return xmlDoc;
  }

  return {
    ...xmlDoc,
    "w:document": {
      ...xmlDoc["w:document"],
      "w:body": {
        ...body,
        "w:tbl":
          processedTables.length === 1 ? processedTables[0] : processedTables,
      },
    },
  };
};

export const replaceInAllTables = (xmlDoc: any, data: ReplaceData): any => {
  const body = xmlDoc["w:document"]?.["w:body"];
  if (!body) return xmlDoc;

  const tables = body["w:tbl"];
  if (!tables) return xmlDoc;

  const tableArray = Array.isArray(tables) ? tables : [tables];
  const processedTables = processAllTables(tableArray, data);

  return updateTablesInDocument(xmlDoc, processedTables);
};
