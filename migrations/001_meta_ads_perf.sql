CREATE TABLE plugin_meta_ads_perf_c52e71910d.metrics_cache (
  id uuid PRIMARY KEY,
  company_id text NOT NULL,
  ad_account_id text NOT NULL,
  campaign_id text,
  adset_id text,
  ad_id text,
  metric_hour timestamptz NOT NULL,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  conversions numeric NOT NULL DEFAULT 0,
  cpa numeric,
  roas numeric,
  ctr numeric,
  frequency numeric,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, ad_account_id, metric_hour, campaign_id, adset_id, ad_id)
);

CREATE INDEX metrics_cache_company_hour_idx
  ON plugin_meta_ads_perf_c52e71910d.metrics_cache (company_id, metric_hour DESC);

CREATE TABLE plugin_meta_ads_perf_c52e71910d.action_queue (
  id uuid PRIMARY KEY,
  company_id text NOT NULL,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  target_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  suggested_by_agent_id text,
  approved_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz
);

CREATE INDEX action_queue_company_status_idx
  ON plugin_meta_ads_perf_c52e71910d.action_queue (company_id, status, created_at DESC);

CREATE TABLE plugin_meta_ads_perf_c52e71910d.audit_logs (
  id uuid PRIMARY KEY,
  company_id text NOT NULL,
  action_queue_id uuid REFERENCES plugin_meta_ads_perf_c52e71910d.action_queue(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  actor_kind text NOT NULL,
  actor_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_company_created_idx
  ON plugin_meta_ads_perf_c52e71910d.audit_logs (company_id, created_at DESC);
