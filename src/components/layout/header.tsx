"use client";

import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div
          className="text-2xl font-bold text-blue-600 cursor-pointer"
          onClick={() => navigate("/")}
        >
          SSA Manager
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {user && (
            <>
              <button
                onClick={() => navigate("/appointments")}
                className="text-slate-600 hover:text-slate-900 font-medium"
              >
                Appointments
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="text-slate-600 hover:text-slate-900 font-medium"
              >
                Profile
              </button>
              <Button
                className=""
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          )}
          {!user && (
            <>
              <Button variant="outline" onClick={() => navigate("/login")}>
                Sign In
              </Button>
              <Button variant="default" onClick={() => navigate("/signup")}>
                Sign Up
              </Button>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t p-4 space-y-3">
          {user && (
            <>
              <button
                onClick={() => {
                  navigate("/appointments");
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-slate-100 rounded"
              >
                Appointments
              </button>
              <button
                onClick={() => {
                  navigate("/profile");
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-slate-100 rounded"
              >
                Profile
              </button>
              <Button
                size="sm"
                variant="outline"
                className="w-full bg-transparent"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          )}
          {!user && (
            <>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
              <Button
                variant="default"
                className="w-full"
                onClick={() => navigate("/signup")}
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
