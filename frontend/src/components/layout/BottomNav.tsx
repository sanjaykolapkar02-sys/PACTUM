import { Link, useLocation } from "react-router-dom";
import { Home, Plus, Flame } from "lucide-react";

export function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="pactum-bottom-nav" aria-label="Bottom Navigation">
      <Link
        to="/dashboard"
        className={`pactum-nav-item ${currentPath === "/dashboard" ? "active" : ""}`}
        id="bottomNavHome"
      >
        <Home size={20} />
        <span>Home</span>
      </Link>

      <Link
        to="/challenges/create"
        className="pactum-nav-create"
        title="Create Challenge"
        id="bottomNavCreate"
      >
        <Plus size={26} strokeWidth={2.8} />
      </Link>

      <Link
        to="/active"
        className={`pactum-nav-item ${currentPath === "/active" ? "active" : ""}`}
        id="bottomNavActive"
      >
        <Flame size={20} />
        <span>Active</span>
      </Link>
    </nav>
  );
}

export default BottomNav;
