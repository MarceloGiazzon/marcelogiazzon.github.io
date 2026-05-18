# NPDev Schema Contract Pack

Web Checkpoint 001 added a static schema contract pack for the NPDev artifact generator. Web Checkpoint 002 keeps that pack and adds Safe Beta0 contract enforcement on top of it.

## Detected Paths

- Workspace root: `D:\WorkSpace\NPDev`
- Product repo: `D:\WorkSpace\NPDev\NPDev_General`
- Static site root: `D:\WorkSpace\NPDev\marcelogiazzon.github.io`
- Worker root: `D:\WorkSpace\NPDev\npdev-ai-proxy`

The workspace root is a clean container only. Contract files live under the static site subfolder in `contracts/`.

## Public Contract Source

The public schema source used for this pack is:

- `D:\WorkSpace\NPDev\NPDev_General\NPDevContract\schemas\config.schema.json`
- `D:\WorkSpace\NPDev\NPDev_General\NPDevContract\schemas\model.schema.json`
- `D:\WorkSpace\NPDev\NPDev_General\NPDevContract\schemas\manifest.schema.json`

`manifest.schema.json` was found and copied, so manifest validation can be guided by the real schema contract. Browser validation in this checkpoint remains `lightweight-contract-validation`; it does not claim full JSON Schema validation.

## Inspected Alternate Schema Locations

These locations were inspected and recorded in `contracts/npdev-contract-manifest.json`:

- `NPDevContract\dsl\resources\Schemas\config.schema.json`
- `NPDevContract\dsl\resources\Schemas\model.schema.json`
- `NPDevContract\dsl\src\main\resources\schema\model.schema.json`
- `NPDevContract\schemas\archive\config-1.0.schema.json`
- `NPDevContract\schemas\archive\model-1.0.0.schema.json`
- `NPDevContract\schemas\authoring\config.schema.json`
- `NPDevContract\schemas\authoring\model.schema.json`

The static site uses `NPDevContract\schemas` as the public contract source because it contains the current public config, model, and manifest schemas.

## Contract Files

- `contracts/config.schema.json`
- `contracts/model.schema.json`
- `contracts/manifest.schema.json`
- `contracts/artifact-bundle.schema.json`
- `contracts/npdev-contract-manifest.json`

The manifest records SHA-256 hashes for copied and generated schemas, the selected paths, the product repo git head, missing schemas, and alternate source inspection results.

## Browser Behavior

The site loads the contract pack from relative paths, displays load status, git head, copied schema names, hashes, and missing schemas. The Gemini prompt includes schema metadata plus compact schema excerpts and instructs Gemini that `config.json`, `model.json`, `manifest.json`, and the outer artifact bundle must match the loaded contracts.

Validation remains lightweight for this checkpoint. It checks required outer fields, required artifacts, core config/model/manifest sections, path safety, JSON-object content for JSON artifacts, schema-pack metadata, manifest `inputFiles` consistency, and Safe Beta0 hard-fail rules.

Safe Beta0 violations are errors, not warnings. They include `reference`, `enum`, `datetime`, `search-dialog`, `now()`, `assign`, `findById`, `findAll`, `delete`, object-shaped `emitEvent.payload`, and expected active CRUD endpoints under `/api/v1`.

The active outer bundle schema is now `npdev-static-generator-artifact-bundle.v4`. Responses using the older `npdev-static-generator-artifact-bundle.v2` schema are invalid.
