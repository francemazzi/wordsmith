import {
  extractRows,
  extractCells,
  extractTextFromCell,
  updateCellText,
  extractGridCols,
  getHeaderFooterRoot,
  getHeaderFooterRootKey,
} from "./xml.js";
import {
  hasTableVariables,
  getTableArrayName,
  replaceInText,
} from "./variables.js";
import { deepClone } from "./utils.js";
import type { ReplaceData, TransposedTableInfo } from "./types.js";

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

export const getTransposedTableInfo = (rows: any[]): TransposedTableInfo => {
  const templateRowIndices = rows
    .map((row, i) => (isTemplateRow(row) ? i : -1))
    .filter((i) => i !== -1);

  if (templateRowIndices.length <= 1) {
    return { transposed: false };
  }

  // Check all template rows reference the same array
  const arrayNames = templateRowIndices.map((i) => {
    const cells = extractCells(rows[i]);
    const cellTexts = cells.map(extractTextFromCell).join("");
    return getTableArrayName(cellTexts);
  });

  const uniqueNames = [...new Set(arrayNames.filter(Boolean))];
  if (uniqueNames.length !== 1) {
    return { transposed: false };
  }

  // Find the template column index (which column has the variables)
  const columnIndices = templateRowIndices.map((i) => {
    const cells = extractCells(rows[i]);
    return cells.findIndex((cell: any) =>
      hasTableVariables(extractTextFromCell(cell))
    );
  });

  const mostCommon = columnIndices
    .filter((i) => i !== -1)
    .sort(
      (a, b) =>
        columnIndices.filter((v) => v === b).length -
        columnIndices.filter((v) => v === a).length
    )[0];

  return {
    transposed: true,
    arrayName: uniqueNames[0]!,
    templateColumnIndex: mostCommon,
  };
};

export const processTransposedTable = (
  table: any,
  data: ReplaceData
): any => {
  const rows = extractRows(table);
  const info = getTransposedTableInfo(rows);

  if (!info.transposed || !info.arrayName || info.templateColumnIndex == null) {
    return table;
  }

  const { arrayName, templateColumnIndex } = info;
  const arrayData = data[arrayName];
  const isEmpty = !Array.isArray(arrayData) || arrayData.length === 0;

  const newRows = rows.map((row) => {
    const cells = extractCells(row);

    if (templateColumnIndex >= cells.length) return row;

    const templateCell = cells[templateColumnIndex];
    const originalText = extractTextFromCell(templateCell);
    const hasVar = hasTableVariables(originalText);

    let expandedCells: any[];

    if (isEmpty) {
      expandedCells = cells.filter((_, i) => i !== templateColumnIndex);
    } else {
      const clonedCells = arrayData.map((item, index) => {
        const clonedCell = deepClone(templateCell);
        if (hasVar) {
          const newText = replaceInText(originalText, arrayName, item, index);
          return updateCellText(clonedCell, newText);
        }
        return clonedCell;
      });

      expandedCells = [
        ...cells.slice(0, templateColumnIndex),
        ...clonedCells,
        ...cells.slice(templateColumnIndex + 1),
      ];
    }

    return {
      ...row,
      "w:tc": expandedCells.length === 1 ? expandedCells[0] : expandedCells,
    };
  });

  let resultTable = {
    ...table,
    "w:tr": newRows.length === 1 ? newRows[0] : newRows,
  };

  // Update w:tblGrid if present
  const gridCols = extractGridCols(table);
  if (gridCols.length > templateColumnIndex) {
    const templateGridCol = gridCols[templateColumnIndex];
    const itemCount = isEmpty ? 0 : arrayData.length;

    const newGridCols = [
      ...gridCols.slice(0, templateColumnIndex),
      ...Array(itemCount)
        .fill(null)
        .map(() => deepClone(templateGridCol)),
      ...gridCols.slice(templateColumnIndex + 1),
    ];

    if (newGridCols.length > 0) {
      resultTable = {
        ...resultTable,
        "w:tblGrid": {
          ...table["w:tblGrid"],
          "w:gridCol":
            newGridCols.length === 1 ? newGridCols[0] : newGridCols,
        },
      };
    }
  }

  return resultTable;
};

export const processTable = (table: any, data: ReplaceData): any => {
  const rows = extractRows(table);

  // Check for transposed table (headers in first column, variables in columns)
  const transposedInfo = getTransposedTableInfo(rows);
  if (transposedInfo.transposed) {
    return processTransposedTable(table, data);
  }

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

/**
 * Replace table variables in header or footer XML document
 * @param xmlDoc - Parsed XML document (header or footer)
 * @param data - Data to replace variables with
 * @returns Updated XML document
 */
export const replaceInHeaderFooterTables = (
  xmlDoc: any,
  data: ReplaceData
): any => {
  const root = getHeaderFooterRoot(xmlDoc);
  const rootKey = getHeaderFooterRootKey(xmlDoc);

  if (!root || !rootKey) return xmlDoc;

  const tables = root["w:tbl"];
  if (!tables) return xmlDoc;

  const tableArray = Array.isArray(tables) ? tables : [tables];
  const processedTables = processAllTables(tableArray, data);

  if (!processedTables || processedTables.length === 0) {
    return xmlDoc;
  }

  return {
    ...xmlDoc,
    [rootKey]: {
      ...root,
      "w:tbl":
        processedTables.length === 1 ? processedTables[0] : processedTables,
    },
  };
};
