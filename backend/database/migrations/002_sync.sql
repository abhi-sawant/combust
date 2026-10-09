-- Adds two-way sync support (cPanel > phpMyAdmin > SQL).
--   updated_at : client-reported last-edit time (epoch ms), used for last-write-wins
--   deleted_at : tombstone time (epoch ms); NULL while the row is live
--   synced_at  : server time (epoch ms) the row was last written; the pull cursor

ALTER TABLE vehicles
  ADD COLUMN updated_at BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN deleted_at BIGINT NULL,
  ADD COLUMN synced_at BIGINT NOT NULL DEFAULT 0,
  ADD INDEX idx_vehicles_user_synced (user_id, synced_at);

ALTER TABLE fuel_entries
  ADD COLUMN updated_at BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN deleted_at BIGINT NULL,
  ADD COLUMN synced_at BIGINT NOT NULL DEFAULT 0,
  ADD INDEX idx_entries_synced (synced_at);

UPDATE vehicles SET updated_at = UNIX_TIMESTAMP(created_at) * 1000, synced_at = UNIX_TIMESTAMP() * 1000;
UPDATE fuel_entries fe JOIN vehicles v ON v.id = fe.vehicle_id
  SET fe.updated_at = UNIX_TIMESTAMP(v.created_at) * 1000, fe.synced_at = UNIX_TIMESTAMP() * 1000;
