"use client";

import { useState } from "react";
import { supabase, createAppointmentHistoryEntry } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader } from "lucide-react";
import type { Appointment } from "@/lib/store";

type AppointmentStatus =
  | "BOOKED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "COMPLETED"
  | "CONFIRMED";

interface AppointmentActionsProps {
  appointment: Appointment;
  onStatusChange?: (newStatus: AppointmentStatus) => void;
}

export function AppointmentActions({
  appointment,
  onStatusChange,
}: AppointmentActionsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (newStatus: AppointmentStatus) => {
    setLoading(true);
    setError(null);

    try {
      // Validate user is authenticated
      const currentUser = user || useAppStore.getState().user;
      if (!currentUser?.id) {
        throw new Error("User not authenticated. Please log in again.");
      }

      // Create history entry for status change
      await createAppointmentHistoryEntry(
        appointment.external_id,
        "EDIT",
        "user",
        { status: appointment.status },
        { status: newStatus },
        currentUser.id,
        `Status changed from ${appointment.status} to ${newStatus}`
      );

      const { error: err } = await supabase
        .from("appointments")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appointment.id);

      if (err) throw err;

      onStatusChange?.(newStatus);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update appointment"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (
      confirm(
        "Are you sure you want to confirm this appointment? This action cannot be undone."
      )
    ) {
      updateStatus("CONFIRMED");
    }
  };

  const handleComplete = () => {
    if (
      confirm(
        "Are you sure you want to mark this appointment as completed? This action cannot be undone."
      )
    ) {
      updateStatus("COMPLETED");
    }
  };

  const handleCancel = () => {
    if (
      confirm(
        "⚠️ WARNING: Are you sure you want to cancel this appointment? This action cannot be undone and will notify the customer."
      )
    ) {
      updateStatus("CANCELLED");
    }
  };

  const availableActions = {
    BOOKED: [
      {
        label: "Edit",
        action: () =>
          window.dispatchEvent(
            new CustomEvent("edit-appointment", { detail: appointment })
          ),
        variant: "outline" as const,
      },
      { label: "Confirm", action: handleConfirm, variant: "outline" as const },
      {
        label: "Cancel",
        action: handleCancel,
        variant: "destructive" as const,
      },
    ],
    EDITED: [
      {
        label: "Edit",
        action: () =>
          window.dispatchEvent(
            new CustomEvent("edit-appointment", { detail: appointment })
          ),
        variant: "outline" as const,
      },
      { label: "Confirm", action: handleConfirm, variant: "default" as const },
      {
        label: "Cancel",
        action: handleCancel,
        variant: "outline" as const,
      },
    ],
    CONFIRMED: [
      {
        label: "Complete",
        action: handleComplete,
        variant: "default" as const,
      },
      {
        label: "Cancel",
        action: handleCancel,
        variant: "destructive" as const,
      },
    ],
    COMPLETED: [],
    CANCELLED: [],
    RESCHEDULED: [
      { label: "Confirm", action: handleConfirm, variant: "default" as const },
      {
        label: "Cancel",
        action: handleCancel,
        variant: "destructive" as const,
      },
    ],
  };

  const actions =
    availableActions[appointment.status as keyof typeof availableActions] || [];

  if (actions.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-slate-50">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {actions.map((action) => (
          <Button
            key={action.label}
            onClick={action.action}
            disabled={loading}
            variant={action.variant}
            size="sm"
            className={action.label === "Cancel" ? "text-black" : ""}
          >
            {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
