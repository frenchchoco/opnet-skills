import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    plugins: [
        nodePolyfills({
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
        react(),
    ],
    resolve: {
        dedupe: [
            '@noble/curves',
            '@noble/hashes',
            '@scure/bip32',
            '@scure/bip39',
            'buffer',
            'react',
            'react-dom',
        ],
    },
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: {
                    // Crypto libraries
                    crypto: ['@noble/curves', '@noble/hashes', '@scure/bip32', '@scure/bip39'],
                    // BTC Vision packages
                    btcvision: [
                        '@btc-vision/transaction',
                        '@btc-vision/bitcoin',
                        '@btc-vision/bip32',
                    ],
                    // OPNet
                    opnet: ['opnet'],
                    // React
                    react: ['react', 'react-dom', 'react-router-dom'],
                },
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'buffer', 'process'],
    },
});
