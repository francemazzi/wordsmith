import {
  extractVariables,
  parseVariable,
  replaceVariable,
  replaceVariables,
  hasTableVariables,
  getTableArrayName,
} from "../../src/variables";

describe("Variable Functions", () => {
  describe("extractVariables", () => {
    it("should extract simple variables", () => {
      const text = "Hello {{name}}, your age is {{age}}";
      const variables = extractVariables(text);
      expect(variables).toEqual(["name", "age"]);
    });

    it("should extract variables with spaces", () => {
      const text = "Hello {{ name }}, your age is {{ age }}";
      const variables = extractVariables(text);
      expect(variables).toEqual(["name", "age"]);
    });

    it("should handle duplicate variables", () => {
      const text = "{{name}} and {{name}} again";
      const variables = extractVariables(text);
      expect(variables).toEqual(["name"]);
    });

    it("should return empty array if no variables", () => {
      const text = "No variables here";
      const variables = extractVariables(text);
      expect(variables).toEqual([]);
    });
  });

  describe("parseVariable", () => {
    it("should parse simple variable", () => {
      const variable = parseVariable("name");
      expect(variable.isTableVariable).toBe(false);
      expect(variable.name).toBe("name");
    });

    it("should parse table variable", () => {
      const variable = parseVariable("items.name");
      expect(variable.isTableVariable).toBe(true);
      expect(variable.arrayName).toBe("items");
      expect(variable.fieldName).toBe("name");
    });
  });

  describe("replaceVariable", () => {
    it("should replace a variable", () => {
      const text = "Hello {{name}}!";
      const result = replaceVariable("name", "Mario")(text);
      expect(result).toBe("Hello Mario!");
    });

    it("should replace multiple occurrences", () => {
      const text = "{{name}} and {{name}}";
      const result = replaceVariable("name", "Mario")(text);
      expect(result).toBe("Mario and Mario");
    });

    it("should handle numbers", () => {
      const text = "Age: {{age}}";
      const result = replaceVariable("age", 25)(text);
      expect(result).toBe("Age: 25");
    });

    it("should handle booleans", () => {
      const text = "Active: {{active}}";
      const result = replaceVariable("active", true)(text);
      expect(result).toBe("Active: true");
    });
  });

  describe("replaceVariables", () => {
    it("should replace multiple variables", () => {
      const text = "Hello {{name}}, age {{age}}";
      const result = replaceVariables({ name: "Mario", age: 30 })(text);
      expect(result).toBe("Hello Mario, age 30");
    });

    it("should skip array values", () => {
      const text = "Hello {{name}}";
      const result = replaceVariables({
        name: "Mario",
        items: [{ x: 1 }],
      })(text);
      expect(result).toBe("Hello Mario");
    });
  });

  describe("hasTableVariables", () => {
    it("should detect table variables", () => {
      expect(hasTableVariables("{{items.name}}")).toBe(true);
      expect(hasTableVariables("{{name}}")).toBe(false);
    });
  });

  describe("getTableArrayName", () => {
    it("should extract array name", () => {
      expect(getTableArrayName("{{items.name}}")).toBe("items");
      expect(getTableArrayName("{{products.price}}")).toBe("products");
      expect(getTableArrayName("{{name}}")).toBeNull();
    });
  });
});
