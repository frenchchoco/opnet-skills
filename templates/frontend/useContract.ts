import { useState, useCallback } from 'react';
import { getContract, IOP20Contract, CallResult, OP_20_ABI, BitcoinInterface } from 'opnet';
import { useOPNet } from '../providers/OPNetProvider';

/**
 * Hook for interacting with OPNet smart contracts
 *
 * @param contractAddress - The contract address
 * @param abi - Contract ABI (defaults to OP20)
 */
export function useContract<T extends BitcoinInterface = IOP20Contract>(
    contractAddress: string,
    abi: T = OP_20_ABI as unknown as T
) {
    const { provider, isConnected } = useOPNet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    /**
     * Get the contract instance
     */
    const getContractInstance = useCallback(() => {
        if (!provider || !isConnected) {
            throw new Error('Provider not connected');
        }
        return getContract<T>(contractAddress, abi, provider);
    }, [provider, isConnected, contractAddress, abi]);

    /**
     * Call a read-only contract method (simulation)
     */
    const callMethod = useCallback(
        async <R>(methodName: string, ...args: unknown[]): Promise<CallResult<R> | null> => {
            if (!provider || !isConnected) {
                setError(new Error('Provider not connected'));
                return null;
            }

            setLoading(true);
            setError(null);

            try {
                const contract = getContractInstance();
                const method = (contract as Record<string, unknown>)[methodName];

                if (typeof method !== 'function') {
                    throw new Error(`Method ${methodName} not found on contract`);
                }

                const result = await method.call(contract, ...args);
                return result as CallResult<R>;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [provider, isConnected, getContractInstance]
    );

    return {
        contract: isConnected ? getContractInstance() : null,
        callMethod,
        loading,
        error,
        isConnected,
    };
}

/**
 * Specialized hook for OP20 tokens
 */
export function useOP20(contractAddress: string) {
    const { contract, callMethod, loading, error, isConnected } = useContract<IOP20Contract>(
        contractAddress,
        OP_20_ABI
    );

    const getName = useCallback(async () => {
        const result = await callMethod<string>('name');
        return result?.properties?.result ?? null;
    }, [callMethod]);

    const getSymbol = useCallback(async () => {
        const result = await callMethod<string>('symbol');
        return result?.properties?.result ?? null;
    }, [callMethod]);

    const getDecimals = useCallback(async () => {
        const result = await callMethod<number>('decimals');
        return result?.properties?.result ?? null;
    }, [callMethod]);

    const getTotalSupply = useCallback(async () => {
        const result = await callMethod<bigint>('totalSupply');
        return result?.properties?.result ?? null;
    }, [callMethod]);

    const getBalanceOf = useCallback(
        async (address: string) => {
            const result = await callMethod<bigint>('balanceOf', address);
            return result?.properties?.result ?? null;
        },
        [callMethod]
    );

    const getAllowance = useCallback(
        async (owner: string, spender: string) => {
            const result = await callMethod<bigint>('allowance', owner, spender);
            return result?.properties?.result ?? null;
        },
        [callMethod]
    );

    return {
        contract,
        loading,
        error,
        isConnected,
        getName,
        getSymbol,
        getDecimals,
        getTotalSupply,
        getBalanceOf,
        getAllowance,
    };
}
