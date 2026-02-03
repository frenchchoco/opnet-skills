import { useState, useCallback, useEffect } from 'react';
import { useWalletConnect, WalletConnectionState } from '@btc-vision/walletconnect';

/**
 * Hook for wallet connection and management
 */
export function useWallet() {
    const walletConnect = useWalletConnect();
    const [address, setAddress] = useState<string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Update state when wallet connection changes
    useEffect(() => {
        if (walletConnect.state === WalletConnectionState.Connected) {
            setAddress(walletConnect.address ?? null);
            setPublicKey(walletConnect.publicKey ?? null);
        } else {
            setAddress(null);
            setPublicKey(null);
        }
    }, [walletConnect.state, walletConnect.address, walletConnect.publicKey]);

    /**
     * Connect to wallet
     */
    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(null);

        try {
            await walletConnect.connect();
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
        } finally {
            setIsConnecting(false);
        }
    }, [walletConnect]);

    /**
     * Disconnect wallet
     */
    const disconnect = useCallback(async () => {
        try {
            await walletConnect.disconnect();
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
        }
    }, [walletConnect]);

    /**
     * Sign a message
     */
    const signMessage = useCallback(
        async (message: string): Promise<string | null> => {
            if (!walletConnect.isConnected) {
                setError(new Error('Wallet not connected'));
                return null;
            }

            try {
                const signature = await walletConnect.signMessage(message);
                return signature;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                return null;
            }
        },
        [walletConnect]
    );

    /**
     * Sign a PSBT
     */
    const signPsbt = useCallback(
        async (psbt: string): Promise<string | null> => {
            if (!walletConnect.isConnected) {
                setError(new Error('Wallet not connected'));
                return null;
            }

            try {
                const signedPsbt = await walletConnect.signPsbt(psbt);
                return signedPsbt;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                return null;
            }
        },
        [walletConnect]
    );

    return {
        // State
        address,
        publicKey,
        isConnected: walletConnect.isConnected,
        isConnecting,
        error,
        walletName: walletConnect.walletName,

        // Actions
        connect,
        disconnect,
        signMessage,
        signPsbt,
    };
}
