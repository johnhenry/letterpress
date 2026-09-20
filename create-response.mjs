import { createRoute } from "./create-route.mjs";

export const createResponse = (strings, ...substitutions) =>
  createRoute()(strings, ...substitutions)();

export default createResponse;
