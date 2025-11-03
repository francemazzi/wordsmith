import { pipe, compose, curry, toString, deepClone } from "../../src/utils";

describe("Utility Functions", () => {
  describe("pipe", () => {
    it("should execute functions left to right", () => {
      const add5 = (x: number) => x + 5;
      const multiply2 = (x: number) => x * 2;
      const result = pipe(add5, multiply2)(10);
      expect(result).toBe(30); // (10 + 5) * 2
    });
  });

  describe("compose", () => {
    it("should execute functions right to left", () => {
      const add5 = (x: number) => x + 5;
      const multiply2 = (x: number) => x * 2;
      const result = compose(add5, multiply2)(10);
      expect(result).toBe(25); // (10 * 2) + 5
    });
  });

  describe("curry", () => {
    it("should curry a 2-argument function", () => {
      const add = (a: number, b: number) => a + b;
      const curriedAdd = curry(add);
      expect(curriedAdd(5)(3)).toBe(8);
    });
  });

  describe("toString", () => {
    it("should convert values to string", () => {
      expect(toString(123)).toBe("123");
      expect(toString("hello")).toBe("hello");
      expect(toString(true)).toBe("true");
      expect(toString(false)).toBe("false");
      expect(toString(null)).toBe("");
      expect(toString(undefined)).toBe("");
    });
  });

  describe("deepClone", () => {
    it("should deep clone an object", () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);
      cloned.b.c = 999;
      expect(original.b.c).toBe(2);
      expect(cloned.b.c).toBe(999);
    });
  });
});
