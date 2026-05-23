import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";
import { DATA_KEYS, JOB_KEYS, PLUGIN_ID, TOOL_NAMES } from "../src/constants.js";

describe("meta-ads-performance-node", () => {
  it("declares v1 manifest capabilities and tools", () => {
    expect(manifest.id).toBe(PLUGIN_ID);
    expect(manifest.capabilities).toContain("agent.tools.register");
    expect(manifest.capabilities).toContain("database.namespace.migrate");
    expect(manifest.jobs?.map((j) => j.jobKey)).toEqual([
      JOB_KEYS.syncMetaMetrics,
      JOB_KEYS.executeApprovedActions,
    ]);
    expect(manifest.tools?.map((t) => t.name)).toEqual(Object.values(TOOL_NAMES));
  });

  it("registers data handlers and read-only suggest tools", async () => {
    const harness = createTestHarness({
      manifest,
      capabilities: [...manifest.capabilities, "companies.read"],
    });
    await plugin.definition.setup(harness.ctx);

    const overview = await harness.getData(DATA_KEYS.overview, { companyId: "co-1" });
    expect(overview).toMatchObject({ configured: false, pendingApprovals: 0 });

    const suggest = await harness.executeTool(TOOL_NAMES.suggestPause, {
      companyId: "co-1",
      adId: "ad-1",
      reason: "CPA alto",
    });
    expect(suggest.data).toMatchObject({ status: "pending" });
  });
});
