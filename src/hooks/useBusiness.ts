import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore, Business, BusinessMember } from "@/lib/store";

export function useBusiness() {
  const {
    user,
    currentBusiness,
    setCurrentBusiness,
    userBusinesses,
    setUserBusinesses,
    businessMembers,
    setBusinessMembers,
    currentUserRole,
    setCurrentUserRole,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's businesses and memberships on mount
  useEffect(() => {
    if (user?.id) {
      loadUserBusinesses();
    }
  }, [user?.id]);

  // Set current business and role when businesses are loaded
  useEffect(() => {
    if (userBusinesses.length > 0) {
      // Check if currentBusiness exists in the loaded businesses
      const validCurrentBusiness = currentBusiness
        ? userBusinesses.find(b => b.id === currentBusiness.id)
        : null;

      if (!validCurrentBusiness) {
        // Current business is invalid or missing, set to first available
        const defaultBusiness = userBusinesses[0];
        setCurrentBusiness(defaultBusiness);

        // Find the user's role in this business
        const userRole = businessMembers.find(
          (member) =>
            member.business_id === defaultBusiness.id &&
            member.user_id === user?.id
        );
        if (userRole) {
          setCurrentUserRole(userRole);
        }
      } else {
        // Current business is valid, ensure role is set
        const userRole = businessMembers.find(
          (member) =>
            member.business_id === validCurrentBusiness.id &&
            member.user_id === user?.id
        );
        if (userRole) {
          setCurrentUserRole(userRole);
        }
      }
    } else if (currentBusiness) {
      // No businesses loaded but we have a persisted currentBusiness - clear it
      setCurrentBusiness(null);
      setCurrentUserRole(null);
    }
  }, [userBusinesses, businessMembers, currentBusiness, user?.id]);

  const loadUserBusinesses = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Load businesses where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from("business_members")
        .select(
          `
          *,
          businesses (*)
        `
        )
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) {
        console.error("Business members query error:", memberError);

        // If table doesn't exist yet (migration not run), handle gracefully
        if (
          memberError.code === "PGRST116" ||
          memberError.code === "42P17" ||
          memberError.message?.includes(
            'relation "business_members" does not exist'
          ) ||
          memberError.message?.includes(
            'relation "public.business_members" does not exist'
          )
        ) {
          console.warn(
            "Multi-tenant migration not yet applied. Please run the migration script in Supabase SQL Editor."
          );
          setError("migration");
          return;
        }

        // If it's an RLS policy error after migration, try fallback approach
        if (
          memberError.code === "PGRST301" ||
          memberError.message?.includes("permission denied") ||
          memberError.message?.includes("infinite recursion")
        ) {
          console.warn("RLS permission issue, trying fallback approach");

          // Try to load businesses directly if user is owner
          const { data: ownedBusinesses, error: ownerError } = await supabase
            .from("businesses")
            .select("*")
            .eq("owner_id", user.id);

          if (ownerError) {
            console.error("Owner businesses query error:", ownerError);
            // If this also fails, it might be a migration issue
            if (
              ownerError.code === "PGRST116" ||
              ownerError.message?.includes(
                'relation "businesses" does not exist'
              )
            ) {
              setError("migration");
              return;
            }
            // For RLS issues, set error to indicate migration needed
            setError("infinite recursion");
            return;
          }

          if (ownedBusinesses && ownedBusinesses.length > 0) {
            // Create mock membership data for owned businesses
            const mockMemberships: BusinessMember[] = ownedBusinesses.map(
              (business) => ({
                id: `mock-${business.id}`,
                business_id: business.id,
                user_id: user.id,
                role: "owner" as const,
                status: "active" as const,
                invited_by: undefined,
                invited_at: new Date().toISOString(),
                joined_at: new Date().toISOString(),
                permissions: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            );

            setUserBusinesses(ownedBusinesses);
            setBusinessMembers(mockMemberships);
            setLoading(false);
            return;
          }
        }

        throw memberError;
      }

      if (memberships) {
        const businesses = memberships
          .map((m: any) => m.businesses)
          .filter(Boolean);
        const members = memberships.map((m: any) => ({
          ...m,
          user: undefined, // Will be populated if needed
        }));

        setUserBusinesses(businesses);
        setBusinessMembers(members);
      }
    } catch (err) {
      console.error("Error loading businesses:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load businesses"
      );
    } finally {
      setLoading(false);
    }
  };

  const createBusiness = async (businessData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  }) => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("businesses")
        .insert({
          ...businessData,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Reload businesses to include the new one
      await loadUserBusinesses();

      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create business"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const switchBusiness = (businessId: string) => {
    const business = userBusinesses.find((b) => b.id === businessId);
    if (business) {
      setCurrentBusiness(business);

      // Find and set the user's role in this business
      const userRole = businessMembers.find(
        (member) =>
          member.business_id === businessId && member.user_id === user?.id
      );
      setCurrentUserRole(userRole || null);
    }
  };

  const inviteTeamMember = async (
    email: string,
    role: BusinessMember["role"]
  ) => {
    if (!currentBusiness?.id || !user?.id) return;

    try {
      // Generate invitation token
      const token = crypto.randomUUID();

      const { data, error } = await supabase
        .from("business_invitations")
        .insert({
          business_id: currentBusiness.id,
          email,
          role,
          invited_by: user.id,
          token,
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Send invitation email
      // For now, just return the invitation data
      return data;
    } catch (err) {
      throw err;
    }
  };

  const acceptInvitation = async (token: string) => {
    if (!user?.id) return;

    try {
      // Find the invitation
      const { data: invitation, error: inviteError } = await supabase
        .from("business_invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteError || !invitation) {
        throw new Error("Invalid or expired invitation");
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from("business_members")
        .select("*")
        .eq("business_id", invitation.business_id)
        .eq("user_id", user.id)
        .single();

      if (existingMember) {
        throw new Error("You are already a member of this business");
      }

      // Create business membership
      const { data: membership, error: memberError } = await supabase
        .from("business_members")
        .insert({
          business_id: invitation.business_id,
          user_id: user.id,
          role: invitation.role,
          status: "active",
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Update invitation status
      await supabase
        .from("business_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      // Reload businesses
      await loadUserBusinesses();

      return membership;
    } catch (err) {
      throw err;
    }
  };

  const updateBusiness = async (updates: Partial<Business>) => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from("businesses")
        .update(updates)
        .eq("id", currentBusiness.id)
        .select()
        .single();

      if (error) throw error;

      setCurrentBusiness(data);
      // Update in userBusinesses array
      setUserBusinesses(
        userBusinesses.map((b) => (b.id === data.id ? data : b))
      );

      return data;
    } catch (err) {
      throw err;
    }
  };

  const canUser = (permission: string): boolean => {
    if (!currentUserRole) return false;

    const rolePermissions: Record<string, string[]> = {
      owner: ["*"], // Full access
      manager: [
        "view_business",
        "edit_business",
        "manage_team",
        "manage_settings",
        "manage_services",
        "manage_hours",
        "manage_appointments",
        "view_appointments",
      ],
      receptionist: [
        "view_business",
        "manage_appointments",
        "view_appointments",
      ],
      mechanic: ["view_business", "view_appointments", "edit_appointments"],
    };

    const userPermissions = rolePermissions[currentUserRole.role] || [];
    return (
      userPermissions.includes("*") || userPermissions.includes(permission)
    );
  };

  return {
    currentBusiness,
    userBusinesses,
    businessMembers,
    currentUserRole,
    loading,
    error,
    loadUserBusinesses,
    createBusiness,
    switchBusiness,
    inviteTeamMember,
    acceptInvitation,
    updateBusiness,
    canUser,
  };
}
