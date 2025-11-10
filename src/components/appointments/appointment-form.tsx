"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/hooks/useBusiness";
import { useSubscription } from "@/hooks/useSubscription";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Save, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import {
  format,
  parseISO,
  addDays,
  startOfDay,
  endOfDay,
  addMinutes,
  isWithinInterval,
  isSameDay,
} from "date-fns";

interface AppointmentFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AppointmentForm({ onClose, onSuccess }: AppointmentFormProps) {
  const { user, appointments } = useAppStore();
  const { currentBusiness } = useBusiness();
  const { canPerformAction } = useSubscription();
  const { businessServices, businessHoursNew, blockedSlots, businessSettings } =
    useBusinessSettings();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedService, setSelectedService] = useState<string>("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    service_name: "",
    start_time: "",
    end_time: "",
    location: "",
    customer_notes: "",
    vehicle_make_model: "",
    web_meeting_url: "",
  });

  // Generate available dates and time slots when business settings change
  useEffect(() => {
    if (businessHoursNew.length > 0 && businessSettings) {
      generateAvailableDates();
    }
  }, [businessHoursNew, businessSettings, appointments]);

  // Generate available time slots when date changes
  useEffect(() => {
    if (selectedDate && businessHoursNew.length > 0 && businessSettings) {
      generateAvailableTimeSlots();
    }
  }, [
    selectedDate,
    businessHoursNew,
    blockedSlots,
    businessSettings,
    appointments,
    selectedService,
    businessServices,
  ]);

  // Auto-calculate end time when service is selected
  useEffect(() => {
    if (selectedService && formData.start_time) {
      const service = businessServices.find((s) => s.id === selectedService);
      if (service) {
        const startDateTime = new Date(formData.start_time);
        const endDateTime = addMinutes(startDateTime, service.duration_minutes);
        setFormData((prev) => ({
          ...prev,
          end_time: format(endDateTime, "yyyy-MM-dd'T'HH:mm"),
          service_name: service.name,
        }));
      }
    }
  }, [selectedService, formData.start_time, businessServices]);

  const generateAvailableDates = () => {
    if (!businessSettings || businessHoursNew.length === 0) return;

    const dates: string[] = [];
    const today = new Date();
    const maxDaysAhead = 90; // Look ahead 90 days

    for (let i = 0; i < maxDaysAhead; i++) {
      const date = addDays(today, i);
      const dateString = format(date, "yyyy-MM-dd");
      const dayOfWeek = date.getDay();

      // Check if business is open on this day
      const dayHours = businessHoursNew.find(
        (h) => h.day_of_week === dayOfWeek && h.is_enabled
      );

      if (dayHours) {
        // Check if date has reached maximum appointments
        const appointmentCount = getAppointmentCountForDate(dateString);
        const maxAppointments = businessSettings.max_appointments_per_day || 8;

        if (appointmentCount < maxAppointments) {
          dates.push(dateString);
        }
      }
    }

    setAvailableDates(dates);
  };

  const generateAvailableTimeSlots = () => {
    if (!businessSettings || businessHoursNew.length === 0) return;

    const date = parseISO(selectedDate);
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.

    // Find business hours for this day
    const dayHours = businessHoursNew.find(
      (h) => h.day_of_week === dayOfWeek && h.is_enabled
    );

    if (!dayHours) {
      setAvailableTimeSlots([]);
      return;
    }

    const slots: string[] = [];
    const interval = businessSettings.appointment_interval_minutes || 30;
    const buffer = businessSettings.buffer_time_minutes || 0;

    // Determine duration: use service duration if selected, else interval
    const selectedServiceObj = businessServices.find(
      (s) => s.id === selectedService
    );
    const duration = selectedServiceObj
      ? selectedServiceObj.duration_minutes
      : interval;

    const businessOpen = new Date(`${selectedDate}T${dayHours.open_time}`);
    const businessClose = new Date(`${selectedDate}T${dayHours.close_time}`);

    let currentSlot = new Date(businessOpen);

    while (currentSlot < businessClose) {
      const slotEnd = addMinutes(currentSlot, duration);

      // Skip if slot end exceeds business close
      if (slotEnd > businessClose) {
        currentSlot = addMinutes(currentSlot, interval);
        continue;
      }

      const slotStartUTC = currentSlot;
      const slotEndUTC = slotEnd;

      // Check if slot conflicts with blocked slots
      const isBlocked = blockedSlots.some((blocked) => {
        try {
          const blockedStart = parseISO(
            blocked.start_time.replace(" ", "T").replace("+00", "+00:00")
          );
          const blockedEnd = parseISO(
            blocked.end_time.replace(" ", "T").replace("+00", "+00:00")
          );
          const dateMatches =
            format(blockedStart, "yyyy-MM-dd") === selectedDate;
          const overlaps =
            dateMatches &&
            slotStartUTC < blockedEnd &&
            slotEndUTC > blockedStart;
          return overlaps;
        } catch (error) {
          console.error("Error parsing blocked slot:", error);
          return false;
        }
      });

      // Check if slot conflicts with existing appointments
      const isBooked = appointments.some((appointment) => {
        if (
          appointment.status !== "BOOKED" &&
          appointment.status !== "CONFIRMED"
        )
          return false; // Only check booked and confirmed appointments

        console.log(
          "Appointment raw:",
          appointment.start_time,
          appointment.end_time
        );
        try {
          const utcStart = parseISO(
            appointment.start_time.replace(" ", "T").replace("+00", "Z")
          );
          const utcEnd = parseISO(
            appointment.end_time.replace(" ", "T").replace("+00", "Z")
          );
          // UTC times are already converted to local time by parseISO
          const localStart = utcStart;
          const localEnd = utcEnd;
          console.log("Appointment parsed (local):", localStart, localEnd);
          console.log("Slot local:", currentSlot, "Slot end local:", slotEnd);
          console.log(
            "Selected date:",
            selectedDate,
            "Appointment date:",
            format(localStart, "yyyy-MM-dd")
          );

          // Check if the slot overlaps with the appointment
          const dateMatches = format(localStart, "yyyy-MM-dd") === selectedDate;

          // Standard interval overlap: slot overlaps if slot.start < appointment.end AND slot.end > appointment.start
          const overlaps =
            dateMatches && currentSlot < localEnd && slotEnd > localStart;

          return overlaps;
        } catch (error) {
          console.error("Error parsing appointment:", error);
          return false;
        }
      });

      if (!isBlocked && !isBooked) {
        const timeSlot = format(currentSlot, "HH:mm");
        console.log(`Adding available slot: ${timeSlot}`);
        slots.push(timeSlot);
      } else {
        console.log(
          `Slot ${format(
            currentSlot,
            "HH:mm"
          )} is blocked or booked - isBlocked: ${isBlocked}, isBooked: ${isBooked}`
        );
      }

      currentSlot = addMinutes(currentSlot, interval);
    }

    console.log(`Total available slots generated: ${slots.length}`, slots);
    setAvailableTimeSlots(slots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentBusiness) return;

    // Check subscription limits before creating appointment
    if (!canPerformAction("create_appointment")) {
      alert(
        "Appointment limit reached for your current plan. Please upgrade to create more appointments."
      );
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    // Validate for overlapping appointments before creation
    const newAppointmentStart = new Date(formData.start_time);
    const newAppointmentEnd = new Date(formData.end_time);

    const hasOverlap = appointments.some((appointment) => {
      if (appointment.status !== "BOOKED" && appointment.status !== "CONFIRMED")
        return false;

      const appointmentStart = new Date(appointment.start_time);
      const appointmentEnd = new Date(appointment.end_time);

      // Check if the new appointment overlaps with existing ones
      return (
        isSameDay(appointmentStart, newAppointmentStart) &&
        (isWithinInterval(newAppointmentStart, {
          start: appointmentStart,
          end: appointmentEnd,
        }) ||
          isWithinInterval(newAppointmentEnd, {
            start: appointmentStart,
            end: appointmentEnd,
          }) ||
          isWithinInterval(appointmentStart, {
            start: newAppointmentStart,
            end: newAppointmentEnd,
          }))
      );
    });

    if (hasOverlap) {
      alert(
        "This time slot conflicts with an existing appointment. Please select a different time."
      );
      setShowConfirm(false);
      return;
    }

    setLoading(true);
    try {
      // Generate external_id for manual appointments
      const externalId = `manual-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const appointmentData = {
        external_id: externalId,
        business_id: currentBusiness.id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone || null,
        service_name: formData.service_name,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        status: "BOOKED",
        display_status: null,
        vehicle_make_model: formData.vehicle_make_model || null,
        location: formData.location || null,
        customer_notes: formData.customer_notes || null,
        source: "manual",
        web_meeting_url: formData.web_meeting_url || null,
        raw_payload: null,
        created_by_user: true,
        was_edited: false,
        if_edited: false,
        edited_by: null,
        previous_external_id: null,
        previous_appointment: null,
      };

      const { data, error } = await supabase
        .from("appointments")
        .insert([appointmentData])
        .select()
        .single();

      if (error) throw error;

      // Add to local store
      useAppStore.getState().addAppointment(data);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to create appointment:", error);
      alert("Failed to create appointment. Please try again.");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getAppointmentCountForDate = (date: string) => {
    return appointments.filter((appointment) => {
      if (
        appointment.status !== "BOOKED" &&
        appointment.status !== "CONFIRMED"
      ) {
        return false;
      }
      return format(new Date(appointment.start_time), "yyyy-MM-dd") === date;
    }).length;
  };

  const handleDateChange = (date: string) => {
    // Check if the selected date has reached maximum appointments
    const appointmentCount = getAppointmentCountForDate(date);
    const maxAppointments = businessSettings?.max_appointments_per_day || 8;

    if (appointmentCount >= maxAppointments) {
      alert(
        `This date has reached the maximum number of appointments (${maxAppointments}). Please select a different date.`
      );
      return;
    }

    setSelectedDate(date);
    // Reset time selections when date changes
    setFormData((prev) => ({
      ...prev,
      start_time: "",
      end_time: "",
    }));
  };

  const handleTimeSlotSelect = (timeSlot: string) => {
    const startDateTime = new Date(`${selectedDate}T${timeSlot}`);
    setFormData((prev) => ({
      ...prev,
      start_time: format(startDateTime, "yyyy-MM-dd'T'HH:mm"),
    }));
  };

  const hasServicesConfigured = businessServices.length > 0;
  const hasHoursConfigured = businessHoursNew.some((h) => h.is_enabled);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 bg-opacity-95 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-0 bg-white/95 backdrop-blur-md">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                Create New Appointment
              </h2>
              <p className="text-blue-100 text-sm">
                Fill in the details below to schedule an appointment
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
          {/* Configuration Warnings */}
          {(!hasServicesConfigured || !hasHoursConfigured) && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">
                    Business Configuration Required
                  </h3>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {!hasServicesConfigured && (
                      <li>
                        • No services configured. Please add services in
                        business settings.
                      </li>
                    )}
                    {!hasHoursConfigured && (
                      <li>
                        • No business hours configured. Please set your
                        operating hours.
                      </li>
                    )}
                  </ul>
                  <p className="text-sm text-amber-700 mt-2">
                    You can still create appointments manually, but dropdown
                    selections will be limited.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="" htmlFor="customer_name">
                  Customer Name *
                </Label>
                <Input
                  type="text"
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("customer_name", e.target.value)
                  }
                  required
                  className="border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                  placeholder="Enter customer's full name"
                />
              </div>

              <div>
                <Label className="" htmlFor="customer_email">
                  Customer Email *
                </Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("customer_email", e.target.value)
                  }
                  required
                  className="border-2 border-gray-200 focus:border-green-400 focus:ring-green-400/20 transition-all duration-200"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <Label className="" htmlFor="customer_phone">
                  Customer Phone
                </Label>
                <Input
                  type="tel"
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("customer_phone", e.target.value)
                  }
                  className="border-2 border-gray-200 focus:border-cyan-400 focus:ring-cyan-400/20 transition-all duration-200"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label className="" htmlFor="service">
                  Service *
                </Label>
                {hasServicesConfigured ? (
                  <Select
                    value={selectedService}
                    onValueChange={setSelectedService}
                  >
                    <SelectTrigger className="border-2 border-gray-200 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-200">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessServices.map((service) => (
                        <SelectItem key={service.id} value={service.id!}>
                          {service.name} ({service.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="text"
                    id="service_name"
                    value={formData.service_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange("service_name", e.target.value)
                    }
                    required
                    className="border-2 border-gray-200 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-200"
                    placeholder="e.g., Oil Change, Brake Service"
                  />
                )}
              </div>

              <div>
                <Label className="" htmlFor="appointment_date">
                  Appointment Date *
                </Label>
                {availableDates.length > 0 ? (
                  <Select value={selectedDate} onValueChange={handleDateChange}>
                    <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200">
                      <SelectValue placeholder="Select date" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="date"
                    id="appointment_date"
                    value={selectedDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleDateChange(e.target.value)
                    }
                    min={format(new Date(), "yyyy-MM-dd")}
                    required
                    className="border-2 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200"
                  />
                )}
              </div>

              <div>
                <Label className="" htmlFor="start_time">
                  Start Time *
                </Label>
                {availableTimeSlots.length > 0 ? (
                  <Select
                    value={
                      formData.start_time
                        ? format(new Date(formData.start_time), "HH:mm")
                        : ""
                    }
                    onValueChange={handleTimeSlotSelect}
                  >
                    <SelectTrigger className="border-2 border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20 transition-all duration-200">
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="time"
                    id="start_time"
                    value={
                      formData.start_time
                        ? format(new Date(formData.start_time), "HH:mm")
                        : ""
                    }
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const time = e.target.value;
                      if (time) {
                        const dateTime = new Date(`${selectedDate}T${time}`);
                        handleInputChange(
                          "start_time",
                          format(dateTime, "yyyy-MM-dd'T'HH:mm")
                        );
                      }
                    }}
                    required
                    className="border-2 border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20 transition-all duration-200"
                  />
                )}
              </div>

              <div>
                <Label className="" htmlFor="end_time">
                  End Time *
                </Label>
                <Input
                  type="time"
                  id="end_time"
                  value={
                    formData.end_time
                      ? format(new Date(formData.end_time), "HH:mm")
                      : ""
                  }
                  readOnly
                  className="border-2 border-gray-200 bg-gray-50 text-gray-600"
                  title="Auto-calculated based on service duration"
                />
              </div>

              <div>
                <Label className="" htmlFor="location">
                  Location
                </Label>
                <Input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("location", e.target.value)
                  }
                  className="border-2 border-gray-200 focus:border-red-400 focus:ring-red-400/20 transition-all duration-200"
                  placeholder="e.g., Main Shop, Branch Office"
                />
              </div>

              <div>
                <Label className="" htmlFor="vehicle_make_model">
                  Vehicle Make/Model
                </Label>
                <Input
                  type="text"
                  id="vehicle_make_model"
                  value={formData.vehicle_make_model}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("vehicle_make_model", e.target.value)
                  }
                  className="border-2 border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20 transition-all duration-200"
                  placeholder="e.g., Toyota Camry 2020"
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
                className="resize-none border-2 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200"
                placeholder="Add any special notes or requirements..."
              />
            </div>

            <div>
              <Label className="" htmlFor="web_meeting_url">
                Web Meeting URL (Optional)
              </Label>
              <Input
                type="url"
                id="web_meeting_url"
                placeholder="https://meet.google.com/..."
                value={formData.web_meeting_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("web_meeting_url", e.target.value)
                }
                className="border-2 border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 transition-all duration-200"
              />
            </div>

            {showConfirm ? (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 mt-8 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-amber-100 p-3 rounded-full">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-900 mb-3 text-lg">
                      Confirm Appointment Creation
                    </h3>
                    <p className="text-amber-800 mb-6 leading-relaxed">
                      Please review the appointment details carefully before
                      saving. This action will create a new appointment in the
                      system and notify the customer.
                    </p>
                    <div className="flex gap-4">
                      <Button
                        variant="default"
                        size="lg"
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 shadow-lg transform hover:scale-105 transition-all duration-200"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {loading ? "Creating..." : "Confirm & Save"}
                      </Button>
                      <Button
                        size="lg"
                        type="button"
                        variant="outline"
                        onClick={() => setShowConfirm(false)}
                        className="border-2 border-gray-300 hover:border-gray-400 px-6 py-3 font-semibold transition-all duration-200"
                      >
                        Back to Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <Button
                  variant="default"
                  size="lg"
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-4 shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <Save className="w-5 h-5 mr-3" />
                  {loading ? "Creating..." : "Create Appointment"}
                </Button>
                <Button
                  size="lg"
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="px-8 py-4 border-2 border-gray-300 hover:border-gray-400 font-semibold transition-all duration-200"
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </div>
      </Card>
    </div>
  );
}
