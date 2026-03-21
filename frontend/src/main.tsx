import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "var(--color-card)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            },
            success: {
              iconTheme: { primary: "var(--color-primary)", secondary: "var(--color-card)" },
            },
            error: {
              iconTheme: { primary: "var(--color-destructive)", secondary: "var(--color-card)" },
            },
          }}
        />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
