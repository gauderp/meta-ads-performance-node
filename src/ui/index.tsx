import {
  usePluginAction,
  usePluginData,
  type PluginPageProps,
  type PluginSettingsPageProps,
} from "@paperclipai/plugin-sdk/ui";
import type React from "react";
import { ACTION_KEYS, DATA_KEYS } from "../constants.js";

type OverviewData = {
  configured: boolean;
  spend: number;
  conversions: number;
  impressions: number;
  roas: number | null;
  cpa: number | null;
  pendingApprovals: number;
};

type InboxData = {
  items: Array<{
    id: string;
    actionType: string;
    status: string;
    targetId: string;
    reason: string | null;
    createdAt: string;
  }>;
};

type AuditData = {
  items: Array<{
    id: string;
    event_type: string;
    actor_kind: string;
    actor_id: string | null;
    created_at: string;
  }>;
};

type SettingsData = {
  adAccountId: string;
  hasToken: boolean;
  accessTokenSecretRef: string;
};

const panelStyle = {
  display: "grid",
  gap: 12,
  fontSize: 14,
  lineHeight: 1.5,
} satisfies React.CSSProperties;

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  display: "grid",
  gap: 8,
} satisfies React.CSSProperties;

const buttonStyle = {
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
  font: "inherit",
} satisfies React.CSSProperties;

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ color: "#6b7280", fontSize: 12 }}>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

export function MainPage({ context }: PluginPageProps) {
  const companyId = context.companyId ?? "";
  const { data: overview, loading, error, refresh } = usePluginData<OverviewData>(
    DATA_KEYS.overview,
    { companyId },
  );
  const { data: inbox } = usePluginData<InboxData>(DATA_KEYS.actionInbox, { companyId });
  const { data: audit } = usePluginData<AuditData>(DATA_KEYS.auditLogs, { companyId });
  const approve = usePluginAction(ACTION_KEYS.approveAction);
  const reject = usePluginAction(ACTION_KEYS.rejectAction);

  if (loading) return <div>Carregando Meta Ads…</div>;
  if (error) return <div>Erro: {error.message}</div>;
  if (!overview) return null;

  return (
    <div style={panelStyle}>
      <h2 style={{ margin: 0 }}>Meta Ads Performance</h2>
      {!overview.configured ? (
        <div style={cardStyle}>
          Configure o token e o Ad Account ID em Settings antes de sincronizar métricas.
        </div>
      ) : null}

      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Overview</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          <MetricCard label="Spend (7d cache)" value={`$${overview.spend.toFixed(2)}`} />
          <MetricCard label="ROAS" value={overview.roas != null ? overview.roas.toFixed(2) : "—"} />
          <MetricCard label="CPA" value={overview.cpa != null ? `$${overview.cpa.toFixed(2)}` : "—"} />
          <MetricCard
            label="Pending approvals"
            value={String(overview.pendingApprovals)}
          />
        </div>
        <button type="button" style={buttonStyle} onClick={() => void refresh()}>
          Refresh
        </button>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Action Inbox</h3>
        {(inbox?.items ?? []).length === 0 ? (
          <div style={cardStyle}>Nenhuma ação pendente.</div>
        ) : (
          inbox?.items.map((item) => (
            <div key={item.id} style={cardStyle}>
              <div>
                <strong>{item.actionType}</strong> → {item.targetId}
              </div>
              <div>{item.reason ?? "Sem motivo informado"}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() =>
                    void approve({
                      companyId,
                      actionId: item.id,
                      actorUserId: context.userId,
                    }).then(() => refresh())
                  }
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  style={{ ...buttonStyle, background: "#fff", color: "#111827" }}
                  onClick={() =>
                    void reject({
                      companyId,
                      actionId: item.id,
                      actorUserId: context.userId,
                    }).then(() => refresh())
                  }
                >
                  Recusar
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Audit Logs</h3>
        <div style={{ display: "grid", gap: 6 }}>
          {(audit?.items ?? []).slice(0, 20).map((row) => (
            <div key={row.id} style={cardStyle}>
              <div>
                <strong>{row.event_type}</strong> · {row.actor_kind}
                {row.actor_id ? ` (${row.actor_id})` : ""}
              </div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>{row.created_at}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SettingsPage({ context }: PluginSettingsPageProps) {
  const companyId = context.companyId ?? "";
  const { data, loading, error, refresh } = usePluginData<SettingsData>(DATA_KEYS.settings, {
    companyId,
  });
  const saveSettings = usePluginAction(ACTION_KEYS.saveSettings);

  if (loading) return <div>Carregando configurações…</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <form
      style={panelStyle}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const adAccountId = (form.elements.namedItem("adAccountId") as HTMLInputElement).value;
        const accessTokenSecretRef = (form.elements.namedItem("accessTokenSecretRef") as HTMLInputElement)
          .value;
        void saveSettings({
          companyId,
          adAccountId,
          accessTokenSecretRef,
          actorUserId: context.userId,
        }).then(() => refresh());
      }}
    >
      <h2 style={{ margin: 0 }}>Meta Ads Settings</h2>
      <label style={{ display: "grid", gap: 4 }}>
        Ad Account ID
        <input
          name="adAccountId"
          defaultValue={data?.adAccountId ?? ""}
          placeholder="1234567890"
          style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }}
        />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        Access Token (secret ref)
        <input
          name="accessTokenSecretRef"
          defaultValue={data?.accessTokenSecretRef ?? ""}
          placeholder="secret://meta-ads-token"
          style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }}
        />
      </label>
      <div style={{ color: "#6b7280", fontSize: 12 }}>
        {data?.hasToken ? "Token configurado." : "Nenhum token salvo ainda."}
      </div>
      <button type="submit" style={buttonStyle}>
        Salvar
      </button>
    </form>
  );
}
