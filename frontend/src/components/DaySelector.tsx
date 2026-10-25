import { useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';

interface DaySelectorProps {
  selectedDate: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  label?: string;
}

const JAN_DATES = Array.from({ length: 31 }, (_, i) => {
  const d = new Date(2026, 0, i + 1);
  return format(d, 'yyyy-MM-dd');
});

export function DaySelector({
  selectedDate,
  onChange,
  minDate = '2026-01-01',
  maxDate = '2026-01-31',
  label = 'Select delivery date',
}: DaySelectorProps) {
  const currentDate = parseISO(selectedDate);
  const min = parseISO(minDate);
  const max = parseISO(maxDate);

  const canGoBack = currentDate > min;
  const canGoForward = currentDate < max;

  const prev = () => canGoBack && onChange(format(subDays(currentDate, 1), 'yyyy-MM-dd'));
  const next = () => canGoForward && onChange(format(addDays(currentDate, 1), 'yyyy-MM-dd'));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{label}</p>
      <div className="flex items-center gap-3">
        {/* Prev/Next arrows */}
        <button
          onClick={prev}
          disabled={!canGoBack}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Date display */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 min-w-[180px] justify-center">
          <span className="font-medium text-white">
            {format(currentDate, 'EEEE, d MMMM yyyy')}
          </span>
        </div>

        <button
          onClick={next}
          disabled={!canGoForward}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Quick month pills */}
        <div className="hidden md:flex gap-1 flex-wrap ml-2">
          {[1, 7, 14, 21, 28].map((day) => {
            const d = `2026-01-${String(day).padStart(2, '0')}`;
            const isSelected = d === selectedDate;
            return (
              <button
                key={day}
                onClick={() => onChange(d)}
                className={clsx(
                  'px-2 py-1 text-xs rounded-md font-medium transition-colors',
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                )}
              >
                Jan {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
