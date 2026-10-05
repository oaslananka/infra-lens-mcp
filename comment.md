## Summary

Successfully aligned the `linkify-it` governed override with markdown-it 14.3.x compatibility by changing it from `6.1.0` to `5.0.2`.

### Changes made:
- **dependency-overrides.json**: Updated `linkify-it` version to `5.0.2` while preserving all metadata (owner, reason, upstream advisory GHSA-v245-v573-v5vm, reviewBy)
- **pnpm-workspace.yaml**: Updated `linkify-it` override to `5.0.2`
- **pnpm-lock.yaml**: Regenerated deterministically with `pnpm install --no-frozen-lockfile`

### Verification (all passing):
- `pnpm install --frozen-lockfile` ✓
- `pnpm run docs:api:check` ✓
- `pnpm run check:licenses` ✓
- `pnpm run check:overrides` ✓
- `pnpm run lint` ✓
- `pnpm run test:coverage` ✓ (169 tests passed, 93.31% statement coverage)
- `pnpm run build` ✓
- `pnpm audit --audit-level high` ✓ (No known vulnerabilities)
- `pre-commit run --all-files` ✓

The `markdown-it 14.3.2` override and all other security upgrades remain unchanged.