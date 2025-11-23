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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-lg border border-gray-200">
        <div className="p-4 sm:p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Edit Appointment
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-600 leading-relaxed">
                  Changes will be logged and cannot be undone
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Close edit form"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="customer_name"
                  className="text-base font-medium text-gray-700"
                >
                  Customer Name *
                </Label>
                <Input
                  type="text"
                  className="w-full mt-1 min-h-[44px] text-base bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("customer_name", e.target.value)
                  }
                  required
                  aria-describedby="customer_name_help"
                />
              </div>

              <div>
                <Label
                  htmlFor="customer_email"
                  className="text-base font-medium text-gray-700"
                >
                  Customer Email *
                </Label>
                <Input
                  className="w-full mt-1 min-h-[44px] text-base bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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
                <Label
                  htmlFor="customer_phone"
                  className="text-base font-medium text-gray-700"
                >
                  Customer Phone
                </Label>
                <Input
                  className="w-full mt-1 min-h-[44px] text-base bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  type="tel"
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("customer_phone", e.target.value)
                  }
                />
              </div>

              <div>
                <Label
                  htmlFor="service_name"
                  className="text-base font-medium text-gray-700"
                >
                  Service Name *
                </Label>
                <Input
                  className="w-full mt-1 min-h-[44px] text-base bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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
                <Label
                  htmlFor="location"
                  className="text-base font-medium text-gray-700"
                >
                  Location *
                </Label>
                <Input
                  className="w-full mt-1 min-h-[44px] text-base bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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
                <Label
                  htmlFor="vehicle_make_model"
                  className="text-base font-medium text-gray-700"
                >
                  Vehicle Make/Model
                </Label>
                <Input
                  className="w-full mt-1 min-h-[44px] text-base bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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
              <Label
                htmlFor="customer_notes"
                className="text-base font-medium text-gray-700"
              >
                Customer Notes
              </Label>
              <Textarea
                id="customer_notes"
                className="w-full mt-1 min-h-[100px] text-base bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 resize-none"
                value={formData.customer_notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleInputChange("customer_notes", e.target.value)
                }
                rows={4}
              />
            </div>

            <div>
              <Label
                htmlFor="web_meeting_url"
                className="text-base font-medium text-gray-700"
              >
                Web Meeting URL
              </Label>
              <Input
                className="w-full mt-1 min-h-[44px] text-base bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                type="url"
                id="web_meeting_url"
                placeholder="https://meet.google.com/..."
                value={formData.web_meeting_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("web_meeting_url", e.target.value)
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="default"
                size="lg"
                type="submit"
                disabled={loading}
                className="flex-1 min-h-[48px] text-base font-medium bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500"
              >
                <Save className="w-5 h-5 mr-2" />
                {loading ? "Updating..." : "Update Appointment"}
              </Button>
              <Button
                size="lg"
                type="button"
                variant="outline"
                onClick={onClose}
                className="min-h-[48px] text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
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
