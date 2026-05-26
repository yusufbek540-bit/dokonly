-- Mass mailings table
CREATE TABLE IF NOT EXISTS mass_mailings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft',  -- draft | sending | sent | failed
    recipient_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mailings_tenant ON mass_mailings(tenant_id);
