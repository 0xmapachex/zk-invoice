import {
  getTokenContract as getTokenContractFromPackage,
  getInvoiceRegistry as getInvoiceRegistryFromPackage,
} from "@zk-invoice/contracts/contract";
import { TokenContract } from "@zk-invoice/contracts/artifacts";
import type { InvoiceRegistryContract } from "@zk-invoice/contracts/artifacts";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import type { AztecNode } from "@aztec/aztec.js/node";
import type { BaseWallet } from "@aztec/aztec.js/wallet";
import { Fr } from "@aztec/aztec.js/fields";
import { ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";
import type { ContractInstanceWithAddress } from "@aztec/stdlib/contract";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Load deployment data from filesystem
 */
export const loadDeployments = (): {
  usdc: { address: string };
  registry?: {
    address: string;
    secretKey?: string;
    instance: any;
  };
} => {
  try {
    // Try to load from CLI package (shared deployments)
    const deploymentsPath = join(__dirname, "../../../cli/scripts/data/deployments.json");
    const data = readFileSync(deploymentsPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    throw new Error(
      "Failed to load deployments.json. Make sure contracts are deployed first. " +
        (error as Error).message
    );
  }
};

/**
 * Get token contract instance
 */
export const getTokenContract = async (
  wallet: BaseWallet,
  from: AztecAddress,
  node: AztecNode,
  tokenAddress: AztecAddress
): Promise<TokenContract> => {
  return getTokenContractFromPackage(wallet, from, node, tokenAddress);
};

/**
 * Get invoice registry contract instance
 */
export const getInvoiceRegistry = async (
  wallet: BaseWallet,
  from: AztecAddress,
  registryAddress: AztecAddress,
  contractInstance: ContractInstanceWithAddress,
  registrySecretKey?: Fr
): Promise<InvoiceRegistryContract> => {
  return getInvoiceRegistryFromPackage(
    wallet,
    from,
    registryAddress,
    contractInstance,
    registrySecretKey
  );
};

/**
 * Parse deployment data and get registry contract
 */
export const getRegistryFromDeployments = async (
  wallet: BaseWallet,
  from: AztecAddress
): Promise<{
  registry: InvoiceRegistryContract;
  registryAddress: AztecAddress;
}> => {
  const deployments = loadDeployments();

  if (!deployments.registry) {
    throw new Error(
      "Registry contract not deployed! Please deploy the registry first."
    );
  }

  const registryDeployment = {
    ...deployments.registry,
    instance: ContractInstanceWithAddressSchema.parse(deployments.registry.instance),
  };

  const registryAddress = AztecAddress.fromString(registryDeployment.address);
  const registrySecretKey = registryDeployment.secretKey
    ? Fr.fromString(registryDeployment.secretKey)
    : undefined;

  const registry = await getInvoiceRegistry(
    wallet,
    from,
    registryAddress,
    registryDeployment.instance,
    registrySecretKey
  );

  return { registry, registryAddress };
};

