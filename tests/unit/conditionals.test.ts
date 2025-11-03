import {
  evaluateCondition,
  processConditionals,
  hasConditionals,
  extractConditionalVariables,
} from "../../src/conditionals";

describe("Conditional Functions", () => {
  describe("evaluateCondition", () => {
    it("should return false for null and undefined", () => {
      expect(evaluateCondition(null)).toBe(false);
      expect(evaluateCondition(undefined)).toBe(false);
    });

    it("should evaluate booleans correctly", () => {
      expect(evaluateCondition(true)).toBe(true);
      expect(evaluateCondition(false)).toBe(false);
    });

    it("should evaluate numbers", () => {
      expect(evaluateCondition(1)).toBe(true);
      expect(evaluateCondition(0)).toBe(false);
      expect(evaluateCondition(-1)).toBe(true);
    });

    it("should evaluate strings", () => {
      expect(evaluateCondition("text")).toBe(true);
      expect(evaluateCondition("")).toBe(false);
    });

    it("should evaluate arrays", () => {
      expect(evaluateCondition([1, 2, 3])).toBe(true);
      expect(evaluateCondition([])).toBe(false);
    });

    it("should evaluate objects as true", () => {
      expect(evaluateCondition({ key: "value" })).toBe(true);
      expect(evaluateCondition({})).toBe(true);
    });
  });

  describe("processConditionals", () => {
    it("should process simple if block when condition is true", () => {
      const text = "{{#if isApproved}}Approved{{/if}}";
      const data = { isApproved: true };
      const result = processConditionals(text, data);
      expect(result).toBe("Approved");
    });

    it("should remove if block when condition is false", () => {
      const text = "{{#if isApproved}}Approved{{/if}}";
      const data = { isApproved: false };
      const result = processConditionals(text, data);
      expect(result).toBe("");
    });

    it("should process if-else block when condition is true", () => {
      const text = "{{#if isApproved}}Approved{{else}}Pending{{/if}}";
      const data = { isApproved: true };
      const result = processConditionals(text, data);
      expect(result).toBe("Approved");
    });

    it("should process if-else block when condition is false", () => {
      const text = "{{#if isApproved}}Approved{{else}}Pending{{/if}}";
      const data = { isApproved: false };
      const result = processConditionals(text, data);
      expect(result).toBe("Pending");
    });

    it("should handle multiple conditionals", () => {
      const text =
        "{{#if active}}Active{{/if}} and {{#if premium}}Premium{{else}}Free{{/if}}";
      const data = { active: true, premium: false };
      const result = processConditionals(text, data);
      expect(result).toBe("Active and Free");
    });

    it("should handle conditionals with complex content", () => {
      const text = "{{#if approved}}Document approved on {{date}} by {{name}}{{/if}}";
      const data = { approved: true };
      const result = processConditionals(text, data);
      expect(result).toBe("Document approved on {{date}} by {{name}}");
    });

    it("should handle undefined variables as false", () => {
      const text = "{{#if unknown}}Yes{{else}}No{{/if}}";
      const data = {};
      const result = processConditionals(text, data);
      expect(result).toBe("No");
    });
  });

  describe("hasConditionals", () => {
    it("should detect conditional blocks", () => {
      expect(hasConditionals("{{#if test}}content{{/if}}")).toBe(true);
      expect(hasConditionals("{{#if test}}yes{{else}}no{{/if}}")).toBe(true);
    });

    it("should return false for text without conditionals", () => {
      expect(hasConditionals("{{variable}}")).toBe(false);
      expect(hasConditionals("plain text")).toBe(false);
    });
  });

  describe("extractConditionalVariables", () => {
    it("should extract variable names from conditionals", () => {
      const text = "{{#if isApproved}}Approved{{/if}}";
      const vars = extractConditionalVariables(text);
      expect(vars).toEqual(["isApproved"]);
    });

    it("should extract multiple variables", () => {
      const text = "{{#if active}}Active{{/if}} {{#if premium}}Premium{{/if}}";
      const vars = extractConditionalVariables(text);
      expect(vars).toEqual(["active", "premium"]);
    });

    it("should handle duplicates", () => {
      const text = "{{#if test}}A{{/if}} {{#if test}}B{{/if}}";
      const vars = extractConditionalVariables(text);
      expect(vars).toEqual(["test"]);
    });

    it("should return empty array if no conditionals", () => {
      const text = "{{variable}} plain text";
      const vars = extractConditionalVariables(text);
      expect(vars).toEqual([]);
    });
  });
});

