import {
  processInlineTemplateTokensInDocument,
  processInlineTemplateTokensInHeaderFooter,
} from "../../src/template-processing";
import { extractTextFromParagraph, extractTextFromCell } from "../../src/xml";

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
