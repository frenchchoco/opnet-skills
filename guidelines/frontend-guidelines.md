# OPNet Frontend Development Guidelines

**Read `setup-guidelines.md` FIRST for project setup and package versions.**

This document covers frontend architecture, code organization, caching, network handling, and best practices.

---

## Table of Contents

1. [Code Architecture](#code-architecture)
2. [Project Structure](#project-structure)
3. [Caching and Reuse](#caching-and-reuse)
4. [Network Configuration](#network-configuration)
5. [Wallet Integration](#wallet-integration)
6. [Utility Patterns](#utility-patterns)
7. [Component Patterns](#component-patterns)
8. [TypeScript Standards](#typescript-standards)
9. [Common Frontend Mistakes](#common-frontend-mistakes)
10. [Theming with CSS Variables](#theming-with-css-variables)

---

## Code Architecture

### OOP WHERE SENSIBLE

**Use Object-Oriented Programming where it makes sense.** Classes are preferred over scattered functions for:

- Services (ProviderService, ContractService, WalletService)
- Utilities with related methods (FormatUtils, ValidationUtils)
- State management with encapsulation
- Complex components with internal logic

**NOT everything needs to be a class.** Simple pure functions, React hooks, and small utilities can remain functional.

### NO SPAGHETTI CODE

**Classes are preferred over scattered functions.** Organize code properly:

| Bad | Good |
|-----|------|
| Functions scattered across files | Classes with clear responsibilities |
| Duplicate code everywhere | Utility classes, shared functions |
| No structure | Feature-based organization |
| Inline logic in components | Logic extracted to hooks/services |

### Single Responsibility Principle

Each class/function/component should do ONE thing:

```typescript
// BAD - Component does everything
function TokenPage() {
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const [balance, setBalance] = useState(0n);
    // ... 500 lines of mixed logic
}

// GOOD - Separated concerns
function TokenPage() {
    const { provider } = useOPNetProvider();
    const { contract } = useTokenContract();
    const { balance, refreshBalance } = useTokenBalance();
    // Clean, focused component
}
```

---

## Project Structure

```
src/
├── main.tsx                      # Entry point
├── App.tsx                       # Root component
├── config/
│   ├── index.ts                  # Config exports
│   ├── networks.ts               # Network configs (mainnet, regtest)
│   └── contracts.ts              # Contract addresses per network
├── components/
│   ├── common/                   # Shared components (Button, Modal, etc.)
│   ├── wallet/                   # Wallet-related components
│   └── token/                    # Token-specific components
├── hooks/
│   ├── useOPNetProvider.ts       # Provider hook (cached)
│   ├── useWallet.ts              # Wallet connection hook
│   ├── useContract.ts            # Contract instance hook (cached)
│   └── useTokenBalance.ts        # Specific data hooks
├── services/
│   ├── ProviderService.ts        # Provider singleton
│   ├── ContractService.ts        # Contract instance cache
│   └── WalletService.ts          # Wallet interaction service
├── utils/
│   ├── formatting.ts             # Format utils (addresses, amounts)
│   ├── validation.ts             # Validation utils
│   └── network.ts                # Network detection utils
├── types/
│   ├── index.ts                  # Type exports
│   ├── contracts.ts              # Contract types
│   └── wallet.ts                 # Wallet types
├── abi/
│   └── TokenABI.ts               # Contract ABIs
└── styles/
    └── index.css                 # Global styles
```

---

## Caching and Reuse

### ALWAYS CACHE. ALWAYS REUSE.

**Provider, contract instances, and API responses MUST be cached.**

### Provider Singleton

```typescript
// services/ProviderService.ts
import { JSONRpcProvider } from 'opnet';
import { Networks } from '@btc-vision/bitcoin';

/**
 * Singleton provider service. Never create multiple provider instances.
 */
class ProviderService {
    private static instance: ProviderService;
    private providers: Map<Networks, JSONRpcProvider> = new Map();

    private constructor() {}

    public static getInstance(): ProviderService {
        if (!ProviderService.instance) {
            ProviderService.instance = new ProviderService();
        }
        return ProviderService.instance;
    }

    /**
     * Get or create provider for network.
     * Provider is created ONCE and reused.
     */
    public getProvider(network: Networks): JSONRpcProvider {
        if (!this.providers.has(network)) {
            const rpcUrl = this.getRpcUrl(network);
            const provider = new JSONRpcProvider(rpcUrl, network);
            this.providers.set(network, provider);
        }
        return this.providers.get(network)!;
    }

    private getRpcUrl(network: Networks): string {
        switch (network) {
            case Networks.Mainnet:
                return 'https://api.opnet.org';
            case Networks.Regtest:
                return 'http://localhost:9001';
            default:
                throw new Error(`Unsupported network: ${network}`);
        }
    }
}

export const providerService = ProviderService.getInstance();
```

### Contract Instance Cache

```typescript
// services/ContractService.ts
import { IOP20Contract, getContract, OP20_ABI } from 'opnet';
import { Networks } from '@btc-vision/bitcoin';
import { providerService } from './ProviderService';

/**
 * Contract instance cache. getContract is called ONCE per address.
 */
class ContractService {
    private static instance: ContractService;
    private contracts: Map<string, IOP20Contract> = new Map();

    private constructor() {}

    public static getInstance(): ContractService {
        if (!ContractService.instance) {
            ContractService.instance = new ContractService();
        }
        return ContractService.instance;
    }

    /**
     * Get or create contract instance.
     * Contract is created ONCE and reused.
     */
    public getTokenContract(address: string, network: Networks): IOP20Contract {
        const key = `${network}:${address}`;

        if (!this.contracts.has(key)) {
            const provider = providerService.getProvider(network);
            const contract = getContract<IOP20Contract>(address, OP20_ABI, provider);
            this.contracts.set(key, contract);
        }

        return this.contracts.get(key)!;
    }

    /**
     * Clear cache on network change.
     */
    public clearCache(): void {
        this.contracts.clear();
    }
}

export const contractService = ContractService.getInstance();
```

### Hook with Caching

```typescript
// hooks/useContract.ts
import { useMemo } from 'react';
import { IOP20Contract } from 'opnet';
import { Networks } from '@btc-vision/bitcoin';
import { contractService } from '../services/ContractService';
import { useNetwork } from './useNetwork';

export function useTokenContract(address: string): IOP20Contract | null {
    const { network } = useNetwork();

    // useMemo ensures we don't recreate on every render
    // But the REAL caching is in ContractService
    return useMemo(() => {
        if (!address || !network) return null;
        return contractService.getTokenContract(address, network);
    }, [address, network]);
}
```

---

## Network Configuration

### ALWAYS Use Enums from @btc-vision/bitcoin

**NEVER hardcode network strings.** Use the official enums:

```typescript
import { Networks } from '@btc-vision/bitcoin';
import { ChainId } from '@btc-vision/transaction';

// WRONG - Hardcoded strings
const network = 'mainnet';
const network = 'regtest';

// CORRECT - Use enums
const network = Networks.Mainnet;
const network = Networks.Regtest;
```

### Network Config File

```typescript
// config/networks.ts
import { Networks } from '@btc-vision/bitcoin';

export interface NetworkConfig {
    name: string;
    rpcUrl: string;
    explorerUrl: string;
}

export const NETWORK_CONFIGS: Record<Networks, NetworkConfig> = {
    [Networks.Mainnet]: {
        name: 'Mainnet',
        rpcUrl: 'https://api.opnet.org',
        explorerUrl: 'https://explorer.opnet.org',
    },
    [Networks.Testnet]: {
        name: 'Testnet',
        rpcUrl: 'https://testnet.opnet.org',
        explorerUrl: 'https://testnet-explorer.opnet.org',
    },
    [Networks.Regtest]: {
        name: 'Regtest',
        rpcUrl: 'http://localhost:9001',
        explorerUrl: 'http://localhost:3000',
    },
};
```

### Contract Addresses Per Network

```typescript
// config/contracts.ts
import { Networks } from '@btc-vision/bitcoin';

export interface ContractAddresses {
    token: string;
    staking?: string;
    // Add other contracts
}

export const CONTRACT_ADDRESSES: Record<Networks, ContractAddresses> = {
    [Networks.Mainnet]: {
        token: 'bcrt1q...mainnet-address',
        staking: 'bcrt1q...mainnet-staking',
    },
    [Networks.Testnet]: {
        token: 'bcrt1q...testnet-address',
    },
    [Networks.Regtest]: {
        token: 'bcrt1q...regtest-address',
    },
};

/**
 * Get contract address for current network.
 */
export function getContractAddress(
    contract: keyof ContractAddresses,
    network: Networks
): string {
    const addresses = CONTRACT_ADDRESSES[network];
    const address = addresses[contract];

    if (!address) {
        throw new Error(`No ${contract} address configured for ${network}`);
    }

    return address;
}
```

---

## Wallet Integration

### Auto-Detect Network Switch (NO PAGE REFRESH)

The website must handle network changes WITHOUT requiring page refresh:

```typescript
// hooks/useNetwork.ts
import { useState, useEffect, useCallback } from 'react';
import { Networks } from '@btc-vision/bitcoin';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { contractService } from '../services/ContractService';

export function useNetwork() {
    const { network: walletNetwork, isConnected } = useWalletConnect();
    const [network, setNetwork] = useState<Networks>(Networks.Mainnet);

    // Auto-detect wallet network change
    useEffect(() => {
        if (isConnected && walletNetwork) {
            if (walletNetwork !== network) {
                // Network changed - clear caches
                contractService.clearCache();
                setNetwork(walletNetwork);
            }
        }
    }, [walletNetwork, isConnected, network]);

    // Manual network switch (when not connected)
    const switchNetwork = useCallback((newNetwork: Networks) => {
        contractService.clearCache();
        setNetwork(newNetwork);
    }, []);

    return {
        network,
        switchNetwork,
        isConnected,
    };
}
```

### Wallet Connection Component

```typescript
// components/wallet/WalletConnect.tsx
import { useWalletConnect, SupportedWallets } from '@btc-vision/walletconnect';
import { Networks } from '@btc-vision/bitcoin';
import { formatAddress } from '../../utils/formatting';

export function WalletConnect() {
    const {
        isConnected,
        address,
        network,
        connectToWallet,
        disconnect,
    } = useWalletConnect();

    const handleConnect = async () => {
        await connectToWallet(SupportedWallets.OP_WALLET);
    };

    if (isConnected && address) {
        return (
            <div className="wallet-info">
                <span className="network-badge">
                    {network === Networks.Mainnet ? 'Mainnet' : 'Regtest'}
                </span>
                <span className="address">{formatAddress(address)}</span>
                <button onClick={disconnect}>Disconnect</button>
            </div>
        );
    }

    return (
        <button onClick={handleConnect}>
            Connect Wallet
        </button>
    );
}
```

### Network-Aware Data Fetching

```typescript
// hooks/useTokenData.ts
import { useState, useEffect } from 'react';
import { useNetwork } from './useNetwork';
import { useTokenContract } from './useContract';
import { getContractAddress } from '../config/contracts';

export function useTokenData() {
    const { network } = useNetwork();
    const tokenAddress = getContractAddress('token', network);
    const contract = useTokenContract(tokenAddress);

    const [balance, setBalance] = useState<bigint>(0n);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Refetch when network changes
        if (contract) {
            fetchBalance();
        }
    }, [contract, network]);

    const fetchBalance = async () => {
        if (!contract) return;
        setLoading(true);
        try {
            const result = await contract.balanceOf(userAddress);
            setBalance(result.decoded[0] as bigint);
        } finally {
            setLoading(false);
        }
    };

    return { balance, loading, refreshBalance: fetchBalance };
}
```

---

## Utility Patterns

### Create Utility Classes for Reusable Logic

**NO duplicate code.** Extract to utilities:

```typescript
// utils/formatting.ts

/**
 * Format utilities for consistent display.
 */
export class FormatUtils {
    /**
     * Truncate address for display.
     */
    public static formatAddress(address: string, chars: number = 6): string {
        if (address.length <= chars * 2 + 3) return address;
        return `${address.slice(0, chars)}...${address.slice(-chars)}`;
    }

    /**
     * Format token amount with decimals.
     */
    public static formatTokenAmount(
        amount: bigint,
        decimals: number = 18,
        displayDecimals: number = 4
    ): string {
        const divisor = 10n ** BigInt(decimals);
        const whole = amount / divisor;
        const fraction = amount % divisor;

        const fractionStr = fraction.toString().padStart(decimals, '0');
        const displayFraction = fractionStr.slice(0, displayDecimals);

        return `${whole.toLocaleString()}.${displayFraction}`;
    }

    /**
     * Parse token amount from user input.
     */
    public static parseTokenAmount(input: string, decimals: number = 18): bigint {
        const [whole, fraction = ''] = input.split('.');
        const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
        return BigInt(whole + paddedFraction);
    }
}
```

```typescript
// utils/validation.ts

/**
 * Validation utilities.
 */
export class ValidationUtils {
    /**
     * Validate Bitcoin address format.
     */
    public static isValidAddress(address: string): boolean {
        // Basic validation - starts with expected prefix
        return /^(bc1|bcrt1|tb1)[a-z0-9]{39,87}$/i.test(address);
    }

    /**
     * Validate positive amount.
     */
    public static isValidAmount(amount: string): boolean {
        if (!amount) return false;
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0;
    }
}
```

### Using Utilities in Components

```typescript
import { FormatUtils } from '../utils/formatting';
import { ValidationUtils } from '../utils/validation';

function TransferForm() {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');

    const isValid = ValidationUtils.isValidAddress(recipient)
        && ValidationUtils.isValidAmount(amount);

    const handleSubmit = () => {
        const parsedAmount = FormatUtils.parseTokenAmount(amount, 18);
        // Submit transfer
    };

    return (
        <form>
            <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Recipient address"
            />
            <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
            />
            <button disabled={!isValid} onClick={handleSubmit}>
                Transfer
            </button>
        </form>
    );
}
```

---

## Component Patterns

### Clean, Focused Components

```typescript
// WRONG - Component does too much
function TokenPage() {
    // 50 lines of state
    // 100 lines of effects
    // 200 lines of handlers
    // 150 lines of JSX
}

// CORRECT - Separated concerns
function TokenPage() {
    return (
        <div className="token-page">
            <TokenHeader />
            <TokenBalance />
            <TokenActions />
            <TokenHistory />
        </div>
    );
}

function TokenBalance() {
    const { balance, loading } = useTokenBalance();

    if (loading) return <Spinner />;

    return (
        <div className="balance">
            {FormatUtils.formatTokenAmount(balance)}
        </div>
    );
}
```

### Props Interfaces

```typescript
// Always define props interfaces
interface TokenCardProps {
    address: string;
    name: string;
    symbol: string;
    balance: bigint;
    onTransfer: (amount: bigint) => void;
}

function TokenCard({ address, name, symbol, balance, onTransfer }: TokenCardProps) {
    // ...
}
```

---

## TypeScript Standards

### ESLint + Strict TypeScript (ESNext Always)

```json
// tsconfig.json
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
        "jsx": "react-jsx"
    }
}
```

### NO `any` Type

```typescript
// WRONG
const data: any = response.data;
function process(input: any): any { }

// CORRECT
interface TokenData {
    name: string;
    symbol: string;
    balance: bigint;
}
const data: TokenData = response.data;
function process(input: TokenData): ProcessedData { }
```

---

## Common Frontend Mistakes

### 1. Creating Multiple Provider Instances

**WRONG:**
```typescript
function Component1() {
    const provider = new JSONRpcProvider(url, network);  // New instance
}
function Component2() {
    const provider = new JSONRpcProvider(url, network);  // Another instance!
}
```

**CORRECT:**
```typescript
// Use singleton service
const provider = providerService.getProvider(network);  // Same instance
```

### 2. Calling getContract Every Render

**WRONG:**
```typescript
function TokenBalance() {
    // Creates new contract instance on EVERY render!
    const contract = getContract(address, abi, provider);
}
```

**CORRECT:**
```typescript
function TokenBalance() {
    // Cached in service, useMemo prevents unnecessary calls
    const contract = useTokenContract(address);
}
```

### 3. Hardcoding Network Strings

**WRONG:**
```typescript
if (network === 'mainnet') { }
const config = configs['regtest'];
```

**CORRECT:**
```typescript
import { Networks } from '@btc-vision/bitcoin';
if (network === Networks.Mainnet) { }
const config = configs[Networks.Regtest];
```

### 4. Not Handling Network Switch

**WRONG:**
```typescript
// Page refresh required when wallet changes network
```

**CORRECT:**
```typescript
useEffect(() => {
    if (walletNetwork !== currentNetwork) {
        contractService.clearCache();
        setNetwork(walletNetwork);
        // Data refetches automatically due to dependency
    }
}, [walletNetwork]);
```

### 5. Duplicate Utility Code

**WRONG:**
```typescript
// In Component1.tsx
const formatted = `${address.slice(0, 6)}...${address.slice(-4)}`;

// In Component2.tsx (same logic duplicated)
const formatted = `${address.slice(0, 6)}...${address.slice(-4)}`;
```

**CORRECT:**
```typescript
// In utils/formatting.ts
export function formatAddress(address: string): string { }

// In any component
import { formatAddress } from '../utils/formatting';
const formatted = formatAddress(address);
```

### 6. Missing Loading States

**WRONG:**
```typescript
function Balance() {
    const [balance, setBalance] = useState(0n);
    // No loading state - shows 0 while fetching
    return <div>{balance}</div>;
}
```

**CORRECT:**
```typescript
function Balance() {
    const { balance, loading } = useTokenBalance();

    if (loading) return <Skeleton />;
    return <div>{formatTokenAmount(balance)}</div>;
}
```

### 7. Vite Version Incompatibility

**WRONG:**
```json
{
    "vite": "^6.0.0",
    "vite-plugin-node-polyfills": "^0.22.0"
}
```

**CORRECT:**
```json
{
    "vite": "^7.3.1",
	"vite-plugin-dts": "^4.5.4",
	"vite-plugin-node-polyfills": "^0.25.0",
}
```

---

## Theming with CSS Variables

### ALWAYS Use CSS Variables for Colors

**Never hardcode colors.** Use CSS variables for dark/light theme support:

```css
/* styles/variables.css */

:root {
    /* Light theme (default) */
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f5f5f5;
    --color-bg-tertiary: #e0e0e0;

    --color-text-primary: #1a1a1a;
    --color-text-secondary: #666666;
    --color-text-muted: #999999;

    --color-border: #e0e0e0;
    --color-border-hover: #cccccc;

    --color-accent: #0066cc;
    --color-accent-hover: #0052a3;
    --color-accent-text: #ffffff;

    --color-success: #22c55e;
    --color-warning: #f59e0b;
    --color-error: #ef4444;

    --color-card-bg: #ffffff;
    --color-card-shadow: rgba(0, 0, 0, 0.1);

    /* Spacing */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;

    /* Border radius */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-full: 9999px;

    /* Font sizes */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-md: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;

    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-normal: 250ms ease;
}

/* Dark theme */
[data-theme="dark"] {
    --color-bg-primary: #0a0a0a;
    --color-bg-secondary: #1a1a1a;
    --color-bg-tertiary: #2a2a2a;

    --color-text-primary: #f5f5f5;
    --color-text-secondary: #a0a0a0;
    --color-text-muted: #666666;

    --color-border: #333333;
    --color-border-hover: #444444;

    --color-accent: #3b82f6;
    --color-accent-hover: #60a5fa;
    --color-accent-text: #ffffff;

    --color-success: #22c55e;
    --color-warning: #f59e0b;
    --color-error: #ef4444;

    --color-card-bg: #1a1a1a;
    --color-card-shadow: rgba(0, 0, 0, 0.3);
}
```

### Using CSS Variables in Components

```css
/* styles/components.css */

.card {
    background: var(--color-card-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    box-shadow: 0 2px 8px var(--color-card-shadow);
    transition: border-color var(--transition-fast);
}

.card:hover {
    border-color: var(--color-border-hover);
}

.button-primary {
    background: var(--color-accent);
    color: var(--color-accent-text);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-md);
    cursor: pointer;
    transition: background var(--transition-fast);
}

.button-primary:hover {
    background: var(--color-accent-hover);
}

.text-primary {
    color: var(--color-text-primary);
}

.text-secondary {
    color: var(--color-text-secondary);
}

.text-muted {
    color: var(--color-text-muted);
}
```

### Theme Toggle Hook

```typescript
// hooks/useTheme.ts
import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        // Check localStorage first
        const stored = localStorage.getItem('theme') as Theme | null;
        if (stored) return stored;

        // Check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    return { theme, setTheme, toggleTheme };
}
```

### Theme Toggle Component

```typescript
// components/common/ThemeToggle.tsx
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
            {theme === 'light' ? '🌙' : '☀️'}
        </button>
    );
}
```

### Theme Rules

| Rule | Why |
|------|-----|
| **NEVER hardcode colors** | Breaks theming |
| **Use CSS variables** | Single source of truth |
| **Define both themes** | `:root` for light, `[data-theme="dark"]` for dark |
| **Use semantic names** | `--color-text-primary` not `--color-black` |
| **Include spacing/radius** | Consistent design system |
| **Store preference** | localStorage persists user choice |
| **Respect system preference** | `prefers-color-scheme` media query |

---

## Summary Checklist

### Architecture
- [ ] OOP where sensible (services, utilities with related methods)
- [ ] Use classes for services (ProviderService, ContractService)
- [ ] Extract duplicate code to utility classes
- [ ] Components are small and focused
- [ ] Logic extracted to hooks/services

### Caching
- [ ] Provider is singleton - NEVER create multiple instances
- [ ] Contract instances are cached - getContract called ONCE per address
- [ ] Clear caches on network change

### Network
- [ ] Use `Networks` enum from @btc-vision/bitcoin
- [ ] Config file has addresses for all networks (mainnet, regtest)
- [ ] Auto-detect wallet network switch (no page refresh)
- [ ] NO hardcoded network strings

### TypeScript
- [ ] ESNext + strict TypeScript
- [ ] NO `any` type anywhere

### Theming
- [ ] Use CSS variables for ALL colors
- [ ] Define both light and dark themes
- [ ] Use semantic variable names (--color-text-primary, not --color-black)
- [ ] Store theme preference in localStorage
- [ ] Respect system preference (prefers-color-scheme)
