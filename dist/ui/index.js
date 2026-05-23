// src/ui/index.tsx
import {
  usePluginAction,
  usePluginData
} from "@paperclipai/plugin-sdk/ui";

// src/constants.ts
var ACTION_KEYS = {
  saveSettings: "save-settings",
  approveAction: "approve-action",
  rejectAction: "reject-action"
};
var DATA_KEYS = {
  overview: "overview",
  actionInbox: "action-inbox",
  auditLogs: "audit-logs",
  settings: "settings"
};

// src/ui/index.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var panelStyle = {
  display: "grid",
  gap: 12,
  fontSize: 14,
  lineHeight: 1.5
};
var cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  display: "grid",
  gap: 8
};
var buttonStyle = {
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
  font: "inherit"
};
function MetricCard({ label, value }) {
  return /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
    /* @__PURE__ */ jsx("div", { style: { color: "#6b7280", fontSize: 12 }, children: label }),
    /* @__PURE__ */ jsx("strong", { children: value })
  ] });
}
function MainPage({ context }) {
  const companyId = context.companyId ?? "";
  const { data: overview, loading, error, refresh } = usePluginData(
    DATA_KEYS.overview,
    { companyId }
  );
  const { data: inbox } = usePluginData(DATA_KEYS.actionInbox, { companyId });
  const { data: audit } = usePluginData(DATA_KEYS.auditLogs, { companyId });
  const approve = usePluginAction(ACTION_KEYS.approveAction);
  const reject = usePluginAction(ACTION_KEYS.rejectAction);
  if (loading) return /* @__PURE__ */ jsx("div", { children: "Carregando Meta Ads\u2026" });
  if (error) return /* @__PURE__ */ jsxs("div", { children: [
    "Erro: ",
    error.message
  ] });
  if (!overview) return null;
  return /* @__PURE__ */ jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsx("h2", { style: { margin: 0 }, children: "Meta Ads Performance" }),
    !overview.configured ? /* @__PURE__ */ jsx("div", { style: cardStyle, children: "Configure o token e o Ad Account ID em Settings antes de sincronizar m\xE9tricas." }) : null,
    /* @__PURE__ */ jsxs("section", { style: { display: "grid", gap: 8 }, children: [
      /* @__PURE__ */ jsx("h3", { style: { margin: 0 }, children: "Overview" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }, children: [
        /* @__PURE__ */ jsx(MetricCard, { label: "Spend (7d cache)", value: `$${overview.spend.toFixed(2)}` }),
        /* @__PURE__ */ jsx(MetricCard, { label: "ROAS", value: overview.roas != null ? overview.roas.toFixed(2) : "\u2014" }),
        /* @__PURE__ */ jsx(MetricCard, { label: "CPA", value: overview.cpa != null ? `$${overview.cpa.toFixed(2)}` : "\u2014" }),
        /* @__PURE__ */ jsx(
          MetricCard,
          {
            label: "Pending approvals",
            value: String(overview.pendingApprovals)
          }
        )
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", style: buttonStyle, onClick: () => void refresh(), children: "Refresh" })
    ] }),
    /* @__PURE__ */ jsxs("section", { style: { display: "grid", gap: 8 }, children: [
      /* @__PURE__ */ jsx("h3", { style: { margin: 0 }, children: "Action Inbox" }),
      (inbox?.items ?? []).length === 0 ? /* @__PURE__ */ jsx("div", { style: cardStyle, children: "Nenhuma a\xE7\xE3o pendente." }) : inbox?.items.map((item) => /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("strong", { children: item.actionType }),
          " \u2192 ",
          item.targetId
        ] }),
        /* @__PURE__ */ jsx("div", { children: item.reason ?? "Sem motivo informado" }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              style: buttonStyle,
              onClick: () => void approve({
                companyId,
                actionId: item.id,
                actorUserId: context.userId
              }).then(() => refresh()),
              children: "Aprovar"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              style: { ...buttonStyle, background: "#fff", color: "#111827" },
              onClick: () => void reject({
                companyId,
                actionId: item.id,
                actorUserId: context.userId
              }).then(() => refresh()),
              children: "Recusar"
            }
          )
        ] })
      ] }, item.id))
    ] }),
    /* @__PURE__ */ jsxs("section", { style: { display: "grid", gap: 8 }, children: [
      /* @__PURE__ */ jsx("h3", { style: { margin: 0 }, children: "Audit Logs" }),
      /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 6 }, children: (audit?.items ?? []).slice(0, 20).map((row) => /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("strong", { children: row.event_type }),
          " \xB7 ",
          row.actor_kind,
          row.actor_id ? ` (${row.actor_id})` : ""
        ] }),
        /* @__PURE__ */ jsx("div", { style: { color: "#6b7280", fontSize: 12 }, children: row.created_at })
      ] }, row.id)) })
    ] })
  ] });
}
function SettingsPage({ context }) {
  const companyId = context.companyId ?? "";
  const { data, loading, error, refresh } = usePluginData(DATA_KEYS.settings, {
    companyId
  });
  const saveSettings = usePluginAction(ACTION_KEYS.saveSettings);
  if (loading) return /* @__PURE__ */ jsx("div", { children: "Carregando configura\xE7\xF5es\u2026" });
  if (error) return /* @__PURE__ */ jsxs("div", { children: [
    "Erro: ",
    error.message
  ] });
  return /* @__PURE__ */ jsxs(
    "form",
    {
      style: panelStyle,
      onSubmit: (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const adAccountId = form.elements.namedItem("adAccountId").value;
        const accessTokenSecretRef = form.elements.namedItem("accessTokenSecretRef").value;
        void saveSettings({
          companyId,
          adAccountId,
          accessTokenSecretRef,
          actorUserId: context.userId
        }).then(() => refresh());
      },
      children: [
        /* @__PURE__ */ jsx("h2", { style: { margin: 0 }, children: "Meta Ads Settings" }),
        /* @__PURE__ */ jsxs("label", { style: { display: "grid", gap: 4 }, children: [
          "Ad Account ID",
          /* @__PURE__ */ jsx(
            "input",
            {
              name: "adAccountId",
              defaultValue: data?.adAccountId ?? "",
              placeholder: "1234567890",
              style: { padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("label", { style: { display: "grid", gap: 4 }, children: [
          "Access Token (secret ref)",
          /* @__PURE__ */ jsx(
            "input",
            {
              name: "accessTokenSecretRef",
              defaultValue: data?.accessTokenSecretRef ?? "",
              placeholder: "secret://meta-ads-token",
              style: { padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { style: { color: "#6b7280", fontSize: 12 }, children: data?.hasToken ? "Token configurado." : "Nenhum token salvo ainda." }),
        /* @__PURE__ */ jsx("button", { type: "submit", style: buttonStyle, children: "Salvar" })
      ]
    }
  );
}
export {
  MainPage,
  SettingsPage
};
//# sourceMappingURL=index.js.map
