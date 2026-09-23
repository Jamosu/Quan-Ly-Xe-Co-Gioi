# ADR-0001: Repository-managed shared project memory

- Date: 2026-09-19
- Status: Accepted

## Context

Multiple AI tools and accounts work on the repository. Conversation memory is not durable or shared.

## Decision

The Git repository is the shared project-memory source of truth. `AGENTS.md` and `AI_PROJECT_CONTEXT.md` are entry points; `docs/` stores stable architecture, business, development, and decision material; `.agents/context/` remains the detailed evidence layer. Graphify, if used, is indexing only.

## Consequences

Business changes update the relevant docs in the same change. Agents must validate against source/schema and must not treat model memory or generated indexes as authority.

## Affected modules

All modules and all coding agents.
