import JSZip from "jszip";
import { unzip, zip, getDocumentXml } from "../../src/zip";

describe("ZIP binary preservation", () => {
  it("keeps media files as binary buffers", async () => {
    const inputZip = new JSZip();
    inputZip.file(
      "word/document.xml",
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'
    );
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03,
    ]);
    inputZip.file("word/media/image1.png", pngBytes);

    const archive = await inputZip.generateAsync({ type: "nodebuffer" });
    const files = await unzip(archive);

    expect(typeof files["word/document.xml"]).toBe("string");
    expect(Buffer.isBuffer(files["word/media/image1.png"])).toBe(true);
    expect(getDocumentXml(files)).toContain("<w:document");
  });

  it("round-trips binary files without corruption", async () => {
    const inputZip = new JSZip();
    inputZip.file(
      "word/document.xml",
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'
    );
    const originalBinary = Buffer.from(
      Array.from({ length: 64 }, (_, i) => (i * 7) % 256)
    );
    inputZip.file("word/media/image2.bin", originalBinary);

    const sourceBuffer = await inputZip.generateAsync({ type: "nodebuffer" });
    const unpacked = await unzip(sourceBuffer);
    const rebuiltBuffer = await zip(unpacked);

    const rebuiltZip = await JSZip.loadAsync(rebuiltBuffer);
    const rebuiltBinary = await rebuiltZip.file("word/media/image2.bin")?.async("nodebuffer");

    expect(Buffer.isBuffer(rebuiltBinary)).toBe(true);
    expect(rebuiltBinary?.equals(originalBinary)).toBe(true);
  });
});
