"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "@/hooks/useBusiness";
import { useAppointments } from "@/hooks/useAppointments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

export function ConnectionVerifier({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const navigate = useNavigate();
  const { currentBusiness } = useBusiness();
  const { appointments } = useAppointments(undefined);
  const [isVerifying, setIsVerifying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "connected" | "disconnected"
  >("unknown");
  const [lastAppointment, setLastAppointment] = useState<any>(null);

  useEffect(() => {
    if (appointments.length > 0) {
      // Find the most recent appointment
      const sortedAppointments = appointments.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setLastAppointment(sortedAppointments[0]);
    }
  }, [appointments]);

  const verifyConnection = async () => {
    setIsVerifying(true);

    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if there are any appointments from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAppointments = appointments.filter(
      (apt) => new Date(apt.created_at) > oneDayAgo
    );

    if (recentAppointments.length > 0) {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus("disconnected");
    }

    setIsVerifying(false);
  };

  if (!currentBusiness) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-slate-600">Loading business information...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/onboarding/setup")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Setup
            </Button>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Verify Connection
            </h1>
            <p className="text-slate-600">
              Let's check if your WordPress site is successfully connected to
              SSA Manager.
            </p>
          </div>

          {/* Connection Status */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              {connectionStatus === "connected" ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : connectionStatus === "disconnected" ? (
                <XCircle className="w-8 h-8 text-red-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-slate-400" />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  Connection Status:{" "}
                  <Badge
                    variant={
                      connectionStatus === "connected"
                        ? "default"
                        : connectionStatus === "disconnected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {connectionStatus === "connected"
                      ? "Success! Connected 🎉"
                      : connectionStatus === "disconnected"
                      ? "Waiting for first appointment..."
                      : "Unknown"}
                  </Badge>
                </h3>
                <p className="text-sm text-slate-600">
                  {connectionStatus === "connected"
                    ? "Your WordPress site is successfully connected! Appointments will now appear in your dashboard."
                    : connectionStatus === "disconnected"
                    ? "No recent appointments detected. Create a test appointment on your WordPress site."
                    : "Click 'Check Again' to check the status."}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Recent Appointments</h3>
            {appointments.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No appointments found</p>
                <p className="text-sm text-slate-500 mt-1">
                  Create a test appointment on your WordPress site to verify the
                  connection.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 3).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{appointment.customer_name}</p>
                      <p className="text-sm text-slate-600">
                        {appointment.service_name} -{" "}
                        {new Date(appointment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">{appointment.status}</Badge>
                  </div>
                ))}
                {appointments.length > 3 && (
                  <p className="text-center text-sm text-slate-600 pt-2">
                    +{appointments.length - 3} more appointments
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <Button
              onClick={verifyConnection}
              disabled={isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Again
                </>
              )}
            </Button>

            {connectionStatus === "connected" && (
              <Button
                className="w-full"
                onClick={onComplete || (() => navigate("/dashboard"))}
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {connectionStatus === "disconnected" && (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">
                    Connection Issues
                  </h4>
                  <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                    <li>
                      Check that the webhook URL is correct in the plugin
                      settings
                    </li>
                    <li>Verify the plugin is activated and configured</li>
                    <li>Check WordPress error logs for any issues</li>
                    <li>
                      Try creating a test appointment and wait a few minutes
                    </li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/onboarding/setup")}
                  >
                    Review Setup Steps
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onComplete || (() => navigate("/dashboard"))}
                  >
                    Continue Anyway
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
