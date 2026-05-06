import { encodeFunctionData, isAddress, type Hex } from "viem";
import { adapterFor as _adapterFor } from "./chains-internal.js";
import { mpcContract as _mpcContract } from "./chains-internal.js";
import { nearAccount } from "./near.js";
import {
  ensureSigningAllowed,
  ensureNearSigner,
  checkNearAmount,
  checkWeiAmount,
} from "./policy.js";
import type { HydraConfig } from "./config.js";
import type { EvmChain } from "./chains.js";

const FT_TRANSFER_GAS = 30_000_000_000_000n;
const DEFAULT_CALL_GAS = 30_000_000_000_000n;

export interface SendNearArgs {
  to: string;
  amountYocto: string;
  dry?: boolean;
}

export async function sendNear(cfg: HydraConfig, args: SendNearArgs) {
  ensureSigningAllowed(cfg);
  ensureNearSigner(cfg);
  const amount = BigInt(args.amountYocto);
  checkNearAmount(cfg, amount);
  const plan = {
    kind: "send_near" as const,
    from: cfg.account!.id,
    to: args.to,
    amountYocto: args.amountYocto,
  };
  if (args.dry !== false) return { dry: true, plan };
  const acct = nearAccount(cfg);
  const result = await acct.transfer({ receiverId: args.to, amount });
  return { dry: false, plan, txHash: pickTxHash(result), result };
}

export interface SendFtArgs {
  tokenContract: string;
  to: string;
  amount: string;
  memo?: string;
  dry?: boolean;
}

export async function sendFt(cfg: HydraConfig, args: SendFtArgs) {
  ensureSigningAllowed(cfg);
  ensureNearSigner(cfg);
  const plan = {
    kind: "send_ft" as const,
    from: cfg.account!.id,
    tokenContract: args.tokenContract,
    to: args.to,
    amount: args.amount,
    memo: args.memo,
  };
  if (args.dry !== false) return { dry: true, plan };
  const acct = nearAccount(cfg);
  const result = (await acct.callFunction({
    contractId: args.tokenContract,
    methodName: "ft_transfer",
    args: { receiver_id: args.to, amount: args.amount, memo: args.memo },
    deposit: 1n,
    gas: FT_TRANSFER_GAS,
  })) as unknown;
  return { dry: false, plan, txHash: pickTxHash(result), result };
}

export interface CallContractArgs {
  contractId: string;
  method: string;
  args?: Record<string, unknown>;
  depositYocto?: string;
  gas?: string;
  dry?: boolean;
}

export async function callContract(cfg: HydraConfig, a: CallContractArgs) {
  ensureSigningAllowed(cfg);
  ensureNearSigner(cfg);
  const plan = {
    kind: "contract_call" as const,
    from: cfg.account!.id,
    contractId: a.contractId,
    method: a.method,
    args: a.args ?? {},
    depositYocto: a.depositYocto ?? "0",
    gas: a.gas ?? DEFAULT_CALL_GAS.toString(),
  };
  if (a.dry !== false) return { dry: true, plan };
  const deposit = a.depositYocto ? BigInt(a.depositYocto) : 0n;
  if (deposit > 0n) checkNearAmount(cfg, deposit);
  const acct = nearAccount(cfg);
  const result = (await acct.callFunction({
    contractId: a.contractId,
    methodName: a.method,
    args: a.args ?? {},
    deposit,
    gas: a.gas ? BigInt(a.gas) : DEFAULT_CALL_GAS,
  })) as unknown;
  return { dry: false, plan, txHash: pickTxHash(result), result };
}

export interface SendEvmArgs {
  chain: EvmChain;
  predecessor?: string;
  path?: string;
  to: string;
  valueWei?: string;
  dataHex?: Hex;
  erc20?: { token: string; recipient: string; amount: string };
  dry?: boolean;
}

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export async function sendEvm(cfg: HydraConfig, args: SendEvmArgs) {
  ensureSigningAllowed(cfg);
  ensureNearSigner(cfg);
  const predecessor = args.predecessor ?? cfg.account!.id;
  const path = args.path ?? `${args.chain}-1`;
  const adapter = _adapterFor(cfg, args.chain);
  const { address: from } = await adapter.deriveAddressAndPublicKey(predecessor, path);

  let to: string;
  let value: bigint;
  let data: Hex;
  if (args.erc20) {
    if (!isAddress(args.erc20.token) || !isAddress(args.erc20.recipient)) {
      throw new Error("erc20.token and erc20.recipient must be valid 0x addresses");
    }
    to = args.erc20.token;
    value = 0n;
    data = encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [args.erc20.recipient as Hex, BigInt(args.erc20.amount)],
    });
  } else {
    if (!isAddress(args.to)) throw new Error("to must be a valid 0x address");
    to = args.to;
    value = args.valueWei ? BigInt(args.valueWei) : 0n;
    data = (args.dataHex ?? "0x") as Hex;
  }
  checkWeiAmount(cfg, value);

  const plan = {
    kind: "send_evm" as const,
    chain: args.chain,
    from,
    to,
    valueWei: value.toString(),
    dataHex: data,
    derivedFrom: { predecessor, path },
  };

  if (args.dry !== false) {
    // In dry mode, skip prepareTransactionForSigning. It calls estimateGas
    // against the chain, which fails when the derived address holds 0
    // native gas — defeating the purpose of a dry run. Return the plan only.
    return { dry: true, plan };
  }

  const { transaction, hashesToSign } = await adapter.prepareTransactionForSigning({
    from,
    to,
    value,
    data,
  });

  const signerAccount = nearAccount(cfg);
  const contract = _mpcContract(cfg);
  const rsvSignatures = await contract.sign({
    payloads: hashesToSign,
    path,
    keyType: "Ecdsa",
    signerAccount,
  });
  const signedTx = adapter.finalizeTransactionSigning({ transaction, rsvSignatures }) as Hex;
  const { hash } = await adapter.broadcastTx(signedTx);
  return { dry: false, plan, txHash: hash, signedTx };
}

function pickTxHash(result: unknown): string | undefined {
  const r = result as { transaction?: { hash?: string }; transaction_outcome?: { id?: string } };
  return r?.transaction?.hash ?? r?.transaction_outcome?.id;
}
