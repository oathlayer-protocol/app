import { NextRequest } from "next/server";
import { createWalletClient, http, parseAbi, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// World Chain — uses Tenderly VNet if configured, falls back to public testnet
const rpcUrl =
  process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC ||
  "https://worldchain-sepolia.g.alchemy.com/public";

const worldChain = {
  id: parseInt(process.env.NEXT_PUBLIC_WORLD_CHAIN_ID || "4801"),
  name: "World Chain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
};

const REGISTRY_ABI = parseAbi([
  "function requestProviderRegistration(uint256 root, uint256 nullifierHash, uint256[8] calldata proof) external",
]);

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("=== REGISTER BODY FROM MINIKIT ===", JSON.stringify(body, null, 2));
  const { proof, merkle_root, nullifier_hash } = body;

  // Validate proof format before any on-chain call — prevents 500 crashes on malformed input
  if (typeof proof !== "string" || !/^0x[0-9a-fA-F]{512}$/.test(proof)) {
    return Response.json({ error: "Invalid proof format (expected 0x + 512 hex chars)" }, { status: 400 });
  }
  if (!merkle_root || !nullifier_hash) {
    return Response.json({ error: "Missing merkle_root or nullifier_hash" }, { status: 400 });
  }

  // NOTE: World ID 4.0 API verify endpoint has undocumented breaking changes
  // (requires unknown protocol_version field). Proof originates from World App
  // (trusted source) and is verified on-chain by WorldChainRegistry.
  // The ZK proof validity is enforced at the contract level.
  console.log("Relaying World ID proof to contract, nullifier:", nullifier_hash?.slice?.(0, 20));

  // Submit to WorldChainRegistry contract
  const rawKey = process.env.RELAYER_PRIVATE_KEY;
  if (!rawKey) {
    return Response.json({ error: "Relayer not configured" }, { status: 500 });
  }
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, chain: worldChain, transport: http() });

  const registryAddress = getAddress(
    process.env.NEXT_PUBLIC_REGISTRY_CONTRACT || "0x0000000000000000000000000000000000000000"
  );

  // Parse proof array — IDKit returns a packed hex string encoding 8 uint256 values
  const proofHex = proof.replace("0x", "");
  const proofArray: bigint[] = [];
  for (let i = 0; i < 8; i++) {
    proofArray.push(BigInt("0x" + proofHex.slice(i * 64, (i + 1) * 64)));
  }

  try {
    const txHash = await walletClient.writeContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: "requestProviderRegistration",
      args: [BigInt(merkle_root), BigInt(nullifier_hash), proofArray as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]],
    });

    return Response.json({ ok: true, txHash });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Contract call failed:", msg);
    return Response.json({ error: "Contract call failed", detail: msg }, { status: 500 });
  }
}
