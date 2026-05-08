-- Sticker IDs changed from integers (1–980) to string codes (MEX1, FWC3, CC1…)
-- Old integer data is incompatible with the new format.
UPDATE stickers SET owned = '[]'::jsonb, updated_at = NOW();
