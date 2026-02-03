---
name: "OPNet Development"
description: "Build on OPNet - Bitcoin L1 consensus layer for trustless smart contracts"
metadata:
  version: "1.0.0"
  author: "OPNet"
  tags:
    - bitcoin
    - smart-contracts
    - assemblyscript
    - web3
    - blockchain
---

# OPNet Development Skill

A comprehensive skill for building on OPNet - Bitcoin's L1 consensus layer for trustless smart contracts.

## What is OPNet

OPNet is a **Bitcoin L1 consensus layer** enabling smart contracts directly on Bitcoin. It is:

- **NOT a metaprotocol** - It's a full consensus layer
- **Fully trustless** - No centralized components
- **Permissionless** - Anyone can participate
- **Decentralized** - Relies on Bitcoin PoW + OPNet epoch SHA1 mining

### Security Model

After 20 blocks, an epoch is buried deep enough that changing it requires rewriting Bitcoin history at **millions of dollars per hour**, making OPNet state **more final than Bitcoin's 6-confirmation security**.

The **checksum root** for each epoch is a cryptographic fingerprint of the entire state. If even one bit differs, the checksum changes completely and proof fails, making **silent state corruption impossible**.

### Key Principles

1. **Contracts are WebAssembly** (AssemblyScript) - Deterministic execution
2. **NON-CUSTODIAL** - Contracts NEVER hold BTC
3. **Verify-don't-custody** - Contracts verify L1 tx outputs, not hold funds
4. **Partial reverts** - Only consensus layer execution reverts; Bitcoin transfers are ALWAYS valid
5. **No gas token** - Uses Bitcoin directly

---

## ENFORCEMENT RULES (NON-NEGOTIABLE)

### Before Writing ANY Code

**YOU MUST:**

1. **READ `docs/core-typescript-law-CompleteLaw.md` COMPLETELY** - These are strict TypeScript rules
2. **VERIFY project configuration matches standards** in `docs/` config files

### Configuration Files (in `docs/`)

| File | Purpose |
|------|---------|
| `eslint-contract.json` | ESLint for AssemblyScript contracts |
| `eslint-generic.json` | ESLint for TypeScript libraries |
| `eslint-react.json` | ESLint for React/Next.js frontends |
| `tsconfig-generic.json` | TypeScript config (NOT for contracts) |
| `asconfig.json` | AssemblyScript compiler config |

### Configuration Verification Checklist

- [ ] `tsconfig.json` matches `docs/tsconfig-generic.json` (or strict ES2025 for contracts)
- [ ] `eslint.config.js` uses appropriate config from `docs/`
- [ ] **NO `any` type anywhere** - This is FORBIDDEN
- [ ] ES2025 compliant
- [ ] Unit tests exist and pass

### IF ANY CHECK FAILS → REFUSE TO CODE UNTIL FIXED

Misconfigured projects lead to **exploits and critical vulnerabilities**.

---

## TypeScript Law (CRITICAL)

From `docs/core-typescript-law-CompleteLaw.md`:

### FORBIDDEN Constructs

| Construct | Why Forbidden |
|-----------|---------------|
| `any` | Runtime bug waiting to happen. No exceptions. |
| `unknown` | Only at system boundaries (JSON parsing, external APIs) |
| `object` (lowercase) | Use specific interfaces or `Record<string, T>` |
| `Function` (uppercase) | Use specific signatures |
| `{}` | Means "any non-nullish value". Use `Record<string, never>` |
| Non-null assertion (`!`) | Use explicit null checks or optional chaining |
| Dead/duplicate code | Design is broken if present |
| ESLint bypasses | Never |
| Section separator comments | See below |

### FORBIDDEN: Section Separator Comments

**NEVER** write comments like:

```typescript
// ==================== PRIVATE METHODS ====================
// ---------------------- HELPERS ----------------------
// ************* CONSTANTS *************
// ####### INITIALIZATION #######
```

These are **lazy, unprofessional, and useless**. They add noise without value.

**INSTEAD**: Use proper TSDoc for EVERY class, method, property, and function:

```typescript
/**
 * Transfers tokens from sender to recipient.
 *
 * @param to - The recipient address
 * @param amount - The amount to transfer in base units
 * @returns True if transfer succeeded
 * @throws {InsufficientBalanceError} If sender has insufficient balance
 * @throws {InvalidAddressError} If recipient address is invalid
 *
 * @example
 * ```typescript
 * const success = await token.transfer(recipientAddress, 1000n);
 * ```
 */
public async transfer(to: Address, amount: bigint): Promise<boolean> {
    // ...
}
```

**TSDoc Requirements:**

- `@param` for every parameter
- `@returns` for non-void returns
- `@throws` for possible exceptions
- `@example` for non-trivial methods
- Description of what the method does, not how

**Code organization comes from proper class design, not ASCII art.**

### Numeric Types

- **`number`**: Array lengths, loop counters, small flags, ports, pixels
- **`bigint`**: Satoshi amounts, block heights, timestamps, database IDs, file sizes, cumulative totals
- **Floats for financial values**: **FORBIDDEN** - Use fixed-point `bigint` with explicit scale

### Required tsconfig.json Settings

```json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "exactOptionalPropertyTypes": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitOverride": true,
        "moduleResolution": "bundler",
        "module": "ESNext",
        "target": "ES2025",
        "lib": ["ES2025"],
        "isolatedModules": true,
        "verbatimModuleSyntax": true
    }
}
```

---

## Performance Rules

### THREADING IS MANDATORY

- **Sequential processing = unacceptable performance**
- Use Worker threads for CPU-bound work
- Use async with proper concurrency for I/O
- Batch operations where possible
- Use connection pooling

### Caching (ALWAYS)

- **Reuse contract instances** - Never create new instances for same contract
- **Reuse providers** - Single provider instance per network
- **Cache locally** - Browser localStorage/IndexedDB for user data
- **Cache on API** - Server-side caching for blockchain state
- **Invalidate on block change** - Clear stale data when new block confirmed

### Backend/API Frameworks

**MANDATORY**: Use OPNet's high-performance libraries:

| Package | Purpose |
|---------|---------|
| `@btc-vision/uwebsocket.js` | WebSocket server (fastest) |
| `@btc-vision/hyper-express` | HTTP server (fastest) |

**FORBIDDEN**: Express, Fastify, Koa, Hapi, or any other HTTP framework. They are significantly slower.

```typescript
// CORRECT - Use hyper-express with threading
import HyperExpress from '@btc-vision/hyper-express';
import { Worker } from 'worker_threads';

const app = new HyperExpress.Server();
// Use classes, not functions
// Delegate CPU work to workers
```

---

## Contract Gas Optimization (CRITICAL)

### FORBIDDEN Patterns in Contracts

| Pattern | Why Forbidden | Alternative |
|---------|---------------|-------------|
| `while` loops | Unbounded gas consumption | Use bounded `for` loops |
| Infinite loops | Contract halts, wastes gas | Always have exit condition |
| Iterating all map keys | O(n) grows exponentially | Use indexed lookups, pagination |
| Iterating all array elements | O(n) cost explosion | Store aggregates, use pagination |
| Unbounded arrays | Grows forever | Cap size, use cleanup |

### Gas-Efficient Patterns

```typescript
// WRONG - Iterating all holders (O(n) disaster)
let total: u256 = u256.Zero;
for (let i = 0; i < holders.length; i++) {
    total = SafeMath.add(total, balances.get(holders[i]));
}

// CORRECT - Store running total
const totalSupply: StoredU256 = new StoredU256(TOTAL_SUPPLY_POINTER);
// Update on mint/burn, read in O(1)
```

---

## Security Audit Checklist

### All Code Must Be Checked For:

#### Cryptographic

- [ ] Key generation entropy
- [ ] Nonce reuse
- [ ] Signature malleability
- [ ] Timing attacks
- [ ] Replay attacks

#### Smart Contract

- [ ] Reentrancy
- [ ] Integer overflow/underflow
- [ ] Access control bypass
- [ ] Authorization flaws
- [ ] State manipulation
- [ ] Race conditions

#### Bitcoin-specific

- [ ] Transaction malleability
- [ ] UTXO selection vulnerabilities
- [ ] Fee sniping
- [ ] Dust attacks

---

## Quick Start

| Task | Template |
|------|----------|
| New OP20 token | `templates/contracts/OP20Token.ts` |
| New OP721 NFT | `templates/contracts/OP721NFT.ts` |
| Generic contract | `templates/contracts/MyContract.ts` |
| Contract tests | `templates/tests/` |
| Frontend dApp | `templates/frontend/` |
| Node plugin (indexer) | `templates/plugins/OP20Indexer.ts` |
| Node plugin (generic) | `templates/plugins/MyPlugin.ts` |

---

## Complete File Index

### Configuration Files (`docs/`)

| File | Description |
|------|-------------|
| `docs/asconfig.json` | AssemblyScript compiler config |
| `docs/eslint-contract.json` | ESLint for AssemblyScript contracts |
| `docs/eslint-generic.json` | ESLint for TypeScript libraries |
| `docs/eslint-react.json` | ESLint for React frontends |
| `docs/tsconfig-generic.json` | TypeScript config (not contracts) |
| `docs/setup-README.md` | Setup instructions |

### TypeScript Law

| File | Description |
|------|-------------|
| `docs/core-typescript-law-readme.md` | Overview |
| `docs/core-typescript-law-CompleteLaw.md` | **COMPLETE RULES - READ FIRST** |

### OPNet Client Library

| File | Description |
|------|-------------|
| `docs/core-opnet-README.md` | Library overview |
| `docs/core-opnet-backend-api.md` | Backend API with hyper-express |
| `docs/core-opnet-getting-started-installation.md` | Installation |
| `docs/core-opnet-getting-started-overview.md` | Architecture overview |
| `docs/core-opnet-getting-started-quick-start.md` | Quick start guide |
| `docs/core-opnet-providers-json-rpc-provider.md` | JSON-RPC provider |
| `docs/core-opnet-providers-websocket-provider.md` | WebSocket provider |
| `docs/core-opnet-providers-understanding-providers.md` | Provider concepts |
| `docs/core-opnet-providers-advanced-configuration.md` | Advanced config |
| `docs/core-opnet-providers-internal-caching.md` | Caching system |
| `docs/core-opnet-providers-threaded-http.md` | Threading |
| `docs/core-opnet-contracts-overview.md` | Contract interaction overview |
| `docs/core-opnet-contracts-instantiating-contracts.md` | Creating contract instances |
| `docs/core-opnet-contracts-simulating-calls.md` | Simulating calls |
| `docs/core-opnet-contracts-sending-transactions.md` | Sending transactions |
| `docs/core-opnet-contracts-gas-estimation.md` | Gas estimation |
| `docs/core-opnet-contracts-offline-signing.md` | Offline signing |
| `docs/core-opnet-contracts-transaction-configuration.md` | TX config |
| `docs/core-opnet-contracts-contract-code.md` | Contract code retrieval |
| `docs/core-opnet-abi-reference-abi-overview.md` | ABI overview |
| `docs/core-opnet-abi-reference-data-types.md` | ABI data types |
| `docs/core-opnet-abi-reference-op20-abi.md` | OP20 ABI |
| `docs/core-opnet-abi-reference-op20s-abi.md` | OP20S ABI (signatures) |
| `docs/core-opnet-abi-reference-op721-abi.md` | OP721 ABI |
| `docs/core-opnet-abi-reference-motoswap-abis.md` | MotoSwap ABIs |
| `docs/core-opnet-abi-reference-factory-abis.md` | Factory ABIs |
| `docs/core-opnet-abi-reference-stablecoin-abis.md` | Stablecoin ABIs |
| `docs/core-opnet-abi-reference-custom-abis.md` | Custom ABI creation |
| `docs/core-opnet-api-reference-provider-api.md` | Provider API |
| `docs/core-opnet-api-reference-contract-api.md` | Contract API |
| `docs/core-opnet-api-reference-epoch-api.md` | Epoch API |
| `docs/core-opnet-api-reference-utxo-manager-api.md` | UTXO Manager API |
| `docs/core-opnet-api-reference-types-interfaces.md` | Types & interfaces |
| `docs/core-opnet-bitcoin-utxos.md` | UTXO handling |
| `docs/core-opnet-bitcoin-utxo-optimization.md` | UTXO optimization |
| `docs/core-opnet-bitcoin-balances.md` | Balance queries |
| `docs/core-opnet-bitcoin-sending-bitcoin.md` | Sending BTC |
| `docs/core-opnet-blocks-block-operations.md` | Block operations |
| `docs/core-opnet-blocks-block-witnesses.md` | Block witnesses |
| `docs/core-opnet-blocks-gas-parameters.md` | Gas parameters |
| `docs/core-opnet-blocks-reorg-detection.md` | Reorg detection |
| `docs/core-opnet-epochs-overview.md` | Epochs overview |
| `docs/core-opnet-epochs-epoch-operations.md` | Epoch operations |
| `docs/core-opnet-epochs-mining-template.md` | Mining template |
| `docs/core-opnet-epochs-submitting-epochs.md` | Submitting epochs |
| `docs/core-opnet-transactions-broadcasting.md` | Broadcasting TXs |
| `docs/core-opnet-transactions-fetching-transactions.md` | Fetching TXs |
| `docs/core-opnet-transactions-transaction-receipts.md` | TX receipts |
| `docs/core-opnet-transactions-challenges.md` | TX challenges |
| `docs/core-opnet-storage-storage-operations.md` | Storage operations |
| `docs/core-opnet-public-keys-public-key-operations.md` | Public key ops |
| `docs/core-opnet-utils-bitcoin-utils.md` | Bitcoin utilities |
| `docs/core-opnet-utils-binary-serialization.md` | Binary serialization |
| `docs/core-opnet-utils-revert-decoder.md` | Revert decoder |
| `docs/core-opnet-examples-op20-examples.md` | OP20 examples |
| `docs/core-opnet-examples-op721-examples.md` | OP721 examples |
| `docs/core-opnet-examples-deployment-examples.md` | Deployment examples |
| `docs/core-opnet-examples-advanced-swaps.md` | Swap examples |

### Transaction Library

| File | Description |
|------|-------------|
| `docs/core-transaction-README.md` | Library overview |
| `docs/core-transaction-transaction-building.md` | Building transactions |
| `docs/core-transaction-offline-transaction-signing.md` | Offline signing |
| `docs/core-transaction-addresses-P2OP.md` | P2OP address format |
| `docs/core-transaction-addresses-P2WDA.md` | P2WDA address format |
| `docs/core-transaction-quantum-support-README.md` | Quantum overview |
| `docs/core-transaction-quantum-support-01-introduction.md` | Quantum intro |
| `docs/core-transaction-quantum-support-02-mnemonic-and-wallet.md` | Quantum wallet |
| `docs/core-transaction-quantum-support-03-address-generation.md` | Quantum addresses |
| `docs/core-transaction-quantum-support-04-message-signing.md` | Quantum signing |
| `docs/core-transaction-quantum-support-05-address-verification.md` | Quantum verification |

### OIP Specifications

| File | Description |
|------|-------------|
| `docs/core-OIP-README.md` | OIP overview |
| `docs/core-OIP-OIP-0001.md` | OIP process |
| `docs/core-OIP-OIP-0002.md` | Contract standards |
| `docs/core-OIP-OIP-0003.md` | **Plugin system spec** |
| `docs/core-OIP-OIP-0004.md` | Epoch system |
| `docs/core-OIP-OIP-0020.md` | OP20 token standard |
| `docs/core-OIP-OIP-0721.md` | OP721 NFT standard |

### Contract Runtime (btc-runtime)

| File | Description |
|------|-------------|
| `docs/contracts-btc-runtime-README.md` | Runtime overview |
| `docs/contracts-btc-runtime-gas-optimization.md` | **Gas optimization (CRITICAL)** |
| `docs/contracts-btc-runtime-getting-started-installation.md` | Installation |
| `docs/contracts-btc-runtime-getting-started-first-contract.md` | First contract |
| `docs/contracts-btc-runtime-getting-started-project-structure.md` | Project structure |
| `docs/contracts-btc-runtime-core-concepts-blockchain-environment.md` | Blockchain env |
| `docs/contracts-btc-runtime-core-concepts-storage-system.md` | Storage system |
| `docs/contracts-btc-runtime-core-concepts-pointers.md` | Storage pointers |
| `docs/contracts-btc-runtime-core-concepts-events.md` | Events |
| `docs/contracts-btc-runtime-core-concepts-decorators.md` | Decorators |
| `docs/contracts-btc-runtime-core-concepts-security.md` | Security |
| `docs/contracts-btc-runtime-api-reference-blockchain.md` | Blockchain API |
| `docs/contracts-btc-runtime-api-reference-storage.md` | Storage API |
| `docs/contracts-btc-runtime-api-reference-events.md` | Events API |
| `docs/contracts-btc-runtime-api-reference-op20.md` | OP20 API |
| `docs/contracts-btc-runtime-api-reference-op721.md` | OP721 API |
| `docs/contracts-btc-runtime-api-reference-safe-math.md` | SafeMath API |
| `docs/contracts-btc-runtime-contracts-op-net-base.md` | OP_NET base class |
| `docs/contracts-btc-runtime-contracts-op20-token.md` | OP20 implementation |
| `docs/contracts-btc-runtime-contracts-op20s-signatures.md` | OP20S signatures |
| `docs/contracts-btc-runtime-contracts-op721-nft.md` | OP721 implementation |
| `docs/contracts-btc-runtime-contracts-reentrancy-guard.md` | Reentrancy guard |
| `docs/contracts-btc-runtime-contracts-upgradeable.md` | Upgradeable contracts |
| `docs/contracts-btc-runtime-storage-stored-primitives.md` | Stored primitives |
| `docs/contracts-btc-runtime-storage-stored-maps.md` | Stored maps |
| `docs/contracts-btc-runtime-storage-stored-arrays.md` | Stored arrays |
| `docs/contracts-btc-runtime-storage-memory-maps.md` | Memory maps |
| `docs/contracts-btc-runtime-types-address.md` | Address type |
| `docs/contracts-btc-runtime-types-calldata.md` | Calldata type |
| `docs/contracts-btc-runtime-types-bytes-writer-reader.md` | BytesWriter/Reader |
| `docs/contracts-btc-runtime-types-safe-math.md` | SafeMath type |
| `docs/contracts-btc-runtime-advanced-cross-contract-calls.md` | Cross-contract calls |
| `docs/contracts-btc-runtime-advanced-signature-verification.md` | Signature verification |
| `docs/contracts-btc-runtime-advanced-quantum-resistance.md` | Quantum resistance |
| `docs/contracts-btc-runtime-advanced-bitcoin-scripts.md` | Bitcoin scripts |
| `docs/contracts-btc-runtime-advanced-contract-upgrades.md` | Contract upgrades |
| `docs/contracts-btc-runtime-advanced-plugins.md` | Contract plugins |
| `docs/contracts-btc-runtime-examples-basic-token.md` | Basic token example |
| `docs/contracts-btc-runtime-examples-stablecoin.md` | Stablecoin example |
| `docs/contracts-btc-runtime-examples-nft-with-reservations.md` | NFT example |
| `docs/contracts-btc-runtime-examples-oracle-integration.md` | Oracle example |

### Other Contract Docs

| File | Description |
|------|-------------|
| `docs/contracts-as-bignum-README.md` | BigNum library (u256, u128) |
| `docs/contracts-opnet-transform-README.md` | Transform decorators |
| `docs/contracts-opnet-transform-std-README.md` | Standard library |
| `docs/contracts-example-tokens-README.md` | Example tokens |
| `docs/contracts-example-tokens-docs-OP_20.md` | OP20 example |

### Client Libraries

| File | Description |
|------|-------------|
| `docs/clients-bitcoin-README.md` | Bitcoin library |
| `docs/clients-bip32-README.md` | BIP32 HD derivation |
| `docs/clients-bip32-QUANTUM.md` | Quantum support |
| `docs/clients-ecpair-README.md` | EC key pairs |
| `docs/clients-walletconnect-README.md` | WalletConnect |
| `docs/clients-walletconnect-wallet-integration.md` | Wallet integration |

### Testing

| File | Description |
|------|-------------|
| `docs/testing-unit-test-framework-README.md` | Test framework |
| `docs/testing-opnet-unit-test-README.md` | Unit testing |
| `docs/testing-opnet-unit-test-docs-README.md` | Test docs |
| `docs/testing-opnet-unit-test-docs-Blockchain.md` | Blockchain mocking |
| `docs/testing-opnet-unit-test-docs-ContractRuntime.md` | Contract runtime |

### Frontend

| File | Description |
|------|-------------|
| `docs/frontend-motoswap-ui-README.md` | **Frontend guide (THE STANDARD)** |

### Plugins

| File | Description |
|------|-------------|
| `docs/plugins-plugin-sdk-README.md` | Plugin SDK |
| `docs/plugins-opnet-node-README.md` | OPNet node |
| `docs/plugins-opnet-node-docker-README.md` | Docker setup |

### Templates

#### Contract Templates (`templates/contracts/`)

| File | Description |
|------|-------------|
| `templates/contracts/OP20Token.ts` | OP20 token implementation |
| `templates/contracts/OP721NFT.ts` | OP721 NFT implementation |
| `templates/contracts/MyContract.ts` | Generic contract template |
| `templates/contracts/index.ts` | Entry point / exports |

#### Frontend Templates (`templates/frontend/`)

| File | Description |
|------|-------------|
| `templates/frontend/App.tsx` | Main app component |
| `templates/frontend/OPNetProvider.tsx` | OPNet context provider |
| `templates/frontend/WalletConnect.tsx` | Wallet connection component |
| `templates/frontend/ContractInteraction.tsx` | Contract interaction component |
| `templates/frontend/useWallet.ts` | Wallet hook |
| `templates/frontend/useContract.ts` | Contract hook |
| `templates/frontend/vite.config.ts` | Vite configuration |
| `templates/frontend/package.json` | Package dependencies |

#### Plugin Templates (`templates/plugins/`)

| File | Description |
|------|-------------|
| `templates/plugins/MyPlugin.ts` | Generic plugin template |
| `templates/plugins/OP20Indexer.ts` | OP20 indexer plugin |
| `templates/plugins/types.ts` | Type definitions |
| `templates/plugins/index.ts` | Entry point |
| `templates/plugins/plugin.json` | Plugin manifest |

#### Test Templates (`templates/tests/`)

| File | Description |
|------|-------------|
| `templates/tests/OP20.test.ts` | OP20 test example |
| `templates/tests/setup.ts` | Test setup |
| `templates/tests/gulpfile.js` | Gulp build config |

---

## Contract Development

### Key Concepts

1. **Contracts use AssemblyScript** - Compiles to WebAssembly
2. **Constructor runs on EVERY interaction** - Use `onDeployment()` for initialization
3. **Contracts CANNOT hold BTC** - They are calculators, not custodians
4. **Verify-don't-custody pattern** - Check `Blockchain.tx.outputs` against internal state

### Decorator Reference

```typescript
// Mark method as callable
@method({ name: 'param1', type: ABIDataTypes.UINT256 })

// Specify return types
@returns({ name: 'result', type: ABIDataTypes.UINT256 })

// Declare emitted events
@emit('Transfer', 'Approval')
```

### Storage Types

| Type | Use Case |
|------|----------|
| `StoredU256` | Single u256 value |
| `StoredBoolean` | Boolean flag |
| `StoredString` | String value |
| `StoredMapU256` | Key-value map (u256 keys/values) |
| `AddressMemoryMap` | In-memory address map |

---

## Testing

### ALL CODE MUST HAVE TESTS

```typescript
import { opnet, OPNetUnit, Assert, Blockchain } from '@btc-vision/unit-test-framework';

await opnet('My Tests', async (vm: OPNetUnit) => {
    vm.beforeEach(async () => {
        Blockchain.dispose();
        await Blockchain.init();
    });

    await vm.it('should work correctly', async () => {
        const result = await contract.someMethod();
        Assert.expect(result).toEqual(expected);
    });
});
```

---

## Plugin Development

**OPNet nodes are like Minecraft servers - they support plugins!**

### Key Resources

- Read `docs/plugins-plugin-sdk-README.md`
- Read `docs/core-OIP-OIP-0003.md` for plugin specification
- Use `templates/plugins/OP20Indexer.ts` for indexers

### Plugin Lifecycle

| Hook | When Called | Blocking |
|------|-------------|----------|
| `onFirstInstall` | First installation | Yes |
| `onNetworkInit` | Every load | Yes |
| `onBlockChange` | New block confirmed | No |
| `onReorg` | Chain reorganization | Yes (CRITICAL) |

### Critical: Reorg Handling

You **MUST** implement `onReorg()` to revert state for reorged blocks. Failure to do so will cause data inconsistency.

---

## Frontend Development

### Configuration Standard

Frontend configs **MUST** use `docs/eslint-react.json` and `docs/tsconfig-generic.json`:

- Vite + React
- Vitest for testing
- ESLint with TypeScript strict mode
- ES2025 target

### Caching (MANDATORY)

- **Reuse provider instances** - Singleton per network
- **Reuse contract instances** - Cache by address
- **Cache API responses** - Invalidate on block change

### Key Hooks

```typescript
// OPNet provider
const { provider, isConnected, network } = useOPNet();

// Contract interaction
const { contract, callMethod, loading } = useContract(address, abi);

// Wallet connection
const { address, connect, disconnect, signPsbt } = useWallet();
```

See `docs/frontend-motoswap-ui-README.md` for complete integration guide.

---

## Backend/API Development

### MANDATORY Frameworks

| Package | Purpose |
|---------|---------|
| `@btc-vision/hyper-express` | HTTP server (fastest) |
| `@btc-vision/uwebsocket.js` | WebSocket server (fastest) |

**FORBIDDEN**: Express, Fastify, Koa, Hapi - they are significantly slower.

See `docs/core-opnet-backend-api.md` for complete guide.

---

## Client Libraries

| Package | Doc | Description |
|---------|-----|-------------|
| `@btc-vision/bitcoin` | `docs/clients-bitcoin-README.md` | Bitcoin lib (709x faster PSBT) |
| `@btc-vision/bip32` | `docs/clients-bip32-README.md` | HD derivation + quantum |
| `@btc-vision/ecpair` | `docs/clients-ecpair-README.md` | EC key pairs |
| `@btc-vision/transaction` | `docs/core-transaction-README.md` | OPNet transactions |
| `opnet` | `docs/core-opnet-README.md` | Main client library |
| `@btc-vision/walletconnect` | `docs/clients-walletconnect-README.md` | Wallet connection |

---

## Version Requirements

| Tool | Minimum Version |
|------|-----------------|
| Node.js | >= 24.0.0 |
| TypeScript | >= 5.9.3 |
| AssemblyScript | >= 0.28.9 |

---

## Critical Reminders

1. **READ typescript-law FIRST** - Non-negotiable rules
2. **Verify project configuration** - Before writing any code
3. **NO `any` type** - Ever
4. **Test everything** - Unit tests required
5. **Handle reorgs** - In plugins, always implement `onReorg()`
6. **Contracts don't hold BTC** - Verify-don't-custody pattern
7. **Threading for performance** - Sequential = unacceptable
8. **NO section separator comments** - Use TSDoc instead