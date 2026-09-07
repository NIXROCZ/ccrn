-- Gift cards are valid for three years from issue, the Australian statutory
-- minimum under the Australian Consumer Law.
--
-- Existing rows keep NULL. They were sold under terms that said the balance
-- never expires, so every check below reads NULL as "no expiry" rather than
-- retrospectively expiring a card somebody already paid for.
ALTER TABLE gift_cards ADD COLUMN expires_at TEXT;
CREATE INDEX IF NOT EXISTS idx_gift_cards_expiry ON gift_cards(expires_at);
