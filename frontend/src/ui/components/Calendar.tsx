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
  onClick?: () => void;
}

interface CalendarProps {
  events: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  initialDate?: Date;
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

const TodayButton = styled(Button)`
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
`;

const WeekdayHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
`;

const WeekdayCell = styled.div`
  padding: 0.75rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.mutedText};
  text-transform: uppercase;
`;

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(100px, auto);
  background: ${({ theme }) => theme.color.panel};

  @media (max-width: 768px) {
    grid-auto-rows: minmax(80px, auto);
  }
`;

const DayCell = styled.div<{
  $isToday?: boolean;
  $isCurrentMonth?: boolean;
  $isSelected?: boolean;
}>`
  min-height: 100px;
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ $isCurrentMonth, theme }) =>
    $isCurrentMonth ? theme.color.panel : theme.color.grey50 || "#f9fafb"};
  cursor: pointer;
  transition: background-color 0.15s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    background: ${({ theme }) => theme.color.brand50 || "#eff6ff"};
  }

  ${({ $isSelected, theme }) =>
    $isSelected &&
    `
    background: ${theme.color.brand100 || "#dbeafe"};
    border-color: ${theme.color.brand600 || "#2563eb"};
  `}

  @media (max-width: 768px) {
    min-height: 80px;
    padding: 0.25rem;
  }
`;

const DayNumber = styled.div<{ $isToday?: boolean }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 0.25rem;

  ${({ $isToday, theme }) =>
    $isToday &&
    `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${theme.color.brand600 || "#2563eb"};
    color: white;
    font-weight: 600;
  `}
`;

const EventsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
`;

const EventBadge = styled.button<{ $color?: string }>`
  display: block;
  width: 100%;
  padding: 2px 4px;
  font-size: 0.75rem;
  background: ${({ $color }) => $color || "#3b82f6"};
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.85;
  }

  @media (max-width: 768px) {
    font-size: 0.65rem;
    padding: 1px 3px;
  }
`;

const MoreEvents = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.color.mutedText};
  margin-top: 2px;
  font-weight: 500;
`;

// Helper functions
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function endOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() + (6 - day);
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getCalendarDays(currentDate: Date): Date[] {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  const day = new Date(calendarStart);

  while (day <= calendarEnd) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }

  return days;
}

export default function Calendar({
  events,
  onDateClick,
  onEventClick,
  initialDate = new Date(),
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const today = new Date();

  const calendarDays = useMemo(
    () => getCalendarDays(currentDate),
    [currentDate]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      // event.startTime is already a local Date object
      // Use getFullYear(), getMonth(), getDate() for local components
      const dateKey = `${event.startTime.getFullYear()}-${event.startTime.getMonth()}-${event.startTime.getDate()}`;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDate.get(dateKey) || [];
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventClick?.(event);
    event.onClick?.();
  };

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <CalendarWrapper>
      <Header>
        <HeaderTitle>{monthYear}</HeaderTitle>
        <HeaderActions>
          <TodayButton variation="secondary" size="small" onClick={handleToday}>
            Today
          </TodayButton>
          <Button
            variation="secondary"
            size="small"
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variation="secondary"
            size="small"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </Button>
        </HeaderActions>
      </Header>

      <WeekdayHeader>
        {weekdays.map((day) => (
          <WeekdayCell key={day}>{day}</WeekdayCell>
        ))}
      </WeekdayHeader>

      <DaysGrid>
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, today);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isSelected = selectedDate
            ? isSameDay(day, selectedDate)
            : false;
          const maxVisibleEvents = 3;
          const hasMoreEvents = dayEvents.length > maxVisibleEvents;

          return (
            <DayCell
              key={index}
              $isToday={isToday}
              $isCurrentMonth={isCurrentMonth}
              $isSelected={isSelected}
              onClick={() => handleDayClick(day)}
            >
              <DayNumber $isToday={isToday}>{day.getDate()}</DayNumber>
              <EventsContainer>
                {dayEvents.slice(0, maxVisibleEvents).map((event) => (
                  <EventBadge
                    key={event.id}
                    $color={event.color}
                    onClick={(e) => handleEventClick(event, e)}
                    title={event.title}
                  >
                    {event.startTime.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}{" "}
                    {event.title}
                  </EventBadge>
                ))}
                {hasMoreEvents && (
                  <MoreEvents>
                    +{dayEvents.length - maxVisibleEvents} more
                  </MoreEvents>
                )}
              </EventsContainer>
            </DayCell>
          );
        })}
      </DaysGrid>
    </CalendarWrapper>
  );
}
