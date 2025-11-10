"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { Calendar, Home, User } from "lucide-react";

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/appointments", icon: Calendar, label: "Appointments" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-40">
      <div className="flex items-center justify-around">
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              isActive(path)
                ? "text-blue-600 border-t-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
