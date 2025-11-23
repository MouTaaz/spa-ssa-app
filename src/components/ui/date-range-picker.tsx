"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
} from "date-fns";

interface DateRangePickerProps {
  selectedRange: { from: Date | null; to: Date | null };
  onRangeChange: (range: { from: Date | null; to: Date | null }) => void;
  className?: string;
}

export function DateRangePicker({
  selectedRange,
  onRangeChange,
  className = "",
}: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for full weeks
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDateClick = (date: Date) => {
    if (selectingStart || !selectedRange.from) {
      onRangeChange({ from: date, to: null });
      setSelectingStart(false);
    } else {
      if (date < selectedRange.from) {
        onRangeChange({ from: date, to: selectedRange.from });
      } else {
        onRangeChange({ from: selectedRange.from, to: date });
      }
      setSelectingStart(true);
    }
  };

  const isInRange = (date: Date) => {
    if (!selectedRange.from || !selectedRange.to) return false;
    return isWithinInterval(date, {
      start: selectedRange.from,
      end: selectedRange.to,
    });
  };

  const isRangeStart = (date: Date) => {
    return selectedRange.from && isSameDay(date, selectedRange.from);
  };

  const isRangeEnd = (date: Date) => {
    return selectedRange.to && isSameDay(date, selectedRange.to);
  };

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-semibold text-lg">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-slate-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const inRange = isInRange(date);
          const rangeStart = isRangeStart(date);
          const rangeEnd = isRangeEnd(date);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              className={`
                h-10 w-10 text-sm rounded-md transition-colors
                ${!isCurrentMonth ? "text-slate-400" : "text-slate-900"}
                ${inRange ? "bg-blue-100" : "hover:bg-slate-100"}
                ${rangeStart || rangeEnd ? "bg-blue-600 text-white" : ""}
                ${rangeStart ? "rounded-l-md" : ""}
                ${rangeEnd ? "rounded-r-md" : ""}
                ${inRange && !rangeStart && !rangeEnd ? "bg-blue-100" : ""}
              `}
            >
              {format(date, "d")}
            </button>
          );
        })}
      </div>

      {/* Selected range display */}
      {(selectedRange.from || selectedRange.to) && (
        <div className="mt-4 text-sm text-slate-600">
          {selectedRange.from && selectedRange.to ? (
            <span>
              Selected: {format(selectedRange.from, "MMM d")} -{" "}
              {format(selectedRange.to, "MMM d")}
            </span>
          ) : selectedRange.from ? (
            <span>
              Start: {format(selectedRange.from, "MMM d")} - Select end date
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
