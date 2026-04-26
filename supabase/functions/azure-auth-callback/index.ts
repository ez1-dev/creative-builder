import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

// Decodifica payload de JWT (sem validar assinatura — validamos issuer/aud/tid/exp manualmente)
function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(padded + "==".slice(0, (4 - (padded.length % 4)) % 4));
  return JSON.parse(json);
}

function htmlError(message: string, origin: string): Response {
  const safeOrigin = origin || "/";
  const body = `<!doctype html><html><head><meta charset="utf-8"><title>Erro de autenticação</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#1e293b;padding:2rem;border-radius:8px;max-width:480px;text-align:center}
a{color:#60a5fa}</style></head><body><div class="box">
<h2>Falha no login Microsoft</h2><p>${message}</p>
<p><a href="${safeOrigin}/login">Voltar para a tela de login</a></p>
</div></body></html>`;
  return new Response(body, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  let appOrigin = "";
  try {
    if (stateRaw) {
      const decoded = JSON.parse(atob(stateRaw));
      appOrigin = decoded.o || "";
    }
  } catch { /* ignore */ }

  if (errorParam) {
    return htmlError(`${errorParam}: ${errorDesc ?? ""}`, appOrigin);
  }
  if (!code) return htmlError("Código de autorização ausente.", appOrigin);

  // Tenant fixo do "Estrutural Zortéa" — não usar /common nem /organizations.
  const EXPECTED_TENANT_ID = "15b289b8-79a4-49f8-93de-904f7e233a25";
  const envTenant = Deno.env.get("AZURE_TENANT_ID");
  if (envTenant && envTenant !== EXPECTED_TENANT_ID) {
    console.warn(
      `AZURE_TENANT_ID env (${envTenant}) difere do esperado (${EXPECTED_TENANT_ID}); usando o esperado.`,
    );
  }
  const tenantId = EXPECTED_TENANT_ID;
  const clientId = Deno.env.get("AZURE_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!clientId || !clientSecret) {
    return htmlError("Configuração Azure ausente no servidor.", appOrigin);
  }

  const redirectUri = `${supabaseUrl}/functions/v1/azure-auth-callback`;

  // 1. Trocar code por tokens
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "openid email profile",
      }),
    },
  );
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return htmlError(`Falha na troca de token: ${txt}`, appOrigin);
  }
  const tokenJson = await tokenRes.json() as { id_token?: string };
  if (!tokenJson.id_token) return htmlError("id_token ausente na resposta do Azure.", appOrigin);

  // 2. Validar id_token (claims básicos)
  let claims: Record<string, unknown>;
  try {
    claims = decodeJwtPayload(tokenJson.id_token);
  } catch {
    return htmlError("id_token inválido.", appOrigin);
  }

  if (claims.tid !== tenantId) return htmlError("Tenant não autorizado.", appOrigin);
  if (claims.aud !== clientId) return htmlError("Audience inválido.", appOrigin);
  const expectedIss1 = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const expectedIss2 = `https://sts.windows.net/${tenantId}/`;
  if (claims.iss !== expectedIss1 && claims.iss !== expectedIss2) {
    return htmlError("Issuer inválido.", appOrigin);
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp === "number" && claims.exp < now) {
    return htmlError("Token expirado.", appOrigin);
  }

  const email = (claims.email || claims.preferred_username || claims.upn) as string | undefined;
  const name = (claims.name || claims.preferred_username) as string | undefined;
  if (!email) return htmlError("E-mail não encontrado no token Microsoft.", appOrigin);
  const emailLower = email.toLowerCase();

  // 3. Criar/encontrar usuário no Supabase Auth
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // listUsers não filtra por email, então paginamos buscando o email
  let userId: string | null = null;
  try {
    // Tentar por listagem paginada (até 1000 usuários)
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list?.users?.find((u) => (u.email ?? "").toLowerCase() === emailLower);
    if (found) userId = found.id;
  } catch (_) { /* ignore */ }

  if (!userId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: emailLower,
      email_confirm: true,
      user_metadata: { provider: "azure", name },
    });
    if (createErr || !created.user) {
      return htmlError(`Falha ao criar usuário: ${createErr?.message ?? "desconhecido"}`, appOrigin);
    }
    userId = created.user.id;
  }

  // 4. Gerar magic link e redirecionar para o app
  const finalRedirect = appOrigin ? `${appOrigin}/auth/callback` : `${supabaseUrl}/auth/v1/verify`;
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: emailLower,
    options: { redirectTo: finalRedirect },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return htmlError(`Falha ao gerar link de sessão: ${linkErr?.message ?? "desconhecido"}`, appOrigin);
  }

  return Response.redirect(linkData.properties.action_link, 302);
});
