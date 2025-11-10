import type { Appointment } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface AppointmentStatsProps {
  appointments: Appointment[];
}

export function AppointmentStats({ appointments }: AppointmentStatsProps) {
  // Helper function to determine if a cancelled appointment was cancelled due to rescheduling
  const isCancelledDueToReschedule = (apt: Appointment) => {
    if (apt.status !== "CANCELLED") return false;

    // Check if this cancelled appointment was cancelled due to rescheduling
    // (i.e., there's a newer appointment that references this as its predecessor)
    return appointments.some((otherApt) => {
      return (
        otherApt.status !== "CANCELLED" &&
        otherApt.previous_appointment &&
        otherApt.previous_appointment.external_id === apt.external_id
      );
    });
  };

  const stats = {
    total: appointments.length,
    booked: appointments.filter((a) => a.status !== "CANCELLED").length,
    confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
    completed: appointments.filter((a) => a.status === "COMPLETED").length,
    cancelled: appointments.filter(
      (a) => a.status === "CANCELLED" && !isCancelledDueToReschedule(a)
    ).length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <Calendar className="w-8 h-8 text-blue-600 opacity-20" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Booked</p>
            <p className="text-2xl font-bold">{stats.booked}</p>
          </div>
          <Clock className="w-8 h-8 text-orange-600 opacity-20" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Confirmed</p>
            <p className="text-2xl font-bold">{stats.confirmed}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Completed</p>
            <p className="text-2xl font-bold">{stats.completed}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-slate-600 opacity-20" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Cancelled</p>
            <p className="text-2xl font-bold">{stats.cancelled}</p>
          </div>
          <AlertCircle className="w-8 h-8 text-red-600 opacity-20" />
        </div>
      </Card>
    </div>
  );
}
