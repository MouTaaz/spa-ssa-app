import { useState } from "react";
import { supabase, createAppointmentHistoryEntry } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X, Save, AlertTriangle } from "lucide-react";
import type { Appointment } from "@/lib/store";

interface AppointmentEditFormProps {
  appointment: Appointment;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AppointmentEditForm({
  appointment,
  onClose,
  onSuccess,
}: AppointmentEditFormProps) {
  const { updateAppointment } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: appointment.customer_name,
    customer_email: appointment.customer_email,
    customer_phone: appointment.customer_phone || "",
    service_name: appointment.service_name,
    location: appointment.location,
    customer_notes: appointment.customer_notes || "",
    vehicle_make_model: appointment.vehicle_make_model || "",
    web_meeting_url: appointment.web_meeting_url || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if any changes were made
    const hasChanges =
      formData.customer_name !== appointment.customer_name ||
      formData.customer_email !== appointment.customer_email ||
      formData.customer_phone !== (appointment.customer_phone || "") ||
      formData.service_name !== appointment.service_name ||
      formData.location !== appointment.location ||
      formData.customer_notes !== (appointment.customer_notes || "") ||
      formData.vehicle_make_model !== (appointment.vehicle_make_model || "") ||
      formData.web_meeting_url !== (appointment.web_meeting_url || "");

    if (!hasChanges) {
      alert("No changes detected. Please modify at least one field.");
      return;
    }

    // Security confirmation
    const confirmed = confirm(
      "⚠️ SECURITY CONFIRMATION: You are about to edit customer appointment information. This action will be logged and cannot be undone. Are you sure you want to proceed?"
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      // Determine if headers or details were edited
      const headerFields = [
        "customer_name",
        "customer_email",
        "customer_phone",
        "service_name",
        "location",
      ];
      const detailFields = [
        "customer_notes",
        "vehicle_make_model",
        "web_meeting_url",
      ];

      const changedFields = Object.keys(formData).filter(
        (key) =>
          formData[key as keyof typeof formData] !== (appointment as any)[key]
      );

      const isHeaderEdit = changedFields.some((field) =>
        headerFields.includes(field)
      );
      const isDetailEdit = changedFields.some((field) =>
        detailFields.includes(field)
      );

      let action = "EDIT";
      // Keep as "EDIT" for now, differentiation will be handled by source column

      // Create history entry for the change
      await createAppointmentHistoryEntry(
        appointment.external_id,
        action,
        "user",
        {
          customer_name: appointment.customer_name,
          customer_email: appointment.customer_email,
          customer_phone: appointment.customer_phone,
          service_name: appointment.service_name,
          location: appointment.location,
          customer_notes: appointment.customer_notes,
          vehicle_make_model: appointment.vehicle_make_model,
          web_meeting_url: appointment.web_meeting_url,
        },
        formData,
        useAppStore.getState().user?.id,
        "Manual edit via appointment form"
      );

      // Update the appointment
      const { data, error } = await supabase
        .from("appointments")
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
          display_status: "EDITED", // Mark as edited
          if_edited: true,
          edited_by: useAppStore.getState().user?.id, // Store the user ID who edited
        })
        .eq("id", appointment.id)
        .select()
        .single();

      if (error) throw error;

      // Update local store
      updateAppointment(appointment.id, data);

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Failed to update appointment:", error);
      console.error("Error details:", error.message, error.details, error.hint);
      alert(
        `Failed to update appointment: ${error.message || "Please try again."}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Edit Appointment</h2>
              <div className="flex items-center gap-2 mt-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-amber-700">
                  Changes will be logged and cannot be undone
                </p>
              </div>
            </div>
            <Button className="" variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="" htmlFor="customer_name">
                  Customer Name *
                </Label>
                <Input
                  type="text"
                  className="w-full"
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("customer_name", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label className="" htmlFor="customer_email">
                  Customer Email *
                </Label>
                <Input
                  className=""
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("customer_email", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label className="" htmlFor="customer_phone">
                  Customer Phone
                </Label>
                <Input
                  className=""
                  type="tel"
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("customer_phone", e.target.value)
                  }
                />
              </div>

              <div>
                <Label className="" htmlFor="service_name">
                  Service Name *
                </Label>
                <Input
                  className=""
                  type="text"
                  id="service_name"
                  value={formData.service_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("service_name", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label className="" htmlFor="location">
                  Location *
                </Label>
                <Input
                  className=""
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("location", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label className="" htmlFor="vehicle_make_model">
                  Vehicle Make/Model
                </Label>
                <Input
                  className=""
                  type="text"
                  id="vehicle_make_model"
                  value={formData.vehicle_make_model}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("vehicle_make_model", e.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <Label className="" htmlFor="customer_notes">
                Customer Notes
              </Label>
              <Textarea
                id="customer_notes"
                value={formData.customer_notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleInputChange("customer_notes", e.target.value)
                }
                rows={3}
              />
            </div>

            <div>
              <Label className="" htmlFor="web_meeting_url">
                Web Meeting URL
              </Label>
              <Input
                className=""
                type="url"
                id="web_meeting_url"
                placeholder="https://meet.google.com/..."
                value={formData.web_meeting_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("web_meeting_url", e.target.value)
                }
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="default"
                size="lg"
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Updating..." : "Update Appointment"}
              </Button>
              <Button
                className=""
                size="lg"
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
