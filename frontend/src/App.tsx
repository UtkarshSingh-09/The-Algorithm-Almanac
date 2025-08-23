// frontend/src/App.tsx

import { Switch, Route } from "wouter";
// The path alias for components is correct because we configured it
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";

// V-- I've corrected these local file imports --V

// 1. Added the '.ts' extension. This makes the import explicit.
import { queryClient } from "./lib/queryClient.ts";

// 2. Changed from "@/pages/home" to a direct relative path, since home.tsx is in the same folder.
import Home from "./home.tsx";

// 3. Changed from "@/pages/not-found" to a direct relative path.
//    (This assumes you have a 'not-found.tsx' file in your 'src' folder)
import NotFound from "./not-found.tsx";


function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;