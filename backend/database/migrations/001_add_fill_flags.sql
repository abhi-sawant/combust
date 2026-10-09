-- Adds partial-fill support to an existing database (cPanel > phpMyAdmin > SQL).
-- Existing rows default to full-tank fills with no missed fill-up, which matches
-- how they were treated before, so their mileage is unchanged.

ALTER TABLE fuel_entries
  ADD COLUMN is_full_tank TINYINT(1) NOT NULL DEFAULT 1 AFTER litres_filled,
  ADD COLUMN missed_previous TINYINT(1) NOT NULL DEFAULT 0 AFTER is_full_tank;
