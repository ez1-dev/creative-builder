import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Tenant fixo do "Estrutural Zortéa" — não usar /common nem /organizations.
const EXPECTED_TENANT_ID = "15b289b8-79a4-49f8-93de-904f7e233a25";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const envTenant = Deno.env.get("AZURE_TENANT_ID");
    if (envTenant && envTenant !== EXPECTED_TENANT_ID) {
      console.warn(
        `AZURE_TENANT_ID env (${envTenant}) difere do esperado (${EXPECTED_TENANT_ID}); usando o esperado.`,
      );
    }
    const tenantId = EXPECTED_TENANT_ID;
    const clientId = Deno.env.get("AZURE_CLIENT_ID");
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "AZURE_CLIENT_ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let origin = "";
    try {
      const body = await req.json().catch(() => null);
      origin = body?.origin ?? "";
    } catch { /* ignore */ }
    if (!origin) {
      const url = new URL(req.url);
      origin = url.searchParams.get("origin") ?? "";
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/azure-auth-callback`;

    const stateObj = { n: crypto.randomUUID(), o: origin };
    const state = btoa(JSON.stringify(stateObj));
    const nonce = crypto.randomUUID();

    const authUrl = new URL(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    );
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_mode", "query");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("nonce", nonce);

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
