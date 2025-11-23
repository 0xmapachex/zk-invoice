"use client";

import { Toast, ToastTitle, ToastDescription } from "./toast";
import { useToast } from "@/hooks/useToast";

export function Toaster() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          onClose={() => removeToast(toast.id)}
          className="mb-2"
        >
          <div>
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {toast.description && (
              <ToastDescription className="mt-1">{toast.description}</ToastDescription>
            )}
          </div>
        </Toast>
      ))}
    </div>
  );
}

