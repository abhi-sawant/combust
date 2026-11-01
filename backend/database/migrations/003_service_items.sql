-- Adds the service / part-replacement tracker (cPanel > phpMyAdmin > SQL).
-- Synced like fuel_entries: LWW on updated_at, tombstones in deleted_at, pull cursor on synced_at.

CREATE TABLE IF NOT EXISTS service_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  vehicle_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  last_changed_date DATE NULL,
  last_changed_odometer DOUBLE NULL,
  interval_km INT NULL,
  interval_months INT NULL,
  notes TEXT NULL,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NULL,
  synced_at BIGINT NOT NULL DEFAULT 0,
  INDEX idx_service_items_synced (synced_at),
  INDEX idx_service_items_vehicle (vehicle_id),
  CONSTRAINT fk_service_items_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
