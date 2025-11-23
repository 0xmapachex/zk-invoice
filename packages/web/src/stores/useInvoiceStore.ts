import { create } from "zustand";
import type { Invoice, InvoiceFilters } from "@/types/invoice";

interface InvoiceState {
  // Invoice list
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;
  
  // Selected invoice (for detail view)
  selectedInvoice: Invoice | null;
  
  // Filters
  filters: InvoiceFilters;
  
  // Actions
  setInvoices: (invoices: Invoice[]) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  removeInvoice: (id: string) => void;
  selectInvoice: (invoice: Invoice | null) => void;
  setFilters: (filters: Partial<InvoiceFilters>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed getters
  getFilteredInvoices: () => Invoice[];
  getInvoiceById: (id: string) => Invoice | undefined;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  // Initial state
  invoices: [],
  isLoading: false,
  error: null,
  selectedInvoice: null,
  filters: {
    status: "all",
    search: "",
  },
  
  // Set all invoices
  setInvoices: (invoices: Invoice[]) => {
    set({ invoices, error: null });
  },
  
  // Add a new invoice
  addInvoice: (invoice: Invoice) => {
    set((state) => ({
      invoices: [invoice, ...state.invoices],
    }));
  },
  
  // Update an existing invoice
  updateInvoice: (id: string, updates: Partial<Invoice>) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.invoiceId === id ? { ...inv, ...updates } : inv
      ),
      // Update selected invoice if it's the one being updated
      selectedInvoice:
        state.selectedInvoice?.invoiceId === id
          ? { ...state.selectedInvoice, ...updates }
          : state.selectedInvoice,
    }));
  },
  
  // Remove an invoice
  removeInvoice: (id: string) => {
    set((state) => ({
      invoices: state.invoices.filter((inv) => inv.invoiceId !== id),
      selectedInvoice:
        state.selectedInvoice?.invoiceId === id ? null : state.selectedInvoice,
    }));
  },
  
  // Select an invoice for detail view
  selectInvoice: (invoice: Invoice | null) => {
    set({ selectedInvoice: invoice });
  },
  
  // Update filters
  setFilters: (filters: Partial<InvoiceFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },
  
  // Set loading state
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },
  
  // Set error state
  setError: (error: string | null) => {
    set({ error });
  },
  
  // Get filtered invoices based on current filters
  getFilteredInvoices: () => {
    const { invoices, filters } = get();
    
    let filtered = invoices;
    
    // Filter by status
    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter((inv) => inv.status === filters.status);
    }
    
    // Filter by search term (search in title, invoice ID, or sender address)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.title.toLowerCase().includes(searchLower) ||
          inv.invoiceId.toLowerCase().includes(searchLower) ||
          inv.senderAddress.toLowerCase().includes(searchLower)
      );
    }
    
    // TODO: Add date range filtering when needed
    // if (filters.dateFrom) {
    //   filtered = filtered.filter((inv) => inv.createdAt >= filters.dateFrom!.getTime());
    // }
    // if (filters.dateTo) {
    //   filtered = filtered.filter((inv) => inv.createdAt <= filters.dateTo!.getTime());
    // }
    
    return filtered;
  },
  
  // Get a specific invoice by ID
  getInvoiceById: (id: string) => {
    const { invoices } = get();
    return invoices.find((inv) => inv.invoiceId === id);
  },
}));

