CREATE TABLE IF NOT EXISTS queries (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  sql_query  TEXT NOT NULL,
  context    TEXT NOT NULL,
  tags       TEXT[] DEFAULT '{}',
  type       TEXT DEFAULT 'sql',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_queries_title   ON queries USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_queries_context ON queries USING gin(to_tsvector('english', context));

CREATE TABLE IF NOT EXISTS product_owners (
  id SERIAL PRIMARY KEY,
  project_name TEXT NOT NULL,
  owners TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

