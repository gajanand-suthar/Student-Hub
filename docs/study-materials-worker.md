# TEMPORARY: deploy this guide, then delete it

> Apply the migration and deploy the Worker routes below, then remove this
> guide and `migrations/0001_study_materials.md` from the repository if they
> are no longer needed as deployment records.

# Study materials Worker contract

The frontend calls two authenticated endpoints. Add these to the Cloudflare
Worker that is configured by `js/config.js`; the Worker source is not part of
this repository.

## Authentication and authorization

1. Verify the existing `X-Identity-Token`/`Authorization` token using the
   same middleware used by the other protected `/api/*` routes.
2. Resolve `studentId`, `name`, and `semester` from the verified identity or
   trusted student record. Never use client-provided author or semester data.
3. Reject missing/invalid semester with `401` or `403`. This is what makes the
   same-semester boundary enforceable.

## `GET /api/study-materials`

Return only records belonging to the caller's resolved semester, newest first:

```sql
SELECT id, title, description, url, author_name AS authorName,
       created_at AS createdAt
FROM study_materials
WHERE semester = ?
ORDER BY created_at DESC
LIMIT 100;
```

Response: `{ "materials": [...] }`. Do not return `author_id`, profile photo,
or data from other semesters.

## `POST /api/study-materials`

Accept JSON only: `{ "title", "description", "url" }`. Trim values; enforce
the length limits in the migration; parse the URL with `new URL(url)` and allow
only `http:` or `https:`. Reject any other fields as non-authoritative. Insert
the verified student's ID, name, and semester alongside a generated UUID.

Return `201` with the newly created public fields. The application stores only
the external URL and metadata; it must not download, proxy, upload, or retain
the linked file.

## Deploy

Apply [`migrations/0001_study_materials.md`](../migrations/0001_study_materials.md)
to the Worker D1 database, deploy the two routes with the existing Worker, and
ensure its CORS middleware permits the production Student Hub origin and the
existing authentication headers.
