import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  rabbyWallet,
  metaMaskWallet,
  walletConnectWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { defineChain } from "viem";

const TENDERLY_RPC =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://virtual.sepolia.eu.rpc.tenderly.co/47ad454d-8109-4ccb-9285-7ab201835e5d";

// Tenderly Virtual Sepolia VNet
export const tenderlyVNet = defineChain({
  id: 11155111,
  name: "Sepolia (Tenderly VNet)",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [TENDERLY_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: "Tenderly",
      url:
        process.env.NEXT_PUBLIC_TENDERLY_EXPLORER ||
        "https://dashboard.tenderly.co/robbyn/project/testnet/5c780e4f-4df5-4a50-b221-2342cd4b713e",
    },
  },
  testnet: true,
});

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "oathlayer-hackathon";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [rabbyWallet, metaMaskWallet, injectedWallet],
    },
    {
      groupName: "Other",
      wallets: [walletConnectWallet],
    },
  ],
  { appName: "OathLayer", projectId }
);

export const config = createConfig({
  connectors,
  chains: [tenderlyVNet],
  transports: {
    [tenderlyVNet.id]: http(TENDERLY_RPC),
  },
  ssr: true,
});
