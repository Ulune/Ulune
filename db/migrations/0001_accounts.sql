-- Ulune's synced account, version 1: the tables (docs/sync-protocol.md, section 13).
-- Share and compare plan, feature 4. Postgres on Neon, Frankfurt (decision A2).
--
-- Every date is a whole day since 1970-01-01 (UTC): no time of day, no IP address and no user
-- agent is ever stored. Every blob, wrap and name is sealed on a device; the server cannot open any.
-- Applied once, in one transaction (scripts/account-migrate.mjs, or pasted into Neon's SQL editor).
-- Never edit a migration once applied: add the next numbered file.

CREATE TABLE schema_migrations (
  version integer PRIMARY KEY,
  day integer NOT NULL
);

-- An account: a random id and its counters; nothing about the person.
CREATE TABLE accounts (
  id bytea PRIMARY KEY CHECK (length(id) = 16),
  created_day integer NOT NULL,
  seen_day integer NOT NULL,
  -- The last version handed out to a record of this account.
  seq bigint NOT NULL DEFAULT 0 CHECK (seq >= 0),
  -- Tombstones at or below this version may have been purged (a cursor below it must list everything again).
  floor bigint NOT NULL DEFAULT 0 CHECK (floor >= 0),
  -- The live records' blob bytes and count, kept within the quotas by these checks.
  bytes bigint NOT NULL DEFAULT 0,
  records integer NOT NULL DEFAULT 0,
  quota_bytes bigint NOT NULL,
  quota_records integer NOT NULL,
  CONSTRAINT accounts_quota_bytes CHECK (bytes <= quota_bytes),
  CONSTRAINT accounts_quota_records CHECK (records <= quota_records)
);
CREATE INDEX accounts_seen ON accounts (seen_day);
CREATE INDEX accounts_created ON accounts (created_day);

-- The ways in: a passkey's public key, or a passphrase's or recovery code's scrypt hash, and the
-- data key wrapped on a device for that way in.
CREATE TABLE ways (
  account_id bytea NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  id bytea NOT NULL CHECK (length(id) = 16),
  kind text NOT NULL CHECK (kind IN ('passkey', 'passphrase', 'recovery')),
  -- A passkey's credential id, or a recovery code's lookup.
  lookup bytea CHECK (lookup IS NULL OR length(lookup) BETWEEN 1 AND 1023),
  public_key bytea,
  alg integer,
  counter bigint,
  client_salt bytea,
  argon_m integer,
  argon_t integer,
  argon_p integer,
  server_salt bytea,
  auth_hash bytea,
  wrap bytea NOT NULL CHECK (length(wrap) BETWEEN 40 AND 256),
  created_day integer NOT NULL,
  used_day integer,
  PRIMARY KEY (account_id, id),
  CONSTRAINT ways_passkey CHECK (
    kind <> 'passkey'
    OR (lookup IS NOT NULL AND public_key IS NOT NULL AND alg IS NOT NULL AND alg IN (-7, -8, -257) AND counter IS NOT NULL AND counter >= 0)
  ),
  CONSTRAINT ways_passphrase CHECK (
    kind <> 'passphrase'
    OR (lookup IS NULL AND COALESCE(length(client_salt), 0) = 16 AND argon_m IS NOT NULL AND argon_t IS NOT NULL AND argon_p IS NOT NULL
      AND COALESCE(length(server_salt), 0) = 16 AND COALESCE(length(auth_hash), 0) = 32)
  ),
  CONSTRAINT ways_recovery CHECK (
    kind <> 'recovery'
    OR (COALESCE(length(lookup), 0) = 16 AND COALESCE(length(server_salt), 0) = 16 AND COALESCE(length(auth_hash), 0) = 32)
  )
);
CREATE UNIQUE INDEX ways_lookup ON ways (kind, lookup) WHERE lookup IS NOT NULL;
CREATE UNIQUE INDEX ways_one_secret ON ways (account_id, kind) WHERE kind IN ('passphrase', 'recovery');

-- The devices: a random id, the device key's public half, a name sealed on a device.
CREATE TABLE devices (
  account_id bytea NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  id bytea NOT NULL CHECK (length(id) = 16),
  public_key bytea NOT NULL CHECK (length(public_key) BETWEEN 64 AND 128),
  name bytea CHECK (name IS NULL OR length(name) = 128),
  created_day integer NOT NULL,
  seen_day integer NOT NULL,
  PRIMARY KEY (account_id, id)
);

-- The records: an opaque name (a keyed hash made on a device), a version, a sealed blob of one of the
-- six bucket sizes, or none for a tombstone.
CREATE TABLE records (
  account_id bytea NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  rid bytea NOT NULL CHECK (length(rid) = 16),
  version bigint NOT NULL CHECK (version > 0),
  deleted boolean NOT NULL,
  blob bytea,
  size integer NOT NULL,
  changed_day integer NOT NULL,
  PRIMARY KEY (account_id, rid),
  CONSTRAINT records_blob CHECK (
    (deleted AND blob IS NULL AND size = 0)
    OR (NOT deleted AND blob IS NOT NULL AND size = length(blob) AND size IN (8192, 16384, 32768, 65536, 131072, 262144))
  )
);
CREATE UNIQUE INDEX records_version ON records (account_id, version);
CREATE INDEX records_tombstones ON records (changed_day) WHERE deleted;
-- Sealed bytes do not compress: keep them out of line without trying.
ALTER TABLE records ALTER COLUMN blob SET STORAGE EXTERNAL;

-- Challenges spent: a nonce, the day. A challenge's expiry is inside its token, never here.
CREATE TABLE spent (
  nonce bytea PRIMARY KEY CHECK (length(nonce) = 16),
  day integer NOT NULL
);
CREATE INDEX spent_day ON spent (day);

-- Device links (adding a device by QR code): ephemeral public keys, the new device's key, the data key
-- sealed for it. Deleted once taken or closed, and the next day at the latest.
CREATE TABLE links (
  id bytea PRIMARY KEY CHECK (length(id) = 16),
  day integer NOT NULL,
  opener text NOT NULL CHECK (opener IN ('giver', 'taker')),
  account_id bytea REFERENCES accounts (id) ON DELETE CASCADE,
  giver_epk bytea CHECK (giver_epk IS NULL OR length(giver_epk) = 65),
  taker_epk bytea CHECK (taker_epk IS NULL OR length(taker_epk) = 65),
  taker_key bytea CHECK (taker_key IS NULL OR length(taker_key) BETWEEN 64 AND 128),
  sealed bytea CHECK (sealed IS NULL OR length(sealed) BETWEEN 64 AND 2048),
  device_id bytea CHECK (device_id IS NULL OR length(device_id) = 16)
);
CREATE INDEX links_day ON links (day);

INSERT INTO schema_migrations (version, day) VALUES (1, (floor(extract(epoch FROM now()) / 86400))::integer);
