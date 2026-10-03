'use client';

import { useMemo, useState } from 'react';

type EventType = 'Quiz' | 'Session' | 'Deadline';
type FilterType = 'All' | EventType;

type CalendarEvent = {
  day: number;
  title: string;
  type: EventType;
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const FILTERS: FilterType[] = ['All', 'Quiz', 'Session', 'Deadline'];

const EVENTS: CalendarEvent[] = [
  { day: 3, title: 'Quiz: Budgeting', type: 'Quiz' },
  { day: 4, title: 'Face-to-Face session', type: 'Session' },
  { day: 6, title: 'Portfolio due', type: 'Deadline' },
  { day: 9, title: 'Virtual sync', type: 'Session' },
  { day: 15, title: 'Practice test window opens', type: 'Quiz' },
  { day: 22, title: 'Module activity due', type: 'Deadline' },
];

const EVENT_STYLE: Record<EventType, { dot: string; background: string; color: string }> = {
  Quiz: {
    dot: '#d88955',
    background: '#faf8f5',
    color: '#67574c',
  },
  Session: {
    dot: '#426a53',
    background: '#f7f8f6',
    color: '#526258',
  },
  Deadline: {
    dot: '#6d8d9c',
    background: '#f7f9fa',
    color: '#526b77',
  },
};

export default function StudentCalendarPage() {
  const today = new Date();
  const [viewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [filter, setFilter] = useState<FilterType>('All');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = viewDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPreviousMonth = new Date(year, month, 0).getDate();
    const weekCount = Math.ceil((firstDayIndex + daysInMonth) / 7);
    const cellCount = weekCount * 7;

    return Array.from({ length: cellCount }, (_, index) => {
      const position = index - firstDayIndex + 1;

      if (position < 1) {
        return {
          day: daysInPreviousMonth + position,
          monthOffset: -1,
        };
      }

      if (position > daysInMonth) {
        return {
          day: position - daysInMonth,
          monthOffset: 1,
        };
      }

      return { day: position, monthOffset: 0 };
    });
  }, [month, year]);

  const visibleEvents = useMemo(
    () => EVENTS.filter((event) => filter === 'All' || event.type === filter),
    [filter],
  );

  const isToday = (day: number, monthOffset: number) => {
    const cellDate = new Date(year, month + monthOffset, day);

    return (
      cellDate.getFullYear() === today.getFullYear() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getDate() === today.getDate()
    );
  };

  return (
    <div
      style={{
        minHeight: '100%',
        background: '#f4f1ea',
        padding: '20px 24px 28px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '18px',
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '17px',
              lineHeight: 1.2,
              fontWeight: 650,
              color: '#171b18',
              letterSpacing: '-0.01em',
            }}
          >
            {monthLabel}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
            {FILTERS.map((item) => {
              const selected = filter === item;
              const dotColor =
                item === 'Quiz'
                  ? '#d88955'
                  : item === 'Session'
                    ? '#426a53'
                    : item === 'Deadline'
                      ? '#6d8d9c'
                      : 'transparent';

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  style={{
                    height: '25px',
                    padding: '0 11px',
                    borderRadius: '999px',
                    border: selected ? '1px solid #365f49' : '1px solid #d9d7d1',
                    background: selected ? '#365f49' : '#ffffff',
                    color: selected ? '#ffffff' : '#585e59',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '10px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: selected ? '0 1px 2px rgba(24, 42, 32, 0.12)' : 'none',
                  }}
                >
                  {item !== 'All' && (
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '999px',
                        background: selected ? '#ffffff' : dotColor,
                        display: 'inline-block',
                      }}
                    />
                  )}
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #dfddd7',
            borderRadius: '14px',
            background: '#ffffff',
            boxShadow: '0 1px 2px rgba(41, 50, 45, 0.02)',
          }}
        >
          <div style={{ minWidth: '900px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                height: '39px',
                borderBottom: '1px solid #eceae5',
                background: '#fcfcfb',
              }}
            >
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    color: '#9d9193',
                  }}
                >
                  {weekday}
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              }}
            >
              {calendarCells.map((cell, index) => {
                const dimmed = cell.monthOffset !== 0;
                const todayCell = isToday(cell.day, cell.monthOffset);
                const events =
                  cell.monthOffset === 0
                    ? visibleEvents.filter((event) => event.day === cell.day)
                    : [];

                const isLastColumn = (index + 1) % 7 === 0;
                const isLastRow = index >= calendarCells.length - 7;

                return (
                  <div
                    key={`${cell.monthOffset}-${cell.day}-${index}`}
                    style={{
                      minHeight: '74px',
                      padding: '9px 10px',
                      borderRight: isLastColumn ? 'none' : '1px solid #efede8',
                      borderBottom: isLastRow ? 'none' : '1px solid #efede8',
                      background: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        fontWeight: 500,
                        color: todayCell ? '#ffffff' : dimmed ? '#c8c8c3' : '#38413c',
                        background: todayCell ? '#365f49' : 'transparent',
                      }}
                    >
                      {cell.day}
                    </div>

                    {events.length > 0 && (
                      <div style={{ marginTop: '6px', display: 'grid', gap: '4px' }}>
                        {events.map((event) => {
                          const tone = EVENT_STYLE[event.type];

                          return (
                            <div
                              key={`${event.day}-${event.title}`}
                              title={event.title}
                              style={{
                                minWidth: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                borderRadius: '5px',
                                background: tone.background,
                                color: tone.color,
                                padding: '4px 6px',
                                fontSize: '8px',
                                lineHeight: 1.15,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              <span
                                style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '999px',
                                  background: tone.dot,
                                  flex: '0 0 auto',
                                }}
                              />
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {event.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
