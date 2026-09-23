---
name: graphify
description: Maintain an optional Graphify index of the Fleet repository without treating it as the source of truth.
---

# Graphify index

The repository files, schema, migrations, and shared-memory documents are authoritative. First check whether this repository already has Graphify configuration and whether the CLI is available; do not install Graphify, add global configuration, or upload repository data without explicit authorization.

If configured, keep generated output in `graphify-out/` and exclude secrets, `.env*`, dependencies, build output, caches, and generated binaries. Use the index only to navigate; confirm conclusions against source before editing. If unavailable, report the missing integration and a proposed repository-local command rather than fabricating an index.

