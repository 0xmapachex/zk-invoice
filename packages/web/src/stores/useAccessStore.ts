import { create } from "zustand";

export interface AccessRequest {
  id: string;
  invoice_id: string;
  requester_address: string;
  requester_name?: string;
  requester_role?: string;
  reason: string;
  status: "pending" | "approved" | "denied";
  requested_at: number;
  responded_at?: number;
  response_reason?: string;
  expires_at?: number;
}

export interface AccessLog {
  id: string;
  invoice_id: string;
  accessor_address: string;
  action: "view" | "download" | "export";
  accessed_at: number;
}

interface AccessState {
  pendingRequestsCount: number;
  accessRequests: AccessRequest[];
  accessLogs: AccessLog[];
  accessPermissions: Record<string, boolean>;
  
  setPendingRequestsCount: (count: number) => void;
  setAccessRequests: (requests: AccessRequest[]) => void;
  setAccessLogs: (logs: AccessLog[]) => void;
  setAccessPermission: (invoiceId: string, hasAccess: boolean) => void;
  clearAccessData: () => void;
}

export const useAccessStore = create<AccessState>((set) => ({
  pendingRequestsCount: 0,
  accessRequests: [],
  accessLogs: [],
  accessPermissions: {},
  
  setPendingRequestsCount: (count: number) => set({ pendingRequestsCount: count }),
  
  setAccessRequests: (requests: AccessRequest[]) => 
    set({ 
      accessRequests: requests,
      pendingRequestsCount: requests.filter(r => r.status === "pending").length 
    }),
  
  setAccessLogs: (logs: AccessLog[]) => set({ accessLogs: logs }),
  
  setAccessPermission: (invoiceId: string, hasAccess: boolean) =>
    set((state) => ({
      accessPermissions: {
        ...state.accessPermissions,
        [invoiceId]: hasAccess,
      },
    })),
  
  clearAccessData: () =>
    set({
      pendingRequestsCount: 0,
      accessRequests: [],
      accessLogs: [],
      accessPermissions: {},
    }),
}));

