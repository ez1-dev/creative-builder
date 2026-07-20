import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MCP_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

export default function ConnectAgentPage() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(MCP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conectar assistente de IA</h1>
        <p className="text-muted-foreground mt-2">
          Conecte o HUB de Gestão ao ChatGPT ou Claude para consultar seus dados por conversa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>URL do servidor MCP</CardTitle>
          <CardDescription>Copie este endereço — você vai colar dentro do ChatGPT ou Claude.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/40 font-mono text-sm break-all">
            <span className="flex-1">{MCP_URL}</span>
            <Button size="sm" variant="secondary" onClick={copy} className="shrink-0">
              {copied ? <><Check className="h-4 w-4 mr-1" /> Copiado</> : <><Copy className="h-4 w-4 mr-1" /> Copiar</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Você será solicitado a entrar com sua conta do HUB de Gestão e aprovar o acesso. O assistente enxerga apenas o que suas permissões permitem.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">ChatGPT <Badge variant="outline">Developer mode</Badge></CardTitle>
            <CardDescription>Requer conta com acesso a conectores personalizados.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside text-sm">
            <li>
              Abra{" "}
              <a
                href="https://chatgpt.com/#settings/Connectors/Advanced"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                Configurações → Conectores → Avançado <ExternalLink className="h-3 w-3" />
              </a>{" "}
              e ative o <strong>Developer mode</strong> (leia o aviso de risco exibido).
            </li>
            <li>No campo de mensagem, clique no botão <strong>+</strong> e ative o Developer mode.</li>
            <li>Clique em <strong>Add sources</strong> e depois em <strong>Connect more</strong>.</li>
            <li>Dê um nome ao conector (ex.: <em>HUB de Gestão</em>) e cole a URL do MCP acima.</li>
            <li>Aprove a autorização e volte à conversa — peça algo como “liste minhas passagens aéreas recentes”.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Claude</CardTitle>
          <CardDescription>Disponível em planos com conectores personalizados.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside text-sm">
            <li>
              Abra{" "}
              <a
                href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                Conectores do Claude <ExternalLink className="h-3 w-3" />
              </a>.
            </li>
            <li>Dê um nome ao conector (ex.: <em>HUB de Gestão</em>) e cole a URL do MCP acima.</li>
            <li>No compositor da conversa, ative o conector e faça uma pergunta usando os dados do Sapiens.</li>
          </ol>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Precisa de outro cliente compatível com MCP? Use a mesma URL — o fluxo de autenticação é padrão OAuth 2.1.
      </p>
    </div>
  );
}
