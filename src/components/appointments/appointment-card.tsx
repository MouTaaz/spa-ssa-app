"use client";

import { useState } from "react";
import type { Appointment } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Wrench,
  ChevronDown,
  ChevronUp,
  Video,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
}

export function AppointmentCard({
  appointment,
  onClick,
}: AppointmentCardProps) {
  const [showRescheduleHistory, setShowRescheduleHistory] = useState(false);

  const statusColors: Record<string, string> = {
    BOOKED: "bg-blue-100 text-blue-800",
    CONFIRMED: "bg-green-100 text-green-800",
    COMPLETED: "bg-slate-100 text-slate-800",
    CANCELLED: "bg-red-100 text-red-800",
    CANCELLED_RESCHEDULE: "bg-orange-100 text-orange-800 border-orange-300",
    CANCELLED_FINAL: "bg-red-100 text-red-800 border-red-300",
    RESCHEDULED: "bg-orange-100 text-orange-800",
    EDITED: "bg-blue-100 text-blue-800 border-purple-300",
  };

  const startDate = new Date(appointment.start_time);
  const endDate = new Date(appointment.end_time);

  const hasRescheduleHistory = appointment.previous_appointment;

  return (
    <Card
      onClick={onClick}
      className="p-4 sm:p-6 hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-slate-50 border-2 hover:border-blue-300 rounded-2xl"
    >
      {/* Enhanced mobile-first edited info highlight */}
      {appointment.display_status === "EDITED" && (
        <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 via-purple-100 to-purple-50 border-l-4 border-purple-500 rounded-xl shadow-lg animate-fade-in">
          <div className="flex items-center gap-2 text-purple-800 mb-2">
            <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse shadow-sm"></div>
            <span className="text-sm font-bold tracking-wide">
              ✏️ Customer Edited
            </span>
          </div>
          <p className="text-xs text-purple-700 leading-relaxed font-medium">
            Customer information was updated. Check history for details.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-200 text-purple-800 text-xs rounded-full font-semibold shadow-sm">
              <AlertCircle className="w-3 h-3" />
              Info Changed
            </span>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-xl text-slate-900 mb-1 truncate">
            {appointment.customer_name}
          </h3>
          <p className="text-sm text-slate-600 font-medium bg-slate-100 inline-block px-2 py-1 rounded-full truncate">
            {appointment.service_name}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {hasRescheduleHistory && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setShowRescheduleHistory(!showRescheduleHistory);
              }}
              aria-controls={`reschedule-history-${appointment.id}`}
              aria-expanded={showRescheduleHistory}
              className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 transition-all duration-200 min-h-[44px] w-full sm:w-auto"
            >
              <span className="flex items-center gap-1">
                <span className="text-orange-600">🔄</span>
                Rescheduled
                {showRescheduleHistory ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </span>
            </Button>
          )}
          <Badge
            variant={
              appointment.status === "CANCELLED"
                ? appointment.cancellation_type === "reschedule"
                  ? "cancelled_reschedule"
                  : "cancelled_final"
                : (appointment.status.toLowerCase() as any)
            }
            className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm ${
              appointment.status === "CANCELLED"
                ? undefined
                : statusColors[appointment.status]
            }`}
          >
            {appointment.display_status === "RESCHEDULED"
              ? "BOOKED (Rescheduled)"
              : appointment.display_status === "EDITED"
              ? "BOOKED (Edited)"
              : appointment.status === "CANCELLED"
              ? appointment.cancellation_type === "reschedule"
                ? "CANCELLED (Reschedule)"
                : "CANCELLED (Final)"
              : appointment.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg hover:bg-slate-100 transition-colors duration-200">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <span className="font-medium text-slate-900">
              {format(startDate, "MMM dd, yyyy")}
            </span>
            <span className="block text-xs text-slate-500">Date</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg hover:bg-slate-100 transition-colors duration-200">
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Clock className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <span className="font-medium text-slate-900">
              {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
            </span>
            <span className="block text-xs text-slate-500">Time</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg hover:bg-slate-100 transition-colors duration-200 sm:col-span-2">
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-slate-900 break-words">
              {appointment.location}
            </span>
            <span className="block text-xs text-slate-500">Location</span>
          </div>
        </div>

        {appointment.vehicle_make_model && (
          <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg hover:bg-slate-100 transition-colors duration-200 sm:col-span-2">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Wrench className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-slate-900 break-words">
                {appointment.vehicle_make_model}
              </span>
              <span className="block text-xs text-slate-500">Vehicle</span>
            </div>
          </div>
        )}

        {appointment.customer_phone && (
          <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg hover:bg-slate-100 transition-colors duration-200 sm:col-span-2">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Phone className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-slate-900 break-words">
                {appointment.customer_phone}
              </span>
              <span className="block text-xs text-slate-500">Phone</span>
            </div>
          </div>
        )}

        {appointment.web_meeting_url && (
          <div className="sm:col-span-2">
            <a
              href={appointment.web_meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-3 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-3 rounded-lg transition-all duration-200 group"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Video className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <span className="font-medium underline">Join Meeting</span>
                <span className="block text-xs text-blue-500">
                  Click to open
                </span>
              </div>
              <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        )}
      </div>

      {appointment.customer_notes && (
        <div className="mt-3 p-2 bg-slate-50 rounded text-sm text-slate-700">
          <p className="font-medium mb-1">Notes:</p>
          <p className="break-words">{appointment.customer_notes}</p>
          {/* Extract and display meeting link if present in notes */}
          {appointment.customer_notes.includes("Meeting:") && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              {(() => {
                const meetingMatch = appointment.customer_notes.match(
                  /Meeting:\s*(https:\/\/[^\s]+)/
                );
                if (meetingMatch) {
                  return (
                    <a
                      href={meetingMatch[1]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline text-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Join Meeting
                    </a>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Expandable Reschedule History */}
      {hasRescheduleHistory && (
        <div
          id={`reschedule-history-${appointment.id}`}
          className={`mt-4 overflow-hidden transition-all duration-500 ease-in-out ${
            showRescheduleHistory
              ? "max-h-[1000px] opacity-100 scale-100"
              : "max-h-0 opacity-0 scale-95"
          }`}
        >
          <div className="border-t-2 border-orange-300 pt-4 space-y-4 bg-gradient-to-r from-orange-50/50 to-orange-100/50 p-4 rounded-xl">
            <h4 className="font-bold text-base text-slate-800 flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse shadow-sm"></div>
              <span className="text-orange-700">Reschedule History</span>
            </h4>

            {/* What Changed */}
            {appointment.previous_appointment && (
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <h5 className="font-medium text-sm text-orange-800 mb-3 flex items-center gap-2">
                  <span className="text-orange-600">🔄</span>
                  What Changed
                </h5>
                <div className="space-y-3 text-xs">
                  {(() => {
                    const changes = [];
                    const prev = appointment.previous_appointment;

                    if (prev) {
                      if (
                        prev.start_time !== appointment.start_time ||
                        prev.end_time !== appointment.end_time
                      ) {
                        changes.push(
                          <div
                            key="time"
                            className="bg-white p-2 rounded border"
                          >
                            <span className="text-slate-600 font-medium block mb-1">
                              Time:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-red-600 text-xs font-medium">
                                  Previous:
                                </span>
                                <div className="text-red-700 font-mono">
                                  {format(
                                    new Date(prev.start_time),
                                    "MMM dd, yyyy HH:mm"
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-green-600 text-xs font-medium">
                                  Current:
                                </span>
                                <div className="text-green-700 font-mono">
                                  {format(startDate, "MMM dd, yyyy HH:mm")}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (prev.location !== appointment.location) {
                        changes.push(
                          <div
                            key="location"
                            className="bg-white p-2 rounded border"
                          >
                            <span className="text-slate-600 font-medium block mb-1">
                              Location:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-red-600 text-xs font-medium">
                                  Previous:
                                </span>
                                <div className="text-red-700 break-words">
                                  {prev.location}
                                </div>
                              </div>
                              <div>
                                <span className="text-green-600 text-xs font-medium">
                                  Current:
                                </span>
                                <div className="text-green-700 break-words">
                                  {appointment.location}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (prev.service_name !== appointment.service_name) {
                        changes.push(
                          <div
                            key="service"
                            className="bg-white p-2 rounded border"
                          >
                            <span className="text-slate-600 font-medium block mb-1">
                              Service:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-red-600 text-xs font-medium">
                                  Previous:
                                </span>
                                <div className="text-red-700 break-words">
                                  {prev.service_name}
                                </div>
                              </div>
                              <div>
                                <span className="text-green-600 text-xs font-medium">
                                  Current:
                                </span>
                                <div className="text-green-700 break-words">
                                  {appointment.service_name}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    }

                    return changes.length > 0 ? (
                      changes
                    ) : (
                      <div className="text-slate-500 italic text-center py-2">
                        No specific changes detected
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Enhanced External ID Trail */}
            <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-lg">
              <h5 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-3">
                <div className="w-4 h-4 bg-slate-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🔗</span>
                </div>
                External ID Trail
              </h5>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2 rounded border">
                  <span className="text-slate-600 font-medium block">
                    Previous:
                  </span>
                  <code className="bg-slate-200 px-2 py-1 rounded text-slate-800 font-mono text-xs block mt-1 break-all">
                    {appointment.previous_appointment!.external_id}
                  </code>
                </div>
                <div className="bg-white p-2 rounded border">
                  <span className="text-slate-600 font-medium block">
                    Current:
                  </span>
                  <code className="bg-slate-200 px-2 py-1 rounded text-slate-800 font-mono text-xs block mt-1 break-all">
                    {appointment.external_id}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
