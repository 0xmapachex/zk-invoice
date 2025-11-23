"use client";

import { create } from "zustand";

type ToastVariant = "default" | "success" | "destructive" | "warning";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));
    
    // Auto-remove after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export function useToast() {
  const { toasts, addToast, removeToast } = useToastStore();
  
  const toast = {
    success: (title: string, description?: string, duration?: number) => {
      addToast({ title, description, variant: "success", duration });
    },
    error: (title: string, description?: string, duration?: number) => {
      addToast({ title, description, variant: "destructive", duration });
    },
    warning: (title: string, description?: string, duration?: number) => {
      addToast({ title, description, variant: "warning", duration });
    },
    info: (title: string, description?: string, duration?: number) => {
      addToast({ title, description, variant: "default", duration });
    },
  };
  
  return {
    toasts,
    toast,
    removeToast,
  };
}

