import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_passagens_aereas",
  title: "List air travel records",
  description:
    "List recent air travel (passagens aéreas) records for the signed-in user, honoring row-level security. Supports simple filters and a row limit.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe("Maximum number of rows to return (1-200)."),
    colaborador: z
      .string()
      .trim()
      .optional()
      .describe("Optional case-insensitive substring to filter by collaborator name."),
    since: z
      .string()
      .optional()
      .describe(
        "Optional ISO date (YYYY-MM-DD). Only records with data_registro >= this date are returned.",
      ),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, colaborador, since }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Not authenticated" }],
        isError: true,
      };
    }

    let query = supabaseForUser(ctx)
      .from("passagens_aereas")
      .select("*")
      .order("data_registro", { ascending: false })
      .limit(limit);

    if (colaborador) query = query.ilike("colaborador", `%${colaborador}%`);
    if (since) query = query.gte("data_registro", since);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [
        {
          type: "text",
          text: `Returned ${data?.length ?? 0} record(s).`,
        },
      ],
      structuredContent: { rows: data ?? [] },
    };
  },
});
