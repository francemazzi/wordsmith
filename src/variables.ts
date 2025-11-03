import type { Variable } from "./types.js";
import { toString } from "./utils.js";

export const DEFAULT_PATTERN = /\{\{(\s*[\w.]+\s*)\}\}/g;

export const TABLE_VARIABLE_PATTERN = /\{\{(\w+)\.(\w+)\}\}/g;

export const findVariables =
  (pattern: RegExp) =>
  (text: string): string[] => {
    const matches = text.matchAll(pattern);
    return [...new Set([...matches].map((m) => m[1].trim()))];
  };

export const extractVariables = (text: string): string[] => {
  return findVariables(DEFAULT_PATTERN)(text);
};

export const parseVariable = (varName: string): Variable => {
  const match = varName.match(/^(\w+)\.(\w+)$/);

  if (match) {
    return {
      name: varName,
      pattern: `{{${varName}}}`,
      isTableVariable: true,
      arrayName: match[1],
      fieldName: match[2],
    };
  }

  return {
    name: varName,
    pattern: `{{${varName}}}`,
    isTableVariable: false,
  };
};

export const replaceVariable =
  (key: string, value: any) =>
  (text: string): string => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    return text.replace(regex, toString(value));
  };

export const replaceVariables =
  (data: Record<string, any>) =>
  (text: string): string => {
    let result = text;

    const objectVarPattern = /\{\{(\w+)\.(\w+)\}\}/g;
    result = result.replace(objectVarPattern, (match, objectName, propName) => {
      const obj = data[objectName];
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        return toString(obj[propName] ?? match);
      }
      return match;
    });

    return Object.entries(data).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) return acc;
      if (typeof value === "object" && value !== null) return acc;
      return replaceVariable(key, value)(acc);
    }, result);
  };

export const replaceInText = (
  text: string,
  arrayName: string,
  dataItem: Record<string, any>,
  index: number
): string => {
  let result = text;

  const fieldPattern = new RegExp(`\\{\\{${arrayName}\\.(\\w+)\\}\\}`, "g");
  result = result.replace(fieldPattern, (match, fieldName) => {
    if (fieldName === "#" || fieldName === "index") {
      return toString(index + 1);
    }
    return toString(dataItem[fieldName] ?? "");
  });

  return result;
};

export const getAllVariables = (text: string): Variable[] => {
  const varNames = extractVariables(text);
  return varNames.map(parseVariable);
};

export const hasTableVariables = (text: string): boolean => {
  return TABLE_VARIABLE_PATTERN.test(text);
};

export const getTableArrayName = (text: string): string | null => {
  const pattern = /\{(\w+)\.(\w+)\}\}/;
  const match = text.match(pattern);
  if (match && match[1]) {
    return match[1];
  }
  return null;
};
