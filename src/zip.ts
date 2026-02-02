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

// Patterns for identifying header and footer files
const HEADER_PATTERN = /^word\/header\d+\.xml$/;
const FOOTER_PATTERN = /^word\/footer\d+\.xml$/;

/**
 * Get all header files from the docx
 * @param files - DocxFiles object
 * @returns Record of header filenames to their XML content
 */
export const getHeaderFiles = (files: DocxFiles): Record<string, string> => {
  return Object.entries(files)
    .filter(([name]) => HEADER_PATTERN.test(name))
    .reduce((acc, [name, content]) => ({ ...acc, [name]: content }), {});
};

/**
 * Get all footer files from the docx
 * @param files - DocxFiles object
 * @returns Record of footer filenames to their XML content
 */
export const getFooterFiles = (files: DocxFiles): Record<string, string> => {
  return Object.entries(files)
    .filter(([name]) => FOOTER_PATTERN.test(name))
    .reduce((acc, [name, content]) => ({ ...acc, [name]: content }), {});
};

/**
 * Update multiple XML files at once
 * @param updates - Record of filenames to their new XML content
 * @returns Function that takes DocxFiles and returns updated DocxFiles
 */
export const updateMultipleXmlFiles =
  (updates: Record<string, string>) =>
  (files: DocxFiles): DocxFiles => ({
    ...files,
    ...updates,
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
