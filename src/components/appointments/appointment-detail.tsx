"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  Suspense,
} from "react";
import type { Appointment } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentActions } from "./appointment-actions";
import { AppointmentHistory } from "./appointment-history";
import {
  X,
  Copy,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Car,
  FileText,
  ExternalLink,
  Printer,
  Share2,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  AlertCircle,
  History,
  Loader2,
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { useAppStore } from "@/lib/store";

interface AppointmentDetailProps {
  appointment: Appointment;
  onClose: () => void;
}

const AppointmentDetail = React.memo(function AppointmentDetail({
  appointment,
  onClose,
}: AppointmentDetailProps) {
  const [copied, setCopied] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState(appointment);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    customer: true,
    service: true,
    vehicle: false,
    notes: false,
    system: false,
  });
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { isOnline } = useAppStore();

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    setTouchStartY(event.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (touchStartY === null) return;

      const touchEndY = event.changedTouches[0].clientY;
      const deltaY = touchEndY - touchStartY;

      // Swipe down to close (minimum 100px swipe)
      if (deltaY > 100) {
        onClose();
      }

      setTouchStartY(null);
    },
    [touchStartY, onClose]
  );

  const printAppointment = useCallback(() => {
    window.print();
  }, []);

  const shareAppointment = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Appointment: ${appointment.customer_name}`,
          text: `Appointment with ${appointment.customer_name} for ${appointment.service_name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      copyToClipboard(
        `${appointment.customer_name} - ${appointment.service_name}`
      );
    }
  }, [appointment, copyToClipboard]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const startDate = useMemo(
    () => new Date(appointment.start_time),
    [appointment.start_time]
  );
  const endDate = useMemo(
    () => new Date(appointment.end_time),
    [appointment.end_time]
  );
  const duration = useMemo(
    () => differenceInMinutes(endDate, startDate),
    [startDate, endDate]
  );

  const statusVariant = useMemo(() => {
    const statusMap = {
      BOOKED: "booked",
      CONFIRMED: "confirmed",
      COMPLETED: "completed",
      CANCELLED: "cancelled",
      RESCHEDULED: "rescheduled",
      EDITED: "edited",
    } as const;
    return (
      statusMap[currentAppointment.status as keyof typeof statusMap] ||
      "default"
    );
  }, [currentAppointment.status]);

  const statusIcon = useMemo(() => {
    const iconMap = {
      BOOKED: Calendar,
      CONFIRMED: Clock,
      COMPLETED: User,
      CANCELLED: AlertCircle,
      RESCHEDULED: Calendar,
      EDITED: FileText,
    };
    return (
      iconMap[currentAppointment.status as keyof typeof iconMap] || Calendar
    );
  }, [currentAppointment.status]);

  const StatusIcon = statusIcon;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-detail-title"
    >
      <Card
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex items-center gap-3">
            <h2
              id="appointment-detail-title"
              className="text-xl font-bold text-slate-900"
            >
              Appointment Details
            </h2>
            {!isOnline && (
              <div className="flex items-center gap-1 text-orange-600">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs font-medium">Offline</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={printAppointment}
              className="hidden sm:flex h-8 w-8"
              aria-label="Print appointment"
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={shareAppointment}
              className="h-8 w-8"
              aria-label="Share appointment"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <StatusIcon className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Status</h3>
              </div>
              <Badge variant={statusVariant} className="w-fit">
                {currentAppointment.status === "EDITED"
                  ? "BOOKED (Edited)"
                  : currentAppointment.status}
              </Badge>
            </div>
            {/* Customer Info */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection("customer")}
                className="flex items-center justify-between w-full text-left"
                aria-expanded={expandedSections.customer}
              >
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </h3>
                {expandedSections.customer ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {expandedSections.customer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 border-l-2 border-slate-200">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Name
                      </p>
                      <p className="font-medium text-slate-900">
                        {currentAppointment.customer_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Email
                      </p>
                      <p className="font-medium text-slate-900">
                        {currentAppointment.customer_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Phone
                      </p>
                      <p className="font-medium text-slate-900">
                        {currentAppointment.customer_phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Location
                      </p>
                      <p className="font-medium text-slate-900">
                        {currentAppointment.location}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Service Info */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection("service")}
                className="flex items-center justify-between w-full text-left"
                aria-expanded={expandedSections.service}
              >
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Service Details
                </h3>
                {expandedSections.service ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {expandedSections.service && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 border-l-2 border-slate-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Service
                      </p>
                      <p className="font-medium text-slate-900">
                        {currentAppointment.service_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Date
                      </p>
                      <p className="font-medium text-slate-900">
                        {format(startDate, "MMMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Time
                      </p>
                      <p className="font-medium text-slate-900">
                        {format(startDate, "HH:mm")} -{" "}
                        {format(endDate, "HH:mm")}
                        <span className="text-xs text-slate-500 ml-2">
                          ({duration} min)
                        </span>
                      </p>
                    </div>
                  </div>
                  {currentAppointment.web_meeting_url && (
                    <div className="flex items-center gap-3">
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Meeting Link
                        </p>
                        <a
                          href={currentAppointment.web_meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-800 underline"
                        >
                          Join Meeting
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Vehicle Info */}
            {currentAppointment.vehicle_make_model && (
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection("vehicle")}
                  className="flex items-center justify-between w-full text-left"
                  aria-expanded={expandedSections.vehicle}
                >
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Vehicle Information
                  </h3>
                  {expandedSections.vehicle ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                {expandedSections.vehicle && (
                  <div className="pl-6 border-l-2 border-slate-200">
                    <p className="font-medium text-slate-900 flex items-center gap-2">
                      <Car className="w-4 h-4 text-slate-400" />
                      {currentAppointment.vehicle_make_model}
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* Notes */}
            {currentAppointment.customer_notes && (
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection("notes")}
                  className="flex items-center justify-between w-full text-left"
                  aria-expanded={expandedSections.notes}
                >
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Notes
                  </h3>
                  {expandedSections.notes ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                {expandedSections.notes && (
                  <div className="pl-6 border-l-2 border-slate-200">
                    <div className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                      {currentAppointment.customer_notes}
                      {/* Extract and display meeting link if present in notes */}
                      {currentAppointment.customer_notes.includes(
                        "Meeting:"
                      ) && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-sm font-medium text-slate-600 mb-2">
                            Meeting Link:
                          </p>
                          {(() => {
                            const meetingMatch =
                              currentAppointment.customer_notes.match(
                                /Meeting:\s*(https:\/\/[^\s]+)/
                              );
                            if (meetingMatch) {
                              return (
                                <a
                                  href={meetingMatch[1]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Join Meeting
                                </a>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Actions */}
            <AppointmentActions
              appointment={currentAppointment}
              onStatusChange={(newStatus) =>
                setCurrentAppointment((prev) => ({
                  ...prev,
                  status: newStatus,
                }))
              }
            />
            History
            <Suspense
              fallback={
                <Card className="p-6 wrap-break-word">
                  <div className="flex items-center gap-2 mb-4 wrap-break-word">
                    <History className="w-5 h-5 wrap-break-word" />
                    <h3 className="text-lg font-semibold ">Change History</h3>
                  </div>
                  <div className="flex items-center justify-center py-8 wrap-break-word">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400 wrap-break-word" />
                    <span className="ml-2 text-slate-600">
                      Loading history...
                    </span>
                  </div>
                </Card>
              }
            >
              <AppointmentHistory externalId={currentAppointment.external_id} />
            </Suspense>
            {/* Status-specific Info */}
            {currentAppointment.status === "RESCHEDULED" && (
              <Card className="p-4 bg-orange-50 border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Rescheduled Appointment
                </h4>
                <p className="text-sm text-orange-700">
                  This appointment was cancelled and rescheduled to a new
                  date/time. Check the appointment list for the new booking with
                  the same customer.
                </p>
              </Card>
            )}
            {currentAppointment.status === "EDITED" && (
              <Card className="p-4 bg-purple-50 border-purple-200 wrap-break-word">
                <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Appointment Edited
                </h4>
                <p className="text-sm text-purple-700">
                  Customer information was updated for this appointment. View
                  the change history below for details.
                </p>
              </Card>
            )}
            {/* System Info */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection("system")}
                className="flex items-center justify-between w-full text-left"
                aria-expanded={expandedSections.system}
              >
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  System Information
                </h3>
                {expandedSections.system ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {expandedSections.system && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 border-l-2 border-slate-200 text-sm">
                  <div>
                    <p className="text-slate-500 uppercase tracking-wide text-xs">
                      External ID
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">
                        {currentAppointment.external_id}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          copyToClipboard(currentAppointment.external_id)
                        }
                        className="h-6 w-6"
                        aria-label="Copy external ID"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      {copied && (
                        <span className="text-xs text-green-600 animate-in fade-in">
                          Copied!
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase tracking-wide text-xs">
                      Source
                    </p>
                    <p className="font-medium mt-1">
                      {currentAppointment.source}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase tracking-wide text-xs">
                      Created
                    </p>
                    <p className="font-medium mt-1">
                      {format(
                        new Date(currentAppointment.created_at),
                        "MMM dd, yyyy HH:mm"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase tracking-wide text-xs">
                      Updated
                    </p>
                    <p className="font-medium mt-1">
                      {format(
                        new Date(currentAppointment.updated_at),
                        "MMM dd, yyyy HH:mm"
                      )}
                    </p>
                  </div>
                  {currentAppointment.if_edited && (
                    <div>
                      <p className="text-slate-500 uppercase tracking-wide text-xs">
                        Edited By
                      </p>
                      <p className="font-medium mt-1">
                        {currentAppointment.edited_by === "user"
                          ? "Staff Member"
                          : currentAppointment.edited_by === "customer"
                          ? "Customer (via webhook)"
                          : currentAppointment.edited_by}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

export { AppointmentDetail };
