# TEMPORARY: apply this migration, then delete this file

> This is a one-time D1 deployment aid. After the migration has been applied
> and recorded in the Worker deployment process, remove this file and the
> companion `docs/study-materials-worker.md` guide if you do not want to retain
> operational instructions in the frontend repository.

Run the following against the D1 database used by the authenticated Student Hub
Worker:

```sql
CREATE TABLE IF NOT EXISTS study_materials (
  id TEXT PRIMARY KEY,
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 1000),
  url TEXT NOT NULL CHECK (length(url) BETWEEN 1 AND 2048),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS study_materials_semester_created_idx
  ON study_materials (semester, created_at DESC);
```

The Worker must derive `semester`, `author_id`, and `author_name` from the
verified identity token; do not accept those values from the browser.
