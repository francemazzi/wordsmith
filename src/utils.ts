/**
 * Utility functions for functional composition
 */

/**
 * Pipe - executes functions from left to right
 */
export const pipe =
  <T>(...fns: Array<(arg: any) => any>) =>
  (value: T): any =>
    fns.reduce((acc, fn) => fn(acc), value);

/**
 * Compose - executes functions from right to left
 */
export const compose =
  <T>(...fns: Array<(arg: any) => any>) =>
  (value: T): any =>
    fns.reduceRight((acc, fn) => fn(acc), value);

/**
 * Curry helper for 2-argument functions
 */
export const curry =
  <A, B, C>(fn: (a: A, b: B) => C) =>
  (a: A) =>
  (b: B): C =>
    fn(a, b);

/**
 * Map function for objects
 */
export const mapObject =
  <T, U>(fn: (value: T, key: string) => U) =>
  (obj: Record<string, T>): Record<string, U> =>
    Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, fn(value, key)])
    );

/**
 * Filter function for objects
 */
export const filterObject =
  <T>(predicate: (value: T, key: string) => boolean) =>
  (obj: Record<string, T>): Record<string, T> =>
    Object.fromEntries(
      Object.entries(obj).filter(([key, value]) => predicate(value, key))
    );

/**
 * Deep clone helper
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Safe string conversion
 */
export const toString = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};
