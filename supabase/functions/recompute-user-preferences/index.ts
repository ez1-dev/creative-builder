import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Daily job: aggregates each active user's search history into
 * user_preferences (favorite modules + frequent filters per module).
 * Triggered by pg_cron at 03:00.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Window: last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await admin
      .from("user_search_history")
      .select("user_id, module, filters, created_at")
      .gte("created_at", since);

    if (error) throw error;

    // Aggregate per user
    type UserAgg = {
      moduleCounts: Map<string, number>;
      filtersByModule: Map<string, Map<string, { filters: any; count: number }>>;
      hourCounts: Map<number, number>;
    };
    const perUser = new Map<string, UserAgg>();

    for (const row of rows || []) {
      if (!row.user_id) continue;
      let agg = perUser.get(row.user_id);
      if (!agg) {
        agg = {
          moduleCounts: new Map(),
          filtersByModule: new Map(),
          hourCounts: new Map(),
        };
        perUser.set(row.user_id, agg);
      }
      agg.moduleCounts.set(row.module, (agg.moduleCounts.get(row.module) || 0) + 1);

      if (!agg.filtersByModule.has(row.module)) {
        agg.filtersByModule.set(row.module, new Map());
      }
      const map = agg.filtersByModule.get(row.module)!;
      const key = JSON.stringify(row.filters || {});
      const ex = map.get(key);
      if (ex) ex.count++;
      else map.set(key, { filters: row.filters, count: 1 });

      try {
        const h = new Date(row.created_at).getHours();
        agg.hourCounts.set(h, (agg.hourCounts.get(h) || 0) + 1);
      } catch {}
    }

    let upserted = 0;
    for (const [userId, agg] of perUser) {
      const favorite_modules = Array.from(agg.moduleCounts.entries())
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const frequent_filters: Record<string, any> = {};
      for (const [mod, map] of agg.filtersByModule) {
        const top = Array.from(map.values())
          .filter((f) => f.count >= 3) // recurring only
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        if (top.length) frequent_filters[mod] = top;
      }

      // Preferred time band from hourCounts
      let preferred_period: string | null = null;
      if (agg.hourCounts.size) {
        const sorted = Array.from(agg.hourCounts.entries()).sort(
          (a, b) => b[1] - a[1]
        );
        const peakHour = sorted[0][0];
        if (peakHour < 12) preferred_period = "manha";
        else if (peakHour < 18) preferred_period = "tarde";
        else preferred_period = "noite";
      }

      const { error: upErr } = await admin
        .from("user_preferences")
        .upsert(
          {
            user_id: userId,
            favorite_modules,
            frequent_filters,
            preferred_period,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upErr) {
        console.error("upsert failed for", userId, upErr);
      } else {
        upserted++;
      }
    }

    // Cleanup old history (>30 days)
    await admin.rpc("cleanup_old_search_history").catch((e) => {
      console.warn("cleanup_old_search_history failed:", e);
    });

    return new Response(
      JSON.stringify({
        ok: true,
        users_processed: perUser.size,
        users_upserted: upserted,
        rows_analyzed: rows?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("recompute-user-preferences error:", e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
