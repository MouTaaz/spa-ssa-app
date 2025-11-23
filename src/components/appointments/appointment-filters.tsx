"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Calendar } from "lucide-react";
import { useState, ChangeEvent } from "react";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
} from "date-fns";

interface AppointmentFiltersProps {
  onStatusChange: (status: string | null) => void;
  onSearchChange: (search: string) => void;
  onDateRangeChange: (range: {
    from: string | null;
    to: string | null;
  }) => void;
}

export function AppointmentFilters({
  onStatusChange,
  onSearchChange,
  onDateRangeChange,
}: AppointmentFiltersProps) {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activePrefilter, setActivePrefilter] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const statuses = ["BOOKED", "CONFIRMED", "COMPLETED", "CANCELLED"];

  const prefilters = [
    { key: "today", label: "Today" },
    { key: "thisWeek", label: "This Week" },
    { key: "lastWeek", label: "Last Week" },
    { key: "thisMonth", label: "This Month" },
  ];

  const getDateRange = (prefilter: string) => {
    const now = new Date();
    switch (prefilter) {
      case "today":
        return {
          from: format(startOfDay(now), "yyyy-MM-dd"),
          to: format(endOfDay(now), "yyyy-MM-dd"),
        };
      case "thisWeek":
        return {
          from: format(startOfWeek(now), "yyyy-MM-dd"),
          to: format(endOfWeek(now), "yyyy-MM-dd"),
        };
      case "lastWeek":
        const lastWeek = subWeeks(now, 1);
        return {
          from: format(startOfWeek(lastWeek), "yyyy-MM-dd"),
          to: format(endOfWeek(lastWeek), "yyyy-MM-dd"),
        };
      case "thisMonth":
        return {
          from: format(startOfMonth(now), "yyyy-MM-dd"),
          to: format(endOfMonth(now), "yyyy-MM-dd"),
        };
      default:
        return { from: null, to: null };
    }
  };

  const handlePrefilterClick = (prefilter: string) => {
    if (activePrefilter === prefilter) {
      setActivePrefilter(null);
      setFromDate("");
      setToDate("");
      onDateRangeChange({ from: null, to: null });
    } else {
      setActivePrefilter(prefilter);
      const range = getDateRange(prefilter);
      setFromDate(range.from || "");
      setToDate(range.to || "");
      onDateRangeChange(range);
    }
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setActivePrefilter(null);
    onDateRangeChange({ from: value || null, to: toDate || null });
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setActivePrefilter(null);
    onDateRangeChange({ from: fromDate || null, to: value || null });
  };

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
            {status === "EDITED" ? "BOOKED (Edited)" : status}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Date Range</span>
        </div>

        {/* Prefilter Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {prefilters.map((prefilter) => (
            <Button
              key={prefilter.key}
              variant={
                activePrefilter === prefilter.key ? "default" : "outline"
              }
              size="sm"
              onClick={() => handlePrefilterClick(prefilter.key)}
              className="text-xs"
            >
              {prefilter.label}
            </Button>
          ))}
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFromDateChange(e.target.value)
              }
              className="text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleToDateChange(e.target.value)
              }
              className="text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
