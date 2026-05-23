import { randomUUID } from "node:crypto";
import type { PluginContext } from "@paperclipai/plugin-sdk";
import type { ActionQueueStatus, ActionQueueType, AdsConfig } from "./constants.js";

const CONFIG_STATE_KEY = "ads-config";

export function tables(namespace: string) {
  return {
    metricsCache: `${namespace}.metrics_cache`,
    actionQueue: `${namespace}.action_queue`,
    auditLogs: `${namespace}.audit_logs`,
  };
}

export async function loadAdsConfig(
  ctx: PluginContext,
  companyId: string,
): Promise<AdsConfig | null> {
  const value = (await ctx.state.get({
    scopeKind: "company",
    scopeId: companyId,
    namespace: "meta-ads",
    stateKey: CONFIG_STATE_KEY,
  })) as AdsConfig | null;
  if (!value?.adAccountId || !value.accessTokenSecretRef) return null;
  return value;
}

export async function saveAdsConfig(
  ctx: PluginContext,
  companyId: string,
  config: AdsConfig,
): Promise<void> {
  await ctx.state.set(
    {
      scopeKind: "company",
      scopeId: companyId,
      namespace: "meta-ads",
      stateKey: CONFIG_STATE_KEY,
    },
    config,
  );
}

export async function resolveAccessToken(
  ctx: PluginContext,
  config: AdsConfig,
): Promise<string> {
  return ctx.secrets.resolve(config.accessTokenSecretRef);
}

export async function insertAuditLog(
  ctx: PluginContext,
  input: {
    companyId: string;
    actionQueueId?: string | null;
    eventType: string;
    actorKind: "user" | "agent" | "system";
    actorId?: string | null;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const t = tables(ctx.db.namespace);
  await ctx.db.execute(
    `INSERT INTO ${t.auditLogs} (id, company_id, action_queue_id, event_type, actor_kind, actor_id, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      randomUUID(),
      input.companyId,
      input.actionQueueId ?? null,
      input.eventType,
      input.actorKind,
      input.actorId ?? null,
      JSON.stringify(input.details ?? {}),
    ],
  );
}

export async function queueAction(
  ctx: PluginContext,
  input: {
    companyId: string;
    actionType: ActionQueueType;
    targetId: string;
    payload: Record<string, unknown>;
    reason?: string;
    suggestedByAgentId?: string;
  },
): Promise<{ id: string; status: ActionQueueStatus }> {
  const t = tables(ctx.db.namespace);
  const id = randomUUID();
  await ctx.db.execute(
    `INSERT INTO ${t.actionQueue}
      (id, company_id, action_type, status, target_id, payload, reason, suggested_by_agent_id)
     VALUES ($1, $2, $3, 'pending', $4, $5::jsonb, $6, $7)`,
    [
      id,
      input.companyId,
      input.actionType,
      input.targetId,
      JSON.stringify(input.payload),
      input.reason ?? null,
      input.suggestedByAgentId ?? null,
    ],
  );
  await insertAuditLog(ctx, {
    companyId: input.companyId,
    actionQueueId: id,
    eventType: "action.suggested",
    actorKind: input.suggestedByAgentId ? "agent" : "system",
    actorId: input.suggestedByAgentId ?? null,
    details: { actionType: input.actionType, targetId: input.targetId },
  });
  return { id, status: "pending" };
}

export async function listPendingActions(ctx: PluginContext, companyId: string) {
  const t = tables(ctx.db.namespace);
  return ctx.db.query<{
    id: string;
    action_type: string;
    status: string;
    target_id: string;
    payload: unknown;
    reason: string | null;
    suggested_by_agent_id: string | null;
    created_at: string;
  }>(
    `SELECT id, action_type, status, target_id, payload, reason, suggested_by_agent_id, created_at
     FROM ${t.actionQueue}
     WHERE company_id = $1 AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 100`,
    [companyId],
  );
}

export async function listAuditLogs(ctx: PluginContext, companyId: string) {
  const t = tables(ctx.db.namespace);
  return ctx.db.query<{
    id: string;
    event_type: string;
    actor_kind: string;
    actor_id: string | null;
    details: unknown;
    created_at: string;
  }>(
    `SELECT id, event_type, actor_kind, actor_id, details, created_at
     FROM ${t.auditLogs}
     WHERE company_id = $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [companyId],
  );
}

export async function getOverviewMetrics(ctx: PluginContext, companyId: string) {
  const t = tables(ctx.db.namespace);
  const rows = await ctx.db.query<{
    spend: string;
    conversions: string;
    impressions: string;
    roas: string | null;
    cpa: string | null;
  }>(
    `SELECT
       COALESCE(SUM(spend), 0) AS spend,
       COALESCE(SUM(conversions), 0) AS conversions,
       COALESCE(SUM(impressions), 0) AS impressions,
       AVG(roas) AS roas,
       AVG(cpa) AS cpa
     FROM ${t.metricsCache}
     WHERE company_id = $1 AND metric_hour >= now() - interval '7 days'`,
    [companyId],
  );
  return rows[0] ?? { spend: "0", conversions: "0", impressions: "0", roas: null, cpa: null };
}

export async function upsertMetricsSnapshot(
  ctx: PluginContext,
  input: {
    companyId: string;
    adAccountId: string;
    metricHour: Date;
    spend: number;
    impressions: number;
    conversions: number;
    cpa?: number | null;
    roas?: number | null;
    raw?: Record<string, unknown>;
  },
): Promise<void> {
  const t = tables(ctx.db.namespace);
  await ctx.db.execute(
    `INSERT INTO ${t.metricsCache}
      (id, company_id, ad_account_id, metric_hour, spend, impressions, conversions, cpa, roas, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     ON CONFLICT (company_id, ad_account_id, metric_hour, campaign_id, adset_id, ad_id)
     DO UPDATE SET
       spend = EXCLUDED.spend,
       impressions = EXCLUDED.impressions,
       conversions = EXCLUDED.conversions,
       cpa = EXCLUDED.cpa,
       roas = EXCLUDED.roas,
       raw = EXCLUDED.raw`,
    [
      randomUUID(),
      input.companyId,
      input.adAccountId,
      input.metricHour.toISOString(),
      input.spend,
      input.impressions,
      input.conversions,
      input.cpa ?? null,
      input.roas ?? null,
      JSON.stringify(input.raw ?? {}),
    ],
  );
}

export async function listApprovedActions(ctx: PluginContext) {
  const t = tables(ctx.db.namespace);
  return ctx.db.query<{
    id: string;
    company_id: string;
    action_type: string;
    target_id: string;
    payload: unknown;
    approved_by_user_id: string | null;
  }>(
    `SELECT id, company_id, action_type, target_id, payload, approved_by_user_id
     FROM ${t.actionQueue}
     WHERE status = 'approved'
     ORDER BY updated_at ASC
     LIMIT 20`,
  );
}

export async function markActionStatus(
  ctx: PluginContext,
  input: {
    id: string;
    companyId: string;
    status: ActionQueueStatus;
    approvedByUserId?: string;
  },
): Promise<void> {
  const t = tables(ctx.db.namespace);
  await ctx.db.execute(
    `UPDATE ${t.actionQueue}
     SET status = $1,
         approved_by_user_id = COALESCE($2, approved_by_user_id),
         updated_at = now(),
         executed_at = CASE WHEN $1 IN ('completed', 'failed') THEN now() ELSE executed_at END
     WHERE id = $3 AND company_id = $4`,
    [input.status, input.approvedByUserId ?? null, input.id, input.companyId],
  );
}
