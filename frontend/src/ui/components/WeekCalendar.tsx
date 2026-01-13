import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  color?: string;
  data?: unknown;
}

interface WeekCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  initialDate?: Date;
}

interface PositionedEvent extends CalendarEvent {
  column: number;
  totalColumns: number;
}

const CalendarWrapper = styled.div`
  background: ${({ theme }) => theme.color.panel};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadowMd};
  overflow: hidden;
  min-height: 600px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.panel};
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const WeekGrid = styled.div`
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  background: ${({ theme }) => theme.color.panel};
  overflow-x: auto;
`;

const TimeColumn = styled.div`
  border-right: 1px solid ${({ theme }) => theme.color.border};
`;

const TimeSlot = styled.div<{ $isFirstRow?: boolean }>`
  height: 60px;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
  text-align: right;
  border-top: ${({ $isFirstRow }) => ($isFirstRow ? "none" : "1px solid")};
  border-color: ${({ theme }) => theme.color.border};
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
`;

const DayColumn = styled.div`
  position: relative;
  border-right: 1px solid ${({ theme }) => theme.color.border};
  min-width: 80px;

  &:last-child {
    border-right: none;
  }
`;

const DayHeader = styled.div<{ $isToday?: boolean }>`
  height: 60px;
  padding: 0.75rem;
  text-align: center;
  border-bottom: 2px solid ${({ theme }) => theme.color.border};
  background: ${({ $isToday, theme }) =>
    $isToday
      ? theme.color.brand50 || "#eff6ff"
      : theme.color.grey50 || "#f9fafb"};
`;

const DayName = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
  margin-bottom: 0.25rem;
`;

const DayNumber = styled.div<{ $isToday?: boolean }>`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};

  ${({ $isToday, theme }) =>
    $isToday &&
    `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${theme.color.brand600 || "#2563eb"};
    color: white;
  `}
`;

const DayContent = styled.div`
  position: relative;
  height: calc(60px * 9);
`;

const HourSlot = styled.div<{ $isFirstRow?: boolean }>`
  height: 60px;
  border-top: ${({ $isFirstRow }) => ($isFirstRow ? "none" : "1px solid")};
  border-color: ${({ theme }) => theme.color.border};
  position: relative;
`;

const EventBlock = styled.button<{
  $color?: string;
  $top: number;
  $height: number;
  $left: number;
  $width: number;
}>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  width: ${({ $width }) => $width}%;
  top: ${({ $top }) => $top}px;
  height: ${({ $height }) => $height}px;
  background: ${({ $color }) => $color || "#3b82f6"};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  z-index: 1;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    z-index: 2;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const EventTime = styled.div`
  font-weight: 600;
  margin-bottom: 2px;
`;

const EventTitle = styled.div`
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CurrentTimeLine = styled.div<{ $position: number }>`
  position: absolute;
  left: 0;
  right: 0;
  top: ${({ $position }) => $position}px;
  height: 2px;
  background: ${({ theme }) => theme.color.red600 || "#dc2626"};
  z-index: 3;

  &::before {
    content: "";
    position: absolute;
    left: -4px;
    top: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.red600 || "#dc2626"};
  }
`;

// Helper functions
function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getWeekDays(currentDate: Date): Date[] {
  const weekStart = startOfWeek(currentDate);
  const days: Date[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }

  return days;
}

function getTimePosition(date: Date): number {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return hours * 60 + minutes;
}

function getCurrentTimePosition(): number {
  const now = new Date();
  return getTimePosition(now);
}

// Check if two events overlap
function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  const end1 =
    event1.endTime || new Date(event1.startTime.getTime() + 60 * 60 * 1000);
  const end2 =
    event2.endTime || new Date(event2.startTime.getTime() + 60 * 60 * 1000);

  return event1.startTime < end2 && end1 > event2.startTime;
}

// Calculate columns for overlapping events
function calculateEventColumns(events: CalendarEvent[]): PositionedEvent[] {
  if (events.length === 0) return [];

  // Sort events by start time, then by duration (longer first)
  const sortedEvents = [...events].sort((a, b) => {
    if (a.startTime.getTime() !== b.startTime.getTime()) {
      return a.startTime.getTime() - b.startTime.getTime();
    }
    const durationA =
      (a.endTime?.getTime() || a.startTime.getTime() + 3600000) -
      a.startTime.getTime();
    const durationB =
      (b.endTime?.getTime() || b.startTime.getTime() + 3600000) -
      b.startTime.getTime();
    return durationB - durationA;
  });

  const positioned: PositionedEvent[] = [];
  const columns: CalendarEvent[][] = [];

  for (const event of sortedEvents) {
    // Find the first column where this event doesn't overlap
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const hasOverlap = column.some((existingEvent) =>
        eventsOverlap(existingEvent, event)
      );

      if (!hasOverlap) {
        column.push(event);
        positioned.push({ ...event, column: i, totalColumns: 0 });
        placed = true;
        break;
      }
    }

    // If no suitable column found, create a new one
    if (!placed) {
      columns.push([event]);
      positioned.push({
        ...event,
        column: columns.length - 1,
        totalColumns: 0,
      });
    }
  }

  // Update totalColumns for all events
  const totalColumns = columns.length;
  positioned.forEach((event) => {
    event.totalColumns = totalColumns;
  });

  return positioned;
}

export default function WeekCalendar({
  events,
  onEventClick,
  initialDate = new Date(),
}: WeekCalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [currentTime, setCurrentTime] = useState(getCurrentTimePosition());
  const today = new Date();

  // Update current time every minute
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimePosition());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      // Use local date components to avoid timezone issues
      const localDate = new Date(event.startTime);
      const dateKey = `${localDate.getFullYear()}-${localDate.getMonth()}-${localDate.getDate()}`;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const getEventsForDay = (date: Date): PositionedEvent[] => {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const dayEvents = eventsByDay.get(dateKey) || [];
    return calculateEventColumns(dayEvents);
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event: CalendarEvent) => {
    onEventClick?.(event);
  };

  const weekRange = `${weekDays[0].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${weekDays[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  // Business hours: 9 AM to 5 PM
  const businessHours = Array.from({ length: 9 }, (_, i) => i + 9);
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <CalendarWrapper>
      <Header>
        <HeaderTitle>{weekRange}</HeaderTitle>
        <HeaderActions>
          <Button variation="secondary" size="small" onClick={handleToday}>
            Today
          </Button>
          <Button
            variation="secondary"
            size="small"
            onClick={handlePrevWeek}
            aria-label="Previous week"
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variation="secondary"
            size="small"
            onClick={handleNextWeek}
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </Button>
        </HeaderActions>
      </Header>

      <WeekGrid>
        <div
          style={{
            height: "60px",
            borderBottom: "2px solid",
            borderColor: "inherit",
          }}
        />

        {weekDays.map((day, index) => {
          const isToday = isSameDay(day, today);
          return (
            <DayHeader key={`header-${index}`} $isToday={isToday}>
              <DayName>{weekdayNames[index]}</DayName>
              <DayNumber $isToday={isToday}>{day.getDate()}</DayNumber>
            </DayHeader>
          );
        })}

        <TimeColumn>
          {businessHours.map((hour, index) => (
            <TimeSlot key={hour} $isFirstRow={index === 0}>
              {hour === 12
                ? "12 PM"
                : hour > 12
                ? `${hour - 12} PM`
                : `${hour} AM`}
            </TimeSlot>
          ))}
        </TimeColumn>

        {weekDays.map((day, dayIndex) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, today);

          return (
            <DayColumn key={`day-${dayIndex}`}>
              <DayContent>
                {businessHours.map((hour, index) => (
                  <HourSlot key={`hour-${hour}`} $isFirstRow={index === 0} />
                ))}

                {dayEvents.map((event) => {
                  const startPos = getTimePosition(event.startTime) - 9 * 60;
                  const endTime =
                    event.endTime ||
                    new Date(event.startTime.getTime() + 60 * 60 * 1000);
                  const endPos = getTimePosition(endTime) - 9 * 60;
                  const duration = endPos - startPos;
                  const height = Math.max(duration, 30);

                  // Calculate width and left position based on columns
                  const columnWidth = 100 / event.totalColumns;
                  const leftPosition = event.column * columnWidth;
                  const width = columnWidth - 1; // Small gap between columns

                  if (startPos >= 0 && startPos < 9 * 60) {
                    return (
                      <EventBlock
                        key={event.id}
                        $color={event.color}
                        $top={startPos}
                        $height={height}
                        $left={leftPosition}
                        $width={width}
                        onClick={() => handleEventClick(event)}
                        title={event.title}
                      >
                        <EventTime>
                          {event.startTime.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </EventTime>
                        <EventTitle>{event.title}</EventTitle>
                      </EventBlock>
                    );
                  }
                  return null;
                })}

                {isToday && currentTime >= 9 * 60 && currentTime <= 17 * 60 && (
                  <CurrentTimeLine $position={currentTime - 9 * 60} />
                )}
              </DayContent>
            </DayColumn>
          );
        })}
      </WeekGrid>
    </CalendarWrapper>
  );
}
