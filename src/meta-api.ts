import type { PluginContext } from "@paperclipai/plugin-sdk";
import type { AdsConfig } from "./constants.js";
import { loadAdsConfig, resolveAccessToken } from "./db.js";

// facebook-nodejs-business-sdk ships without strict TS types in this environment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MetaSdk = any;

async function loadMetaSdk(): Promise<MetaSdk> {
  return import("facebook-nodejs-business-sdk");
}

export type MetaInsights = {
  spend: number;
  impressions: number;
  conversions: number;
  cpa: number | null;
  roas: number | null;
};

function parseNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getMetaClient(
  ctx: PluginContext,
  companyId: string,
): Promise<{ config: AdsConfig; api: MetaSdk } | null> {
  const config = await loadAdsConfig(ctx, companyId);
  if (!config) return null;
  const token = await resolveAccessToken(ctx, config);
  const sdk = await loadMetaSdk();
  const api = sdk.FacebookAdsApi.init(token);
  return { config, api };
}

export async function fetchAccountInsights(
  ctx: PluginContext,
  companyId: string,
  timeRange: "today" | "last_7d" | "last_30d",
): Promise<MetaInsights | null> {
  const client = await getMetaClient(ctx, companyId);
  if (!client) return null;

  const sdk = await loadMetaSdk();
  const datePreset =
    timeRange === "today" ? "today" : timeRange === "last_7d" ? "last_7d" : "last_30d";

  const account = new sdk.AdAccount(`act_${client.config.adAccountId.replace(/^act_/, "")}`);
  const insights = await account.getInsights(
    ["spend", "impressions", "actions", "purchase_roas"],
    { date_preset: datePreset, level: "account" },
  );

  const row = insights[0];
  if (!row) {
    return { spend: 0, impressions: 0, conversions: 0, cpa: null, roas: null };
  }

  const spend = parseNumber(row.spend);
  const impressions = parseNumber(row.impressions);
  const actions = Array.isArray(row.actions) ? row.actions : [];
  const conversions = actions
    .filter((a: { action_type?: string }) => a.action_type === "purchase")
    .reduce((sum: number, a: { value?: string }) => sum + parseNumber(a.value), 0);
  const roasValues = Array.isArray(row.purchase_roas) ? row.purchase_roas : [];
  const roas = roasValues.length > 0 ? parseNumber(roasValues[0]?.value) : null;
  const cpa = conversions > 0 ? spend / conversions : null;

  return { spend, impressions, conversions, cpa, roas };
}

export async function fetchAdsetFatigue(
  ctx: PluginContext,
  companyId: string,
  adsetId: string,
): Promise<{ ctr: number | null; frequency: number | null; history: unknown[] } | null> {
  const client = await getMetaClient(ctx, companyId);
  if (!client) return null;

  const sdk = await loadMetaSdk();
  const adset = new sdk.AdSet(adsetId);
  const insights = await adset.getInsights(["ctr", "frequency"], {
    date_preset: "last_14d",
  });

  const history = insights.map((row: { ctr?: string; frequency?: string; date_start?: string }) => ({
    date: row.date_start,
    ctr: parseNumber(row.ctr),
    frequency: parseNumber(row.frequency),
  }));
  const latest = history[history.length - 1];
  return {
    ctr: latest?.ctr ?? null,
    frequency: latest?.frequency ?? null,
    history,
  };
}

export async function executeApprovedMetaAction(
  ctx: PluginContext,
  input: {
    companyId: string;
    actionType: string;
    targetId: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  const client = await getMetaClient(ctx, input.companyId);
  if (!client) throw new Error("Meta Ads is not configured for this company");

  const sdk = await loadMetaSdk();

  if (input.actionType === "pause_ad") {
    const ad = new sdk.Ad(input.targetId);
    await ad.update([], { status: "PAUSED" });
    return;
  }

  if (input.actionType === "budget_change") {
    const campaign = new sdk.Campaign(input.targetId);
    const budget = Number(input.payload.newBudget);
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error("Invalid budget in approved action payload");
    }
    await campaign.update([], { daily_budget: Math.round(budget * 100) });
    return;
  }

  throw new Error(`Unsupported action type: ${input.actionType}`);
}
