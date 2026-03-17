import {
  extractVariables,
  extractQuestionnaireVariables,
  normalizeQuestionnaireData,
  parseVariable,
  replaceQuestionnaireDsl,
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

    it("should extract questionnaire DSL variables", () => {
      const text =
        'Q1 {{q.apportoModifiche|choice:si|mark:"X"}} Q2 {{q.validita|choice:no}}';
      const variables = extractVariables(text);
      expect(variables).toEqual(["q.apportoModifiche", "q.validita"]);
    });
  });

  describe("extractQuestionnaireVariables", () => {
    it("should extract only questionnaire DSL variables", () => {
      const text =
        "Legacy {{name}} and DSL {{q.apportoModifiche|choice:si|mark:X}}";
      const variables = extractQuestionnaireVariables(text);
      expect(variables).toEqual(["q.apportoModifiche"]);
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

    it("should escape regex characters in key names", () => {
      const text = "Value: {{a+b}}";
      const result = replaceVariable("a+b", "ok")(text);
      expect(result).toBe("Value: ok");
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

    it("should replace questionnaire DSL placeholders", () => {
      const text =
        'Si {{q.apportoModifiche|choice:si|mark:"X"}} No {{q.apportoModifiche|choice:no|mark:"X"}}';
      const result = replaceVariables({
        q: { apportoModifiche: "si" },
      })(text);
      expect(result).toBe("Si X No ");
    });

    it("should replace questionnaire DSL with default marker", () => {
      const text = "Selected: {{q.validita|choice:no}}";
      const result = replaceVariables({
        q: { validita: "no" },
      })(text);
      expect(result).toBe("Selected: X");
    });
  });

  describe("replaceQuestionnaireDsl", () => {
    it("should support multi-select values", () => {
      const text =
        'A {{q.flags|choice:a|mark:"X"}} B {{q.flags|choice:b|mark:"X"}}';
      const result = replaceQuestionnaireDsl({
        q: { flags: ["b"] },
      })(text);
      expect(result).toBe("A  B X");
    });

    it("should preserve token when variable is undefined", () => {
      const text = '{{q.missing|choice:si|mark:"X"}}';
      const result = replaceQuestionnaireDsl({})(text);
      expect(result).toBe('{{q.missing|choice:si|mark:"X"}}');
    });

    it("should preserve token when parent object is missing", () => {
      const text =
        'Si {{q.answer|choice:si|mark:"X"}} No {{q.answer|choice:no|mark:"X"}}';
      const result = replaceQuestionnaireDsl({ other: "value" })(text);
      expect(result).toBe(
        'Si {{q.answer|choice:si|mark:"X"}} No {{q.answer|choice:no|mark:"X"}}'
      );
    });

    it("should replace with empty when variable exists but does not match", () => {
      const text =
        'Si {{q.answer|choice:si|mark:"X"}} No {{q.answer|choice:no|mark:"X"}}';
      const result = replaceQuestionnaireDsl({
        q: { answer: "si" },
      })(text);
      expect(result).toBe("Si X No ");
    });
  });

  describe("normalizeQuestionnaireData", () => {
    it("should derive legacy yes/no fields from q answers", () => {
      const normalized = normalizeQuestionnaireData({
        q: { apportoModifiche: "si", validita: "no" },
      });

      expect(normalized.apportoModifiche).toEqual({
        si: "X",
        no: "",
      });
      expect(normalized.validita).toEqual({
        no: "X",
        si: "",
      });
    });

    it("should preserve existing legacy values", () => {
      const normalized = normalizeQuestionnaireData({
        q: { apportoModifiche: "si" },
        apportoModifiche: { si: "✓", no: "-" },
      });

      expect(normalized.apportoModifiche).toEqual({
        si: "✓",
        no: "-",
      });
    });

    it("should expand dot-notation keys", () => {
      const normalized = normalizeQuestionnaireData({
        "firma.DG": "Mario",
        "q.validita": "si",
      });

      expect(normalized.firma).toEqual({ DG: "Mario" });
      expect(normalized.q).toEqual({ validita: "si" });
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
