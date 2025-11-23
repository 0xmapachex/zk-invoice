import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccountRole = "seller" | "buyer";

interface WalletState {
  // Current role
  role: AccountRole;
  
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  
  // Account addresses (derived from keys)
  sellerAddress: string | null;
  buyerAddress: string | null;
  
  // Current active address based on role
  currentAddress: string | null;
  
  // Actions
  switchRole: (role: AccountRole) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  setAddresses: (seller: string, buyer: string) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      role: "seller",
      isConnected: false,
      isConnecting: false,
      sellerAddress: null,
      buyerAddress: null,
      currentAddress: null,
      
      // Switch between seller and buyer roles
      switchRole: (role: AccountRole) => {
        const state = get();
        const newAddress = role === "seller" ? state.sellerAddress : state.buyerAddress;
        set({ role, currentAddress: newAddress });
      },
      
      // Connect wallet (fetch real Aztec addresses from API)
      connect: async () => {
        set({ isConnecting: true });
        
        try {
          // Fetch real Aztec addresses from the blockchain API
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
          const response = await fetch(`${API_URL}/blockchain/addresses`);
          
          if (!response.ok) {
            throw new Error("Failed to fetch wallet addresses from API");
          }
          
          const result = await response.json();
          
          if (!result.success || !result.data) {
            throw new Error("Invalid response from addresses API");
          }
          
          const { sellerAddress, buyerAddress } = result.data;
          
          console.log("Connected wallets (real Aztec addresses):", { sellerAddress, buyerAddress });
          
          const { role } = get();
          const currentAddress = role === "seller" ? sellerAddress : buyerAddress;
          
          set({
            sellerAddress,
            buyerAddress,
            currentAddress,
            isConnected: true,
            isConnecting: false,
          });
        } catch (error) {
          console.error("Failed to connect wallet:", error);
          set({ isConnecting: false });
          throw error;
        }
      },
      
      // Disconnect wallet
      disconnect: () => {
        set({
          isConnected: false,
          sellerAddress: null,
          buyerAddress: null,
          currentAddress: null,
        });
      },
      
      // Manually set addresses (useful for testing or after Aztec wallet init)
      setAddresses: (seller: string, buyer: string) => {
        const { role } = get();
        const currentAddress = role === "seller" ? seller : buyer;
        set({
          sellerAddress: seller,
          buyerAddress: buyer,
          currentAddress,
          isConnected: true,
        });
      },
    }),
    {
      name: "wallet-storage",
      // Only persist the role, not sensitive data
      partialize: (state) => ({ role: state.role }),
    }
  )
);

