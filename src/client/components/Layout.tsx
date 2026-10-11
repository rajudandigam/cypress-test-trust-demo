import type { ReactNode } from "react";
import type { SafeUser } from "../../domain/types";
import { logout } from "../lib/api";

export function Layout({
  user,
  onLogout,
  children,
}: {
  user: SafeUser | null;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" data-cy="brand">
          Horizon<span>Air</span> Trust Demo
        </div>
        <div className="user-chip">
          {user ? (
            <>
              <span data-cy="session-user">{user.displayName}</span>
              <button
                className="btn btn-secondary"
                data-cy="logout-button"
                type="button"
                onClick={async () => {
                  await logout();
                  onLogout();
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <span className="muted">Not signed in</span>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
