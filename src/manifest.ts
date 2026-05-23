import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  EXPORT_NAMES,
  JOB_KEYS,
  PAGE_ROUTE,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SLOT_IDS,
  TOOL_NAMES,
} from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Meta Ads Performance Manager",
  description:
    "Meta Ads monitoring, metrics cache, agent tools, and human-in-the-loop campaign actions.",
  author: "CUS",
  categories: ["connector", "automation"],
  capabilities: [
    "companies.read",
    "agent.tools.register",
    "database.namespace.migrate",
    "database.namespace.read",
    "database.namespace.write",
    "http.outbound",
    "jobs.schedule",
    "plugin.state.read",
    "plugin.state.write",
    "secrets.read-ref",
    "ui.page.register",
    "instance.settings.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  database: {
    namespaceSlug: "meta_ads_perf",
    migrationsDir: "migrations",
  },
  jobs: [
    {
      jobKey: JOB_KEYS.syncMetaMetrics,
      displayName: "Sync Meta metrics",
      description: "Hourly pull of spend, CPA, ROAS into metrics_cache.",
      schedule: "0 * * * *",
    },
    {
      jobKey: JOB_KEYS.executeApprovedActions,
      displayName: "Execute approved actions",
      description: "Processes approved action_queue items against Meta Marketing API.",
      schedule: "* * * * *",
    },
  ],
  tools: [
    {
      name: TOOL_NAMES.getCampaignMetrics,
      displayName: "Get campaign metrics",
      description: "Returns cached or live campaign performance (CPA, ROAS, Spend).",
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
    {
      name: TOOL_NAMES.identifyFatigue,
      displayName: "Identify ad fatigue",
      description: "Returns CTR and frequency history for an ad set.",
      parametersSchema: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          adsetId: { type: "string" },
        },
        required: ["companyId", "adsetId"],
      },
    },
    {
      name: TOOL_NAMES.suggestPause,
      displayName: "Suggest pause ad",
      description: "Queues a pause request for human approval (never writes to Meta directly).",
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
    {
      name: TOOL_NAMES.suggestBudgetChange,
      displayName: "Suggest budget change",
      description: "Queues a budget change for human approval.",
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
  ],
  ui: {
    slots: [
      {
        type: "page",
        id: SLOT_IDS.mainPage,
        displayName: "Meta Ads",
        exportName: EXPORT_NAMES.mainPage,
        routePath: PAGE_ROUTE,
      },
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "Meta Ads Settings",
        exportName: EXPORT_NAMES.settingsPage,
      },
    ],
  },
};

export default manifest;
