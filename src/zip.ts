import JSZip from "jszip";
import type { DocxFiles } from "./types.js";

export const unzip = async (buffer: Buffer): Promise<DocxFiles> => {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const files: DocxFiles = {};

    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        files[filename] = await file.async("text");
      }
    }

    return files;
  } catch (error) {
    throw new Error(`Failed to unzip file: ${error}`);
  }
};

export const getDocumentXml = (files: DocxFiles): string => {
  const documentXml = files["word/document.xml"];
  if (!documentXml) {
    throw new Error("Invalid .docx file: word/document.xml not found");
  }
  return documentXml;
};

export const getRelationsXml = (files: DocxFiles): string => {
  return files["word/_rels/document.xml.rels"] || "";
};

export const updateDocumentXml =
  (documentXml: string) =>
  (files: DocxFiles): DocxFiles => ({
    ...files,
    "word/document.xml": documentXml,
  });

export const zip = async (files: DocxFiles): Promise<Buffer> => {
  try {
    const jszip = new JSZip();

    for (const [filename, content] of Object.entries(files)) {
      jszip.file(filename, content);
    }

    return await jszip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });
  } catch (error) {
    throw new Error(`Failed to zip files: ${error}`);
  }
};
