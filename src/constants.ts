export const PLUGIN_ID = "meta-ads-performance-node";
export const PLUGIN_VERSION = "1.0.0";
export const DB_NAMESPACE_SLUG = "meta_ads_perf";

export const JOB_KEYS = {
  syncMetaMetrics: "sync_meta_metrics",
  executeApprovedActions: "execute_approved_actions",
} as const;

export const TOOL_NAMES = {
  getCampaignMetrics: "ads:get_campaign_metrics",
  identifyFatigue: "ads:identify_fatigue",
  suggestPause: "ads:suggest_pause",
  suggestBudgetChange: "ads:suggest_budget_change",
} as const;

export const ACTION_KEYS = {
  saveSettings: "save-settings",
  approveAction: "approve-action",
  rejectAction: "reject-action",
} as const;

export const DATA_KEYS = {
  overview: "overview",
  actionInbox: "action-inbox",
  auditLogs: "audit-logs",
  settings: "settings",
} as const;

export const PAGE_ROUTE = "/plugins/meta-ads-performance";

export const EXPORT_NAMES = {
  mainPage: "MainPage",
  settingsPage: "SettingsPage",
} as const;

export const SLOT_IDS = {
  mainPage: "meta-ads-main",
  settingsPage: "meta-ads-settings",
} as const;

export type AdsConfig = {
  adAccountId: string;
  accessTokenSecretRef: string;
};

export type ActionQueueStatus = "pending" | "approved" | "rejected" | "completed" | "failed";

export type ActionQueueType = "pause_ad" | "budget_change";
