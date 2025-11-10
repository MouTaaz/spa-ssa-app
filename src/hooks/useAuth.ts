"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let profileFetched = false;

    // Check if user is already in store (persisted)
    const persistedUser = useAppStore.getState().user;
    if (persistedUser) {
      console.log("User found in persisted store:", persistedUser);
      setUser(persistedUser);
      setLoading(false);
      return;
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      console.log(
        "Auth session check:",
        session ? "Session exists" : "No session"
      );
      console.log("Session details:", session);
      if (session?.user && !profileFetched) {
        profileFetched = true;
        fetchUserProfile(session.user.id);
      } else {
        console.log(
          "No valid session or profile already fetched, setting user to null"
        );
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      console.log(
        "Auth state change:",
        event,
        session ? "Session exists" : "No session"
      );
      if (session?.user && !profileFetched) {
        console.log("User ID from session:", session.user.id);
        profileFetched = true;
        await fetchUserProfile(session.user.id);
      } else if (!session) {
        console.log("No session, setting user to null");
        profileFetched = false;
        setUser(null);
        setLoading(false);
      } else {
        console.log("Profile already fetched, skipping");
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    if (isFetchingProfile) {
      console.log("Profile fetch already in progress, skipping");
      return;
    }

    setIsFetchingProfile(true);
    try {
      console.log("Fetching profile for userId:", userId);

      const { data, error: err } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      console.log("Query result - data:", data, "error:", err);

      if (err) {
        console.error("Profile fetch error:", err);
        throw err;
      }

      if (!data) {
        console.error("No profile data returned for userId:", userId);
        throw new Error("Profile not found");
      }

      console.log("Profile data:", data);
      const userData = {
        id: data.id,
        email: data.email || "",
        full_name: data.full_name || "",
        avatar_url: data.avatar_url,
        business_name: data.business_name,
        phone: data.phone,
      };
      console.log("Setting user data:", userData);
      setUser(userData);
      setError(null);
      console.log("User set successfully, loading should be false now");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch profile";
      console.error("Profile fetch failed:", message);
      setError(message);
      setUser(null);
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
      setIsFetchingProfile(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (err) throw err;

      // Create profile
      if (data.user) {
        await supabase.from("profiles").insert([
          {
            id: data.user.id,
            full_name: fullName,
            email: email,
          },
        ]);
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log("Attempting sign in for:", email);
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (err) {
        console.error("Sign in error:", err);
        throw err;
      }
      console.log("Sign in successful:", data);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      console.error("Sign in failed:", message);
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed");
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      setLoading(true);
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (err) throw err;

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend verification email";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resendVerificationEmail,
  };
}
