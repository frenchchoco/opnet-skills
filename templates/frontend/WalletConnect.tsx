import React from 'react';
import { useWallet } from '../hooks/useWallet';

/**
 * WalletConnect Component
 *
 * Displays wallet connection button and connected wallet info.
 */
export function WalletConnect() {
    const { address, isConnected, isConnecting, error, walletName, connect, disconnect } =
        useWallet();

    // Truncate address for display
    const truncateAddress = (addr: string): string => {
        return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
    };

    if (isConnected && address) {
        return (
            <div className="wallet-connect connected">
                <div className="wallet-info">
                    <span className="wallet-name">{walletName}</span>
                    <span className="wallet-address">{truncateAddress(address)}</span>
                </div>
                <button className="btn btn-disconnect" onClick={disconnect}>
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div className="wallet-connect">
            <button className="btn btn-connect" onClick={connect} disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            {error && <p className="error">{error.message}</p>}
        </div>
    );
}

/**
 * Wallet Required Wrapper
 *
 * Wraps content that requires a connected wallet.
 */
interface WalletRequiredProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function WalletRequired({ children, fallback }: WalletRequiredProps) {
    const { isConnected } = useWallet();

    if (!isConnected) {
        return (
            fallback ?? (
                <div className="wallet-required">
                    <p>Please connect your wallet to continue.</p>
                    <WalletConnect />
                </div>
            )
        );
    }

    return <>{children}</>;
}
