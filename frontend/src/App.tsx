import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
// import { ThemeProvider } from "styled-components";
import GlobalStyles from "./styles/GlobalStyles";
// import "./App.css";
import { AuthProvider } from "./modules/auth/AuthProvider.js";
import { router } from "./routes/router.js";
// import { theme } from "./ui/Theme.js";
import { ThemeProvider } from "./contexts/ThemeContext.js";
import { useEffect } from "react";
import { outboxManager } from "./utils/outboxManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  useEffect(() => {
    // Initialize the outbox manager when app loads
    outboxManager.initialize();
  }, []);

  outboxManager.updateConfig({
    maxRetries: 5,
    retryDelays: [2000, 5000, 10000, 30000, 60000],
    // apiBaseUrl: "https://api.yourapp.com",
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <ThemeProvider>
        <GlobalStyles />
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>

        <Toaster
          position="top-center"
          gutter={12}
          containerStyle={{ margin: "8px" }}
          toastOptions={{
            success: {
              duration: 3000,
            },
            error: {
              duration: 5000,
            },
            style: {
              fontSize: "16px",
              maxWidth: "500px",
              padding: "16px 24px",
              backgroundColor: "var(--color-grey-0)",
              color: "var(--color-grey-700)",
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
