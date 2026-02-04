# OPNet Unit Testing Guidelines

**Read `setup-guidelines.md` FIRST for project setup and package versions.**

**CRITICAL: Unit tests are TypeScript, NOT AssemblyScript.** They have their own separate setup.

---

## Table of Contents

1. [TypeScript Law (MANDATORY)](#typescript-law-mandatory)
2. [Test Environment Overview](#test-environment-overview)
3. [Project Structure](#project-structure)
4. [Test Dependencies](#test-dependencies)
5. [Test Configuration](#test-configuration)
6. [Test Patterns](#test-patterns)
7. [ContractRuntime Wrapper](#contractruntime-wrapper)
8. [Blockchain Mocking](#blockchain-mocking)
9. [Common Test Mistakes](#common-test-mistakes)

---

## TypeScript Law (MANDATORY)

**BEFORE WRITING ANY TEST CODE, YOU MUST READ AND FOLLOW:**

`docs/core-typescript-law-CompleteLaw.md`

**The TypeScript Law is NON-NEGOTIABLE.** Every line of code must comply. Violations lead to exploitable, broken code.

### Key Rules for Tests

| FORBIDDEN | WHY | USE INSTEAD |
|-----------|-----|-------------|
| `any` | Runtime bugs, defeats type checking | Proper types, generics |
| `unknown` (except boundaries) | Lazy escape hatch | Model actual types |
| `!` (non-null assertion) | Hides null bugs | Explicit checks, `?.` |
| `// @ts-ignore` | Hides errors | Fix the actual error |
| `eslint-disable` | Bypasses safety | Fix the actual issue |
| Section separator comments | Lazy, unprofessional | TSDoc for every method |
| `number` for large values | 53-bit precision loss | `bigint` for satoshis, IDs, heights |

**Read the full TypeScript Law before proceeding.**

---

## Test Environment Overview

| Aspect | Contract | Unit Tests |
|--------|----------|------------|
| **Language** | AssemblyScript | TypeScript |
| **Runtime** | WASM | Node.js |
| **Package manager** | Separate package.json | Separate package.json |
| **Compiler** | asc (AssemblyScript) | tsc / ts-node |
| **ESLint config** | eslint-contract.json | eslint-generic.json |

**Unit tests do NOT use as-pect.** They use `@btc-vision/unit-test-framework`.

---

## Project Structure

```
my-contract/
├── src/                          # Contract (AssemblyScript)
│   ├── index.ts
│   └── MyContract.ts
├── build/                        # Compiled WASM
│   └── MyContract.wasm
├── tests/                        # Unit tests (TypeScript)
│   ├── MyContract.test.ts        # Test file
│   ├── MyContractRuntime.ts      # Runtime wrapper (optional)
│   ├── tsconfig.json             # Test-specific tsconfig
│   └── package.json              # Test-specific dependencies (optional)
├── package.json                  # Contract dependencies
└── asconfig.json
```

---

## Test Dependencies

Tests can share the contract's package.json or have their own. Either way, include:

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
        "@types/node": "^25.0.0"
    },
    "overrides": {
        "@noble/hashes": "2.1.0"
    }
}
```

**Run tests with:**
```bash
npx ts-node --esm tests/MyContract.test.ts
```

---

## Test Configuration

### tsconfig.json (for tests/)

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
        "outDir": "./build",
        "rootDir": "."
    },
    "include": ["*.ts"],
    "exclude": ["node_modules"]
}
```

### ESLint (use eslint-generic.json)

Tests are TypeScript, so use the generic TypeScript ESLint config, NOT the AssemblyScript contract config.

---

## Test Patterns

### Basic Test Structure

```typescript
import { opnet, OPNetUnit, Assert, Blockchain } from '@btc-vision/unit-test-framework';
import { ContractRuntime, BytecodeManager } from '@btc-vision/unit-test-framework';
import { Address, BinaryWriter, BinaryReader } from '@btc-vision/transaction';
import * as fs from 'fs';
import * as path from 'path';

await opnet('MyContract Tests', async (vm: OPNetUnit) => {
    // Test addresses
    const deployerAddress: Address = Blockchain.generateRandomAddress();
    const userAddress: Address = Blockchain.generateRandomAddress();
    const contractAddress: Address = Blockchain.generateRandomAddress();

    // Contract instance
    let contract: MyContractRuntime;

    // Setup before each test
    vm.beforeEach(async () => {
        // ALWAYS dispose and reinitialize
        Blockchain.dispose();
        Blockchain.clearContracts();
        await Blockchain.init();

        // Create and register contract
        contract = new MyContractRuntime(deployerAddress, contractAddress);
        Blockchain.register(contract);
        await contract.init();
    });

    // Cleanup after each test
    vm.afterEach(() => {
        contract.dispose();
        Blockchain.dispose();
    });

    // Test cases
    await vm.it('should do something', async () => {
        Blockchain.setSender(userAddress);
        const result = await contract.someMethod();
        Assert.expect(result).toEqual(expectedValue);
    });
});
```

### Assertion Patterns

```typescript
// Equality
Assert.expect(value).toEqual(expected);
Assert.expect(value.toString()).toEqual('123');

// Boolean
Assert.expect(result).toEqual(true);
Assert.expect(result).toEqual(false);

// BigInt comparison (convert to string)
Assert.expect(balance.toString()).toEqual('1000000000000000000000');

// Throws (async)
await Assert.expect(async () => {
    await contract.methodThatShouldFail();
}).toThrow();

// Throws with message
await Assert.expect(async () => {
    await contract.methodThatShouldFail();
}).toThrow('Expected error message');
```

### Block Manipulation

```typescript
// Mine a single block
Blockchain.mineBlock();

// Mine multiple blocks (e.g., advance past deadline)
for (let i = 0; i < 1025; i++) {
    Blockchain.mineBlock();
}

// Set sender for next call
Blockchain.setSender(userAddress);

// Generate random address for testing
const randomUser = Blockchain.generateRandomAddress();
```

---

## ContractRuntime Wrapper

Create a wrapper class to interact with your contract:

```typescript
import { ContractRuntime } from '@btc-vision/unit-test-framework';
import { Address, BinaryWriter, BinaryReader } from '@btc-vision/transaction';

export class MyContractRuntime extends ContractRuntime {
    // Define selectors
    private readonly myMethodSelector: number = this.getSelector('myMethod(address,uint256)');
    private readonly balanceOfSelector: number = this.getSelector('balanceOf(address)');

    public constructor(deployer: Address, address: Address, gasLimit: bigint = 150_000_000_000n) {
        super({
            address: address,
            deployer: deployer,
            gasLimit,
        });
    }

    /**
     * Call a method that returns a boolean.
     */
    public async myMethod(to: Address, amount: bigint): Promise<boolean> {
        const calldata = new BinaryWriter();
        calldata.writeSelector(this.myMethodSelector);
        calldata.writeAddress(to);
        calldata.writeU256(amount);

        const response = await this.execute({ calldata: calldata.getBuffer() });
        this.handleResponse(response);

        const reader = new BinaryReader(response.response);
        return reader.readBoolean();
    }

    /**
     * Call a view method that returns a u256.
     */
    public async balanceOf(address: Address): Promise<bigint> {
        const calldata = new BinaryWriter();
        calldata.writeSelector(this.balanceOfSelector);
        calldata.writeAddress(address);

        const response = await this.execute({ calldata: calldata.getBuffer() });
        this.handleResponse(response);

        const reader = new BinaryReader(response.response);
        return reader.readU256();
    }

    /**
     * Call a method that returns multiple values.
     */
    public async getStatus(): Promise<{
        isClosed: boolean;
        total: bigint;
        remaining: bigint;
    }> {
        const calldata = new BinaryWriter();
        calldata.writeSelector(this.getStatusSelector);

        const response = await this.execute({ calldata: calldata.getBuffer() });
        this.handleResponse(response);

        const reader = new BinaryReader(response.response);
        return {
            isClosed: reader.readBoolean(),
            total: reader.readU256(),
            remaining: reader.readU64(),
        };
    }
}
```

### Selector Format

Use `this.getSelector()` with the method signature:

```typescript
// Method with no params
this.getSelector('myMethod()');

// Method with address param
this.getSelector('balanceOf(address)');

// Method with multiple params
this.getSelector('transfer(address,uint256)');

// Standard OP20 methods
this.getSelector('name()');
this.getSelector('symbol()');
this.getSelector('decimals()');
this.getSelector('totalSupply()');
this.getSelector('balanceOf(address)');
this.getSelector('transfer(address,uint256)');
this.getSelector('approve(address,uint256)');
this.getSelector('allowance(address,address)');
this.getSelector('transferFrom(address,address,uint256)');
```

---

## Blockchain Mocking

### Available Methods

```typescript
// Initialize/cleanup
await Blockchain.init();
Blockchain.dispose();
Blockchain.clearContracts();

// Register contracts
Blockchain.register(contractRuntime);

// Set transaction sender
Blockchain.setSender(address);

// Generate addresses
const addr = Blockchain.generateRandomAddress();

// Mine blocks
Blockchain.mineBlock();

// Access block info (inside contract)
// Blockchain.block.number
// Blockchain.block.timestamp
```

### Testing Multiple Users

```typescript
await vm.it('should handle multiple users', async () => {
    const user1 = Blockchain.generateRandomAddress();
    const user2 = Blockchain.generateRandomAddress();

    // User 1 action
    Blockchain.setSender(user1);
    await contract.mint();

    // User 2 action
    Blockchain.setSender(user2);
    await contract.mint();

    // Verify both
    const balance1 = await contract.balanceOf(user1);
    const balance2 = await contract.balanceOf(user2);

    Assert.expect(balance1.toString()).toEqual('1000');
    Assert.expect(balance2.toString()).toEqual('1000');
});
```

### Testing Time-Based Logic

```typescript
await vm.it('should fail after deadline', async () => {
    // Advance past 1024 block deadline
    for (let i = 0; i < 1025; i++) {
        Blockchain.mineBlock();
    }

    Blockchain.setSender(userAddress);

    // Should throw because deadline passed
    await Assert.expect(async () => {
        await contract.freeMint();
    }).toThrow();
});
```

---

## Common Test Mistakes

### 1. Using as-pect Instead of unit-test-framework

**WRONG:**
```typescript
/// <reference types="@as-pect/assembly/types/as-pect" />

describe('MyContract', () => {  // ERROR: Cannot find name 'describe'
    it('should work', () => {
        expect(true).toBe(true);
    });
});
```

**CORRECT:**
```typescript
import { opnet, OPNetUnit, Assert, Blockchain } from '@btc-vision/unit-test-framework';

await opnet('MyContract', async (vm: OPNetUnit) => {
    await vm.it('should work', async () => {
        Assert.expect(true).toEqual(true);
    });
});
```

### 2. Forgetting to Initialize Blockchain

**WRONG:**
```typescript
vm.beforeEach(async () => {
    contract = new MyContractRuntime(deployer, address);
    // Missing: Blockchain.init()
});
```

**CORRECT:**
```typescript
vm.beforeEach(async () => {
    Blockchain.dispose();
    Blockchain.clearContracts();
    await Blockchain.init();

    contract = new MyContractRuntime(deployer, address);
    Blockchain.register(contract);
    await contract.init();
});
```

### 3. Forgetting to Dispose

**WRONG:**
```typescript
vm.afterEach(() => {
    // Missing cleanup
});
```

**CORRECT:**
```typescript
vm.afterEach(() => {
    contract.dispose();
    Blockchain.dispose();
});
```

### 4. Comparing BigInt Directly

**WRONG:**
```typescript
// May not work as expected
Assert.expect(balance).toEqual(1000n);
```

**CORRECT:**
```typescript
// Convert to string for reliable comparison
Assert.expect(balance.toString()).toEqual('1000');
```

### 5. Not Setting Sender

**WRONG:**
```typescript
// Who is calling?
await contract.mint();
```

**CORRECT:**
```typescript
Blockchain.setSender(userAddress);
await contract.mint();
```

### 6. Wrong Package Versions

**WRONG:**
```json
{
    "@btc-vision/unit-test-framework": "^1.0.0"  // Does not exist
}
```

**CORRECT:**
```json
{
    "@btc-vision/unit-test-framework": "0.4.10"
}
```

### 7. Missing --esm Flag

**WRONG:**
```bash
npx ts-node tests/MyContract.test.ts
# Error: Cannot use import statement outside a module
```

**CORRECT:**
```bash
npx ts-node --esm tests/MyContract.test.ts
```

---

## Example: Complete Test File

```typescript
import { opnet, OPNetUnit, Assert, Blockchain } from '@btc-vision/unit-test-framework';
import { ContractRuntime } from '@btc-vision/unit-test-framework';
import { Address, BinaryWriter, BinaryReader } from '@btc-vision/transaction';

/**
 * Contract runtime wrapper.
 */
class MyTokenRuntime extends ContractRuntime {
    private readonly freeMintSelector: number = this.getSelector('freeMint()');
    private readonly balanceOfSelector: number = this.getSelector('balanceOf(address)');

    public constructor(deployer: Address, address: Address) {
        super({ address, deployer, gasLimit: 150_000_000_000n });
    }

    public async freeMint(): Promise<boolean> {
        const calldata = new BinaryWriter();
        calldata.writeSelector(this.freeMintSelector);

        const response = await this.execute({ calldata: calldata.getBuffer() });
        this.handleResponse(response);

        return new BinaryReader(response.response).readBoolean();
    }

    public async balanceOf(address: Address): Promise<bigint> {
        const calldata = new BinaryWriter();
        calldata.writeSelector(this.balanceOfSelector);
        calldata.writeAddress(address);

        const response = await this.execute({ calldata: calldata.getBuffer() });
        this.handleResponse(response);

        return new BinaryReader(response.response).readU256();
    }
}

/**
 * Unit tests.
 */
await opnet('MyToken Tests', async (vm: OPNetUnit) => {
    const deployer = Blockchain.generateRandomAddress();
    const user = Blockchain.generateRandomAddress();
    const contractAddr = Blockchain.generateRandomAddress();

    let token: MyTokenRuntime;

    vm.beforeEach(async () => {
        Blockchain.dispose();
        Blockchain.clearContracts();
        await Blockchain.init();

        token = new MyTokenRuntime(deployer, contractAddr);
        Blockchain.register(token);
        await token.init();
    });

    vm.afterEach(() => {
        token.dispose();
        Blockchain.dispose();
    });

    await vm.it('should mint tokens', async () => {
        Blockchain.setSender(user);
        const result = await token.freeMint();
        Assert.expect(result).toEqual(true);
    });

    await vm.it('should update balance after mint', async () => {
        Blockchain.setSender(user);
        await token.freeMint();

        const balance = await token.balanceOf(user);
        Assert.expect(balance.toString()).toEqual('1000000000000000000000');
    });

    await vm.it('should fail on 6th mint', async () => {
        Blockchain.setSender(user);

        // Mint 5 times successfully
        for (let i = 0; i < 5; i++) {
            await token.freeMint();
        }

        // 6th should fail
        await Assert.expect(async () => {
            await token.freeMint();
        }).toThrow();
    });
});
```
