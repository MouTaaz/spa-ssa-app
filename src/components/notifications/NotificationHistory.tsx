"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Bell, Calendar, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface NotificationLog {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  status: "sent" | "delivered" | "failed" | "clicked";
  sent_at: string;
  clicked_at?: string;
  created_at: string;
}

export function NotificationHistory() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      loadNotifications();

      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel("notification_logs_changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notification_logs",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("New notification received:", payload);
            setNotifications((prev) => [
              payload.new as NotificationLog,
              ...prev,
            ]);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notification_logs",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Notification updated:", payload);
            setNotifications((prev) =>
              prev.map((notification) =>
                notification.id === payload.new.id
                  ? ({ ...notification, ...payload.new } as NotificationLog)
                  : notification
              )
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, filterType, filterStatus]);

  const loadNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from("notification_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(50);

      if (filterType !== "all") {
        query = query.eq("notification_type", filterType);
      }

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading notifications:", error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotifications = notifications.filter(
    (notification) =>
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: "default",
      delivered: "secondary",
      failed: "destructive",
      clicked: "default",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      appointment_booked: "Appointment Booked",
      appointment_edited: "Appointment Edited",
      appointment_cancelled: "Appointment Cancelled",
      appointment_reminder: "Appointment Reminder",
      system_alert: "System Alert",
    };

    return labels[type as keyof typeof labels] || type;
  };

  if (isLoading && notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="appointment_booked">
                Appointment Booked
              </SelectItem>
              <SelectItem value="appointment_edited">
                Appointment Edited
              </SelectItem>
              <SelectItem value="appointment_cancelled">
                Appointment Cancelled
              </SelectItem>
              <SelectItem value="appointment_reminder">
                Appointment Reminder
              </SelectItem>
              <SelectItem value="system_alert">System Alert</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="clicked">Clicked</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={loadNotifications}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notifications found</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm truncate">
                        {notification.title}
                      </h4>
                      {getStatusBadge(notification.status)}
                    </div>

                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {notification.body}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(
                          new Date(notification.sent_at),
                          "MMM d, yyyy h:mm a"
                        )}
                      </span>
                      <span>
                        {getTypeLabel(notification.notification_type)}
                      </span>
                      {notification.clicked_at && (
                        <span className="text-green-600">
                          Clicked{" "}
                          {format(new Date(notification.clicked_at), "h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredNotifications.length > 0 && (
          <div className="text-center text-sm text-gray-500 pt-4">
            Showing {filteredNotifications.length} of {notifications.length}{" "}
            notifications
          </div>
        )}
      </CardContent>
    </Card>
  );
}
