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
      
      // Connect wallet (initialize accounts from env vars)
      connect: async () => {
        set({ isConnecting: true });
        
        try {
          // Generate deterministic addresses from env vars
          // In production, these would be derived from actual Aztec secret keys
          const sellerSecretKey = process.env.SELLER_SECRET_KEY || 
            "0x0000000000000000000000000000000000000000000000000000000000000001";
          const buyerSecretKey = process.env.BUYER_SECRET_KEY || 
            "0x0000000000000000000000000000000000000000000000000000000000000002";
          
          // Create deterministic mock addresses (until Aztec SDK is integrated)
          // Using a simple hash of the secret key to create a unique address
          const createMockAddress = (key: string) => {
            // Simple hash function for deterministic addresses
            let hash = 0;
            for (let i = 0; i < key.length; i++) {
              hash = ((hash << 5) - hash) + key.charCodeAt(i);
              hash = hash & hash;
            }
            const hexHash = Math.abs(hash).toString(16).padStart(64, '0');
            return `0x${hexHash}`;
          };
          
          const sellerAddress = createMockAddress(sellerSecretKey);
          const buyerAddress = createMockAddress(buyerSecretKey);
          
          console.log("Connected wallets:", { sellerAddress, buyerAddress });
          
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

