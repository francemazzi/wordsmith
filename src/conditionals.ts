/**
 * Conditional logic handling for {{#if}}, {{else}}, {{/if}}
 */

import type { ReplaceData } from "./types.js";

/**
 * Pattern for conditional blocks
 */
export const CONDITIONAL_PATTERN = /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

/**
 * Evaluate a condition value
 */
export const evaluateCondition = (value: any): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Process conditional blocks in text
 */
export const processConditionals = (text: string, data: ReplaceData): string => {
  return text.replace(
    CONDITIONAL_PATTERN,
    (match, variableName, ifBlock, elseBlock) => {
      const value = data[variableName];
      const condition = evaluateCondition(value);

      if (condition) {
        // Return the if block, trimming any extra whitespace
        return ifBlock || "";
      } else {
        // Return the else block if it exists
        return elseBlock || "";
      }
    }
  );
};

/**
 * Check if text contains conditional blocks
 */
export const hasConditionals = (text: string): boolean => {
  // Create a new regex without the global flag for testing
  const testPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/;
  return testPattern.test(text);
};

/**
 * Extract all conditional variable names from text
 */
export const extractConditionalVariables = (text: string): string[] => {
  const variables: string[] = [];
  const regex = /\{\{#if\s+(\w+)\}\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    variables.push(match[1]);
  }

  return [...new Set(variables)];
};

