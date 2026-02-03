import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { JSONRpcProvider, WebSocketRpcProvider } from 'opnet';

// ==================== TYPES ====================

interface OPNetContextType {
    provider: JSONRpcProvider | null;
    wsProvider: WebSocketRpcProvider | null;
    isConnected: boolean;
    network: 'mainnet' | 'regtest';
    switchNetwork: (network: 'mainnet' | 'regtest') => void;
}

interface OPNetProviderProps {
    children: ReactNode;
    defaultNetwork?: 'mainnet' | 'regtest';
}

// ==================== CONSTANTS ====================

const NETWORKS = {
    mainnet: {
        rpc: 'https://api.opnet.org',
        ws: 'wss://api.opnet.org/ws',
    },
    regtest: {
        rpc: 'https://regtest.opnet.org',
        ws: 'wss://regtest.opnet.org/ws',
    },
};

// ==================== CONTEXT ====================

const OPNetContext = createContext<OPNetContextType | undefined>(undefined);

// ==================== PROVIDER ====================

export function OPNetProvider({ children, defaultNetwork = 'mainnet' }: OPNetProviderProps) {
    const [network, setNetwork] = useState<'mainnet' | 'regtest'>(defaultNetwork);
    const [provider, setProvider] = useState<JSONRpcProvider | null>(null);
    const [wsProvider, setWsProvider] = useState<WebSocketRpcProvider | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Initialize providers when network changes
    useEffect(() => {
        const initProviders = async () => {
            try {
                // Create JSON-RPC provider
                const rpcProvider = new JSONRpcProvider(NETWORKS[network].rpc);
                setProvider(rpcProvider);

                // Create WebSocket provider for real-time updates
                const wsRpcProvider = new WebSocketRpcProvider(NETWORKS[network].ws);
                setWsProvider(wsRpcProvider);

                // Test connection
                const blockHeight = await rpcProvider.getBlockHeight();
                console.log(`Connected to OPNet ${network} at block ${blockHeight}`);

                setIsConnected(true);
            } catch (error) {
                console.error('Failed to connect to OPNet:', error);
                setIsConnected(false);
            }
        };

        initProviders();

        // Cleanup on unmount or network change
        return () => {
            wsProvider?.disconnect();
        };
    }, [network]);

    const switchNetwork = (newNetwork: 'mainnet' | 'regtest') => {
        if (newNetwork !== network) {
            setIsConnected(false);
            setNetwork(newNetwork);
        }
    };

    const value: OPNetContextType = {
        provider,
        wsProvider,
        isConnected,
        network,
        switchNetwork,
    };

    return <OPNetContext.Provider value={value}>{children}</OPNetContext.Provider>;
}

// ==================== HOOK ====================

export function useOPNet(): OPNetContextType {
    const context = useContext(OPNetContext);
    if (context === undefined) {
        throw new Error('useOPNet must be used within an OPNetProvider');
    }
    return context;
}
