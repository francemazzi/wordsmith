import {
  processInlineTemplateTokensInDocument,
  processInlineTemplateTokensInHeaderFooter,
} from "../../src/template-processing";
import {
  extractTextFromParagraph,
  extractTextFromCell,
  extractRunText,
} from "../../src/xml";

describe("Template token processing on split runs", () => {
  it("replaces split placeholders in document paragraphs", () => {
    const xmlDoc = {
      "w:document": {
        "w:body": {
          "w:p": {
            "w:r": [{ "w:t": "{{na" }, { "w:t": "me}}" }],
          },
        },
      },
    };

    const result = processInlineTemplateTokensInDocument(xmlDoc, { name: "Mario" });
    const paragraph = result["w:document"]["w:body"]["w:p"];

    expect(extractTextFromParagraph(paragraph)).toBe("Mario");
  });

  it("replaces split placeholders inside table cells", () => {
    const xmlDoc = {
      "w:document": {
        "w:body": {
          "w:tbl": {
            "w:tr": {
              "w:tc": {
                "w:p": {
                  "w:r": [{ "w:t": "Cliente: {{na" }, { "w:t": "me}}" }],
                },
              },
            },
          },
        },
      },
    };

    const result = processInlineTemplateTokensInDocument(xmlDoc, { name: "Mario" });
    const cell = result["w:document"]["w:body"]["w:tbl"]["w:tr"]["w:tc"];

    expect(extractTextFromCell(cell)).toBe("Cliente: Mario");
  });

  it("replaces split placeholders in headers and footers", () => {
    const headerDoc = {
      "w:hdr": {
        "w:p": {
          "w:r": [{ "w:t": "Rapporto {{re" }, { "w:t": "f}}" }],
        },
      },
    };

    const footerDoc = {
      "w:ftr": {
        "w:p": {
          "w:r": [{ "w:t": "Pagina {{pa" }, { "w:t": "ge}}" }],
        },
      },
    };

    const processedHeader = processInlineTemplateTokensInHeaderFooter(headerDoc, {
      ref: "A-123",
    });
    const processedFooter = processInlineTemplateTokensInHeaderFooter(footerDoc, {
      page: 3,
    });

    expect(extractTextFromParagraph(processedHeader["w:hdr"]["w:p"])).toBe(
      "Rapporto A-123"
    );
    expect(extractTextFromParagraph(processedFooter["w:ftr"]["w:p"])).toBe(
      "Pagina 3"
    );
  });
});

describe("Formatting preservation with per-run processing", () => {
  it("preserves run formatting when replacing a variable in one run", () => {
    const xmlDoc = {
      "w:document": {
        "w:body": {
          "w:p": {
            "w:r": [
              {
                "w:rPr": { "w:b": {} },
                "w:t": "Note: ",
              },
              {
                "w:rPr": { "w:i": {} },
                "w:t": "{{commenti}}",
              },
            ],
          },
        },
      },
    };

    const result = processInlineTemplateTokensInDocument(xmlDoc, {
      commenti: "Tutto ok",
    });
    const paragraph = result["w:document"]["w:body"]["w:p"];
    const runs = Array.isArray(paragraph["w:r"])
      ? paragraph["w:r"]
      : [paragraph["w:r"]];

    // Both runs should be preserved
    expect(runs.length).toBe(2);
    // First run keeps bold formatting and original text
    expect(runs[0]["w:rPr"]).toEqual({ "w:b": {} });
    expect(extractRunText(runs[0])).toBe("Note: ");
    // Second run keeps italic formatting with replaced text
    expect(runs[1]["w:rPr"]).toEqual({ "w:i": {} });
    expect(extractRunText(runs[1])).toBe("Tutto ok");
  });

  it("preserves paragraph unchanged when variable is not provided", () => {
    const originalParagraph = {
      "w:r": [
        { "w:rPr": { "w:b": {} }, "w:t": "Firma DG: " },
        { "w:t": "{{firma.DG}}" },
      ],
    };
    const xmlDoc = {
      "w:document": {
        "w:body": {
          "w:p": originalParagraph,
        },
      },
    };

    const result = processInlineTemplateTokensInDocument(xmlDoc, {
      commenti: "some value",
    });
    const paragraph = result["w:document"]["w:body"]["w:p"];

    // Paragraph should be returned unchanged
    expect(paragraph).toBe(originalParagraph);
  });

  it("handles split tokens across differently-formatted runs", () => {
    const xmlDoc = {
      "w:document": {
        "w:body": {
          "w:p": {
            "w:r": [
              { "w:rPr": { "w:b": {} }, "w:t": "Label: " },
              { "w:rPr": { "w:i": {} }, "w:t": "{{na" },
              { "w:t": "me}}" },
            ],
          },
        },
      },
    };

    const result = processInlineTemplateTokensInDocument(xmlDoc, {
      name: "Mario",
    });
    const paragraph = result["w:document"]["w:body"]["w:p"];
    const runs = Array.isArray(paragraph["w:r"])
      ? paragraph["w:r"]
      : [paragraph["w:r"]];

    // First run (Label) should be preserved with its formatting
    expect(runs[0]["w:rPr"]).toEqual({ "w:b": {} });
    expect(extractRunText(runs[0])).toBe("Label: ");
    // Full text should be correct
    expect(extractTextFromParagraph(paragraph)).toBe("Label: Mario");
  });

  it("preserves all runs when no variables match the provided data", () => {
    const xmlDoc = {
      "w:document": {
        "w:body": {
          "w:p": {
            "w:r": [
              { "w:rPr": { "w:b": {} }, "w:t": "Note: " },
              { "w:t": "{{commenti}}" },
              { "w:rPr": { "w:sz": { "@_w:val": "24" } }, "w:t": " end" },
            ],
          },
        },
      },
    };

    const result = processInlineTemplateTokensInDocument(xmlDoc, {
      otherVar: "irrelevant",
    });
    const paragraph = result["w:document"]["w:body"]["w:p"];
    const runs = Array.isArray(paragraph["w:r"])
      ? paragraph["w:r"]
      : [paragraph["w:r"]];

    // All 3 runs should be preserved exactly
    expect(runs.length).toBe(3);
    expect(extractTextFromParagraph(paragraph)).toBe("Note: {{commenti}} end");
  });
});
