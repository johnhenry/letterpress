import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import theresWaldo from "theres-waldo";

export const dynamicRun = async (code, directory) => {
  const tempFileName = `temp-${randomUUID()}.mjs`;
  const tempFilePath = path.join(directory, tempFileName);

  try {
    await fs.writeFile(tempFilePath, code);
    const importedModule = await import(tempFilePath);
    await fs.unlink(tempFilePath);
    return importedModule;
  } catch (error) {
    await fs.unlink(tempFilePath);
    throw error;
  }
};

export default dynamicRun;
