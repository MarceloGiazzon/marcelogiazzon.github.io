'use strict';

const $ = (id) => document.getElementById(id);

const state = {
  lastPrompt: '',
  lastRaw: '',
  lastBundle: null,
  lastFiles: [],
  lastValidation: null,
  schemaPack: {
    status: 'loading',
    manifest: null,
    schemas: {},
    errors: []
  }
};

const SITE_BUILD_LABEL = 'Safe Beta0 Prompt Size Control 003';
const CONTRACT_MODE = 'Safe Beta0';
const PROMPT_CONTRACT_VERSION = 'NPDEV_PRECISE_FORMAT_GUIDE v4';
const ARTIFACT_BUNDLE_SCHEMA_VERSION = 'npdev-static-generator-artifact-bundle.v4';
const VALIDATION_MODE = 'lightweight-contract-validation';
const PROXY_PROMPT_LIMIT_BYTES = 30000;
const PROXY_REQUEST_WARN_BYTES = 24000;

const SCHEMA_PACK_PATHS = {
  manifest: 'contracts/npdev-contract-manifest.json',
  config: 'contracts/config.schema.json',
  model: 'contracts/model.schema.json',
  manifestSchema: 'contracts/manifest.schema.json',
  artifactBundle: 'contracts/artifact-bundle.schema.json'
};

const SCHEMA_PROMPT_CHAR_LIMITS = {
  'artifact-bundle.schema.json': 6500,
  'config.schema.json': 6500,
  'model.schema.json': 14000,
  'manifest.schema.json': 3000
};

const SAFE_BETA0_RESTRICTIONS = [
  'no reference fields',
  'no enum fields',
  'no datetime fields',
  'no search-dialog widgets',
  'no now() expressions',
  'no assign flow steps',
  'no findById operations or steps',
  'no findAll operations or steps',
  'no delete operations or steps',
  'no object-shaped emitEvent.payload',
  'no CRUD endpoints under /api/v1'
];

const SAFE_BETA0_ALLOWED_FIELD_TYPES = ['string', 'uuid', 'integer', 'decimal', 'boolean', 'date'];
const SAFE_BETA0_ALLOWED_WIDGETS = ['text', 'textarea', 'checkbox', 'date', 'email'];
const SAFE_BETA0_ALLOWED_CAPABILITY_OPS = ['save'];
const SAFE_BETA0_ALLOWED_FLOW_STEPS = ['enforceInvariants', 'capabilityCall', 'emitEvent', 'return'];

const REQUIRED_ARTIFACT_PATHS = [
  'config.json',
  'model.json',
  'manifest.json',
  'expected-behavior.md',
  'expected-endpoints.md',
  'generation-notes.md'
];

const OPTIONAL_ARTIFACT_PATHS = [
  'generation-notes.md',
  'input/example-request.json'
];

const NPDEV_RESPONSE_SCHEMA_HINT = {
  schemaVersion: ARTIFACT_BUNDLE_SCHEMA_VERSION,
  project: {
    name: 'string',
    scenarioId: 'kebab-case-string',
    objective: 'string',
    assumptions: ['string'],
    warnings: ['string']
  },
  artifacts: [
    {
      path: 'config.json',
      content: {
        $schema: 'contracts/config.schema.json',
        configVersion: '1.0',
        scenario: {
          name: 'kebab-case-scenario-id',
          description: 'string',
          outputRoot: '..\\\\Output'
        },
        generator: {
          failIfModelMissing: true,
          failIfConfigMissing: true,
          cleanOutputBeforeGenerate: true,
          emitPluginAssets: true,
          emitRuntimeAssets: true,
          emitUiAssets: true
        },
        bootstrap: {
          root: '..\\\\..\\\\NPDevRuntimeHost',
          mergeStrategy: 'clean-copy'
        },
        artifact: {
          root: '..\\\\Output\\\\ArtifactNP',
          generatedFolderName: 'npdev-generated',
          libsFolderName: 'libs',
          metaFolderName: 'npdev-meta'
        },
        finalExec: {
          root: '..\\\\Output\\\\App',
          deleteBeforeMount: true
        },
        database: {
          provider: 'docker-postgres',
          host: 'localhost',
          port: 5432,
          database: 'scenario_database_name',
          username: 'finalexec',
          password: 'finalexec',
          adminDatabase: 'postgres',
          resetMode: 'reset',
          containerName: 'npdev-scenario-id'
        },
        runtime: {
          springProfile: 'dev,step0,trial',
          serverPort: 8083,
          javaArgs: [],
          gradleTask: 'bootRun'
        },
        trialDefaults: {
          apiKey: 'dev-key',
          recommendedProfiles: 'dev,step0,trial',
          runtimeUrl: 'http://localhost:8083/',
          databaseMode: 'step0-h2',
          pluginDiscoveryMode: 'filesystem-folder',
          pluginPackageDirectory: './npdev-generated/src/main/resources/npdev/plugin-packages',
          notes: ['string']
        }
      }
    },
    {
      path: 'model.json',
      content: {
        $schema: 'contracts/model.schema.json',
        namespace: 'trial.example',
        dslVersion: '1.0.0',
        version: '1.0',
        metadata: {
          purpose: 'string'
        },
        concepts: [
          {
            name: 'PascalCaseConcept',
            ui: {
              label: 'Human label'
            },
            fields: [
              {
                name: 'camelCaseField',
                type: 'uuid|string|integer|decimal|boolean|date',
                id: true,
                required: true,
                ui: {
                  label: 'Human label',
                  widget: 'text|textarea|checkbox|date|email'
                }
              }
            ],
            invariants: [
              {
                name: 'PascalCaseRuleName',
                expr: "fieldName != null && fieldName != ''"
              }
            ]
          }
        ],
        capabilities: [
          {
            name: 'persistence',
            type: 'PersistenceCapability',
            operations: ['save']
          }
        ],
        bindings: [
          {
            capability: 'persistence',
            adapter: 'repository'
          },
          {
            capability: 'eventBus',
            adapter: 'inproc'
          }
        ],
        events: [
          {
            name: 'PascalCaseEvent',
            payload: [
              { name: 'id', type: 'uuid' }
            ]
          }
        ],
        flows: [
          {
            name: 'PascalCaseFlowName',
            input: {
              concept: 'PascalCaseConcept',
              mode: 'create'
            },
            steps: [
              {
                name: 'validate-input',
                type: 'enforceInvariants',
                scope: 'PascalCaseConcept',
                invariants: ['PascalCaseRuleName']
              },
              {
                name: 'save-record',
                type: 'capabilityCall',
                cap: 'persistence',
                op: 'save',
                args: ['$input'],
                out: '$saved'
              },
              {
                name: 'return-record',
                type: 'return',
                value: '$saved'
              }
            ]
          }
        ]
      }
    },
    {
      path: 'manifest.json',
      content: {
        id: 'scenario-id',
        title: 'Human title',
        complexity: 'simple|medium|tenant',
        mainFlow: 'PascalCaseFlowName',
        purpose: 'string',
        businessStory: 'string',
        features: ['concept', 'invariants', 'persistence', 'event', 'trace'],
        inputFiles: ['input/example-request.json'],
        walkthrough: ['string'],
        expectedOutcomes: ['string']
      }
    },
    {
      path: 'expected-behavior.md',
      content: '# Expected Behavior\\n\\n...'
    },
    {
      path: 'expected-endpoints.md',
      content: '# Expected Endpoints\\n\\n...'
    },
    {
      path: 'generation-notes.md',
      content: '# Generation Notes\\n\\n...'
    }
  ],
  qualityGates: {
    validationMode: 'lightweight-contract-validation',
    requiredArtifacts: REQUIRED_ARTIFACT_PATHS,
    recommendedArtifacts: OPTIONAL_ARTIFACT_PATHS,
    safeBeta0Restrictions: SAFE_BETA0_RESTRICTIONS,
    missingInformation: ['string'],
    riskNotes: ['string'],
    warnings: ['string'],
    humanReviewChecklist: ['string'],
    beta0ScopeNotes: ['string']
  }
};

function setStatus(kind, title, message) {
  const dot = $('statusDot');
  dot.classList.remove('busy', 'error');
  if (kind === 'busy') dot.classList.add('busy');
  if (kind === 'error') dot.classList.add('error');
  $('statusTitle').textContent = title;
  $('statusMessage').textContent = message;
}

function siteContractSummary() {
  return {
    siteBuild: SITE_BUILD_LABEL,
    contractMode: CONTRACT_MODE,
    promptContract: PROMPT_CONTRACT_VERSION,
    bundleSchema: ARTIFACT_BUNDLE_SCHEMA_VERSION,
    validationMode: VALIDATION_MODE
  };
}

async function fetchJsonContract(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return response.json();
}

async function loadSchemaPack() {
  renderSchemaPackStatus();

  try {
    const manifest = await fetchJsonContract(SCHEMA_PACK_PATHS.manifest);
    const schemas = {};

    const schemaLoads = [
      ['config.schema.json', SCHEMA_PACK_PATHS.config],
      ['model.schema.json', SCHEMA_PACK_PATHS.model],
      ['manifest.schema.json', SCHEMA_PACK_PATHS.manifestSchema],
      ['artifact-bundle.schema.json', SCHEMA_PACK_PATHS.artifactBundle]
    ];

    for (const [name, path] of schemaLoads) {
      const missingByManifest = Array.isArray(manifest.missingSchemas)
        && manifest.missingSchemas.some((schema) => schema.name === name);
      if (!missingByManifest) {
        schemas[name] = await fetchJsonContract(path);
      }
    }

    state.schemaPack = { status: 'loaded', manifest, schemas, errors: [] };
  } catch (error) {
    state.schemaPack = {
      status: 'failed',
      manifest: null,
      schemas: {},
      errors: [error.message]
    };
  }

  renderSchemaPackStatus();
}

function schemaPackSummary() {
  const pack = state.schemaPack;
  const manifest = pack.manifest || {};
  const schemaRows = Array.isArray(manifest.schemas) ? manifest.schemas : [];
  const missingRows = Array.isArray(manifest.missingSchemas) ? manifest.missingSchemas : [];

  return {
    status: pack.status,
    validationMode: manifest.validationMode || VALIDATION_MODE,
    activeBundleSchemaVersion: ARTIFACT_BUNDLE_SCHEMA_VERSION,
    promptContract: PROMPT_CONTRACT_VERSION,
    schemaPackVersion: manifest.schemaPackVersion || 'unknown',
    gitHead: manifest.gitHead || 'unknown',
    schemas: schemaRows.map((schema) => ({
      name: schema.name,
      sha256: schema.sha256,
      purpose: schema.purpose
    })),
    missingSchemas: missingRows.map((schema) => schema.name || schema.expectedSourcePath || 'unknown')
  };
}

function renderSchemaPackStatus() {
  const box = $('schemaPackStatus');
  if (!box) return;

  const pack = state.schemaPack;
  if (pack.status === 'loading') {
    box.className = 'schema-pack-status loading';
    box.innerHTML = '<strong>Schema pack loading</strong><p>Fetching contracts from the local static site.</p>';
    return;
  }

  if (pack.status === 'failed') {
    box.className = 'schema-pack-status failed';
    box.innerHTML = `
      <strong>Schema pack failed</strong>
      <p>${pack.errors.map(escapeHtml).join('<br>')}</p>
      <p>Validation remains ${VALIDATION_MODE} and will report that schema metadata is unavailable.</p>
    `;
    return;
  }

  const manifest = pack.manifest || {};
  const schemas = Array.isArray(manifest.schemas) ? manifest.schemas : [];
  const missing = Array.isArray(manifest.missingSchemas) ? manifest.missingSchemas : [];
  const hashRows = schemas
    .map((schema) => `<li><code>${escapeHtml(schema.name)}</code> <span>${escapeHtml(String(schema.sha256 || '').slice(0, 16))}</span></li>`)
    .join('');
  const missingRows = missing.length
    ? `<p><strong>Missing schemas:</strong> ${missing.map((schema) => `<code>${escapeHtml(schema.name || schema.expectedSourcePath || 'unknown')}</code>`).join(', ')}</p>`
    : '<p><strong>Missing schemas:</strong> none</p>';

  box.className = 'schema-pack-status loaded';
  box.innerHTML = `
    <div class="schema-pack-heading">
      <strong>Schema pack loaded</strong>
      <span>${escapeHtml(manifest.schemaPackVersion || 'unknown')}</span>
    </div>
    <p><strong>Git head:</strong> <code>${escapeHtml(String(manifest.gitHead || 'unknown').slice(0, 12))}</code></p>
    <p><strong>Validation mode:</strong> <code>${escapeHtml(manifest.validationMode || VALIDATION_MODE)}</code></p>
    <p><strong>Copied schemas:</strong> ${schemas.map((schema) => `<code>${escapeHtml(schema.name)}</code>`).join(', ')}</p>
    ${missingRows}
    <ul class="schema-hash-list">${hashRows}</ul>
  `;
}

function splitCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toKebabCase(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'npdev-generated-app';
}

function toPascalCase(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') || 'GeneratedEntity';
}

function getFormValues() {
  const projectName = $('projectName').value.trim();
  return {
    projectName,
    scenarioId: toKebabCase($('scenarioId').value.trim() || projectName),
    objective: $('objective').value.trim(),
    entities: splitCsv($('entities').value),
    mainFlow: toPascalCase($('mainFlow').value.trim() || 'MainBusinessFlow'),
    backendTarget: $('backendTarget').value,
    databaseProvider: $('databaseProvider').value,
    serverPort: Number($('serverPort').value || 8083),
    complexity: $('complexity').value,
    constraints: $('constraints').value.trim(),
    provider: $('provider').value,
    model: $('model').value.trim() || 'gemini-2.5-flash',
    endpoint: $('endpoint').value.trim(),
    temperature: Number($('temperature').value || 0.1),
    maxTokens: Number($('maxTokens').value || 12000),
    includeFullSchemas: Boolean($('includeFullSchemas')?.checked)
  };
}

function buildNpdevPrompt(input) {
  const projectName = input.projectName || 'Generated NPDev Application';
  const scenarioId = input.scenarioId || toKebabCase(projectName);
  const entities = input.entities.length ? input.entities.join(', ') : 'infer 1 to 4 core concepts from objective';
  const constraints = input.constraints || 'Keep Beta0 Path B. Avoid trusted-source execution and unsupported custom procedure code. Prefer model-governed concepts, invariants, flows, capabilities, events, and simple panels only when safe.';
  const schemaContract = formatSchemaContractForPrompt(input.includeFullSchemas);

  return `You are generating input artifacts for NPDevGenerator, not generic application code.

SITE CONTRACT:
- Site contract mode: ${CONTRACT_MODE}
- Prompt contract: ${PROMPT_CONTRACT_VERSION}
- Bundle schema: ${ARTIFACT_BUNDLE_SCHEMA_VERSION}
- Validation mode: ${VALIDATION_MODE}

NPDevGenerator consumes a folder similar to:
Input/
  config.json
  model.json
  manifest.json
  expected-behavior.md
  expected-endpoints.md
  input/example-request.json optional

Your job:
Generate a conservative, schema-shaped artifact bundle for NPDev Beta0 usage.

Project:
- Name: ${projectName}
- Scenario id: ${scenarioId}
- Main flow: ${input.mainFlow}
- Complexity: ${input.complexity}
- Backend target: ${input.backendTarget}
- Database provider: ${input.databaseProvider}
- Runtime port: ${input.serverPort}
- Primary concepts/entities: ${entities}
- Constraints: ${constraints}

Objective:
${input.objective}

NPDev SCHEMA CONTRACT PACK:
${schemaContract}

SAFE BETA0 DEFAULT RESTRICTIONS:
${SAFE_BETA0_RESTRICTIONS.map((restriction) => `- ${restriction}`).join('\n')}

SAFE BETA0 HARD RULES:
If you generate any forbidden advanced feature, the artifact will be rejected.

Forbidden in Safe Beta0:
- type "reference"
- type "enum"
- type "datetime"
- widget "search-dialog"
- invariant functions like now()
- step type "assign"
- persistence operations "findById", "findAll", "delete"
- object-shaped emitEvent.payload
- CRUD endpoints under /api/v1

Use these safe fallbacks:
- relationships: uuid fields such as patientId, doctorId
- status: string field; document allowed values in markdown
- date/time: date field or string field; document expected format
- retrieval: do not promise findAll endpoints
- updates: full-object save only if supported, otherwise document as future
- endpoints: use /api/flows and /api/flows/<FlowName>/execute

If the user objective asks for advanced features, do not generate them in Safe Beta0.
Use safe fallback fields and record the limitation in generation-notes.md and qualityGates.riskNotes.

CRITICAL FORMAT RULES:
1. Return JSON only. No markdown fence. No commentary outside JSON.
2. The response must use schemaVersion "${ARTIFACT_BUNDLE_SCHEMA_VERSION}".
3. artifacts must be an array of objects with path and content.
4. config.json must match the loaded NPDev config schema from contracts/config.schema.json.
5. model.json must match the loaded NPDev model schema from contracts/model.schema.json.
6. manifest.json must match the loaded NPDev manifest schema from contracts/manifest.schema.json when present.
7. The outer response must match contracts/artifact-bundle.schema.json.
8. config.json content must be a JSON object using NPDevGenerator config shape:
   - configVersion: "1.0"
   - scenario.name, scenario.description, scenario.outputRoot
   - generator flags: failIfModelMissing, failIfConfigMissing, cleanOutputBeforeGenerate, emitPluginAssets, emitRuntimeAssets, emitUiAssets
   - bootstrap.root and bootstrap.mergeStrategy
   - artifact.root, generatedFolderName, libsFolderName, metaFolderName
   - finalExec.root, deleteBeforeMount
   - database.provider, host, port, database, username, password, adminDatabase, resetMode, containerName
   - runtime.springProfile, serverPort, javaArgs, gradleTask
   - trialDefaults
9. model.json content must be a JSON object using NPDev DSL 1.0.0 shape:
   - dslVersion: "1.0.0"
   - version: "1.0"
   - namespace
   - concepts[] with fields[] and invariants[]
   - capabilities[] and bindings[]
   - events[] when useful
   - flows[] with steps such as enforceInvariants, capabilityCall, emitEvent, return
   - queries/procedures/panels only if the objective needs them and they stay declarative
10. manifest.json must include id, title, complexity, mainFlow, purpose, businessStory, features, inputFiles, walkthrough, expectedOutcomes.
11. expected-behavior.md and expected-endpoints.md must explain what NPDev runtime should expose and how to validate it.
12. Do not output Java, TypeScript, SQL, Gradle, or Docker files.
13. Do not invent unsupported custom runtime code.
14. Keep Safe Beta0 restrictions. Advanced mode is not active in this site.
15. Do not invent CRUD endpoints under /api/v1. Prefer runtime flow and evidence endpoints already used by NPDev Beta0 examples.
16. If something is uncertain, make a conservative assumption and record it in project.assumptions and qualityGates.missingInformation.
17. qualityGates.validationMode must be "${VALIDATION_MODE}".
18. qualityGates.requiredArtifacts must list ${REQUIRED_ARTIFACT_PATHS.join(', ')}.
19. qualityGates.safeBeta0Restrictions must list the Safe Beta0 restrictions above.
20. manifest.inputFiles must reference only files also present in artifacts[]. Use input/example-request.json if you include a sample input.
21. expected-endpoints.md must list only conservative runtime endpoints: GET /api/flows, POST /api/flows/<FlowName>/execute, GET /api/audit, GET /api/correlations/{correlationId}.
22. Keep the model small. Prefer 1 to 4 concepts and 1 to 3 flows.
23. Use valid JSON only. JSON.parse must succeed.

Minimal required artifact bundle shape:
${buildCompactArtifactShapeGuide()}
`;
}

function formatSchemaContractForPrompt(includeFullSchemas = false) {
  const pack = state.schemaPack;
  if (pack.status !== 'loaded') {
    return `Schema pack status: ${pack.status}. Use the documented NPDev schema-shaped contract and include qualityGates warnings that browser schema metadata was not loaded.`;
  }

  const summary = schemaPackSummary();
  const schemaLine = summary.schemas
    .filter((schema) => ['config.schema.json', 'model.schema.json', 'manifest.schema.json', 'artifact-bundle.schema.json'].includes(schema.name))
    .map((schema) => `${schema.name} sha256=${schema.sha256}`)
    .join(', ');
  const lines = [
    `NPDev schema pack loaded: ${schemaLine}`,
    `Schema pack version: ${summary.schemaPackVersion}`,
    `Git head: ${summary.gitHead}`,
    `Prompt contract: ${summary.promptContract}`,
    `Active bundle schema: ${summary.activeBundleSchemaVersion}`,
    `Validation mode in this browser: ${summary.validationMode}`,
    `Missing schemas: ${summary.missingSchemas.length ? summary.missingSchemas.join(', ') : 'none'}`,
    'Allowed Safe Beta0: field types string, uuid, integer, decimal, boolean, date; widgets text, textarea, checkbox, date, email; persistence operation save only; steps enforceInvariants, capabilityCall save, emitEvent with from, return; relationships use uuid ID fields, not reference; status uses string, not enum; endpoints use /api/flows, /api/flows/<FlowName>/execute, /api/audit, /api/correlations/{correlationId}.',
    'Forbidden Safe Beta0: reference, enum, datetime, search-dialog, now(), assign, findById, findAll, delete, object-shaped emitEvent.payload, CRUD endpoints under /api/v1, /api/clinic, or /api/<concept>.'
  ];

  if (includeFullSchemas) {
    const schemaText = Object.entries(pack.schemas)
      .map(([name, schema]) => `--- ${name} (${summary.schemas.find((item) => item.name === name)?.sha256 || 'sha256 unknown'}) ---\n${compactSchemaForPrompt(name, schema)}`)
      .join('\n\n');
    lines.push('DEBUG FULL SCHEMA PROMPT MODE ENABLED. Full schema prompt mode may exceed proxy limits.');
    lines.push(schemaText);
  }

  return lines.join('\n');
}

function buildCompactArtifactShapeGuide() {
  return `{
  "schemaVersion": "${ARTIFACT_BUNDLE_SCHEMA_VERSION}",
  "project": { "name": "...", "scenarioId": "kebab-case", "objective": "...", "assumptions": [], "warnings": [] },
  "artifacts": [
    { "path": "config.json", "content": { "$schema": "contracts/config.schema.json", "configVersion": "1.0", "scenario": {}, "generator": {}, "bootstrap": {}, "artifact": {}, "finalExec": {}, "database": {}, "runtime": {} } },
    { "path": "model.json", "content": { "$schema": "contracts/model.schema.json", "namespace": "trial.example", "dslVersion": "1.0.0", "version": "1.0", "concepts": [{ "name": "Appointment", "fields": [{ "name": "patientId", "type": "uuid", "ui": { "label": "Patient ID", "widget": "text" } }] }], "capabilities": [{ "name": "persistence", "type": "PersistenceCapability", "operations": ["save"] }], "bindings": [], "events": [], "flows": [] } },
    { "path": "manifest.json", "content": { "id": "kebab-case", "title": "...", "complexity": "simple", "mainFlow": "...", "purpose": "...", "businessStory": "...", "features": [], "inputFiles": ["input/example-request.json"], "walkthrough": [], "expectedOutcomes": [] } },
    { "path": "expected-behavior.md", "content": "..." },
    { "path": "expected-endpoints.md", "content": "Only /api/flows, /api/flows/<FlowName>/execute, /api/audit, /api/correlations/{correlationId}." },
    { "path": "generation-notes.md", "content": "..." },
    { "path": "input/example-request.json", "content": {} }
  ],
  "qualityGates": { "validationMode": "${VALIDATION_MODE}", "requiredArtifacts": ${JSON.stringify(REQUIRED_ARTIFACT_PATHS)}, "recommendedArtifacts": ${JSON.stringify(OPTIONAL_ARTIFACT_PATHS)}, "safeBeta0Restrictions": ${JSON.stringify(SAFE_BETA0_RESTRICTIONS)}, "missingInformation": [], "riskNotes": [] }
}`;
}

function compactSchemaForPrompt(name, schema) {
  const compact = JSON.stringify(schema);
  const limit = SCHEMA_PROMPT_CHAR_LIMITS[name] || 5000;
  if (compact.length <= limit) return compact;

  const properties = schema && schema.properties ? Object.keys(schema.properties).join(', ') : 'n/a';
  const definitions = schema && schema.definitions ? Object.keys(schema.definitions).slice(0, 60).join(', ') : 'n/a';
  return `${compact.slice(0, limit)}\n...[truncated for prompt size: ${compact.length} chars total; top-level properties: ${properties}; definitions: ${definitions}]`;
}

async function callProvider(input, prompt) {
  if (input.provider === 'mock') {
    return JSON.stringify(buildMockBundle(input), null, 2);
  }

  if (input.provider === 'cloudflare') {
    return callCloudflareWorker(input, prompt);
  }

  throw new Error(`Unsupported provider: ${input.provider}`);
}

async function callCloudflareWorker(input, prompt) {
  if (!input.endpoint) {
    throw new Error('Cloudflare Worker endpoint is required. Example: https://npdev-ai-proxy.YOUR_ACCOUNT.workers.dev/v1/generate');
  }

  const requestPayload = buildWorkerRequestPayload(input, prompt);
  const diagnostics = calculateRequestDiagnostics(input, prompt, requestPayload);
  renderPromptDiagnostics(diagnostics);

  const response = await fetch(input.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  const data = await safeReadJson(response);

  if (!response.ok) {
    throw buildProviderError(response, data);
  }

  if (typeof data.text === 'string' && data.text.trim()) return data.text;
  if (data.json) return JSON.stringify(data.json, null, 2);
  throw new Error('Worker returned no text or json field.');
}

function buildWorkerRequestPayload(input, prompt) {
  return {
    model: input.model,
    prompt,
    schemaHint: JSON.stringify(buildCompactSchemaHint()),
    temperature: input.temperature,
    maxOutputTokens: input.maxTokens
  };
}

function buildCompactSchemaHint() {
  const summary = schemaPackSummary();
  return {
    contractMode: CONTRACT_MODE,
    promptContract: PROMPT_CONTRACT_VERSION,
    schemaVersion: ARTIFACT_BUNDLE_SCHEMA_VERSION,
    validationMode: VALIDATION_MODE,
    schemaPack: {
      status: summary.status,
      version: summary.schemaPackVersion,
      gitHead: summary.gitHead,
      schemas: summary.schemas.map((schema) => ({
        name: schema.name,
        sha256: schema.sha256,
        purpose: schema.purpose
      })),
      missingSchemas: summary.missingSchemas
    },
    safeBeta0: {
      allowedFieldTypes: SAFE_BETA0_ALLOWED_FIELD_TYPES,
      allowedWidgets: SAFE_BETA0_ALLOWED_WIDGETS,
      allowedPersistenceOperations: SAFE_BETA0_ALLOWED_CAPABILITY_OPS,
      allowedFlowSteps: SAFE_BETA0_ALLOWED_FLOW_STEPS,
      forbidden: SAFE_BETA0_RESTRICTIONS,
      requiredArtifacts: REQUIRED_ARTIFACT_PATHS,
      recommendedArtifacts: OPTIONAL_ARTIFACT_PATHS
    }
  };
}

function utf8ByteLength(value) {
  return new TextEncoder().encode(String(value || '')).length;
}

function calculateRequestDiagnostics(input, prompt, requestPayload = buildWorkerRequestPayload(input, prompt)) {
  const requestJson = JSON.stringify(requestPayload);
  return {
    promptChars: prompt.length,
    promptBytes: utf8ByteLength(prompt),
    requestBytes: utf8ByteLength(requestJson),
    model: input.model,
    maxOutputTokens: input.maxTokens,
    includeFullSchemas: Boolean(input.includeFullSchemas),
    limitBytes: PROXY_PROMPT_LIMIT_BYTES,
    nearLimit: utf8ByteLength(requestJson) >= PROXY_REQUEST_WARN_BYTES || utf8ByteLength(prompt) >= PROXY_REQUEST_WARN_BYTES
  };
}

function renderPromptDiagnostics(diagnostics) {
  const box = $('promptDiagnostics');
  if (!box) return;
  box.className = diagnostics.nearLimit ? 'prompt-diagnostics warning' : 'prompt-diagnostics';
  box.innerHTML = `
    <strong>Prompt size:</strong>
    ${diagnostics.promptChars.toLocaleString()} chars,
    ${diagnostics.promptBytes.toLocaleString()} prompt bytes,
    ${diagnostics.requestBytes.toLocaleString()} request JSON bytes.
    <strong>Model:</strong> ${escapeHtml(diagnostics.model)}.
    <strong>Max output:</strong> ${Number(diagnostics.maxOutputTokens).toLocaleString()} tokens.
    ${diagnostics.includeFullSchemas ? '<span>Full schema prompt mode may exceed proxy limits.</span>' : '<span>Compact schema prompt mode active.</span>'}
    ${diagnostics.nearLimit ? '<span>Request is close to the proxy limit. Reduce prompt detail or keep compact mode enabled.</span>' : ''}
  `;
}

async function safeReadJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function formatApiError(prefix, data) {
  const message = data?.error?.message || data?.message || data?.raw || JSON.stringify(data);
  return `${prefix}: ${message}`;
}

function buildProviderError(response, data) {
  const status = data?.status || data?.upstreamStatus || response.status;
  const rawPayload = JSON.stringify(data, null, 2);
  const promptTooLarge = response.status === 413 || data?.error === 'prompt_too_large';
  const upstreamUnavailable = data?.error === 'upstream_error'
    && (Number(status) === 503 || /UNAVAILABLE|overload|high[- ]?demand/i.test(rawPayload));
  let message = formatApiError('Cloudflare Worker request failed', data);
  if (promptTooLarge) {
    message = 'Prompt is too large for the proxy. The site should use compact schema guidance instead of full schemas. Reduce prompt detail or switch to compact mode.';
  }
  if (upstreamUnavailable) {
    message = 'Gemini is temporarily unavailable or overloaded. Try again later, reduce max output tokens, or switch model.';
  }
  const error = new Error(message);
  error.rawPayload = rawPayload;
  error.isProviderError = true;
  error.providerStatus = status;
  return error;
}

function parseArtifactBundle(rawText) {
  console.groupCollapsed('[NPDev] parseArtifactBundle raw response');
  console.log(rawText);
  console.groupEnd();

  const cleaned = extractJsonText(rawText);

  console.groupCollapsed('[NPDev] parseArtifactBundle extracted JSON candidate');
  console.log(cleaned);
  console.groupEnd();

  const parsed = parseJsonWithDiagnostics(cleaned, rawText);
  const artifacts = normalizeArtifacts(parsed);
  const validation = validateArtifacts(parsed, artifacts);
  return { bundle: parsed, artifacts, validation };
}

function parseJsonWithDiagnostics(cleanedText, rawText) {
  const attempts = [
    { name: 'direct', text: cleanedText },
    { name: 'without trailing commas', text: removeTrailingCommas(cleanedText) },
    { name: 'balanced braces fallback', text: sliceToLastBalancedObject(removeTrailingCommas(cleanedText)) }
  ];

  const failures = [];

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt.text);
    } catch (error) {
      const position = extractErrorPosition(error.message);
      failures.push({
        name: attempt.name,
        message: error.message,
        position,
        preview: buildJsonErrorPreview(attempt.text, position)
      });
    }
  }

  console.group('[NPDev] JSON parse failed');
  console.log('Raw response:', rawText);
  console.log('Cleaned response:', cleanedText);
  console.table(failures.map((failure) => ({
    attempt: failure.name,
    message: failure.message,
    position: failure.position
  })));
  for (const failure of failures) {
    console.log(`Preview for ${failure.name}:`, failure.preview);
  }
  console.groupEnd();

  const error = new Error(
    'The AI returned invalid JSON. Open DevTools Console and look for [NPDev] JSON parse failed. ' +
    'The raw response is preserved in the Raw AI response box. Regenerate, lower complexity, or increase Max output tokens.'
  );
  error.failures = failures;
  throw error;
}

function removeTrailingCommas(text) {
  return String(text || '').replace(/,\s*([}\]])/g, '$1');
}

function sliceToLastBalancedObject(text) {
  const source = String(text || '');
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;
  let lastBalancedEnd = -1;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      if (depth === 0 && start < 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) lastBalancedEnd = i + 1;
      if (depth < 0) break;
    }
  }

  if (start >= 0 && lastBalancedEnd > start) {
    return source.slice(start, lastBalancedEnd);
  }

  return source;
}

function extractErrorPosition(message) {
  const match = String(message || '').match(/position\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function buildJsonErrorPreview(text, position) {
  const source = String(text || '');
  if (!Number.isFinite(position)) {
    return source.slice(0, 800);
  }

  const start = Math.max(0, position - 500);
  const end = Math.min(source.length, position + 500);
  return source.slice(start, end);
}

function extractJsonText(rawText) {
  const trimmed = String(rawText || '').trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) return fenceMatch[1].trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function normalizeArtifacts(bundle) {
  if (Array.isArray(bundle.artifacts)) {
    return bundle.artifacts
      .map((artifact) => ({
        path: String(artifact.path || '').trim(),
        content: artifact.content
      }))
      .filter((artifact) => artifact.path);
  }

  if (bundle.files && typeof bundle.files === 'object') {
    return Object.entries(bundle.files).map(([path, content]) => ({ path, content }));
  }

  return [];
}

function validateArtifacts(bundle, artifacts) {
  const errors = [];
  const warnings = [];
  const paths = new Set(artifacts.map((artifact) => artifact.path));
  const getArtifact = (path) => artifacts.find((artifact) => artifact.path === path);

  if (!bundle || typeof bundle !== 'object') {
    errors.push('Outer response must be a JSON object.');
  }

  if (bundle.schemaVersion !== ARTIFACT_BUNDLE_SCHEMA_VERSION) {
    errors.push(`Invalid artifact bundle schemaVersion. Expected ${ARTIFACT_BUNDLE_SCHEMA_VERSION}. This usually means the browser is cached, the deployed app.js is stale, or Gemini ignored the contract.`);
    if (bundle.schemaVersion) {
      errors.push(`Invalid artifact bundle schemaVersion: ${String(bundle.schemaVersion).replace(/^npdev-static-generator-artifact-bundle\./, '')}.`);
    }
  }

  if (!bundle.project || typeof bundle.project !== 'object') errors.push('Outer response missing required top-level field: project.');
  if (!Array.isArray(bundle.artifacts)) errors.push('Outer response missing required top-level field: artifacts[].');
  if (!bundle.qualityGates || typeof bundle.qualityGates !== 'object') errors.push('Outer response missing required top-level field: qualityGates.');

  if (bundle.qualityGates && typeof bundle.qualityGates === 'object') {
    if (bundle.qualityGates.validationMode !== VALIDATION_MODE) {
      warnings.push(`qualityGates.validationMode should be "${VALIDATION_MODE}" for this checkpoint.`);
    }
    if (!Array.isArray(bundle.qualityGates.requiredArtifacts)) {
      warnings.push('qualityGates.requiredArtifacts should list the required artifact paths.');
    }
    if (!Array.isArray(bundle.qualityGates.safeBeta0Restrictions)) {
      warnings.push('qualityGates.safeBeta0Restrictions should list the Safe Beta0 default restrictions.');
    }
  }

  if (state.schemaPack.status !== 'loaded') {
    warnings.push(`Schema pack status is ${state.schemaPack.status}; browser validation is using lightweight contract checks only.`);
  }

  for (const required of REQUIRED_ARTIFACT_PATHS) {
    if (!paths.has(required)) errors.push(`Missing required artifact: ${required}`);
  }

  const config = getArtifact('config.json')?.content;
  const model = getArtifact('model.json')?.content;
  const manifest = getArtifact('manifest.json')?.content;
  const endpoints = getArtifact('expected-endpoints.md')?.content;

  if (!config || typeof config !== 'object') errors.push('config.json must be JSON object content.');
  if (!model || typeof model !== 'object') errors.push('model.json must be JSON object content.');
  if (!manifest || typeof manifest !== 'object') errors.push('manifest.json must be JSON object content.');

  if (config && typeof config === 'object') {
    if (config.configVersion !== '1.0') errors.push('config.json must include configVersion "1.0".');
    for (const key of ['scenario', 'generator', 'bootstrap', 'artifact', 'finalExec', 'database', 'runtime']) {
      if (!config[key]) errors.push(`config.json missing required section: ${key}`);
    }
  }

  if (model && typeof model === 'object') {
    if (model.dslVersion !== '1.0.0') errors.push('model.json must include dslVersion "1.0.0".');
    if (!model.version) errors.push('model.json must include version.');
    if (!Array.isArray(model.concepts) || !model.concepts.length) errors.push('model.json must include at least one concept.');
  }

  if (manifest && typeof manifest === 'object') {
    if (!manifest.id) errors.push('manifest.json must include id.');
    if (!manifest.mainFlow) warnings.push('manifest.json should include mainFlow.');
    if (Array.isArray(manifest.inputFiles)) {
      for (const inputFile of manifest.inputFiles) {
        const inputPath = String(inputFile || '').trim();
        if (inputPath && !paths.has(inputPath)) {
          errors.push(`Manifest references ${inputPath} but the artifact bundle does not include it.`);
        }
      }
    }
  }

  for (const artifact of artifacts) {
    if (!artifact.path.match(/^[A-Za-z0-9._\-\/]+$/)) errors.push(`${artifact.path} contains unsupported path characters.`);
    if (artifact.path.includes('..')) errors.push(`${artifact.path} must not contain parent directory traversal.`);
    if (artifact.path.endsWith('.json') && typeof artifact.content !== 'object') {
      errors.push(`${artifact.path} should have JSON object content, not string content.`);
    }
  }

  errors.push(...inspectSafeBeta0Violations(model, artifacts, endpoints));

  return {
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    passed: errors.length === 0,
    validationMode: VALIDATION_MODE,
    schemaPack: schemaPackSummary()
  };
}

function inspectSafeBeta0Violations(model, artifacts, endpointsContent) {
  const errors = new Set();

  if (model && typeof model === 'object') {
    for (const concept of Array.isArray(model.concepts) ? model.concepts : []) {
      for (const field of Array.isArray(concept.fields) ? concept.fields : []) {
        const fieldName = `${concept.name || 'concept'}.${field.name || 'field'}`;
        if (field.type === 'reference' || field.reference) errors.add(`Safe Beta0 violation: ${fieldName} uses type reference. Use type uuid plus label ${humanizeFieldLabel(field.name)}.`);
        if (field.type === 'enum' || Array.isArray(field.enumValues)) errors.add(`Safe Beta0 violation: ${fieldName} uses type enum. Use type string and document allowed values.`);
        if (field.type === 'datetime') errors.add(`Safe Beta0 violation: ${fieldName} uses type datetime. Use type date or string and document the expected format.`);
        if (field.type && !SAFE_BETA0_ALLOWED_FIELD_TYPES.includes(field.type)) {
          errors.add(`Safe Beta0 violation: ${fieldName} uses unsupported type ${field.type}. Allowed types: ${SAFE_BETA0_ALLOWED_FIELD_TYPES.join(', ')}.`);
        }
        if (field.ui && field.ui.widget === 'search-dialog') errors.add(`Safe Beta0 violation: ${fieldName} uses widget search-dialog. Use a uuid ID field plus a plain text label.`);
        if (field.ui && field.ui.widget && !SAFE_BETA0_ALLOWED_WIDGETS.includes(field.ui.widget)) {
          errors.add(`Safe Beta0 violation: ${fieldName} uses unsupported widget ${field.ui.widget}. Allowed widgets: ${SAFE_BETA0_ALLOWED_WIDGETS.join(', ')}.`);
        }
      }

      for (const invariant of Array.isArray(concept.invariants) ? concept.invariants : []) {
        if (typeof invariant.expr === 'string' && /\bnow\s*\(/i.test(invariant.expr)) {
          errors.add(`Safe Beta0 violation: invariant ${invariant.name || 'unnamed'} uses now(). Use explicit input fields or document the time rule in markdown.`);
        }
      }
    }

    for (const capability of Array.isArray(model.capabilities) ? model.capabilities : []) {
      for (const op of Array.isArray(capability.operations) ? capability.operations : []) {
        if (!SAFE_BETA0_ALLOWED_CAPABILITY_OPS.includes(op)) {
          errors.add(`Safe Beta0 violation: ${capability.name || 'capability'} includes ${op}. Safe Beta0 allows only save.`);
        }
      }
    }

    for (const flow of Array.isArray(model.flows) ? model.flows : []) {
      for (const step of Array.isArray(flow.steps) ? flow.steps : []) {
        const stepName = `${flow.name || 'flow'}.${step.name || step.type || 'step'}`;
        if (step.type && !SAFE_BETA0_ALLOWED_FLOW_STEPS.includes(step.type)) {
          errors.add(`Safe Beta0 violation: ${stepName} uses step type ${step.type}. Allowed flow steps: ${SAFE_BETA0_ALLOWED_FLOW_STEPS.join(', ')}.`);
        }
        if (['assign', 'findById', 'findAll', 'delete'].includes(step.type)) {
          errors.add(`Safe Beta0 violation: ${stepName} uses ${step.type}. Safe Beta0 does not support that flow step.`);
          if (step.type === 'assign') {
            errors.add(`Safe Beta0 violation: ${flow.name || 'flow'} uses assign. Safe Beta0 does not support that flow step.`);
          }
        }
        if (['findById', 'findAll', 'delete'].includes(step.op)) {
          errors.add(`Safe Beta0 violation: ${stepName} uses op ${step.op}. Safe Beta0 allows capabilityCall op save only.`);
        }
        if (step.type === 'capabilityCall' && step.op && step.op !== 'save') {
          errors.add(`Safe Beta0 violation: ${stepName} uses capability operation ${step.op}. Safe Beta0 allows only save.`);
        }
        if (step.type === 'emitEvent' && step.payload && typeof step.payload === 'object' && !Array.isArray(step.payload)) {
          errors.add(`Safe Beta0 violation: ${stepName} uses object-shaped emitEvent.payload. Use emitEvent with from.`);
        }
      }
    }
  }

  const endpointText = typeof endpointsContent === 'string'
    ? endpointsContent
    : artifactContentToString(endpointsContent, 'expected-endpoints.md');
  if (/(^|\s)(GET|POST|PUT|PATCH|DELETE)\s+\/api\/v1\b|\/api\/v1\b/i.test(endpointText)) {
    errors.add('Safe Beta0 violation: expected-endpoints.md contains /api/v1 CRUD endpoints. Use flow endpoints only.');
  }
  if (/\/api\/clinic\b/i.test(endpointText)) {
    errors.add('Safe Beta0 violation: expected-endpoints.md contains CRUD endpoints under /api/clinic. Use flow endpoints only.');
  }
  if (/\bDELETE\s+\//i.test(endpointText)) {
    errors.add('Safe Beta0 violation: expected-endpoints.md contains DELETE endpoints. Safe Beta0 expected endpoints must not include deletes.');
  }
  if (/\bPUT\s+\/api\//i.test(endpointText)) {
    errors.add('Safe Beta0 violation: expected-endpoints.md contains PUT /api/ endpoints. Use flow endpoints only.');
  }
  if (/\bGET\s+\/api\/(?!flows\b|audit\b|correlations\b)[^\s`]*\{id\}/i.test(endpointText)) {
    errors.add('Safe Beta0 violation: expected-endpoints.md contains GET /api/.../{id} concept CRUD endpoints. Use flow endpoints only.');
  }
  if (/\bPOST\s+\/api\/(?!flows\/[^/\s`]+\/execute\b)[^\s`]+/i.test(endpointText)) {
    errors.add('Safe Beta0 violation: expected-endpoints.md contains POST /api/... concept CRUD endpoints. Use /api/flows/<FlowName>/execute only.');
  }

  return [...errors];
}

function humanizeFieldLabel(value) {
  return String(value || 'ID')
    .replace(/Id$/, ' ID')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

function artifactContentToString(content, path) {
  if (typeof content === 'string') return content;
  if (content === null || content === undefined) return '';
  if (path.endsWith('.json')) return JSON.stringify(content, null, 2) + '\n';
  return typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
}

function renderArtifacts(artifacts, validation) {
  const list = $('artifactList');
  list.innerHTML = '';
  state.lastValidation = validation;

  if (!artifacts.length) {
    $('validationBox').className = 'validation-box error';
    $('validationBox').textContent = 'No artifacts were found in the response.';
    setDownloadButtons({ bundle: false, zip: false });
    setRepairPromptButton(false);
    return;
  }

  $('validationBox').className = validation.passed ? 'validation-box ok' : 'validation-box error';
  $('validationBox').innerHTML = renderValidationMessage(validation, artifacts);

  for (const artifact of artifacts) {
    const content = artifactContentToString(artifact.content, artifact.path);
    const card = document.createElement('article');
    card.className = 'artifact-card';
    card.innerHTML = `
      <header>
        <h3></h3>
        <div class="button-row right">
          <button type="button" class="ghost-button copy-file">Copy</button>
          <button type="button" class="secondary-button download-file">Download</button>
        </div>
      </header>
      <pre></pre>
    `;
    card.querySelector('h3').textContent = artifact.path;
    card.querySelector('pre').textContent = content;
    card.querySelector('.copy-file').addEventListener('click', () => copyText(content, `${artifact.path} copied.`));
    card.querySelector('.download-file').addEventListener('click', () => downloadTextFile(artifact.path, content));
    list.appendChild(card);
  }

  setDownloadButtons({ bundle: true, zip: validation.passed });
  setRepairPromptButton(!validation.passed);
}

function renderValidationMessage(validation, artifacts) {
  const parts = [];
  parts.push(`<strong>Safe Beta0 validation: ${validation.passed ? 'PASSED' : 'FAILED'}</strong>`);
  if (!validation.passed) {
    parts.push('Artifact ZIP download is disabled until validation passes.');
  }
  parts.push(`${artifacts.length} file(s) generated.`);
  parts.push(`Validation mode: <code>${escapeHtml(validation.validationMode || VALIDATION_MODE)}</code>.`);
  if (validation.schemaPack) {
    const schemaNames = validation.schemaPack.schemas.map((schema) => `${schema.name} ${String(schema.sha256 || '').slice(0, 12)}`).join(', ');
    parts.push(`Schema pack: <code>${escapeHtml(validation.schemaPack.status)}</code>, git <code>${escapeHtml(String(validation.schemaPack.gitHead || 'unknown').slice(0, 12))}</code>.`);
    if (schemaNames) {
      parts.push(`Schema hashes: ${escapeHtml(schemaNames)}.`);
    }
    if (validation.schemaPack.missingSchemas.length) {
      parts.push(`Missing schemas: ${escapeHtml(validation.schemaPack.missingSchemas.join(', '))}.`);
    }
  }
  if (validation.errors.length) {
    parts.push('<br><strong>Errors:</strong><ul>' + validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('') + '</ul>');
  }
  if (validation.warnings.length) {
    parts.push('<br><strong>Warnings:</strong><ul>' + validation.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('') + '</ul>');
  }
  return parts.join(' ');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setDownloadButtons(options) {
  const stateOptions = typeof options === 'boolean' ? { bundle: options, zip: options } : options;
  $('downloadZipButton').disabled = !stateOptions.zip;
  $('downloadBundleButton').disabled = !stateOptions.bundle;
}

function setRepairPromptButton(enabled) {
  const button = $('copyRepairPromptButton');
  if (!button) return;
  button.disabled = !enabled;
  button.classList.toggle('hidden', !enabled);
}

function buildMockBundle(input) {
  const name = input.projectName || 'Clinic Appointment Manager';
  const scenarioId = input.scenarioId || toKebabCase(name);
  const namespace = `trial.${scenarioId.replace(/-/g, '')}`;
  const objective = input.objective || 'Manage patients, doctors, and appointment scheduling with validation and runtime evidence.';
  const entities = input.entities.length ? input.entities : ['Patient', 'Doctor', 'Appointment'];
  const mainFlow = input.mainFlow || 'ScheduleAppointment';

  return {
    schemaVersion: ARTIFACT_BUNDLE_SCHEMA_VERSION,
    project: {
      name,
      scenarioId,
      objective,
      assumptions: ['Generated by the local mock provider for UI validation.'],
      warnings: ['Review all artifacts before running NPDevGenerator.']
    },
    artifacts: [
      {
        path: 'config.json',
        content: {
          $schema: 'contracts/config.schema.json',
          configVersion: '1.0',
          scenario: {
            name: scenarioId,
            description: objective,
            outputRoot: '..\\Output'
          },
          generator: {
            failIfModelMissing: true,
            failIfConfigMissing: true,
            cleanOutputBeforeGenerate: true,
            emitPluginAssets: true,
            emitRuntimeAssets: true,
            emitUiAssets: true
          },
          bootstrap: {
            root: '..\\..\\NPDevRuntimeHost',
            mergeStrategy: 'clean-copy'
          },
          artifact: {
            root: '..\\Output\\ArtifactNP',
            generatedFolderName: 'npdev-generated',
            libsFolderName: 'libs',
            metaFolderName: 'npdev-meta'
          },
          finalExec: {
            root: '..\\Output\\App',
            deleteBeforeMount: true
          },
          database: {
            provider: input.databaseProvider || 'docker-postgres',
            host: 'localhost',
            port: 5432,
            database: scenarioId.replace(/-/g, '_'),
            username: 'finalexec',
            password: 'finalexec',
            adminDatabase: 'postgres',
            resetMode: 'reset',
            containerName: `npdev-${scenarioId}`
          },
          runtime: {
            springProfile: 'dev,step0,trial',
            serverPort: input.serverPort || 8083,
            javaArgs: [],
            gradleTask: 'bootRun'
          },
          trialDefaults: {
            apiKey: 'dev-key',
            recommendedProfiles: 'dev,step0,trial',
            runtimeUrl: `http://localhost:${input.serverPort || 8083}/`,
            databaseMode: 'step0-h2',
            pluginDiscoveryMode: 'filesystem-folder',
            pluginPackageDirectory: './npdev-generated/src/main/resources/npdev/plugin-packages',
            notes: ['Mock output uses Beta0-compatible conservative defaults.']
          }
        }
      },
      {
        path: 'model.json',
        content: {
          $schema: 'contracts/model.schema.json',
          namespace,
          dslVersion: '1.0.0',
          version: '1.0',
          metadata: { purpose: objective },
          concepts: entities.map((entityName) => ({
            name: toPascalCase(entityName),
            ui: { label: toPascalCase(entityName).replace(/([a-z])([A-Z])/g, '$1 $2') },
            fields: [
              { name: 'id', type: 'uuid', id: true, required: true },
              { name: 'name', type: 'string', required: true, ui: { label: 'Name', widget: 'text' } },
              { name: 'status', type: 'string', required: true, ui: { label: 'Status', widget: 'text' } }
            ],
            invariants: [
              { name: `${toPascalCase(entityName)}NameRequired`, expr: "name != null && name != ''" }
            ]
          })),
          capabilities: [
            { name: 'persistence', type: 'PersistenceCapability', operations: ['save'] }
          ],
          bindings: [
            { capability: 'persistence', adapter: 'repository' },
            { capability: 'eventBus', adapter: 'inproc' }
          ],
          events: [
            { name: `${mainFlow}Completed`, payload: [{ name: 'id', type: 'uuid' }, { name: 'status', type: 'string' }] }
          ],
          flows: [
            {
              name: mainFlow,
              input: { concept: toPascalCase(entities[0]), mode: 'create' },
              steps: [
                { name: 'validate-input', type: 'enforceInvariants', scope: toPascalCase(entities[0]), invariants: [`${toPascalCase(entities[0])}NameRequired`] },
                { name: 'save-record', type: 'capabilityCall', cap: 'persistence', op: 'save', args: ['$input'], out: '$saved' },
                { name: 'emit-completed-event', type: 'emitEvent', event: `${mainFlow}Completed`, from: '$saved' },
                { name: 'return-record', type: 'return', value: '$saved' }
              ]
            }
          ]
        }
      },
      {
        path: 'manifest.json',
        content: {
          id: scenarioId,
          title: name,
          complexity: input.complexity || 'simple',
          mainFlow,
          purpose: `Generate a Beta0 NPDev sample for ${name}.`,
          businessStory: objective,
          features: ['concept', 'invariants', 'persistence', 'event', 'trace'],
          inputFiles: ['input/example-request.json'],
          walkthrough: [
            `Run the sample through NPDevGenerator.`,
            `Call GET /api/flows and confirm ${mainFlow} exists.`,
            `POST the example request to /api/flows/${mainFlow}/execute.`
          ],
          expectedOutcomes: [
            'The input is validated.',
            'The record is persisted through a governed capability.',
            'Runtime evidence is inspectable.'
          ]
        }
      },
      {
        path: 'expected-behavior.md',
        content: `# Expected Behavior\n\n- \`${mainFlow}\` accepts a valid request for ${name}.\n- The runtime validates invariants, saves the primary concept, emits an event, and returns the saved record.\n- Invalid required fields produce explicit validation failure.\n`
      },
      {
        path: 'expected-endpoints.md',
        content: `# Expected Endpoints\n\n- \`GET /api/flows\`\n- \`POST /api/flows/${mainFlow}/execute\`\n- \`GET /api/audit\`\n- \`GET /api/correlations/{correlationId}\`\n`
      },
      {
        path: 'generation-notes.md',
        content: '# Generation Notes\n\nMock output validates the UI and file contract. Use Cloudflare Worker + Gemini for real generation.\n'
      },
      {
        path: 'input/example-request.json',
        content: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Example record',
          status: 'SUBMITTED'
        }
      }
    ],
    qualityGates: {
      validationMode: VALIDATION_MODE,
      requiredArtifacts: REQUIRED_ARTIFACT_PATHS,
      recommendedArtifacts: OPTIONAL_ARTIFACT_PATHS,
      safeBeta0Restrictions: SAFE_BETA0_RESTRICTIONS,
      missingInformation: [],
      riskNotes: ['Mock provider output is illustrative only.'],
      warnings: [],
      humanReviewChecklist: [
        'Review config.json against contracts/config.schema.json.',
        'Review model.json against contracts/model.schema.json.',
        'Review manifest.json against contracts/manifest.schema.json.',
        'Run the relevant NPDev sample/generator validation scripts before accepting the output.'
      ],
      beta0ScopeNotes: ['Trusted-source execution and deep custom procedure implementation remain outside default Beta0 Path B.']
    }
  };
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: guessMimeType(filename) });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.split('/').pop();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function guessMimeType(filename) {
  if (filename.endsWith('.json')) return 'application/json;charset=utf-8';
  if (filename.endsWith('.md')) return 'text/markdown;charset=utf-8';
  return 'text/plain;charset=utf-8';
}

function downloadBundleJson() {
  if (!state.lastBundle) return;
  downloadTextFile('npdev-artifact-bundle.json', JSON.stringify(state.lastBundle, null, 2) + '\n');
}

function downloadZip() {
  if (!state.lastFiles.length) return;
  const files = state.lastFiles.map((artifact) => ({
    name: artifact.path,
    content: artifactContentToString(artifact.content, artifact.path)
  }));
  const blob = createZipBlob(files);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${toKebabCase($('scenarioId').value || $('projectName').value || 'npdev-artifacts')}-input.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createZipBlob(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const mod = dosDateTime(new Date());

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, mod.time, true);
    localView.setUint16(12, mod.date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, mod.time, true);
    centralView.setUint16(14, mod.date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}

function dosDateTime(date) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

async function copyText(text, successMessage) {
  await navigator.clipboard.writeText(text || '');
  setStatus('ready', 'Copied', successMessage || 'Copied to clipboard.');
}

function buildRepairPrompt() {
  const validation = state.lastValidation || { errors: [] };
  const errors = validation.errors && validation.errors.length
    ? validation.errors.join('\n')
    : 'No validation errors were captured.';
  const raw = state.lastRaw || JSON.stringify(state.lastBundle || {}, null, 2);

  return `Repair this NPDev artifact bundle.

Validation errors:
${errors}

Rules:
- Return JSON only.
- Keep schemaVersion ${ARTIFACT_BUNDLE_SCHEMA_VERSION}.
- Remove all Safe Beta0 forbidden features.
- Replace reference with uuid ID fields.
- Replace enum with string.
- Replace datetime with date or string.
- Remove findById/findAll/delete.
- Replace CRUD endpoints with /api/flows endpoints.
- Ensure every manifest inputFiles entry exists in artifacts[].

Original artifact bundle:
${raw}
`;
}

async function copyRepairPrompt() {
  await copyText(buildRepairPrompt(), 'Repair prompt copied.');
}

function clearOutput() {
  state.lastPrompt = '';
  state.lastRaw = '';
  state.lastBundle = null;
  state.lastFiles = [];
  state.lastValidation = null;
  $('promptOutput').value = '';
  $('rawOutput').value = '';
  $('artifactList').innerHTML = '';
  $('validationBox').className = 'validation-box';
  $('validationBox').textContent = 'No artifact generated yet.';
  $('promptDiagnostics').textContent = 'Prompt size has not been calculated yet.';
  $('promptDiagnostics').className = 'prompt-diagnostics';
  setDownloadButtons({ bundle: false, zip: false });
  setRepairPromptButton(false);
  setStatus('ready', 'Ready', 'Output cleared.');
}

function updateProviderDefaults() {
  const provider = $('provider').value;
  if (provider === 'mock') {
    $('model').value = 'mock-npdev-generator';
    $('endpointRow').classList.add('hidden');
  } else {
    $('model').value = $('model').value && $('model').value !== 'mock-npdev-generator' ? $('model').value : 'gemini-2.5-flash';
    $('endpointRow').classList.remove('hidden');
  }
}

function loadExample() {
  $('projectName').value = 'Clinic Appointment Manager';
  $('scenarioId').value = 'clinic-appointment-manager';
  $('objective').value = 'Create a small clinic appointment management app. Receptionists register patients and doctors, schedule appointments, change appointment status, and inspect runtime evidence. The app should validate required patient contact information and appointment date/status.';
  $('entities').value = 'Patient, Doctor, Appointment';
  $('mainFlow').value = 'ScheduleAppointment';
  $('backendTarget').value = 'spring-boot-runtimehost';
  $('databaseProvider').value = 'docker-postgres';
  $('serverPort').value = '8083';
  $('complexity').value = 'simple';
  $('constraints').value = 'Beta0 Path B. Keep output conservative. Do not generate trusted-source execution or unsupported custom procedure code.';
  setStatus('ready', 'Example loaded', 'Preview the prompt or generate artifacts.');
}

async function handleGenerate() {
  const input = getFormValues();
  if (!input.objective) {
    setStatus('error', 'Missing objective', 'Describe the project objective first.');
    return;
  }

  if ($('storeEndpoint').checked && input.endpoint) {
    localStorage.setItem('npdev.workerEndpoint', input.endpoint);
  }

  const prompt = buildNpdevPrompt(input);
  const diagnostics = calculateRequestDiagnostics(input, prompt);
  state.lastPrompt = prompt;
  state.lastBundle = null;
  state.lastFiles = [];
  state.lastValidation = null;
  $('promptOutput').value = prompt;
  $('rawOutput').value = '';
  $('artifactList').innerHTML = '';
  $('validationBox').className = 'validation-box';
  $('validationBox').textContent = 'No artifact generated yet.';
  setDownloadButtons({ bundle: false, zip: false });
  setRepairPromptButton(false);
  renderPromptDiagnostics(diagnostics);

  try {
    console.info('[NPDev] generation contract', siteContractSummary());
    console.info('[NPDev] prompt request diagnostics', diagnostics);
    setStatus('busy', 'Generating', input.provider === 'mock' ? 'Generating mock artifacts.' : 'Calling Cloudflare Worker proxy.');
    const raw = await callProvider(input, prompt);
    state.lastRaw = raw;
    $('rawOutput').value = raw;

    console.groupCollapsed('[NPDev] raw provider response');
    console.log(raw);
    console.groupEnd();

    const { bundle, artifacts, validation } = parseArtifactBundle(raw);
    state.lastBundle = bundle;
    state.lastFiles = artifacts;
    renderArtifacts(artifacts, validation);

    if (validation.passed) {
      setStatus('ready', 'Generated', 'Artifacts are ready for review and download.');
    } else {
      setStatus('error', 'Validation failed', 'The AI responded, but artifact validation found issues.');
    }
  } catch (error) {
    console.error('[NPDev] Generation or parse failed', error);
    setStatus('error', 'Generation failed', error.message);
    if (error.rawPayload) {
      state.lastRaw = error.rawPayload;
      $('rawOutput').value = error.rawPayload;
    } else if (!$('rawOutput').value) {
      $('rawOutput').value = error.stack || error.message;
    }
  }
}

function previewPrompt() {
  const input = getFormValues();
  const prompt = buildNpdevPrompt(input);
  const diagnostics = calculateRequestDiagnostics(input, prompt);
  state.lastPrompt = prompt;
  $('promptOutput').value = prompt;
  renderPromptDiagnostics(diagnostics);
  console.info('[NPDev] prompt request diagnostics', diagnostics);
  setStatus('ready', 'Prompt ready', 'Review or copy the prompt before generation.');
}

function init() {
  loadSchemaPack();

  $('generateButton').addEventListener('click', handleGenerate);
  $('previewPromptButton').addEventListener('click', previewPrompt);
  $('clearButton').addEventListener('click', clearOutput);
  $('loadExampleButton').addEventListener('click', loadExample);
  $('downloadBundleButton').addEventListener('click', downloadBundleJson);
  $('downloadZipButton').addEventListener('click', downloadZip);
  $('copyRepairPromptButton').addEventListener('click', copyRepairPrompt);
  $('copyPromptButton').addEventListener('click', () => copyText($('promptOutput').value, 'Prompt copied.'));
  $('copyRawButton').addEventListener('click', () => copyText($('rawOutput').value, 'Raw response copied.'));
  $('provider').addEventListener('change', updateProviderDefaults);

  const savedEndpoint = localStorage.getItem('npdev.workerEndpoint');
  if (savedEndpoint) {
    $('endpoint').value = savedEndpoint;
    $('storeEndpoint').checked = true;
  }

  updateProviderDefaults();
}

document.addEventListener('DOMContentLoaded', init);
