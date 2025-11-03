import { XMLParser, XMLBuilder } from "fast-xml-parser";

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  cdataPropName: "__cdata",
  commentPropName: "__comment",
  preserveOrder: false,
  arrayMode: false,
};

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "__cdata",
  commentPropName: "__comment",
  format: false,
  suppressEmptyNode: false,
};

export const parseXml = (xmlString: string): any => {
  try {
    const parser = new XMLParser(parserOptions);
    return parser.parse(xmlString);
  } catch (error) {
    throw new Error(`Failed to parse XML: ${error}`);
  }
};

export const xmlToString = (xmlObject: any): string => {
  try {
    const builder = new XMLBuilder(builderOptions);
    return builder.build(xmlObject);
  } catch (error) {
    throw new Error(`Failed to build XML: ${error}`);
  }
};

export const extractTextFromParagraph = (paragraph: any): string => {
  if (!paragraph) return "";

  const runs = paragraph["w:r"];
  if (!runs) return "";

  const runArray = Array.isArray(runs) ? runs : [runs];

  return runArray
    .map((run: any) => {
      const textNode = run["w:t"];
      if (!textNode) return "";
      if (typeof textNode === "string") return textNode;
      if (textNode["#text"]) return textNode["#text"];
      return "";
    })
    .join("");
};

export const extractParagraphs = (xmlDoc: any): any[] => {
  const body = xmlDoc["w:document"]?.["w:body"];
  if (!body) return [];

  const paragraphs = body["w:p"];
  if (!paragraphs) return [];

  return Array.isArray(paragraphs) ? paragraphs : [paragraphs];
};

export const extractTables = (xmlDoc: any): any[] => {
  const body = xmlDoc["w:document"]?.["w:body"];
  if (!body) return [];

  const tables = body["w:tbl"];
  if (!tables) return [];

  return Array.isArray(tables) ? tables : [tables];
};

export const extractRows = (table: any): any[] => {
  const rows = table["w:tr"];
  if (!rows) return [];

  return Array.isArray(rows) ? rows : [rows];
};

export const extractCells = (row: any): any[] => {
  const cells = row["w:tc"];
  if (!cells) return [];

  return Array.isArray(cells) ? cells : [cells];
};

export const extractTextFromCell = (cell: any): string => {
  const paragraphs = cell["w:p"];
  if (!paragraphs) return "";

  const pArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

  return pArray.map(extractTextFromParagraph).join("\n");
};

export const updateParagraphText = (paragraph: any, newText: string): any => {
  return {
    ...paragraph,
    "w:r": {
      "w:t": {
        "@_xml:space": "preserve",
        "#text": newText,
      },
    },
  };
};

export const updateCellText = (cell: any, newText: string): any => {
  const paragraphs = cell["w:p"];
  const pArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

  const updatedParagraphs = pArray.map((p: any, index: number) => {
    if (index === 0) {
      return updateParagraphText(p, newText);
    }
    return p;
  });

  return {
    ...cell,
    "w:p":
      updatedParagraphs.length === 1 ? updatedParagraphs[0] : updatedParagraphs,
  };
};
