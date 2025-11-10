"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { useState, ChangeEvent } from "react";

interface AppointmentFiltersProps {
  onStatusChange: (status: string | null) => void;
  onSearchChange: (search: string) => void;
  onDateChange: (date: string | null) => void;
}

export function AppointmentFilters({
  onStatusChange,
  onSearchChange,
  onDateChange,
}: AppointmentFiltersProps) {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  const statuses = ["BOOKED", "CONFIRMED", "COMPLETED", "CANCELLED"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-white p-3 rounded-lg border">
        <Search className="w-5 h-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by customer name, email, or service..."
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onSearchChange(e.target.value)
          }
          className="border-0 focus:ring-0"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className=""
          variant={activeStatus === null ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setActiveStatus(null);
            onStatusChange(null);
          }}
        >
          All
        </Button>
        {statuses.map((status) => (
          <Button
            className=""
            key={status}
            variant={activeStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveStatus(status);
              onStatusChange(status);
            }}
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-slate-400" />
        <Input
          type="date"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onDateChange(e.target.value || null)
          }
          className="flex-1"
        />
      </div>
    </div>
  );
}
