# OPNet Project Setup Guidelines

**CRITICAL: Read this FIRST before creating any OPNet project.**

This document covers package versions, configurations, and project setup for ALL OPNet project types.

---

## TYPESCRIPT LAW (MANDATORY - READ FIRST)

**BEFORE WRITING ANY CODE, YOU MUST READ AND FOLLOW:**

**`docs/core-typescript-law-CompleteLaw.md`**

**The TypeScript Law is NON-NEGOTIABLE.** It defines strict rules for type safety, code quality, and security. Every line of code must comply. Violations lead to exploitable, broken code that will be rejected.

**Key prohibitions:**
- `any` type - FORBIDDEN everywhere
- `unknown` (except at system boundaries) - FORBIDDEN
- `object` (lowercase) - FORBIDDEN
- `Function` (uppercase) - FORBIDDEN
- `{}` empty object type - FORBIDDEN
- `!` non-null assertion - FORBIDDEN
- `// @ts-ignore` - FORBIDDEN
- `eslint-disable` - FORBIDDEN
- Section separator comments (`// ===`, `// ---`) - FORBIDDEN

**Read the full TypeScript Law before proceeding.**

---

## Table of Contents

1. [Package Versions](#package-versions)
2. [Contract Project Setup](#contract-project-setup)
3. [Unit Test Project Setup](#unit-test-project-setup)
4. [Frontend Project Setup](#frontend-project-setup)
5. [TypeScript Law](#typescript-law)
6. [ESLint Configuration](#eslint-configuration)

---

## Package Versions

**NEVER GUESS PACKAGE VERSIONS.** OPNet packages are actively developed with beta releases. Using wrong versions causes build failures.

### Contract Dependencies

```json
{
    "dependencies": {
        "@btc-vision/as-bignum": "0.1.0-beta.0",
        "@btc-vision/btc-runtime": "1.11.0-beta.0"
    },
    "devDependencies": {
        "assemblyscript": "^0.28.9",
        "@btc-vision/opnet-transform": "^0.2.1"
    },
    "overrides": {
        "@noble/hashes": "2.1.0"
    }
}
```

### Unit Test Dependencies

Unit tests are **TypeScript** (NOT AssemblyScript). They have a SEPARATE package.json.

```json
{
    "type": "module",
    "dependencies": {
        "@btc-vision/unit-test-framework": "0.4.10",
        "@btc-vision/transaction": "1.8.0-beta.9"
    },
    "devDependencies": {
        "typescript": "^5.9.3",
        "ts-node": "^10.9.2",
        "gulp": "^5.0.0",
        "@types/node": "^25.0.0"
    },
    "overrides": {
        "@noble/hashes": "2.1.0"
    }
}
```

### Frontend Dependencies

```json
{
    "dependencies": {
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "opnet": "1.8.1-beta.12",
        "@btc-vision/transaction": "1.8.0-beta.9",
        "@btc-vision/bitcoin": "7.0.0-alpha.10",
        "@btc-vision/ecpair": "4.0.2",
        "@btc-vision/bip32": "7.0.2",
        "@btc-vision/walletconnect": "1.10.0-beta.0"
    },
    "devDependencies": {
        "vite": "^7.3.1",
        "@vitejs/plugin-react": "^4.3.4",
        "vite-plugin-node-polyfills": "^0.22.0",
        "typescript": "^5.9.3"
    },
    "overrides": {
        "@noble/hashes": "2.1.0"
    }
}
```

**IMPORTANT:** Vite 6.x is NOT compatible with vite-plugin-node-polyfills 0.22.0. Use Vite 5.x.

---

## Contract Project Setup

### Directory Structure

```
my-contract/
├── src/
│   ├── index.ts           # Entry point (factory + abort)
│   └── MyContract.ts      # Contract implementation
├── build/                 # Compiled WASM output
├── package.json
├── asconfig.json          # AssemblyScript config
└── tsconfig.json          # TypeScript config (for IDE)
```

### asconfig.json (CRITICAL)

```json
{
    "targets": {
        "debug": {
            "outFile": "build/MyContract.wasm",
            "textFile": "build/MyContract.wat"
        }
    },
    "options": {
        "transform": "@btc-vision/opnet-transform",
        "sourceMap": false,
        "optimizeLevel": 3,
        "shrinkLevel": 1,
        "converge": true,
        "noAssert": false,
        "enable": [
            "sign-extension",
            "mutable-globals",
            "nontrapping-f2i",
            "bulk-memory",
            "simd",
            "reference-types",
            "multi-value"
        ],
        "runtime": "stub",
        "memoryBase": 0,
        "initialMemory": 1,
        "exportStart": "start",
        "use": [
            "abort=index/abort"
        ]
    }
}
```

**Key points:**
- `transform`: Must be `@btc-vision/opnet-transform` (NOT a subpath)
- `enable`: ALL listed features are required
- `use`: Must point to your abort handler (`abort=index/abort` means `src/index.ts` exports `abort`)
- `runtime`: Must be `"stub"`
- `exportStart`: Must be `"start"`

### package.json scripts

```json
{
    "scripts": {
        "build": "asc src/index.ts --config asconfig.json --target debug",
        "clean": "rm -rf build/*"
    }
}
```

---

## Unit Test Project Setup

**Unit tests are TypeScript, NOT AssemblyScript.** They run in Node.js and load the compiled WASM.

### Directory Structure

```
my-contract/
├── src/                   # Contract source (AssemblyScript)
├── build/                 # Compiled WASM
├── tests/                 # Unit tests (TypeScript)
│   ├── MyContract.test.ts
│   └── tsconfig.json      # Separate tsconfig for tests
├── package.json
└── asconfig.json
```

### Test tsconfig.json

```json
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "outDir": "./build"
    },
    "include": ["*.ts"]
}
```

### Test package.json scripts

```json
{
    "scripts": {
        "test": "npx ts-node --esm tests/MyContract.test.ts"
    }
}
```

---

## Frontend Project Setup

### Directory Structure

```
my-frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Utility classes/functions
│   ├── services/          # API/contract services
│   ├── types/             # TypeScript interfaces
│   └── abi/               # Contract ABIs
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            include: ['buffer', 'crypto', 'stream', 'util'],
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
    ],
    define: {
        'process.env': {},
        global: 'globalThis',
    },
    resolve: {
        alias: {
            buffer: 'buffer/',
        },
    },
});
```

### tsconfig.json (Frontend)

```json
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "jsx": "react-jsx",
        "lib": ["ESNext", "DOM", "DOM.Iterable"]
    },
    "include": ["src"]
}
```

---

## TypeScript Law

**These rules are NON-NEGOTIABLE for ALL OPNet projects.**

### FORBIDDEN Constructs

| Construct | Why Forbidden | Use Instead |
|-----------|---------------|-------------|
| `any` | Runtime bugs, defeats TypeScript | Proper types, generics |
| `unknown` | Only at system boundaries | Proper types after validation |
| `object` (lowercase) | Too broad | `Record<string, T>` or interface |
| `Function` (uppercase) | No type safety | `() => ReturnType` |
| `{}` | Means "any non-nullish" | `Record<string, never>` |
| `!` (non-null assertion) | Hides null bugs | Explicit checks, `?.` |
| `// @ts-ignore` | Hides errors | Fix the actual error |
| `eslint-disable` | Bypasses safety | Fix the actual issue |

### FORBIDDEN: Section Separator Comments

**NEVER write:**
```typescript
// ==================== PRIVATE METHODS ====================
// ---------------------- HELPERS ----------------------
// ************* CONSTANTS *************
```

**These are lazy and unprofessional.** Use TSDoc instead:

```typescript
/**
 * Transfers tokens from sender to recipient.
 *
 * @param to - The recipient address
 * @param amount - The amount in base units
 * @returns True if transfer succeeded
 * @throws {InsufficientBalanceError} If balance too low
 */
public async transfer(to: Address, amount: bigint): Promise<boolean> {
    // ...
}
```

### Numeric Types

| Use `number` for | Use `bigint` for |
|------------------|------------------|
| Array lengths | Satoshi amounts |
| Loop counters | Block heights |
| Small flags | Timestamps |
| Ports, pixels | Token amounts |
| | File sizes |

**FORBIDDEN: Floats for financial values.** Use `bigint` with explicit decimals.

### Required tsconfig Settings

```json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "noUncheckedIndexedAccess": true,
        "module": "ESNext",
        "target": "ESNext"
    }
}
```

---

## ESLint Configuration

### For Contracts (AssemblyScript)

Use `docs/eslint-contract.json` from opnet-skills.

### For Unit Tests (TypeScript)

Use `docs/eslint-generic.json` from opnet-skills.

### For Frontend (React)

Use `docs/eslint-react.json` from opnet-skills.

**Key rules (all configs):**
- `@typescript-eslint/no-explicit-any`: "error"
- `@typescript-eslint/explicit-function-return-type`: "error"
- `@typescript-eslint/no-unused-vars`: "error"

---

## Common Setup Mistakes

### 1. Wrong transform path

**WRONG:**
```json
"transform": "@btc-vision/btc-runtime/runtime/transform"
"transform": ["@btc-vision/opnet-transform"]
```

**CORRECT:**
```json
"transform": "@btc-vision/opnet-transform"
```

### 2. Missing WASM features

If contract builds but fails at runtime, check `enable` array includes ALL features.

### 3. Workspace conflicts

**Don't use npm workspaces** with OPNet packages. Install each project separately:

```bash
cd contract && npm install --legacy-peer-deps
cd ../frontend && npm install --legacy-peer-deps
```

### 4. Missing abort handler

If contract builds but crashes immediately, check:
- `asconfig.json` has `"use": ["abort=index/abort"]`
- `src/index.ts` exports the `abort` function
- Import path is `@btc-vision/btc-runtime/runtime/abort/abort`

### 5. Vite plugin version mismatch

`vite-plugin-node-polyfills@0.22.0` requires Vite 5.x, NOT Vite 6.x.
