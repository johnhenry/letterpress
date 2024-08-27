import { createFSRouter } from "../fs-router.mjs";
import path from "path";
import serve from "leserve";
import theresWaldo from "theres-waldo";
const { dir } = theresWaldo(import.meta.url);
const router = createFSRouter(path.join(dir, "routes"));
serve({ port: 8000 }, router);
