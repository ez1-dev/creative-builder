import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listPassagensAereasTool from "./tools/list-passagens-aereas";

// Must be the direct Supabase host, never the Cloud proxy. Built from the
// project ref that Vite inlines at build time, so this stays import-safe.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "sapiens-erp-mcp",
  title: "Sapiens ERP",
  version: "0.1.0",
  instructions:
    "Tools for the Sapiens Control Center ERP. Use `echo` to verify connectivity, and `list_passagens_aereas` to read air travel records for the signed-in user (respects row-level security).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, listPassagensAereasTool],
});
