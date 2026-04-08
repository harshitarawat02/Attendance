import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, ClipboardCheck, MapPin, FileText, BookOpen, Users, UserCircle, LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard className="h-5 w-5" />, roles: ["admin", "teacher", "student"] },
  { label: "Attendance", path: "/attendance", icon: <ClipboardCheck className="h-5 w-5" />, roles: ["teacher", "student"] },
  { label: "Location", path: "/location", icon: <MapPin className="h-5 w-5" />, roles: ["student"] },
  { label: "Records", path: "/records", icon: <FileText className="h-5 w-5" />, roles: ["admin", "teacher", "student"] },
  { label: "Classes", path: "/classes", icon: <BookOpen className="h-5 w-5" />, roles: ["admin", "teacher"] },
  { label: "Users", path: "/users", icon: <Users className="h-5 w-5" />, roles: ["admin"] },
  { label: "Profile", path: "/profile", icon: <UserCircle className="h-5 w-5" />, roles: ["admin", "teacher", "student"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter((item) => role && item.roles.includes(role));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <ClipboardCheck className="h-7 w-7 text-sidebar-primary" />
          <span className="text-lg font-bold text-sidebar-primary-foreground">AttendEase</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {filteredNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 text-xs text-sidebar-foreground/60">
            <p className="font-medium text-sidebar-foreground">{profile?.full_name || "User"}</p>
            <p className="capitalize">{role}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">
            {filteredNav.find((n) => n.path === location.pathname)?.label || "Dashboard"}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
