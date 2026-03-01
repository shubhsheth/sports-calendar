import Footer from "@/components/footer/footer";
import Header from "@/components/header/header";
import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <>
      <HeadContent />
      <Header />
      <div className="py-8">
        <Outlet />
      </div>
      <Footer />
    </>
  ),
});
