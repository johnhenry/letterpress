import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import theresWaldo from "theres-waldo";

export const dynamicRun = async (code, directory) => {
  const tempFileName = `temp-${randomUUID()}.mjs`;
  const tempFilePath = path.join(directory, tempFileName);

  let written = false;
  try {
    await fs.writeFile(tempFilePath, code);
    written = true;
    const importedModule = await import(tempFilePath);
    // Best-effort cleanup: a failure to unlink here must not mask a
    // successful import, nor leave the caller without its result.
    await fs.unlink(tempFilePath).catch(() => {});
    return importedModule;
  } catch (error) {
    // Only attempt cleanup if the file was actually written - otherwise
    // (e.g. writeFile itself failed because the directory isn't writable)
    // this unlink would throw its own ENOENT and mask the real error.
    if (written) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
    throw error;
  }
};

export default dynamicRun;
