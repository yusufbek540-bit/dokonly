-- Persist seller CRM notes and tags on customers
alter table customers
add column if not exists crm jsonb not null default '{"tags": [], "notes": []}'::jsonb;
