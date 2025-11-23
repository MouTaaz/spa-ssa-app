"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppointments } from "@/hooks/useAppointments";
import { useBusiness } from "@/hooks/useBusiness";
import { useOnline } from "@/hooks/useOnline";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import { AppointmentDetail } from "@/components/appointments/appointment-detail";
import { AppointmentFilters } from "@/components/appointments/appointment-filters";
import { AppointmentStats } from "@/components/appointments/appointment-stats";
import { AppointmentTimeline } from "@/components/appointments/appointment-timeline";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { AppointmentEditForm } from "@/components/appointments/appointment-edit-form";
import { RealTimeIndicator } from "@/components/appointments/real-time-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Plus, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";

export function AppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentBusiness, loading: businessLoading } = useBusiness();
  const { appointments } = useAppointments(user?.email);
  const isOnline = useOnline();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: string | null;
    to: string | null;
  }>({ from: null, to: null });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);

  // Handle edit appointment event
  useEffect(() => {
    const handleEditAppointment = (event: CustomEvent) => {
      setEditingAppointment(event.detail);
    };

    window.addEventListener(
      "edit-appointment",
      handleEditAppointment as EventListener
    );

    return () => {
      window.removeEventListener(
        "edit-appointment",
        handleEditAppointment as EventListener
      );
    };
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (statusFilter) {
        if (statusFilter === "BOOKED") {
          // For BOOKED filter, show BOOKED and EDITED (which are BOOKED with edits)
          if (apt.status !== "BOOKED" && apt.status !== "EDITED") return false;
        } else if (statusFilter === "CANCELLED") {
          // For CANCELLED filter, only show normal cancelled appointments (not due to rescheduling)
          if (apt.status !== "CANCELLED") return false;
          // Check if this cancelled appointment was cancelled due to rescheduling
          const wasCancelledForReschedule = appointments.some((otherApt) => {
            return (
              otherApt.status !== "CANCELLED" &&
              otherApt.previous_appointment &&
              otherApt.previous_appointment.external_id === apt.external_id
            );
          });
          if (wasCancelledForReschedule) return false;
        } else if (apt.status !== statusFilter) {
          return false;
        }
      }
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        return (
          apt.customer_name.toLowerCase().includes(search) ||
          apt.customer_email?.toLowerCase().includes(search) ||
          apt.service_name.toLowerCase().includes(search)
        );
      }
      if (dateRange.from || dateRange.to) {
        const aptDate = new Date(apt.start_time);
        const fromDate = dateRange.from
          ? new Date(dateRange.from + "T00:00:00")
          : null;
        const toDate = dateRange.to
          ? new Date(dateRange.to + "T23:59:59")
          : null;

        if (fromDate && toDate) {
          return aptDate >= fromDate && aptDate <= toDate;
        } else if (fromDate) {
          return aptDate >= fromDate;
        } else if (toDate) {
          return aptDate <= toDate;
        }
      }
      return true;
    });
  }, [appointments, statusFilter, searchFilter, dateRange]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Not Authenticated</h2>
          <p className="text-slate-600">Please sign in to view appointments</p>
        </Card>
      </div>
    );
  }

  if (!currentBusiness) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Business Not Found</h2>
          <p className="text-slate-600">Loading your business information...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-2 md:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Appointments</h1>
            <p className="text-sm text-slate-600 truncate">
              {currentBusiness?.name || user.business_name || "Your Business"}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <RealTimeIndicator />
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">Offline</span>
                </>
              )}
            </div>
            <Button
              variant="default"
              size="sm"
              className="md:size-default"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">New</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <AppointmentStats appointments={appointments} />

        {/* Timeline View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <AppointmentTimeline appointments={appointments} />
          </div>
          <div className="hidden lg:block">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">This Week</span>
                  <span className="font-semibold">
                    {
                      appointments.filter((a) => {
                        const date = new Date(a.start_time);
                        const now = new Date();
                        const weekFromNow = new Date(
                          now.getTime() + 7 * 24 * 60 * 60 * 1000
                        );
                        return date >= now && date <= weekFromNow;
                      }).length
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">This Month</span>
                  <span className="font-semibold">
                    {
                      appointments.filter((a) => {
                        const date = new Date(a.start_time);
                        const now = new Date();
                        return (
                          date.getMonth() === now.getMonth() &&
                          date.getFullYear() === now.getFullYear()
                        );
                      }).length
                    }
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Filters and List */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters */}
          <div className="lg:col-span-1">
            <div className="sticky top-32">
              <AppointmentFilters
                onStatusChange={setStatusFilter}
                onSearchChange={setSearchFilter}
                onDateRangeChange={setDateRange}
              />
            </div>
          </div>

          {/* Appointments List */}
          <div className="lg:col-span-3">
            {filteredAppointments.length === 0 ? (
              <Card className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No appointments found
                </h3>
                <p className="text-slate-600">
                  {appointments.length === 0
                    ? "Create your first appointment to get started"
                    : "Try adjusting your filters"}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onClick={() => setSelectedAppointment(appointment)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAppointment && (
        <AppointmentDetail
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <AppointmentForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Form Modal */}
      {editingAppointment && (
        <AppointmentEditForm
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSuccess={() => setEditingAppointment(null)}
        />
      )}
    </div>
  );
}
