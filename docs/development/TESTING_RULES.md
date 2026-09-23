# Testing rules

Run the narrowest relevant test suite plus TypeScript/build validation for changed layers. For API or workflow changes, check authorization, transition legality, transaction behavior, and affected client mapping. For migrations/imports, perform a dry run or report before applying and re-run to verify idempotency where appropriate.
