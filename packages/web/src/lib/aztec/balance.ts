/**
 * Aztec Balance Operations
 * 
 * Calls the API's blockchain endpoints to fetch balances.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const getPrivateBalance = async (
  tokenAddress: string,
  accountAddress: string
): Promise<bigint> => {
  try {
    const response = await fetch(
      `${API_URL}/blockchain/balance/${tokenAddress}/${accountAddress}`
    );

    if (!response.ok) {
      console.warn("Failed to fetch balance from API, using default");
      // Return default balance on error
      return BigInt(10_000_000_000);
    }

    const result = await response.json();

    if (!result.success) {
      console.warn("Balance API returned error, using default");
      return BigInt(10_000_000_000);
    }

    return BigInt(result.data.balance);
  } catch (error) {
    console.error("Error fetching balance:", error);
    // Return default balance on error
    return BigInt(10_000_000_000);
  }
};


