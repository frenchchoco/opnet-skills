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

1. **READ `docs/core/typescript-law/` COMPLETELY** - These are strict TypeScript rules
2. **VERIFY project configuration matches standards** in `configs/`

### Configuration Verification Checklist

- [ ] `tsconfig.json` matches `configs/frontend/` (frontend) or strict ES2025 (contracts/plugins)
- [ ] `eslint.config.js` exists and enforces strict TypeScript
- [ ] `.prettierrc` exists with correct settings
- [ ] **NO `any` type anywhere** - This is FORBIDDEN
- [ ] ES2025 compliant
- [ ] Unit tests exist and pass

### IF ANY CHECK FAILS → REFUSE TO CODE UNTIL FIXED

Misconfigured projects lead to **exploits and critical vulnerabilities**.

---

## TypeScript Law (CRITICAL)

From `docs/core/typescript-law/`:

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

### Optimization Principles

1. Profile first, optimize based on data
2. Avoid creating objects in hot loops
3. Reuse buffers when possible
4. Use typed arrays for binary data
5. Keep object shapes consistent (V8 hidden classes)

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

### Optimization Strategies

1. **Store aggregates** - Don't compute, track incrementally
2. **Pagination** - Process in bounded chunks
3. **Indexed lookups** - O(1) instead of O(n) searches
4. **Lazy evaluation** - Compute only when needed
5. **Batch operations** - Amortize overhead across multiple ops

### Security vs Optimization Balance

**CRITICAL**: Optimization must NOT introduce vulnerabilities:

- [ ] Access control still enforced after optimization
- [ ] Bounds checking preserved
- [ ] Integer overflow/underflow handled
- [ ] State consistency maintained
- [ ] No new attack vectors created

When in doubt, **security wins over gas savings**.

---

## Security Audit Checklist

### All Code Must Be Checked For:

#### Cryptographic

- [ ] Key generation entropy
- [ ] Nonce reuse
- [ ] Signature malleability
- [ ] Timing attacks
- [ ] Replay attacks
- [ ] RNG weaknesses
- [ ] EC parameter validation
- [ ] Hash collision potential
- [ ] State commitment integrity
- [ ] Deterministic execution guarantees

#### Smart Contract

- [ ] Reentrancy
- [ ] Integer overflow/underflow
- [ ] Access control bypass
- [ ] Authorization flaws
- [ ] Privilege escalation
- [ ] State manipulation
- [ ] Race conditions
- [ ] Input validation failures
- [ ] Boundary errors
- [ ] Logic flaws
- [ ] Unsafe type conversions
- [ ] Unhandled edge cases
- [ ] Data integrity violations
- [ ] State inconsistency
- [ ] Improper error handling
- [ ] Dangerous dependencies

#### Bitcoin-specific

- [ ] Transaction malleability
- [ ] UTXO selection vulnerabilities
- [ ] Fee sniping
- [ ] Transaction pinning
- [ ] Dust attacks

---

## Quick Start

| Task | Template |
|------|----------|
| New OP20 token | `templates/contracts/op20-token/` |
| New OP721 NFT | `templates/contracts/op721-nft/` |
| Generic contract | `templates/contracts/generic/` |
| Contract tests | `templates/tests/contract-tests/` |
| Frontend dApp | `templates/frontend/opnet-dapp/` |
| Node plugin (indexer) | `templates/plugins/indexer/` |
| Node plugin (generic) | `templates/plugins/generic/` |

---

## Directory Structure

```
/root/opnet-skills/
├── SKILL.md                    # This file - main entry point
├── docs/                       # ALL documentation
│   ├── core/
│   │   ├── typescript-law/     # STRICT rules (NON-NEGOTIABLE)
│   │   ├── opnet/              # Client library (JSON-RPC, WebSocket)
│   │   ├── transaction/        # Transaction builder
│   │   └── OIP/                # Protocol specs (OIP-0003 = plugins)
│   ├── contracts/
│   │   ├── btc-runtime/        # AssemblyScript contract runtime
│   │   ├── opnet-transform/    # Decorators (@method, @returns, @emit)
│   │   ├── as-bignum/          # u256, u128 implementations
│   │   └── example-tokens/     # Contract examples
│   ├── clients/
│   │   ├── bitcoin/            # Bitcoin library (recoded bitcoinjs-lib)
│   │   ├── bip32/              # HD derivation + ML-DSA quantum support
│   │   ├── ecpair/             # EC key pairs
│   │   └── walletconnect/      # Wallet connection
│   ├── testing/
│   │   ├── unit-test-framework/
│   │   └── opnet-unit-test/
│   ├── frontend/
│   │   └── motoswap-ui/        # THE STANDARD for frontend configs
│   └── plugins/
│       ├── plugin-sdk/
│       └── opnet-node/         # opnet-cli docs
├── configs/                    # MANDATORY configuration standards
│   ├── frontend/               # From motoswap-ui (THE STANDARD)
│   ├── contracts/              # From example-tokens
│   ├── node/                   # From opnet-node
│   └── typescript-law/         # TS rules
└── templates/                  # Production-ready starters
    ├── contracts/
    │   ├── op20-token/
    │   ├── op721-nft/
    │   └── generic/
    ├── tests/
    │   └── contract-tests/
    ├── frontend/
    │   └── opnet-dapp/
    └── plugins/
        ├── indexer/
        └── generic/
```

---

## Documentation Index

### Core Documentation

| Path | Description |
|------|-------------|
| `docs/core/typescript-law/` | **STRICT TypeScript rules - READ FIRST** |
| `docs/core/opnet/` | Main client library (JSON-RPC, WebSocket, contracts) |
| `docs/core/opnet/backend-api.md` | **Backend API with hyper-express/uwebsocket.js** |
| `docs/core/transaction/` | Transaction builder, PSBT, quantum signatures |
| `docs/core/transaction/addresses/P2OP.md` | P2OP quantum-resistant address format |
| `docs/core/OIP/` | Protocol specs (OIP-0003 = plugin system) |

### Contract Documentation

| Path | Description |
|------|-------------|
| `docs/contracts/btc-runtime/` | AssemblyScript contract runtime |
| `docs/contracts/btc-runtime/gas-optimization.md` | **Gas optimization patterns (CRITICAL)** |
| `docs/contracts/opnet-transform/` | Decorators: @method, @returns, @emit |
| `docs/contracts/as-bignum/` | u256, u128 for AssemblyScript |
| `docs/contracts/example-tokens/` | Contract examples (OP20, OP721, stablecoins) |

### Client Documentation

| Path | Description |
|------|-------------|
| `docs/clients/bitcoin/` | Bitcoin library (709x faster than bitcoinjs-lib) |
| `docs/clients/bip32/` | HD derivation with ML-DSA quantum resistance |
| `docs/clients/ecpair/` | EC key pair management |
| `docs/clients/walletconnect/` | Web wallet connection |

### Testing Documentation

| Path | Description |
|------|-------------|
| `docs/testing/unit-test-framework/` | Contract testing framework |
| `docs/testing/opnet-unit-test/` | Test examples |

### Frontend Documentation

| Path | Description |
|------|-------------|
| `docs/frontend/motoswap-ui/` | **Frontend integration guide (wallet, caching, transactions)** |

### Plugin Documentation

| Path | Description |
|------|-------------|
| `docs/plugins/plugin-sdk/` | Node plugin development SDK |
| `docs/plugins/opnet-node/` | Node operation, opnet-cli |

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

Before any work is considered complete, verify with unit tests.

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

- Read `docs/plugins/plugin-sdk/`
- Read `docs/core/OIP/OIP-0003.md` for plugin specification
- Read `docs/plugins/opnet-node/` for opnet-cli usage
- Use `templates/plugins/indexer/` for indexers (e.g., track all OP20 holders)

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

Frontend configs **MUST** match `configs/frontend/` exactly:

- Vite + React
- Vitest for testing
- ESLint with TypeScript strict mode
- Prettier formatting
- ES2025 target

### Caching (MANDATORY)

- **Reuse provider instances** - Singleton per network
- **Reuse contract instances** - Cache by address
- **Cache API responses** - Invalidate on block change
- **Use localStorage** - For user preferences, token metadata

### Polling Intervals

| Operation | Interval |
|-----------|----------|
| Block height | 15 seconds |
| Transaction confirmation | 15 seconds |
| Fee estimation | 30 seconds |

### Key Hooks

```typescript
// OPNet provider
const { provider, isConnected, network } = useOPNet();

// Contract interaction
const { contract, callMethod, loading } = useContract(address, abi);

// Wallet connection
const { address, connect, disconnect, signPsbt } = useWallet();
```

See `docs/frontend/motoswap-ui/README.md` for complete integration guide.

---

## Backend/API Development

### MANDATORY Frameworks

| Package | Purpose |
|---------|---------|
| `@btc-vision/hyper-express` | HTTP server (fastest) |
| `@btc-vision/uwebsocket.js` | WebSocket server (fastest) |

**FORBIDDEN**: Express, Fastify, Koa, Hapi - they are significantly slower.

### Architecture Requirements

1. **Use classes** - Not function handlers
2. **Use threading** - Worker threads for CPU work
3. **Singleton providers** - One provider instance per network
4. **Cache everything** - Contract instances, API responses
5. **Invalidate on block change** - Keep data fresh

See `docs/core/opnet/backend-api.md` for complete guide.

---

## Client Libraries

| Package | Path | Description |
|---------|------|-------------|
| `@btc-vision/bitcoin` | `docs/clients/bitcoin/` | Bitcoin lib (709x faster PSBT) |
| `@btc-vision/bip32` | `docs/clients/bip32/` | HD derivation + quantum |
| `@btc-vision/ecpair` | `docs/clients/ecpair/` | EC key pairs |
| `@btc-vision/transaction` | `docs/core/transaction/` | OPNet transactions |
| `opnet` | `docs/core/opnet/` | Main client library |
| `@btc-vision/walletconnect` | `docs/clients/walletconnect/` | Wallet connection |

---

## Bitcoin Context

OPNet is built on Bitcoin. Understanding Bitcoin fundamentals is essential:

- **UTXOs** - Unspent Transaction Outputs
- **Taproot (P2TR)** - Primary address type
- **PSBT** - Partially Signed Bitcoin Transactions
- **SegWit** - Segregated Witness
- **Schnorr signatures** - Used for Taproot
- **ML-DSA** - Post-quantum signatures (supported via bip32)

---

## Version Requirements

| Tool | Minimum Version |
|------|-----------------|
| Node.js | >= 24.0.0 |
| TypeScript | >= 5.9.3 |
| AssemblyScript | >= 0.28.9 |

---

## Support & Resources

- **OPNet Documentation**: https://docs.opnet.org
- **GitHub**: https://github.com/btc-vision
- **OIP Specifications**: `docs/core/OIP/`

---

## Critical Reminders

1. **READ typescript-law FIRST** - Non-negotiable rules
2. **Verify project configuration** - Before writing any code
3. **NO `any` type** - Ever
4. **Test everything** - Unit tests required
5. **Handle reorgs** - In plugins, always implement `onReorg()`
6. **Contracts don't hold BTC** - Verify-don't-custody pattern
7. **Threading for performance** - Sequential = unacceptable
8. **Configuration must match standards** - Or refuse to code

---

## Complete File Index

### Setup & Configuration (`docs/setup/`)

| File | Description |
|------|-------------|
| `docs/setup/README.md` | Setup instructions |
| `docs/setup/.prettierrc` | Prettier config (all projects) |
| `docs/setup/asconfig.json` | AssemblyScript compiler config |
| `docs/setup/eslint-contract.json` | ESLint for contracts |
| `docs/setup/eslint-generic.json` | ESLint for TypeScript libs |
| `docs/setup/eslint-react.json` | ESLint for React |
| `docs/setup/tsconfig-generic.json` | TypeScript config (not contracts) |

### TypeScript Law (`docs/core/typescript-law/`)

| File | Description |
|------|-------------|
| `docs/core/typescript-law/readme.md` | Overview |
| `docs/core/typescript-law/CompleteLaw.md` | **COMPLETE RULES - READ FIRST** |

### OPNet Client Library (`docs/core/opnet/`)

| File | Description |
|------|-------------|
| `docs/core/opnet/README.md` | Library overview |
| `docs/core/opnet/backend-api.md` | Backend API with hyper-express |
| `docs/core/opnet/getting-started/installation.md` | Installation |
| `docs/core/opnet/getting-started/overview.md` | Architecture overview |
| `docs/core/opnet/getting-started/quick-start.md` | Quick start guide |
| `docs/core/opnet/providers/json-rpc-provider.md` | JSON-RPC provider |
| `docs/core/opnet/providers/websocket-provider.md` | WebSocket provider |
| `docs/core/opnet/providers/understanding-providers.md` | Provider concepts |
| `docs/core/opnet/providers/advanced-configuration.md` | Advanced config |
| `docs/core/opnet/providers/internal-caching.md` | Caching system |
| `docs/core/opnet/providers/threaded-http.md` | Threading |
| `docs/core/opnet/contracts/overview.md` | Contract interaction overview |
| `docs/core/opnet/contracts/instantiating-contracts.md` | Creating contract instances |
| `docs/core/opnet/contracts/simulating-calls.md` | Simulating calls |
| `docs/core/opnet/contracts/sending-transactions.md` | Sending transactions |
| `docs/core/opnet/contracts/gas-estimation.md` | Gas estimation |
| `docs/core/opnet/contracts/offline-signing.md` | Offline signing |
| `docs/core/opnet/contracts/transaction-configuration.md` | TX config |
| `docs/core/opnet/contracts/contract-code.md` | Contract code retrieval |
| `docs/core/opnet/abi-reference/abi-overview.md` | ABI overview |
| `docs/core/opnet/abi-reference/data-types.md` | ABI data types |
| `docs/core/opnet/abi-reference/op20-abi.md` | OP20 ABI |
| `docs/core/opnet/abi-reference/op20s-abi.md` | OP20S ABI (signatures) |
| `docs/core/opnet/abi-reference/op721-abi.md` | OP721 ABI |
| `docs/core/opnet/abi-reference/motoswap-abis.md` | MotoSwap ABIs |
| `docs/core/opnet/abi-reference/factory-abis.md` | Factory ABIs |
| `docs/core/opnet/abi-reference/stablecoin-abis.md` | Stablecoin ABIs |
| `docs/core/opnet/abi-reference/custom-abis.md` | Custom ABI creation |
| `docs/core/opnet/api-reference/provider-api.md` | Provider API |
| `docs/core/opnet/api-reference/contract-api.md` | Contract API |
| `docs/core/opnet/api-reference/epoch-api.md` | Epoch API |
| `docs/core/opnet/api-reference/utxo-manager-api.md` | UTXO Manager API |
| `docs/core/opnet/api-reference/types-interfaces.md` | Types & interfaces |
| `docs/core/opnet/bitcoin/utxos.md` | UTXO handling |
| `docs/core/opnet/bitcoin/utxo-optimization.md` | UTXO optimization |
| `docs/core/opnet/bitcoin/balances.md` | Balance queries |
| `docs/core/opnet/bitcoin/sending-bitcoin.md` | Sending BTC |
| `docs/core/opnet/blocks/block-operations.md` | Block operations |
| `docs/core/opnet/blocks/block-witnesses.md` | Block witnesses |
| `docs/core/opnet/blocks/gas-parameters.md` | Gas parameters |
| `docs/core/opnet/blocks/reorg-detection.md` | Reorg detection |
| `docs/core/opnet/epochs/overview.md` | Epochs overview |
| `docs/core/opnet/epochs/epoch-operations.md` | Epoch operations |
| `docs/core/opnet/epochs/mining-template.md` | Mining template |
| `docs/core/opnet/epochs/submitting-epochs.md` | Submitting epochs |
| `docs/core/opnet/transactions/broadcasting.md` | Broadcasting TXs |
| `docs/core/opnet/transactions/fetching-transactions.md` | Fetching TXs |
| `docs/core/opnet/transactions/transaction-receipts.md` | TX receipts |
| `docs/core/opnet/transactions/challenges.md` | TX challenges |
| `docs/core/opnet/storage/storage-operations.md` | Storage operations |
| `docs/core/opnet/public-keys/public-key-operations.md` | Public key ops |
| `docs/core/opnet/utils/bitcoin-utils.md` | Bitcoin utilities |
| `docs/core/opnet/utils/binary-serialization.md` | Binary serialization |
| `docs/core/opnet/utils/revert-decoder.md` | Revert decoder |
| `docs/core/opnet/examples/op20-examples.md` | OP20 examples |
| `docs/core/opnet/examples/op721-examples.md` | OP721 examples |
| `docs/core/opnet/examples/deployment-examples.md` | Deployment examples |
| `docs/core/opnet/examples/advanced-swaps.md` | Swap examples |

### Transaction Library (`docs/core/transaction/`)

| File | Description |
|------|-------------|
| `docs/core/transaction/README.md` | Library overview |
| `docs/core/transaction/transaction-building.md` | Building transactions |
| `docs/core/transaction/offline-transaction-signing.md` | Offline signing |
| `docs/core/transaction/addresses/P2OP.md` | P2OP address format |
| `docs/core/transaction/addresses/P2WDA.md` | P2WDA address format |
| `docs/core/transaction/quantum-support/README.md` | Quantum overview |
| `docs/core/transaction/quantum-support/01-introduction.md` | Quantum intro |
| `docs/core/transaction/quantum-support/02-mnemonic-and-wallet.md` | Quantum wallet |
| `docs/core/transaction/quantum-support/03-address-generation.md` | Quantum addresses |
| `docs/core/transaction/quantum-support/04-message-signing.md` | Quantum signing |
| `docs/core/transaction/quantum-support/05-address-verification.md` | Quantum verification |

### OIP Specifications (`docs/core/OIP/`)

| File | Description |
|------|-------------|
| `docs/core/OIP/README.md` | OIP overview |
| `docs/core/OIP/OIP-0001.md` | OIP process |
| `docs/core/OIP/OIP-0002.md` | Contract standards |
| `docs/core/OIP/OIP-0003.md` | **Plugin system spec** |
| `docs/core/OIP/OIP-0004.md` | Epoch system |
| `docs/core/OIP/OIP-0020.md` | OP20 token standard |
| `docs/core/OIP/OIP-0721.md` | OP721 NFT standard |

### Contract Runtime (`docs/contracts/btc-runtime/`)

| File | Description |
|------|-------------|
| `docs/contracts/btc-runtime/README.md` | Runtime overview |
| `docs/contracts/btc-runtime/gas-optimization.md` | **Gas optimization (CRITICAL)** |
| `docs/contracts/btc-runtime/getting-started/installation.md` | Installation |
| `docs/contracts/btc-runtime/getting-started/first-contract.md` | First contract |
| `docs/contracts/btc-runtime/getting-started/project-structure.md` | Project structure |
| `docs/contracts/btc-runtime/core-concepts/blockchain-environment.md` | Blockchain env |
| `docs/contracts/btc-runtime/core-concepts/storage-system.md` | Storage system |
| `docs/contracts/btc-runtime/core-concepts/pointers.md` | Storage pointers |
| `docs/contracts/btc-runtime/core-concepts/events.md` | Events |
| `docs/contracts/btc-runtime/core-concepts/decorators.md` | Decorators |
| `docs/contracts/btc-runtime/core-concepts/security.md` | Security |
| `docs/contracts/btc-runtime/api-reference/blockchain.md` | Blockchain API |
| `docs/contracts/btc-runtime/api-reference/storage.md` | Storage API |
| `docs/contracts/btc-runtime/api-reference/events.md` | Events API |
| `docs/contracts/btc-runtime/api-reference/op20.md` | OP20 API |
| `docs/contracts/btc-runtime/api-reference/op721.md` | OP721 API |
| `docs/contracts/btc-runtime/api-reference/safe-math.md` | SafeMath API |
| `docs/contracts/btc-runtime/contracts/op-net-base.md` | OP_NET base class |
| `docs/contracts/btc-runtime/contracts/op20-token.md` | OP20 implementation |
| `docs/contracts/btc-runtime/contracts/op20s-signatures.md` | OP20S signatures |
| `docs/contracts/btc-runtime/contracts/op721-nft.md` | OP721 implementation |
| `docs/contracts/btc-runtime/contracts/reentrancy-guard.md` | Reentrancy guard |
| `docs/contracts/btc-runtime/contracts/upgradeable.md` | Upgradeable contracts |
| `docs/contracts/btc-runtime/storage/stored-primitives.md` | Stored primitives |
| `docs/contracts/btc-runtime/storage/stored-maps.md` | Stored maps |
| `docs/contracts/btc-runtime/storage/stored-arrays.md` | Stored arrays |
| `docs/contracts/btc-runtime/storage/memory-maps.md` | Memory maps |
| `docs/contracts/btc-runtime/types/address.md` | Address type |
| `docs/contracts/btc-runtime/types/calldata.md` | Calldata type |
| `docs/contracts/btc-runtime/types/bytes-writer-reader.md` | BytesWriter/Reader |
| `docs/contracts/btc-runtime/types/safe-math.md` | SafeMath type |
| `docs/contracts/btc-runtime/advanced/cross-contract-calls.md` | Cross-contract calls |
| `docs/contracts/btc-runtime/advanced/signature-verification.md` | Signature verification |
| `docs/contracts/btc-runtime/advanced/quantum-resistance.md` | Quantum resistance |
| `docs/contracts/btc-runtime/advanced/bitcoin-scripts.md` | Bitcoin scripts |
| `docs/contracts/btc-runtime/advanced/contract-upgrades.md` | Contract upgrades |
| `docs/contracts/btc-runtime/advanced/plugins.md` | Contract plugins |
| `docs/contracts/btc-runtime/examples/basic-token.md` | Basic token example |
| `docs/contracts/btc-runtime/examples/stablecoin.md` | Stablecoin example |
| `docs/contracts/btc-runtime/examples/nft-with-reservations.md` | NFT example |
| `docs/contracts/btc-runtime/examples/oracle-integration.md` | Oracle example |

### Other Contract Docs

| File | Description |
|------|-------------|
| `docs/contracts/as-bignum/README.md` | BigNum library (u256, u128) |
| `docs/contracts/opnet-transform/README.md` | Transform decorators |
| `docs/contracts/opnet-transform/std-README.md` | Standard library |
| `docs/contracts/example-tokens/README.md` | Example tokens |
| `docs/contracts/example-tokens/docs/OP_20.md` | OP20 example |

### Client Libraries (`docs/clients/`)

| File | Description |
|------|-------------|
| `docs/clients/bitcoin/README.md` | Bitcoin library |
| `docs/clients/bip32/README.md` | BIP32 HD derivation |
| `docs/clients/bip32/QUANTUM.md` | Quantum support |
| `docs/clients/ecpair/README.md` | EC key pairs |
| `docs/clients/walletconnect/README.md` | WalletConnect |
| `docs/clients/walletconnect/wallet-integration.md` | Wallet integration |

### Testing (`docs/testing/`)

| File | Description |
|------|-------------|
| `docs/testing/unit-test-framework/README.md` | Test framework |
| `docs/testing/opnet-unit-test/README.md` | Unit testing |
| `docs/testing/opnet-unit-test/docs/README.md` | Test docs |
| `docs/testing/opnet-unit-test/docs/Blockchain.md` | Blockchain mocking |
| `docs/testing/opnet-unit-test/docs/ContractRuntime.md` | Contract runtime |

### Frontend (`docs/frontend/`)

| File | Description |
|------|-------------|
| `docs/frontend/motoswap-ui/README.md` | **Frontend guide (THE STANDARD)** |

### Plugins (`docs/plugins/`)

| File | Description |
|------|-------------|
| `docs/plugins/plugin-sdk/README.md` | Plugin SDK |
| `docs/plugins/opnet-node/README.md` | OPNet node |
| `docs/plugins/opnet-node/docker/README.md` | Docker setup |

### Templates (`templates/`)

#### Contract Templates

| File | Description |
|------|-------------|
| `templates/contracts/generic/README.md` | Generic contract template |
| `templates/contracts/generic/package.json` | Package config |
| `templates/contracts/generic/assembly/index.ts` | Entry point |
| `templates/contracts/generic/assembly/MyContract.ts` | Contract code |
| `templates/contracts/op20-token/README.md` | OP20 template |
| `templates/contracts/op20-token/package.json` | Package config |
| `templates/contracts/op20-token/assembly/index.ts` | Entry point |
| `templates/contracts/op20-token/assembly/OP20Token.ts` | Token code |
| `templates/contracts/op721-nft/README.md` | OP721 template |
| `templates/contracts/op721-nft/package.json` | Package config |
| `templates/contracts/op721-nft/assembly/index.ts` | Entry point |
| `templates/contracts/op721-nft/assembly/OP721NFT.ts` | NFT code |

#### Frontend Template

| File | Description |
|------|-------------|
| `templates/frontend/opnet-dapp/README.md` | dApp template |
| `templates/frontend/opnet-dapp/package.json` | Package config |
| `templates/frontend/opnet-dapp/index.html` | HTML entry |
| `templates/frontend/opnet-dapp/vite.config.ts` | Vite config |
| `templates/frontend/opnet-dapp/src/main.tsx` | React entry |
| `templates/frontend/opnet-dapp/src/App.tsx` | App component |
| `templates/frontend/opnet-dapp/src/App.css` | App styles |
| `templates/frontend/opnet-dapp/src/index.css` | Global styles |
| `templates/frontend/opnet-dapp/src/providers/OPNetProvider.tsx` | OPNet provider |
| `templates/frontend/opnet-dapp/src/components/WalletConnect.tsx` | Wallet component |
| `templates/frontend/opnet-dapp/src/components/ContractInteraction.tsx` | Contract component |
| `templates/frontend/opnet-dapp/src/hooks/useWallet.ts` | Wallet hook |
| `templates/frontend/opnet-dapp/src/hooks/useContract.ts` | Contract hook |

#### Plugin Templates

| File | Description |
|------|-------------|
| `templates/plugins/generic/README.md` | Generic plugin |
| `templates/plugins/generic/package.json` | Package config |
| `templates/plugins/generic/plugin.json` | Plugin manifest |
| `templates/plugins/generic/src/index.ts` | Entry point |
| `templates/plugins/generic/src/MyPlugin.ts` | Plugin code |
| `templates/plugins/indexer/README.md` | Indexer plugin |
| `templates/plugins/indexer/package.json` | Package config |
| `templates/plugins/indexer/plugin.json` | Plugin manifest |
| `templates/plugins/indexer/src/index.ts` | Entry point |
| `templates/plugins/indexer/src/OP20Indexer.ts` | Indexer code |
| `templates/plugins/indexer/src/types.ts` | Type definitions |

#### Test Template

| File | Description |
|------|-------------|
| `templates/tests/contract-tests/README.md` | Test template |
| `templates/tests/contract-tests/package.json` | Package config |
| `templates/tests/contract-tests/gulpfile.js` | Gulp config |
| `templates/tests/contract-tests/src/index.ts` | Test entry |
| `templates/tests/contract-tests/src/tests/setup.ts` | Test setup |
| `templates/tests/contract-tests/src/tests/OP20.test.ts` | OP20 tests |
