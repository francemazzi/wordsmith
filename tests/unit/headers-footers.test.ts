import {
  getHeaderFiles,
  getFooterFiles,
  updateMultipleXmlFiles,
} from "../../src/zip";
import {
  parseXml,
  extractParagraphsFromHeaderFooter,
  extractTablesFromHeaderFooter,
  getHeaderFooterRoot,
  getHeaderFooterRootKey,
} from "../../src/xml";
import { replaceInHeaderFooterTables } from "../../src/tables";

describe("Header/Footer Support", () => {
  describe("getHeaderFiles", () => {
    it("should return empty object when no headers exist", () => {
      const files = {
        "word/document.xml": "<document/>",
        "[Content_Types].xml": "<types/>",
      };
      const headers = getHeaderFiles(files);
      expect(headers).toEqual({});
    });

    it("should return all header files", () => {
      const files = {
        "word/document.xml": "<document/>",
        "word/header1.xml": "<header1/>",
        "word/header2.xml": "<header2/>",
        "word/footer1.xml": "<footer/>",
      };
      const headers = getHeaderFiles(files);
      expect(Object.keys(headers)).toHaveLength(2);
      expect(headers["word/header1.xml"]).toBe("<header1/>");
      expect(headers["word/header2.xml"]).toBe("<header2/>");
    });

    it("should not include non-header files", () => {
      const files = {
        "word/document.xml": "<document/>",
        "word/header1.xml": "<header/>",
        "word/headers.xml": "<notaheader/>",
      };
      const headers = getHeaderFiles(files);
      expect(Object.keys(headers)).toHaveLength(1);
      expect(headers["word/header1.xml"]).toBeDefined();
      expect(headers["word/headers.xml"]).toBeUndefined();
    });
  });

  describe("getFooterFiles", () => {
    it("should return empty object when no footers exist", () => {
      const files = {
        "word/document.xml": "<document/>",
        "[Content_Types].xml": "<types/>",
      };
      const footers = getFooterFiles(files);
      expect(footers).toEqual({});
    });

    it("should return all footer files", () => {
      const files = {
        "word/document.xml": "<document/>",
        "word/footer1.xml": "<footer1/>",
        "word/footer2.xml": "<footer2/>",
        "word/header1.xml": "<header/>",
      };
      const footers = getFooterFiles(files);
      expect(Object.keys(footers)).toHaveLength(2);
      expect(footers["word/footer1.xml"]).toBe("<footer1/>");
      expect(footers["word/footer2.xml"]).toBe("<footer2/>");
    });
  });

  describe("updateMultipleXmlFiles", () => {
    it("should update multiple files at once", () => {
      const files: Record<string, string> = {
        "word/document.xml": "<document/>",
        "word/header1.xml": "<header1/>",
        "word/footer1.xml": "<footer1/>",
      };
      const updates = {
        "word/header1.xml": "<updated-header/>",
        "word/footer1.xml": "<updated-footer/>",
      };
      const result = updateMultipleXmlFiles(updates)(files);
      expect(result["word/document.xml"]).toBe("<document/>");
      expect(result["word/header1.xml"]).toBe("<updated-header/>");
      expect(result["word/footer1.xml"]).toBe("<updated-footer/>");
    });

    it("should not modify original files object", () => {
      const files: Record<string, string> = {
        "word/document.xml": "<document/>",
      };
      const updates = {
        "word/header1.xml": "<new-header/>",
      };
      const result = updateMultipleXmlFiles(updates)(files);
      expect(files["word/header1.xml"]).toBeUndefined();
      expect(result["word/header1.xml"]).toBe("<new-header/>");
    });
  });

  describe("getHeaderFooterRoot", () => {
    it("should return header root element", () => {
      const xmlDoc = {
        "w:hdr": {
          "w:p": { "w:r": { "w:t": "Header text" } },
        },
      };
      const root = getHeaderFooterRoot(xmlDoc);
      expect(root).toBeDefined();
      expect(root["w:p"]).toBeDefined();
    });

    it("should return footer root element", () => {
      const xmlDoc = {
        "w:ftr": {
          "w:p": { "w:r": { "w:t": "Footer text" } },
        },
      };
      const root = getHeaderFooterRoot(xmlDoc);
      expect(root).toBeDefined();
      expect(root["w:p"]).toBeDefined();
    });

    it("should return null for non-header/footer document", () => {
      const xmlDoc = {
        "w:document": {
          "w:body": {},
        },
      };
      const root = getHeaderFooterRoot(xmlDoc);
      expect(root).toBeNull();
    });
  });

  describe("getHeaderFooterRootKey", () => {
    it("should return w:hdr for header", () => {
      const xmlDoc = { "w:hdr": {} };
      expect(getHeaderFooterRootKey(xmlDoc)).toBe("w:hdr");
    });

    it("should return w:ftr for footer", () => {
      const xmlDoc = { "w:ftr": {} };
      expect(getHeaderFooterRootKey(xmlDoc)).toBe("w:ftr");
    });

    it("should return null for other documents", () => {
      const xmlDoc = { "w:document": {} };
      expect(getHeaderFooterRootKey(xmlDoc)).toBeNull();
    });
  });

  describe("extractParagraphsFromHeaderFooter", () => {
    it("should extract paragraphs from header", () => {
      const xmlDoc = {
        "w:hdr": {
          "w:p": [
            { "w:r": { "w:t": "First" } },
            { "w:r": { "w:t": "Second" } },
          ],
        },
      };
      const paragraphs = extractParagraphsFromHeaderFooter(xmlDoc);
      expect(paragraphs).toHaveLength(2);
    });

    it("should extract paragraphs from footer", () => {
      const xmlDoc = {
        "w:ftr": {
          "w:p": { "w:r": { "w:t": "Footer text" } },
        },
      };
      const paragraphs = extractParagraphsFromHeaderFooter(xmlDoc);
      expect(paragraphs).toHaveLength(1);
    });

    it("should return empty array for empty header", () => {
      const xmlDoc = { "w:hdr": {} };
      const paragraphs = extractParagraphsFromHeaderFooter(xmlDoc);
      expect(paragraphs).toEqual([]);
    });

    it("should return empty array for non-header/footer", () => {
      const xmlDoc = { "w:document": { "w:body": { "w:p": {} } } };
      const paragraphs = extractParagraphsFromHeaderFooter(xmlDoc);
      expect(paragraphs).toEqual([]);
    });
  });

  describe("extractTablesFromHeaderFooter", () => {
    it("should extract tables from header", () => {
      const xmlDoc = {
        "w:hdr": {
          "w:tbl": [
            { "w:tr": { "w:tc": { "w:p": {} } } },
            { "w:tr": { "w:tc": { "w:p": {} } } },
          ],
        },
      };
      const tables = extractTablesFromHeaderFooter(xmlDoc);
      expect(tables).toHaveLength(2);
    });

    it("should extract single table from footer", () => {
      const xmlDoc = {
        "w:ftr": {
          "w:tbl": { "w:tr": { "w:tc": { "w:p": {} } } },
        },
      };
      const tables = extractTablesFromHeaderFooter(xmlDoc);
      expect(tables).toHaveLength(1);
    });

    it("should return empty array when no tables", () => {
      const xmlDoc = {
        "w:hdr": {
          "w:p": { "w:r": { "w:t": "No tables" } },
        },
      };
      const tables = extractTablesFromHeaderFooter(xmlDoc);
      expect(tables).toEqual([]);
    });
  });

  describe("replaceInHeaderFooterTables", () => {
    it("should return unchanged document when no tables", () => {
      const xmlDoc = {
        "w:hdr": {
          "w:p": { "w:r": { "w:t": "No tables" } },
        },
      };
      const result = replaceInHeaderFooterTables(xmlDoc, { items: [] });
      expect(result).toEqual(xmlDoc);
    });

    it("should return unchanged document for non-header/footer", () => {
      const xmlDoc = {
        "w:document": {
          "w:body": {
            "w:tbl": {},
          },
        },
      };
      const result = replaceInHeaderFooterTables(xmlDoc, { items: [] });
      expect(result).toEqual(xmlDoc);
    });

    it("should preserve root key when processing header", () => {
      const xmlDoc = {
        "w:hdr": {
          "@_xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
          "w:tbl": {
            "w:tr": {
              "w:tc": {
                "w:p": {
                  "w:r": { "w:t": "Static content" },
                },
              },
            },
          },
        },
      };
      const result = replaceInHeaderFooterTables(xmlDoc, {});
      expect(result["w:hdr"]).toBeDefined();
      expect(result["w:ftr"]).toBeUndefined();
    });

    it("should preserve root key when processing footer", () => {
      const xmlDoc = {
        "w:ftr": {
          "@_xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
          "w:tbl": {
            "w:tr": {
              "w:tc": {
                "w:p": {
                  "w:r": { "w:t": "Static content" },
                },
              },
            },
          },
        },
      };
      const result = replaceInHeaderFooterTables(xmlDoc, {});
      expect(result["w:ftr"]).toBeDefined();
      expect(result["w:hdr"]).toBeUndefined();
    });
  });
});
