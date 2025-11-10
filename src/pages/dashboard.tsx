"use client";

import { useAuth } from "@/hooks/useAuth";
import { useAppointments } from "@/hooks/useAppointments";
import { useBusiness } from "@/hooks/useBusiness";
import { useSubscription } from "@/hooks/useSubscription";
import { AppointmentStats } from "@/components/appointments/appointment-stats";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Calendar,
  Users,
  Settings,
  TrendingUp,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export function DashboardPage() {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { appointments } = useAppointments(user?.email);
  const { usageStats, limits, currentPlan, isNearLimit } = useSubscription();
  const navigate = useNavigate();

  // Get recent appointments (next 7 days)
  const recentAppointments = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.start_time);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return (
        aptDate >= now && aptDate <= weekFromNow && apt.status !== "CANCELLED"
      );
    })
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
    .slice(0, 5);

  // Get today's appointments
  const todayAppointments = appointments.filter((apt) => {
    const aptDate = format(new Date(apt.start_time), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    return aptDate === today && apt.status !== "CANCELLED";
  });

  if (!user || !currentBusiness) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-slate-600">Please sign in to view the dashboard</p>
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
            <h1 className="text-2xl font-bold truncate">Dashboard</h1>
            <p className="text-sm text-slate-600 truncate">
              Overview of {currentBusiness.name}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <Button
              variant="default"
              size="sm"
              className="md:size-default"
              onClick={() => navigate("/appointments")}
            >
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">New Appointment</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {user.full_name || user.email}!
          </h2>
          <p className="text-slate-600">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* Quick Stats */}
        <AppointmentStats appointments={appointments} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Appointments */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Today's Appointments</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/appointments")}
                >
                  View All
                </Button>
              </div>

              {todayAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">
                    No appointments scheduled for today
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.slice(0, 3).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate("/appointments")}
                    >
                      <div>
                        <p className="font-medium">
                          {appointment.customer_name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {format(new Date(appointment.start_time), "h:mm a")} -{" "}
                          {appointment.service_name}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {appointment.status.toLowerCase()}
                      </Badge>
                    </div>
                  ))}
                  {todayAppointments.length > 3 && (
                    <p className="text-center text-sm text-slate-600 pt-2">
                      +{todayAppointments.length - 3} more appointments today
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Subscription & Usage */}
          <div className="space-y-6">
            {/* Current Plan */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Current Plan</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-600">Plan</p>
                  <p className="font-semibold capitalize">
                    {currentPlan?.name || "Free"}
                  </p>
                </div>

                {currentPlan && (
                  <div>
                    <p className="text-sm text-slate-600">Monthly Limit</p>
                    <p className="font-semibold">
                      {limits.maxAppointmentsPerMonth === -1
                        ? "Unlimited"
                        : `${limits.maxAppointmentsPerMonth} appointments`}
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/subscribe")}
                >
                  Manage Subscription
                </Button>
              </div>
            </Card>

            {/* Usage Overview */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">Usage This Month</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Appointments</span>
                    <span>
                      {usageStats.appointments.used} /{" "}
                      {usageStats.appointments.limit === -1
                        ? "∞"
                        : usageStats.appointments.limit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        usageStats.appointments.percentage >= 90
                          ? "bg-red-600"
                          : usageStats.appointments.percentage >= 75
                          ? "bg-yellow-600"
                          : "bg-green-600"
                      }`}
                      style={{
                        width: `${Math.min(
                          usageStats.appointments.percentage,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Services</span>
                    <span>
                      {usageStats.services.used} /{" "}
                      {usageStats.services.limit === -1
                        ? "∞"
                        : usageStats.services.limit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        usageStats.services.percentage >= 90
                          ? "bg-red-600"
                          : usageStats.services.percentage >= 75
                          ? "bg-yellow-600"
                          : "bg-green-600"
                      }`}
                      style={{
                        width: `${Math.min(
                          usageStats.services.percentage,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {isNearLimit("appointments") && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs text-yellow-800">
                      Approaching appointment limit
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upcoming Appointments</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/appointments")}
            >
              View All Appointments
            </Button>
          </div>

          {recentAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No upcoming appointments</p>
              <Button
                variant="default"
                size="sm"
                className="mt-4"
                onClick={() => navigate("/appointments")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule First Appointment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate("/appointments")}
                >
                  <div>
                    <p className="font-medium">{appointment.customer_name}</p>
                    <p className="text-sm text-slate-600">
                      {format(
                        new Date(appointment.start_time),
                        "MMM d, h:mm a"
                      )}{" "}
                      - {appointment.service_name}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {appointment.status.toLowerCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Notifications</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/notifications")}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">New appointment booked</p>
                <p className="text-sm text-slate-600">
                  John Doe booked for Haircut
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">Appointment reminder</p>
                <p className="text-sm text-slate-600">
                  Upcoming appointment with Jane Smith
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/appointments")}
            >
              <Plus className="w-5 h-5" />
              New Appointment
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-5 h-5" />
              Business Settings
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/profile")}
            >
              <Users className="w-5 h-5" />
              Profile
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/subscribe")}
            >
              <TrendingUp className="w-5 h-5" />
              Subscription
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
