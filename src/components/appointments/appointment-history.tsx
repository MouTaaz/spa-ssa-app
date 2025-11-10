"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { History, Loader2 } from "lucide-react";

interface HistoryRecord {
  id: string;
  action: string;
  source: string;
  previous_data: any;
  new_data: any;
  created_at: string;
  changed_by: string;
  notes: string;
}

interface AppointmentHistoryProps {
  externalId: string;
}

export function AppointmentHistory({ externalId }: AppointmentHistoryProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [externalId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("appointment_history")
        .select(
          "id, appointment_external_id, action, source, previous_data, new_data, changed_by, notes, created_at"
        )
        .eq("appointment_external_id", externalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Change History</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-600">Loading history...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 ">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Change History</h3>
      </div>

      {history.length === 0 ? (
        <p className="text-slate-600 text-center py-4">No changes recorded</p>
      ) : (
        <div className="space-y-3 ">
          {history.map((record) => (
            <div
              key={record.id}
              className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
            >
              <div className="flex-1 ">
                <p className="font-medium text-sm capitalize ">
                  {record.action === "EDIT" && record.source === "user"
                    ? "Edited by Staff"
                    : record.action === "EDIT" &&
                      (record.source === "customer" ||
                        record.source === "webhook")
                    ? "Edited by Customer"
                    : record.action}
                </p>
                <p className="text-xs text-slate-600">
                  {format(new Date(record.created_at), "MMM dd, yyyy HH:mm:ss")}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Changed by:{" "}
                  <span className="font-medium">{record.changed_by}</span>
                  {record.source && (
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {record.source}
                    </span>
                  )}
                </p>
                {/* Show changes if available */}
                {record.previous_data && record.new_data && (
                  <div className="mt-2 text-xs ">
                    <p className="text-slate-600 mb-1 wrap-break-word">
                      Changes:
                    </p>
                    {Object.keys(record.new_data).map((key) => {
                      if (record.previous_data[key] !== record.new_data[key]) {
                        const formatValue = (value: any) => {
                          if (value === null || value === undefined)
                            return "null";
                          if (typeof value === "object") return "[object]";
                          return String(value);
                        };

                        return (
                          <div key={key} className="flex gap-2 mb-1">
                            <span className="text-slate-500 font-medium">
                              {key}:
                            </span>
                            <span className="text-red-600 line-through flex-1 break-words overflow-wrap-anywhere">
                              {formatValue(record.previous_data[key])}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="text-green-600 flex-1 break-words overflow-wrap-anywhere">
                              {formatValue(record.new_data[key])}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
