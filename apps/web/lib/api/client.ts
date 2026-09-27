import createClient from "openapi-fetch";
import type { paths } from "./schema";

// Typed against openapi.yaml: wrong paths, bodies or response fields fail typecheck.
export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
});
