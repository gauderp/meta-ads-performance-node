import { definePlugin, runWorker, type PluginContext } from "@paperclipai/plugin-sdk";
import {
  ACTION_KEYS,
  DATA_KEYS,
  JOB_KEYS,
  TOOL_NAMES,
} from "./constants.js";
import {
  getOverviewMetrics,
  insertAuditLog,
  listApprovedActions,
  listAuditLogs,
  listPendingActions,
  loadAdsConfig,
  markActionStatus,
  queueAction,
  saveAdsConfig,
  upsertMetricsSnapshot,
} from "./db.js";
import { executeApprovedMetaAction, fetchAccountInsights, fetchAdsetFatigue } from "./meta-api.js";

function requireCompanyId(params: Record<string, unknown>): string {
  const companyId = typeof params.companyId === "string" ? params.companyId.trim() : "";
  if (!companyId) throw new Error("companyId is required");
  return companyId;
}

async function syncCompanyMetrics(ctx: PluginContext, companyId: string) {
  const config = await loadAdsConfig(ctx, companyId);
  if (!config) return;
  const insights = await fetchAccountInsights(ctx, companyId, "today");
  if (!insights) return;
  const hour = new Date();
  hour.setMinutes(0, 0, 0);
  await upsertMetricsSnapshot(ctx, {
    companyId,
    adAccountId: config.adAccountId,
    metricHour: hour,
    spend: insights.spend,
    impressions: insights.impressions,
    conversions: insights.conversions,
    cpa: insights.cpa,
    roas: insights.roas,
    raw: insights,
  });
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register(DATA_KEYS.overview, async (params) => {
      const companyId = requireCompanyId(params as Record<string, unknown>);
      const [metrics, pending] = await Promise.all([
        getOverviewMetrics(ctx, companyId),
        listPendingActions(ctx, companyId),
      ]);
      const configured = Boolean(await loadAdsConfig(ctx, companyId));
      return {
        configured,
        spend: Number(metrics.spend),
        conversions: Number(metrics.conversions),
        impressions: Number(metrics.impressions),
        roas: metrics.roas ? Number(metrics.roas) : null,
        cpa: metrics.cpa ? Number(metrics.cpa) : null,
        pendingApprovals: pending.length,
      };
    });

    ctx.data.register(DATA_KEYS.actionInbox, async (params) => {
      const companyId = requireCompanyId(params as Record<string, unknown>);
      const rows = await listPendingActions(ctx, companyId);
      return {
        items: rows.map((row) => ({
          id: row.id,
          actionType: row.action_type,
          status: row.status,
          targetId: row.target_id,
          payload: row.payload,
          reason: row.reason,
          suggestedByAgentId: row.suggested_by_agent_id,
          createdAt: row.created_at,
        })),
      };
    });

    ctx.data.register(DATA_KEYS.auditLogs, async (params) => {
      const companyId = requireCompanyId(params as Record<string, unknown>);
      const rows = await listAuditLogs(ctx, companyId);
      return { items: rows };
    });

    ctx.data.register(DATA_KEYS.settings, async (params) => {
      const companyId = requireCompanyId(params as Record<string, unknown>);
      const config = await loadAdsConfig(ctx, companyId);
      return {
        adAccountId: config?.adAccountId ?? "",
        hasToken: Boolean(config?.accessTokenSecretRef),
        accessTokenSecretRef: config?.accessTokenSecretRef ?? "",
      };
    });

    ctx.actions.register(ACTION_KEYS.saveSettings, async (params) => {
      const companyId = requireCompanyId(params as Record<string, unknown>);
      const adAccountId = String(params.adAccountId ?? "").trim();
      const accessTokenSecretRef = String(params.accessTokenSecretRef ?? "").trim();
      if (!adAccountId || !accessTokenSecretRef) {
        throw new Error("adAccountId and accessTokenSecretRef are required");
      }
      await saveAdsConfig(ctx, companyId, { adAccountId, accessTokenSecretRef });
      await insertAuditLog(ctx, {
        companyId,
        eventType: "settings.updated",
        actorKind: "user",
        actorId: typeof params.actorUserId === "string" ? params.actorUserId : null,
      });
      return { ok: true };
    });

    ctx.actions.register(ACTION_KEYS.approveAction, async (params) => {
      const companyId = requireCompanyId(params as Record<string, unknown>);
      const actionId = String(params.actionId ?? "");
      const actorUserId = typeof params.actorUserId === "string" ? params.actorUserId : null;
      if (!actionId) throw new Error("actionId is required");
      await markActionStatus(ctx, {
        id: actionId,
        companyId,
        status: "approved",
        approvedByUserId: actorUserId ?? undefined,
      });
      await insertAuditLog(ctx, {
        companyId,
        actionQueueId: actionId,
        eventType: "action.approved",
        actorKind: "user",
        actorId: actorUserId,
      });
      return { ok: true };
    });

    ctx.actions.register(ACTION_KEYS.rejectAction, async (params) => {
      const companyId = requireCompanyId(params as Record<string, unknown>);
      const actionId = String(params.actionId ?? "");
      const actorUserId = typeof params.actorUserId === "string" ? params.actorUserId : null;
      if (!actionId) throw new Error("actionId is required");
      await markActionStatus(ctx, { id: actionId, companyId, status: "rejected" });
      await insertAuditLog(ctx, {
        companyId,
        actionQueueId: actionId,
        eventType: "action.rejected",
        actorKind: "user",
        actorId: actorUserId,
      });
      return { ok: true };
    });

    ctx.tools.register(
      TOOL_NAMES.getCampaignMetrics,
      {
        displayName: "Get campaign metrics",
        description: "Returns campaign performance metrics for the connected ad account.",
        parametersSchema: {
          type: "object",
          properties: {
            companyId: { type: "string" },
            timeRange: { type: "string", enum: ["today", "last_7d", "last_30d"] },
            kpis: { type: "array", items: { type: "string" } },
          },
          required: ["companyId", "timeRange"],
        },
      },
      async (params) => {
        const companyId = requireCompanyId(params as Record<string, unknown>);
        const timeRange = (params as { timeRange?: string }).timeRange ?? "last_7d";
        if (!["today", "last_7d", "last_30d"].includes(timeRange)) {
          throw new Error("Invalid timeRange");
        }
        const live = await fetchAccountInsights(
          ctx,
          companyId,
          timeRange as "today" | "last_7d" | "last_30d",
        );
        if (live) {
          return { content: "Live Meta insights", data: live };
        }
        const cached = await getOverviewMetrics(ctx, companyId);
        return {
          content: "Cached metrics (configure Meta token for live data)",
          data: cached,
        };
      },
    );

    ctx.tools.register(
      TOOL_NAMES.identifyFatigue,
      {
        displayName: "Identify ad fatigue",
        description: "Returns CTR and frequency trend for an ad set.",
        parametersSchema: {
          type: "object",
          properties: {
            companyId: { type: "string" },
            adsetId: { type: "string" },
          },
          required: ["companyId", "adsetId"],
        },
      },
      async (params) => {
        const companyId = requireCompanyId(params as Record<string, unknown>);
        const adsetId = String((params as { adsetId?: string }).adsetId ?? "");
        if (!adsetId) throw new Error("adsetId is required");
        const fatigue = await fetchAdsetFatigue(ctx, companyId, adsetId);
        return { content: "Ad set fatigue analysis", data: fatigue };
      },
    );

    ctx.tools.register(
      TOOL_NAMES.suggestPause,
      {
        displayName: "Suggest pause ad",
        description: "Queues an ad pause for human approval.",
        parametersSchema: {
          type: "object",
          properties: {
            companyId: { type: "string" },
            adId: { type: "string" },
            reason: { type: "string" },
            suggestedByAgentId: { type: "string" },
          },
          required: ["companyId", "adId", "reason"],
        },
      },
      async (params) => {
        const p = params as Record<string, unknown>;
        const queued = await queueAction(ctx, {
          companyId: requireCompanyId(p),
          actionType: "pause_ad",
          targetId: String(p.adId ?? ""),
          payload: { adId: p.adId },
          reason: String(p.reason ?? ""),
          suggestedByAgentId:
            typeof p.suggestedByAgentId === "string" ? p.suggestedByAgentId : undefined,
        });
        return {
          content: "Pause suggestion queued for human approval",
          data: queued,
        };
      },
    );

    ctx.tools.register(
      TOOL_NAMES.suggestBudgetChange,
      {
        displayName: "Suggest budget change",
        description: "Queues a campaign budget change for human approval.",
        parametersSchema: {
          type: "object",
          properties: {
            companyId: { type: "string" },
            campaignId: { type: "string" },
            newBudget: { type: "number" },
            reason: { type: "string" },
            suggestedByAgentId: { type: "string" },
          },
          required: ["companyId", "campaignId", "newBudget", "reason"],
        },
      },
      async (params) => {
        const p = params as Record<string, unknown>;
        const queued = await queueAction(ctx, {
          companyId: requireCompanyId(p),
          actionType: "budget_change",
          targetId: String(p.campaignId ?? ""),
          payload: {
            campaignId: p.campaignId,
            newBudget: Number(p.newBudget),
          },
          reason: String(p.reason ?? ""),
          suggestedByAgentId:
            typeof p.suggestedByAgentId === "string" ? p.suggestedByAgentId : undefined,
        });
        return {
          content: "Budget change queued for human approval",
          data: queued,
        };
      },
    );

    ctx.jobs.register(JOB_KEYS.syncMetaMetrics, async () => {
      const companies = await ctx.companies.list();
      for (const company of companies) {
        try {
          await syncCompanyMetrics(ctx, company.id);
        } catch (error) {
          ctx.logger.warn("Meta metrics sync failed", {
            companyId: company.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });

    ctx.jobs.register(JOB_KEYS.executeApprovedActions, async () => {
      const approved = await listApprovedActions(ctx);
      for (const row of approved) {
        try {
          const payload =
            typeof row.payload === "object" && row.payload !== null
              ? (row.payload as Record<string, unknown>)
              : {};
          await executeApprovedMetaAction(ctx, {
            companyId: row.company_id,
            actionType: row.action_type,
            targetId: row.target_id,
            payload,
          });
          await markActionStatus(ctx, {
            id: row.id,
            companyId: row.company_id,
            status: "completed",
          });
          await insertAuditLog(ctx, {
            companyId: row.company_id,
            actionQueueId: row.id,
            eventType: "action.executed",
            actorKind: "system",
            details: { actionType: row.action_type, targetId: row.target_id },
          });
        } catch (error) {
          await markActionStatus(ctx, {
            id: row.id,
            companyId: row.company_id,
            status: "failed",
          });
          ctx.logger.error("Failed to execute approved Meta action", {
            actionId: row.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });
  },

  async onHealth() {
    return { status: "ok", message: "Meta Ads Performance Node worker is running" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
