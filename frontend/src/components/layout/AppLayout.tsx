import type { ReactNode } from "react";
import AppHeader from "./AppHeader";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppLayout({ children, showNav = true }: AppLayoutProps) {
  return (
    <div style={{ background: "var(--color-background)", minHeight: "100vh" }}>
      <div className="pactum-container">
        <AppHeader />
        <main>{children}</main>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}

export default AppLayout;
