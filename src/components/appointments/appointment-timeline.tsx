import type { Appointment } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow } from "date-fns";
import { Clock, CheckCircle, XCircle, RotateCcw, Edit } from "lucide-react";
import { getESTDate } from "@/lib/timezone";

interface AppointmentTimelineProps {
  appointments: Appointment[];
}

export function AppointmentTimeline({
  appointments,
}: AppointmentTimelineProps) {
  const upcomingAppointments = appointments
    .filter((a) => a.status !== "CANCELLED")
    .sort(
      (a, b) =>
        getESTDate(a.start_time).getTime() - getESTDate(b.start_time).getTime()
    )
    .slice(0, 5);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM dd");
  };

  const getStatusIcon = (status: string, displayStatus?: string) => {
    const effectiveStatus = displayStatus || status;
    switch (effectiveStatus) {
      case "CONFIRMED":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "COMPLETED":
        return <XCircle className="w-4 h-4 text-slate-600" />;
      case "RESCHEDULED":
        return <RotateCcw className="w-4 h-4 text-orange-600" />;
      case "EDITED":
        return <Edit className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string, displayStatus?: string) => {
    const effectiveStatus = displayStatus || status;
    const statusColors: Record<string, string> = {
      CONFIRMED: "bg-green-100 text-green-800",
      COMPLETED: "bg-slate-100 text-slate-800",
      RESCHEDULED: "bg-orange-100 text-orange-800",
      EDITED: "bg-purple-100 text-purple-800",
    };

    const getBadgeText = (status: string, displayStatus?: string) => {
      if (displayStatus === "RESCHEDULED") return "BOOKED (Rescheduled)";
      if (status === "EDITED") return "BOOKED (Edited)";
      return status;
    };

    return (
      <Badge
        variant="default"
        className={statusColors[effectiveStatus] || "bg-blue-100 text-blue-800"}
      >
        {getBadgeText(status, displayStatus)}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Upcoming Appointments</h3>
      {upcomingAppointments.length === 0 ? (
        <p className="text-slate-600 text-center py-8">
          No upcoming appointments
        </p>
      ) : (
        <div className="space-y-3">
          {upcomingAppointments.map((apt) => {
            const startDate = getESTDate(apt.start_time);
            return (
              <div
                key={apt.id}
                className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="mt-0.5 shrink-0">
                  {getStatusIcon(apt.status, apt.display_status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{apt.customer_name}</p>
                    {getStatusBadge(apt.status, apt.display_status)}
                  </div>
                  <p className="text-xs text-slate-600">
                    {getDateLabel(startDate)} at {format(startDate, "HH:mm")}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {apt.service_name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
