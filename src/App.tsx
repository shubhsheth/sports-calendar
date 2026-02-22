import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import F1 from "./components/f1/f1-page";
// import Nba from "./components/nba/nba-page";

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays "fresh" for
        staleTime: 1000 * 60 * 30, // 30 mins

        // Data stays in the cache after being unused
        gcTime: 1000 * 60 * 60, // 60 mins
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex justify-center p-4">
        <F1 />
        {/* <Nba /> */}
      </div>
    </QueryClientProvider>
  );
}

export default App;
