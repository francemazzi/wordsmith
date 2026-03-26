import type { Variable } from "./types.js";
import { toString } from "./utils.js";

export const DEFAULT_PATTERN = /\{\{(\s*[\w.]+\s*)\}\}/g;
export const QUESTIONNAIRE_DSL_PATTERN =
  /\{\{\s*([\w.]+)\s*\|\s*choice\s*:\s*([^|}]+?)\s*(?:\|\s*mark\s*:\s*(?:"([^"]*)"|'([^']*)'|([^|}]+)))?\s*(?:\|\s*unmark\s*:\s*(?:"([^"]*)"|'([^']*)'|([^|}]+)))?\s*\}\}/g;

export const TABLE_VARIABLE_PATTERN = /\{\{(\w+)\.(\w+)\}\}/g;

export const findVariables =
  (pattern: RegExp) =>
  (text: string): string[] => {
    const matches = text.matchAll(pattern);
    return [...new Set([...matches].map((m) => m[1].trim()))];
  };

export const extractVariables = (text: string): string[] => {
  const defaultVariables = findVariables(DEFAULT_PATTERN)(text);
  const questionnaireVariables = extractQuestionnaireVariables(text);
  return [...new Set([...defaultVariables, ...questionnaireVariables])];
};

export const extractQuestionnaireVariables = (text: string): string[] => {
  const matches = text.matchAll(QUESTIONNAIRE_DSL_PATTERN);
  return [...new Set([...matches].map((m) => m[1].trim()))];
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

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const replaceVariable =
  (key: string, value: any) =>
  (text: string): string => {
    const safeKey = escapeRegExp(key);
    const regex = new RegExp(`\\{\\{\\s*${safeKey}\\s*\\}\\}`, "g");
    return text.replace(regex, toString(value));
  };

export const replaceVariables =
  (data: Record<string, any>) =>
  (text: string): string => {
    let result = replaceQuestionnaireDsl(data)(text);

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

const normalizeChoiceValue = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  return String(value).trim().toLowerCase();
};

const getValueFromPath = (data: Record<string, any>, path: string): any => {
  return path.split(".").reduce((acc: any, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, data);
};

const matchesChoice = (value: unknown, choice: string): boolean => {
  const normalizedChoice = normalizeChoiceValue(choice);

  if (Array.isArray(value)) {
    return value.some((item) => normalizeChoiceValue(item) === normalizedChoice);
  }

  return normalizeChoiceValue(value) === normalizedChoice;
};

export const replaceQuestionnaireDsl =
  (data: Record<string, any>) =>
  (text: string): string => {
    return text.replace(
      QUESTIONNAIRE_DSL_PATTERN,
      (match, path, choice, markDoubleQuoted, markSingleQuoted, markPlain, unmarkDoubleQuoted, unmarkSingleQuoted, unmarkPlain) => {
        const selectedValue = getValueFromPath(data, path.trim());
        if (selectedValue === undefined) {
          return match;
        }
        if (!matchesChoice(selectedValue, choice)) {
          const unmark =
            unmarkDoubleQuoted ?? unmarkSingleQuoted ?? unmarkPlain?.trim() ?? "";
          return toString(unmark);
        }

        const mark =
          markDoubleQuoted ?? markSingleQuoted ?? markPlain?.trim() ?? "X";
        return toString(mark);
      }
    );
  };

const NEGATED_CHOICES: Record<string, string> = {
  si: "no",
  no: "si",
  yes: "no",
  true: "false",
  false: "true",
};

const expandDotNotationData = (data: Record<string, any>): Record<string, any> => {
  const expanded = { ...data };

  Object.entries(data).forEach(([path, value]) => {
    if (!path.includes(".")) return;

    const parts = path.split(".").filter(Boolean);
    if (parts.length < 2) return;

    let cursor: any = expanded;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      const current = cursor[key];

      if (current === undefined) {
        cursor[key] = {};
      } else if (
        typeof current !== "object" ||
        current === null ||
        Array.isArray(current)
      ) {
        return;
      }

      cursor = cursor[key];
    }

    const leafKey = parts[parts.length - 1];
    if (cursor[leafKey] === undefined) {
      cursor[leafKey] = value;
    }
  });

  return expanded;
};

export const normalizeQuestionnaireData = (
  data: Record<string, any>
): Record<string, any> => {
  const normalizedData = expandDotNotationData(data);
  const questionnaire = normalizedData.q;
  if (!questionnaire || typeof questionnaire !== "object" || Array.isArray(questionnaire)) {
    return normalizedData;
  }

  Object.entries(questionnaire).forEach(([questionName, rawValue]) => {
    if (rawValue === undefined || rawValue === null || typeof rawValue === "object") {
      return;
    }

    const rawChoice = String(rawValue).trim();
    if (!rawChoice) return;

    const normalizedChoice = normalizeChoiceValue(rawChoice);
    const existingLegacy = normalizedData[questionName];
    const legacyObject =
      existingLegacy &&
      typeof existingLegacy === "object" &&
      !Array.isArray(existingLegacy)
        ? { ...existingLegacy }
        : {};

    if (legacyObject[rawChoice] === undefined) {
      legacyObject[rawChoice] = "X";
    }
    if (legacyObject[normalizedChoice] === undefined) {
      legacyObject[normalizedChoice] = "X";
    }

    const negated = NEGATED_CHOICES[normalizedChoice];
    if (negated && legacyObject[negated] === undefined) {
      legacyObject[negated] = "";
    }

    normalizedData[questionName] = legacyObject;
  });

  return normalizedData;
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
