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

const SITE_BUILD_LABEL = 'Web Endpoint Literal False Positive Fix 002';
const CONTRACT_MODE = 'Safe Beta0';
const PROMPT_CONTRACT_VERSION = 'NPDEV_PRECISE_FORMAT_GUIDE v4';
const ARTIFACT_BUNDLE_SCHEMA_VERSION = 'npdev-static-generator-artifact-bundle.v4';
const VALIDATION_MODE = 'lightweight-contract-validation';
const WORKER_REQUEST_NOTICE_BYTES = 64 * 1024;
const WORKER_REQUEST_SOFT_LIMIT_BYTES = 96 * 1024;
const WORKER_REQUEST_HARD_LIMIT_BYTES = 128 * 1024;
const DEFAULT_MAX_OUTPUT_TOKENS = 12000;
const RECOMMENDED_MAX_OUTPUT_TOKENS = 24000;
const HARD_MAX_OUTPUT_TOKENS = 32000;

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
  'no concept-specific CRUD endpoints'
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
        $schema: '..\\\\..\\\\NPDevContract\\\\schemas\\\\config.schema.json',
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
        sampleId: 'scenario-id',
        sampleName: 'Human title',
        category: 'safe-beta0-web-generated',
        description: 'string',
        primaryFlows: ['PascalCaseFlowName'],
        ownedConcepts: ['PascalCaseConcept'],
        verificationTargets: [
          'GET /api/flows',
          'POST /api/flows/PascalCaseFlowName/execute',
          'GET /api/audit',
          'GET /api/correlations/{correlationId}'
        ],
        features: ['concept', 'invariants', 'persistence', 'event', 'trace'],
        mainFlow: 'PascalCaseFlowName',
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
    maxTokens: Number($('maxTokens').value || DEFAULT_MAX_OUTPUT_TOKENS),
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
- invariant functions like date('today'), today(), now(), includes(), regex(), or any function call
- step type "assign"
- persistence operations "findById", "findAll", "delete"
- object-shaped emitEvent.payload
- concept-specific CRUD endpoints

Use these safe fallbacks:
- relationships: uuid fields such as patientId, doctorId
- status: string field; document allowed values in markdown
- date/time: date field or string field; document expected format
- retrieval: do not promise findAll endpoints
- updates: full-object save only if supported, otherwise document as future
- endpoints: use /api/flows and /api/flows/<FlowName>/execute
- appointment date validation: use AppointmentDateRequired with expr "appointmentDate != null"; document future-date validation as a Safe Beta0 limitation

If the user objective asks for advanced features, do not generate them in Safe Beta0.
Use safe fallback fields and record the limitation in generation-notes.md and qualityGates.riskNotes.

SAFE BETA0 SCHEMA SHAPE HARD RULES:
Do not invent alternative NPDev DSL shapes. The browser rejects schema-shaped JSON that uses the wrong property names.
Use exactly:
- flow.input.concept
- flow.input.mode
- step.cap
- step.op
- step.args
- step.out
- return.value
- enforceInvariants.scope
- enforceInvariants.invariants
- invariant.expr

Safe Beta0 event emission must use exactly:
{
  "name": "emit-event",
  "type": "emitEvent",
  "event": "EventName",
  "from": "$saved"
}

Do not use:
- flow.concept
- field-map input objects
- step.capability
- step.operation
- step.map
- invariant.expression
- JavaScript expressions such as .includes(), array literals, or function calls
- emitEvent.payload
- emitEvent.map
- emitEvent from: "EventName"
- object-shaped payloads

If event emission is uncertain, omit the emitEvent step and document the limitation in generation-notes.md.

Manifest shape rules:
- Use the real NPDev manifest schema shape: sampleId, sampleName, category, description, primaryFlows.
- category must be "safe-beta0-web-generated".
- sampleId comes from project.scenarioId.
- sampleName comes from project.name.
- description comes from the objective or business story.
- primaryFlows must list generated model flow names with the main flow first.
- Because manifest.schema.json allows additional properties, also preserve helpful fields when useful: ownedConcepts, verificationTargets, inputFiles, walkthrough, expectedOutcomes, features, mainFlow.

API key and secret rules:
- config.json trialDefaults.apiKey must be exactly "dev-key".
- Never use YOUR_API_KEY, YOUR_API_KEY_HERE, placeholder, real keys, or empty strings.
- Do not generate real secrets anywhere in config.json or generated artifacts.

Date invariant rules:
- Safe Beta0 invariant expressions must not use functions.
- Do not use date('today'), today(), now(), includes(), regex(), or any function call.
- For appointment date, use only AppointmentDateRequired with expr "appointmentDate != null".
- Do not enforce future-date in model.json.
- Document future-date validation as a known Safe Beta0 limitation in generation-notes.md and qualityGates.riskNotes.

Config path rules:
- Use NPDevGenerator relative paths like "..\\Output", "..\\..\\NPDevRuntimeHost", "..\\Output\\ArtifactNP", and "..\\Output\\App".
- Do not use website-local paths like "contracts/config.schema.json", "output/<scenario>", "bootstrap", "artifacts", or "final-exec".
- Use scenario.name as kebab-case with no spaces.
- Use runtime.springProfile "dev,step0,trial" unless the user explicitly asks for a different compatible profile.

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
   - trialDefaults.apiKey: "dev-key"
9. model.json content must be a JSON object using NPDev DSL 1.0.0 shape:
   - dslVersion: "1.0.0"
   - version: "1.0"
   - namespace
   - concepts[] with fields[] and invariants[]
   - capabilities[] and bindings[]
   - events[] when useful
   - flows[] with steps such as enforceInvariants, capabilityCall, emitEvent, return
   - queries/procedures/panels only if the objective needs them and they stay declarative
10. manifest.json must include sampleId, sampleName, category, description, primaryFlows. It may also include ownedConcepts, verificationTargets, inputFiles, walkthrough, expectedOutcomes, features, and mainFlow because the real NPDev schema allows additional properties.
11. expected-behavior.md and expected-endpoints.md must explain what NPDev runtime should expose and how to validate it.
12. Do not output Java, TypeScript, SQL, Gradle, or Docker files.
13. Do not invent unsupported custom runtime code.
14. Keep Safe Beta0 restrictions. Advanced mode is not active in this site.
15. Do not invent concept-specific CRUD endpoints. Prefer runtime flow and evidence endpoints already used by NPDev Beta0 examples.
16. If something is uncertain, make a conservative assumption and record it in project.assumptions and qualityGates.missingInformation.
17. qualityGates.validationMode must be "${VALIDATION_MODE}".
18. qualityGates.requiredArtifacts must list ${REQUIRED_ARTIFACT_PATHS.join(', ')}.
19. qualityGates.safeBeta0Restrictions must list the Safe Beta0 restrictions above.
20. manifest.inputFiles, when present, must reference only files also present in artifacts[]. Keep input/example-request.json as an artifact even if manifest inputFiles is omitted in a future schema.
21. expected-endpoints.md must list only conservative runtime endpoints: GET /api/flows, POST /api/flows/<FlowName>/execute, GET /api/audit, GET /api/correlations/{correlationId}.
22. Keep the model small. Prefer 1 to 4 concepts and 1 to 3 flows.
23. Use valid JSON only. JSON.parse must succeed.
24. If persistence is used, model.bindings must include { "capability": "persistence", "adapter": "repository" }.
25. If events or emitEvent steps are used, model.bindings must include { "capability": "eventBus", "adapter": "inproc" }.
26. EventBusCapability may use operations ["emitEvent"], but persistence must use operations ["save"] only.
27. config.json trialDefaults.apiKey must be "dev-key". Do not generate real secrets anywhere.
28. Use AppointmentDateRequired with expr "appointmentDate != null"; move future-date validation to generation-notes.md and qualityGates.riskNotes.

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
    "Forbidden Safe Beta0: reference, enum, datetime, search-dialog, date('today'), today(), now(), includes(), regex(), any invariant function call, assign, findById, findAll, delete, object-shaped emitEvent.payload, versioned CRUD endpoint prefixes, clinic CRUD endpoints, or concept-specific CRUD endpoints.",
    'Required NPDev DSL shape: flow.input.concept, flow.input.mode, step.cap, step.op, step.args, step.out, return.value, enforceInvariants.scope, enforceInvariants.invariants, invariant.expr.',
    'Required emitEvent shape: { name, type: "emitEvent", event: "EventName", from: "$saved" }. Do not use payload, map, from: "EventName", or object-shaped payloads.',
    'Required NPDev manifest shape: sampleId, sampleName, category, description, primaryFlows. category must be safe-beta0-web-generated. Additional properties are allowed by the real schema, so inputFiles, walkthrough, expectedOutcomes, features, mainFlow, ownedConcepts, and verificationTargets may be preserved.',
    'Required API key placeholder: config.json trialDefaults.apiKey must be exactly "dev-key"; do not use YOUR_API_KEY, YOUR_API_KEY_HERE, placeholder, real keys, or empty strings; do not generate real secrets.',
    'Appointment date invariant: use AppointmentDateRequired with expr "appointmentDate != null"; do not enforce future-date in model.json; document future-date validation as a Safe Beta0 limitation in generation-notes.md and qualityGates.riskNotes.',
    'Forbidden invented shape: flow.concept, field-map input objects, step.capability, step.operation, step.map, invariant.expression, JavaScript expressions such as .includes(), array literals, or function calls.',
    'Required config style: NPDevGenerator relative paths such as ..\\Output, ..\\..\\NPDevRuntimeHost, ..\\Output\\ArtifactNP, and ..\\Output\\App; no website-local contracts/config.schema.json, output/<scenario>, bootstrap, artifacts, or final-exec paths.'
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
    { "path": "config.json", "content": { "$schema": "..\\\\..\\\\NPDevContract\\\\schemas\\\\config.schema.json", "configVersion": "1.0", "scenario": { "name": "kebab-case", "outputRoot": "..\\\\Output" }, "generator": {}, "bootstrap": { "root": "..\\\\..\\\\NPDevRuntimeHost", "mergeStrategy": "clean-copy" }, "artifact": { "root": "..\\\\Output\\\\ArtifactNP", "generatedFolderName": "npdev-generated", "libsFolderName": "libs", "metaFolderName": "npdev-meta" }, "finalExec": { "root": "..\\\\Output\\\\App" }, "database": {}, "runtime": { "springProfile": "dev,step0,trial" }, "trialDefaults": { "apiKey": "dev-key" } } },
    { "path": "model.json", "content": { "$schema": "contracts/model.schema.json", "namespace": "trial.example", "dslVersion": "1.0.0", "version": "1.0", "concepts": [{ "name": "Appointment", "fields": [{ "name": "patientId", "type": "uuid", "ui": { "label": "Patient ID", "widget": "text" } }], "invariants": [{ "name": "AppointmentPatientRequired", "expr": "patientId != null && patientId != ''" }] }], "capabilities": [{ "name": "persistence", "type": "PersistenceCapability", "operations": ["save"] }], "bindings": [{ "capability": "persistence", "adapter": "repository" }, { "capability": "eventBus", "adapter": "inproc" }], "events": [], "flows": [{ "name": "ScheduleAppointment", "input": { "concept": "Appointment", "mode": "create" }, "steps": [{ "name": "validate-input", "type": "enforceInvariants", "scope": "Appointment", "invariants": ["AppointmentPatientRequired"] }, { "name": "save-record", "type": "capabilityCall", "cap": "persistence", "op": "save", "args": ["$input"], "out": "$saved" }, { "name": "return-record", "type": "return", "value": "$saved" }] }] } },
    { "path": "manifest.json", "content": { "sampleId": "kebab-case", "sampleName": "...", "category": "safe-beta0-web-generated", "description": "...", "primaryFlows": ["ScheduleAppointment"], "ownedConcepts": ["Appointment"], "verificationTargets": ["GET /api/flows", "POST /api/flows/ScheduleAppointment/execute", "GET /api/audit", "GET /api/correlations/{correlationId}"], "inputFiles": ["input/example-request.json"], "walkthrough": [], "expectedOutcomes": [], "features": [], "mainFlow": "ScheduleAppointment" } },
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

function effectiveMaxOutputTokens(requestedMaxOutputTokens) {
  const requested = Number(requestedMaxOutputTokens);
  if (!Number.isFinite(requested)) return DEFAULT_MAX_OUTPUT_TOKENS;
  return Math.min(Math.max(requested, 1024), HARD_MAX_OUTPUT_TOKENS);
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
  const promptBytes = utf8ByteLength(prompt);
  const requestJsonBytes = utf8ByteLength(requestJson);
  const requestedMaxOutputTokens = Number(input.maxTokens || DEFAULT_MAX_OUTPUT_TOKENS);
  const knownEffectiveMaxOutputTokens = effectiveMaxOutputTokens(requestedMaxOutputTokens);
  const compactModeEnabled = !input.includeFullSchemas;
  let requestSizeLevel = 'ok';
  if (requestJsonBytes >= WORKER_REQUEST_NOTICE_BYTES) requestSizeLevel = 'notice';
  if (requestJsonBytes >= WORKER_REQUEST_SOFT_LIMIT_BYTES) requestSizeLevel = 'warning';
  if (requestJsonBytes > WORKER_REQUEST_HARD_LIMIT_BYTES) requestSizeLevel = 'blocked';

  return {
    promptChars: prompt.length,
    promptBytes,
    requestJsonBytes,
    requestBytes: requestJsonBytes,
    model: input.model,
    requestedMaxOutputTokens,
    effectiveMaxOutputTokens: knownEffectiveMaxOutputTokens,
    maxOutputWasClamped: knownEffectiveMaxOutputTokens !== requestedMaxOutputTokens,
    maxOutputTokens: requestedMaxOutputTokens,
    includeFullSchemas: Boolean(input.includeFullSchemas),
    compactModeEnabled,
    workerNoticeBytes: WORKER_REQUEST_NOTICE_BYTES,
    workerSoftLimitBytes: WORKER_REQUEST_SOFT_LIMIT_BYTES,
    workerHardLimitBytes: WORKER_REQUEST_HARD_LIMIT_BYTES,
    requestSizeLevel,
    nearLimit: requestSizeLevel === 'warning' || requestSizeLevel === 'blocked',
    shouldBlock: requestSizeLevel === 'blocked',
    tokenWarning: requestedMaxOutputTokens > RECOMMENDED_MAX_OUTPUT_TOKENS
  };
}

function renderPromptDiagnostics(diagnostics) {
  const box = $('promptDiagnostics');
  if (!box) return;
  box.className = `prompt-diagnostics ${diagnostics.requestSizeLevel === 'ok' ? '' : diagnostics.requestSizeLevel}`.trim();
  box.innerHTML = `
    <strong>Prompt size:</strong>
    ${diagnostics.promptChars.toLocaleString()} chars,
    ${diagnostics.promptBytes.toLocaleString()} prompt bytes,
    ${diagnostics.requestJsonBytes.toLocaleString()} request JSON bytes.
    <strong>Model:</strong> ${escapeHtml(diagnostics.model)}.
    <strong>Max output:</strong> requested ${Number(diagnostics.requestedMaxOutputTokens).toLocaleString()} tokens, effective ${Number(diagnostics.effectiveMaxOutputTokens).toLocaleString()} tokens.
    ${diagnostics.includeFullSchemas ? '<span>Full schema prompt mode may exceed proxy limits.</span>' : '<span>Compact schema prompt mode active.</span>'}
    <span>Worker limits: notice ${diagnostics.workerNoticeBytes.toLocaleString()} bytes, warning ${diagnostics.workerSoftLimitBytes.toLocaleString()} bytes, hard ${diagnostics.workerHardLimitBytes.toLocaleString()} bytes.</span>
    ${diagnostics.requestSizeLevel === 'notice' ? '<span>Request size is moderate but below the Worker warning threshold.</span>' : ''}
    ${diagnostics.requestSizeLevel === 'warning' ? '<span>Request is close to the proxy hard limit. Reduce prompt detail or keep compact mode enabled.</span>' : ''}
    ${diagnostics.requestSizeLevel === 'blocked' ? '<span>Request exceeds the Worker hard limit and will not be sent.</span>' : ''}
    ${diagnostics.tokenWarning ? `<span>Requested max output tokens exceed the recommended ${RECOMMENDED_MAX_OUTPUT_TOKENS.toLocaleString()} token limit. The Worker hard cap is ${HARD_MAX_OUTPUT_TOKENS.toLocaleString()}.</span>` : ''}
    ${diagnostics.maxOutputWasClamped ? '<span>The Worker will clamp max output tokens before calling Gemini.</span>' : ''}
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

function buildPromptTooLargeError(diagnostics) {
  const rawPayload = JSON.stringify({
    error: 'prompt_too_large',
    message: 'Prompt exceeds this proxy limit.',
    requestBytes: diagnostics.requestJsonBytes,
    limitBytes: diagnostics.workerHardLimitBytes,
    suggestion: 'Use compact prompt mode, reduce schema context, or lower prompt detail.'
  }, null, 2);
  const error = new Error('Prompt is too large for the proxy. The site should use compact schema guidance instead of full schemas. Reduce prompt detail or switch to compact mode.');
  error.rawPayload = rawPayload;
  error.isProviderError = true;
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
    errors.push(...inspectConfigShape(config));
  }

  if (model && typeof model === 'object') {
    if (model.dslVersion !== '1.0.0') errors.push('model.json must include dslVersion "1.0.0".');
    if (!model.version) errors.push('model.json must include version.');
    if (!Array.isArray(model.concepts) || !model.concepts.length) errors.push('model.json must include at least one concept.');
    errors.push(...inspectModelShape(model));
  }

  if (manifest && typeof manifest === 'object') {
    errors.push(...inspectManifestShape(manifest));
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
      const isPersistenceCapability = capability.name === 'persistence' || capability.type === 'PersistenceCapability';
      for (const op of Array.isArray(capability.operations) ? capability.operations : []) {
        if (isPersistenceCapability && !SAFE_BETA0_ALLOWED_CAPABILITY_OPS.includes(op)) {
          errors.add(`Safe Beta0 violation: persistence includes ${op}. Safe Beta0 allows only save.`);
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
        const stepCap = step.cap || step.capability || '';
        if (step.type === 'capabilityCall' && stepCap === 'persistence' && step.op && step.op !== 'save') {
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

  const endpointMatches = Array.from(endpointText.matchAll(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?`?\s*(GET|POST|PUT|PATCH|DELETE)\s+([^\s`*),.;]+)/gi));

  for (const match of endpointMatches) {
    const method = String(match[1] || '').toUpperCase();
    const path = String(match[2] || '').replace(/[.,;:]+$/g, '');
    const endpoint = `${method} ${path}`;

    const allowed = endpoint === 'GET /api/flows'
      || endpoint === 'GET /api/audit'
      || endpoint === 'GET /api/correlations/{correlationId}'
      || /^POST \/api\/flows\/[^/\s`]+\/execute$/.test(endpoint);

    if (!allowed) {
      errors.add(`Safe Beta0 violation: expected-endpoints.md declares unsupported active endpoint ${endpoint}. Use flow endpoints only.`);
    }
  }

  return [...errors];
}

function inspectConfigShape(config) {
  const errors = [];
  const schemaPath = normalizeContractPath(config.$schema);
  const scenarioName = String(config.scenario?.name || '');
  const outputRoot = normalizeContractPath(config.scenario?.outputRoot);
  const bootstrapRoot = normalizeContractPath(config.bootstrap?.root);
  const artifactRoot = normalizeContractPath(config.artifact?.root);
  const finalExecRoot = normalizeContractPath(config.finalExec?.root);
  const springProfile = String(config.runtime?.springProfile || '').trim();
  const apiKey = String(config.trialDefaults?.apiKey || '').trim();

  if (schemaPath === 'contracts/config.schema.json') {
    errors.push('config.json $schema must not use website-local path contracts/config.schema.json. Use an NPDevGenerator relative schema path.');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scenarioName)) {
    errors.push('config.json scenario.name must be kebab-case with no spaces.');
  }
  if (!isNpdevRelativePath(outputRoot) || /^output(\/|$)/i.test(outputRoot)) {
    errors.push('config.json scenario.outputRoot must use NPDev relative output style such as ..\\Output, not website-local output paths.');
  }
  if (bootstrapRoot === 'bootstrap') {
    errors.push('config.json bootstrap.root must not be just bootstrap. Use an NPDev runtime root such as ..\\..\\NPDevRuntimeHost.');
  }
  if (artifactRoot === 'artifacts') {
    errors.push('config.json artifact.root must not be just artifacts. Use an NPDev output path such as ..\\Output\\ArtifactNP.');
  }
  if (finalExecRoot === 'final-exec') {
    errors.push('config.json finalExec.root must not be just final-exec. Use an NPDev output path such as ..\\Output\\App.');
  }
  if (apiKey !== 'dev-key') {
    errors.push('config.json trialDefaults.apiKey must be "dev-key". Do not use YOUR_API_KEY, YOUR_API_KEY_HERE, placeholder, real keys, or empty strings.');
  }
  if (springProfile === 'default') {
    errors.push('config.json runtime.springProfile must not be only default. Safe Beta0 expects dev,step0,trial unless explicitly justified.');
  }

  return errors;
}

function inspectModelShape(model) {
  const errors = [];
  const bindings = Array.isArray(model.bindings) ? model.bindings : [];
  const flows = Array.isArray(model.flows) ? model.flows : [];
  let usesPersistence = false;
  let usesEvents = Array.isArray(model.events) && model.events.length > 0;

  for (const concept of Array.isArray(model.concepts) ? model.concepts : []) {
    for (const invariant of Array.isArray(concept.invariants) ? concept.invariants : []) {
      const invariantName = `${concept.name || 'concept'}.${invariant.name || 'invariant'}`;
      if (Object.prototype.hasOwnProperty.call(invariant, 'expression')) {
        errors.push(`Safe Beta0 schema shape violation: ${invariantName} uses invariant.expression. Use invariant.expr.`);
      }
      if (invariant.type === 'expression') {
        errors.push(`Safe Beta0 schema shape violation: ${invariantName} uses type expression. Use a simple invariant.expr string.`);
      }
      errors.push(...inspectInvariantExpression(invariant.expr, invariantName));
    }
  }

  for (const capability of Array.isArray(model.capabilities) ? model.capabilities : []) {
    if (capability.name === 'persistence' && Array.isArray(capability.operations) && capability.operations.includes('save')) {
      usesPersistence = true;
    }
  }

  for (const flow of flows) {
    const flowName = flow.name || 'flow';
    if (Object.prototype.hasOwnProperty.call(flow, 'concept')) {
      errors.push(`Safe Beta0 schema shape violation: ${flowName} uses flow.concept. Use flow.input.concept.`);
    }
    if (!flow.input || typeof flow.input !== 'object' || Array.isArray(flow.input)) {
      errors.push(`Safe Beta0 schema shape violation: ${flowName} must use input: { concept, mode }.`);
    } else {
      const inputKeys = Object.keys(flow.input);
      const looksLikeFieldMap = inputKeys.some((key) => {
        const value = flow.input[key];
        return value && typeof value === 'object' && (Object.prototype.hasOwnProperty.call(value, 'type') || Object.prototype.hasOwnProperty.call(value, 'required'));
      });
      if (looksLikeFieldMap) {
        errors.push(`Safe Beta0 schema shape violation: ${flowName} uses input as field definitions. Use input: { concept, mode }.`);
      }
      if (!flow.input.concept) errors.push(`Safe Beta0 schema shape violation: ${flowName} missing input.concept.`);
      if (!flow.input.mode) errors.push(`Safe Beta0 schema shape violation: ${flowName} missing input.mode.`);
    }

    for (const step of Array.isArray(flow.steps) ? flow.steps : []) {
      const stepName = `${flowName}.${step.name || step.type || 'step'}`;
      if (step.type === 'capabilityCall') {
        usesPersistence = usesPersistence || step.cap === 'persistence' || step.capability === 'persistence';
        if (Object.prototype.hasOwnProperty.call(step, 'capability')) {
          errors.push(`Safe Beta0 schema shape violation: ${stepName} uses step.capability. Use step.cap.`);
        }
        if (Object.prototype.hasOwnProperty.call(step, 'operation')) {
          errors.push(`Safe Beta0 schema shape violation: ${stepName} uses step.operation. Use step.op.`);
        }
        if (Object.prototype.hasOwnProperty.call(step, 'map')) {
          errors.push(`Safe Beta0 schema shape violation: ${stepName} uses step.map. Use step.args and step.out.`);
        }
        if (!step.cap) errors.push(`Safe Beta0 schema shape violation: ${stepName} missing step.cap.`);
        if (!step.op) errors.push(`Safe Beta0 schema shape violation: ${stepName} missing step.op.`);
        if (!Array.isArray(step.args)) errors.push(`Safe Beta0 schema shape violation: ${stepName} must include args array.`);
        if (!step.out) errors.push(`Safe Beta0 schema shape violation: ${stepName} must include out.`);
      }
      if (step.type === 'enforceInvariants') {
        if (Object.prototype.hasOwnProperty.call(step, 'concept')) {
          errors.push(`Safe Beta0 schema shape violation: ${stepName} uses step.concept. Use step.scope.`);
        }
        if (!step.scope) errors.push(`Safe Beta0 schema shape violation: ${stepName} missing scope.`);
        if (!Array.isArray(step.invariants)) errors.push(`Safe Beta0 schema shape violation: ${stepName} must include invariants array.`);
      }
      if (step.type === 'return') {
        if (Object.prototype.hasOwnProperty.call(step, 'map')) {
          errors.push(`Safe Beta0 schema shape violation: ${stepName} uses step.map. Use return.value.`);
        }
        if (!Object.prototype.hasOwnProperty.call(step, 'value')) {
          errors.push(`Safe Beta0 schema shape violation: ${stepName} missing return.value.`);
        }
      }
      if (step.type === 'emitEvent') {
        usesEvents = true;
        if (!step.event) {
          errors.push(`Safe Beta0 schema shape violation: ${stepName} missing event. Use emitEvent.event for the event name.`);
        }
        if (Object.prototype.hasOwnProperty.call(step, 'map')) {
          errors.push(`Safe Beta0 schema shape violation: ${stepName} uses step.map. Use emitEvent.event and emitEvent.from.`);
        }
        if (typeof step.from === 'string' && step.from && !step.from.startsWith('$')) {
          errors.push(`Safe Beta0 schema shape violation: ${stepName} uses from as an event name. Use event for the event name and from as a data reference such as $saved.`);
        }
      }
    }
  }

  if (usesPersistence && !bindings.length) {
    errors.push('Safe Beta0 schema shape violation: model.bindings must not be empty when persistence is used.');
  }
  if (usesPersistence && !bindings.some((binding) => binding.capability === 'persistence' && binding.adapter === 'repository')) {
    errors.push('Safe Beta0 schema shape violation: model.bindings must include persistence -> repository when persistence is used.');
  }
  if (usesEvents && !bindings.some((binding) => binding.capability === 'eventBus' && binding.adapter === 'inproc')) {
    errors.push('Safe Beta0 schema shape violation: model.bindings must include eventBus -> inproc when events or emitEvent steps are used.');
  }

  return errors;
}

function inspectInvariantExpression(expr, invariantName) {
  if (typeof expr !== 'string') return [];
  const errors = [];
  if (/\.includes\s*\(/i.test(expr)) {
    errors.push(`Safe Beta0 schema shape violation: ${invariantName} uses .includes(). Use simple comparisons in invariant.expr.`);
  }
  if (/\[[^\]]*\]/.test(expr)) {
    errors.push(`Safe Beta0 schema shape violation: ${invariantName} uses an array literal. Use simple comparisons in invariant.expr.`);
  }
  const functionMatch = expr.match(/\b([A-Za-z_]\w*)\s*\(/);
  if (functionMatch) {
    errors.push(`Safe Beta0 schema shape violation: ${invariantName} uses function call ${functionMatch[1]}(...). Use simple comparisons in invariant.expr.`);
  }
  if (/(^|[^=!])={3}|!==|=>|;|\b(const|let|var|return)\b/.test(expr)) {
    errors.push(`Safe Beta0 schema shape violation: ${invariantName} uses JavaScript syntax. Use simple NPDev expression strings.`);
  }
  return errors;
}

function inspectManifestShape(manifest) {
  const errors = [];
  const required = ['sampleId', 'sampleName', 'category', 'description', 'primaryFlows'];
  const requiredStrings = ['sampleId', 'sampleName', 'category', 'description'];

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(manifest, key)) {
      errors.push(`manifest.json must include ${key}.`);
    }
  }
  for (const key of requiredStrings) {
    if (Object.prototype.hasOwnProperty.call(manifest, key) && (!manifest[key] || typeof manifest[key] !== 'string')) {
      errors.push(`manifest.json ${key} must be a non-empty string.`);
    }
  }
  if (manifest.category && manifest.category !== 'safe-beta0-web-generated') {
    errors.push('manifest.json category must be safe-beta0-web-generated for website-generated Safe Beta0 artifacts.');
  }
  for (const key of ['primaryFlows', 'ownedConcepts', 'verificationTargets', 'features', 'inputFiles', 'walkthrough', 'expectedOutcomes']) {
    if (Object.prototype.hasOwnProperty.call(manifest, key) && !Array.isArray(manifest[key])) {
      errors.push(`manifest.json ${key} must be an array.`);
    }
  }
  if (Array.isArray(manifest.primaryFlows) && !manifest.primaryFlows.length) {
    errors.push('manifest.json primaryFlows must include at least one flow name.');
  }
  if (typeof manifest.mainFlow === 'string' && Array.isArray(manifest.primaryFlows) && !manifest.primaryFlows.includes(manifest.mainFlow)) {
    errors.push('manifest.json primaryFlows must include mainFlow when mainFlow is present.');
  }

  return errors;
}

function normalizeContractPath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function isNpdevRelativePath(value) {
  return /^\.\.(\/|$)/.test(normalizeContractPath(value));
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
  updateDownloadFilenamePreview(validation.passed);
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

function updateDownloadFilenamePreview(zipEnabled = false) {
  const box = $('downloadFilenamePreview');
  if (!box) return;
  if (!state.lastBundle) {
    box.textContent = 'Download filename will appear after generation.';
    return;
  }

  const baseName = buildArtifactDownloadBaseName(state.lastBundle, getCurrentProviderDownloadLabel());
  const jsonName = `${baseName}.json`;
  const zipName = `${baseName}.zip`;
  const zipText = zipEnabled ? zipName : `${zipName} (disabled until validation passes)`;
  box.innerHTML = `<strong>Download filenames:</strong> JSON <code>${escapeHtml(jsonName)}</code> | ZIP <code>${escapeHtml(zipText)}</code>`;
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
  const conceptNames = entities.map((entityName) => toPascalCase(entityName));
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
          $schema: '..\\..\\NPDevContract\\schemas\\config.schema.json',
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
          sampleId: scenarioId,
          sampleName: name,
          category: 'safe-beta0-web-generated',
          description: objective,
          primaryFlows: [mainFlow],
          ownedConcepts: conceptNames,
          verificationTargets: [
            'GET /api/flows',
            `POST /api/flows/${mainFlow}/execute`,
            'GET /api/audit',
            'GET /api/correlations/{correlationId}'
          ],
          complexity: input.complexity || 'simple',
          mainFlow,
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
  const filename = `${buildArtifactDownloadBaseName(state.lastBundle, getCurrentProviderDownloadLabel())}.json`;
  downloadTextFile(filename, JSON.stringify(state.lastBundle, null, 2) + '\n');
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
  link.download = `${buildArtifactDownloadBaseName(state.lastBundle, getCurrentProviderDownloadLabel())}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildArtifactDownloadBaseName(bundle, providerLabel = 'Gemini-Flash') {
  const projectValue = bundle?.project?.name || bundle?.project?.scenarioId || 'NPDev-Artifacts';
  const safeProvider = sanitizeFilenameSegment(providerLabel || 'Gemini-Flash') || 'Gemini-Flash';
  const safeProject = sanitizeFilenameSegment(projectValue) || 'NPDev-Artifacts';
  return `npdev-artifact-bundle_${safeProvider}_${safeProject}_${formatDownloadDate(new Date())}`;
}

function getCurrentProviderDownloadLabel() {
  const model = String($('model')?.value || '').trim();
  if (/gemini/i.test(model) && /flash/i.test(model)) return 'Gemini-Flash';
  if (/flash/i.test(model)) return 'Gemini-Flash';
  if ($('provider')?.value === 'mock') return 'Mock';
  return sanitizeFilenameSegment(model) || 'Gemini-Flash';
}

function sanitizeFilenameSegment(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDownloadDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
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
  const errorList = validation.errors || [];
  const errors = errorList.length
    ? errorList.join('\n')
    : 'No validation errors were captured.';
  const raw = state.lastRaw || JSON.stringify(state.lastBundle || {}, null, 2);
  const targetedGuidance = buildTargetedRepairGuidance(errorList);

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
- Replace trialDefaults.apiKey with "dev-key". Do not use real secrets.
- Remove function calls from invariant.expr, including date('today'), today(), now(), includes(), and regex().
- Use NPDevGenerator config paths such as ..\\Output, ..\\..\\NPDevRuntimeHost, ..\\Output\\ArtifactNP, and ..\\Output\\App.
- Use flow.input.concept, flow.input.mode, step.cap, step.op, step.args, step.out, enforceInvariants.scope, invariant.expr, and return.value.
- Do not use flow.concept, field-map input objects, step.capability, step.operation, step.map, invariant.expression, JavaScript expressions, or empty bindings when persistence is used.
${targetedGuidance}

Original artifact bundle:
${raw}
`;
}

function buildTargetedRepairGuidance(errors) {
  const text = errors.join('\n');
  const guidance = [];
  if (/manifest\.json|sample-manifest|sampleId|sampleName|category|description|primaryFlows|ownedConcepts|verificationTargets|\bid\b|\btitle\b|\bmainFlow\b/i.test(text)) {
    guidance.push(`\nManifest repair:\n- Use the real NPDev manifest schema keys: sampleId, sampleName, category, description, and primaryFlows.\n- Replace id with sampleId.\n- Replace title with sampleName.\n- Set category to "safe-beta0-web-generated".\n- Set description from purpose, businessStory, or the project objective.\n- Convert mainFlow into primaryFlows: [mainFlow], and include every model flow name with the main flow first.\n- Preserve inputFiles, walkthrough, expectedOutcomes, features, mainFlow, ownedConcepts, and verificationTargets when useful because the current NPDev manifest schema allows additional properties.\n- Keep inputFiles as an array and ensure every path exists in artifacts[].`);
  }
  if (/emitEvent\.payload|object-shaped/i.test(text)) {
    guidance.push(`\nEvent repair:\n- Replace object-shaped emitEvent payload steps like { "type": "emitEvent", "from": "AppointmentScheduledEvent", "payload": { ... } } with { "name": "emit-event", "type": "emitEvent", "event": "AppointmentScheduledEvent", "from": "$savedAppointment" }.\n- Do not use payload, map, or from: "EventName" on emitEvent steps.`);
  }
  if (/trialDefaults\.apiKey|YOUR_API_KEY|placeholder|empty strings/i.test(text)) {
    guidance.push(`\nAPI key repair:\n- Replace trialDefaults.apiKey with "dev-key".\n- Do not use real secrets.`);
  }
  if (/function call|date\(|today\(|now\(|includes\(|regex\(|AppointmentDateFuture/i.test(text)) {
    guidance.push(`\nDate invariant repair:\n- Remove AppointmentDateFuture or replace it with AppointmentDateRequired: appointmentDate != null.\n- Move future-date validation to generation-notes.md as a limitation.\n- Add the limitation to qualityGates.riskNotes.`);
  }
  return guidance.join('\n');
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
  updateDownloadFilenamePreview(false);
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
  updateDownloadFilenamePreview(false);
  setDownloadButtons({ bundle: false, zip: false });
  setRepairPromptButton(false);
  renderPromptDiagnostics(diagnostics);

  try {
    console.info('[NPDev] generation contract', siteContractSummary());
    console.info('[NPDev] prompt request diagnostics', diagnostics);
    if (input.provider === 'cloudflare' && diagnostics.shouldBlock) {
      throw buildPromptTooLargeError(diagnostics);
    }
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

