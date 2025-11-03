import { readFile as fsReadFile } from "fs/promises";
import { existsSync } from "fs";

export const readFile = async (filePath: string): Promise<Buffer> => {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return await fsReadFile(filePath);
};

export const readBuffer = (buffer: Buffer): Buffer => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Invalid buffer provided");
  }
  return buffer;
};

export const read = async (source: string | Buffer): Promise<Buffer> => {
  if (Buffer.isBuffer(source)) {
    return readBuffer(source);
  }
  return await readFile(source);
};
