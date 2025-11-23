"use client";

import type React from "react";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { AlertCircle, LogOut, Settings } from "lucide-react";

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    business_name: user?.business_name || "",
    phone: user?.phone || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: err } = await supabase
        .from("profiles")
        .update(formData)
        .eq("id", user?.id);

      if (err) throw err;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-4 md:p-8 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">
            Profile Settings
          </h1>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-6">
              <p className="text-sm text-green-600">
                Profile updated successfully
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <Input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Your full name"
                className="h-12 md:h-10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Business Name
              </label>
              <Input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleInputChange}
                placeholder="Your business name"
                className="h-12 md:h-10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Your phone number"
                className="h-12 md:h-10"
              />
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4">Account</h2>
              <p className="text-sm text-slate-600 mb-4">
                Email: <span className="font-medium">{user?.email}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/settings")}
                className="w-full sm:w-auto"
              >
                <Settings className="w-4 h-4 mr-2" />
                Business Settings
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSignOut}
                className="w-full sm:w-auto"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </form>
        </Card>

        <NotificationSettings />
      </div>
    </div>
  );
}
