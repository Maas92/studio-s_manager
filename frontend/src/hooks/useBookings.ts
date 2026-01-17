import { useState, useEffect, useCallback } from "react";
import { db } from "../db/db";
import { syncService } from "../services/syncService";
import { useOnlineStatus } from "./useOnlineStatus";
import { type Booking, type APIResponse } from "../types";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

interface UseBookingsReturn {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  createBooking: (
    bookingData: Partial<Booking>
  ) => Promise<APIResponse<Booking>>;
  updateBooking: (
    id: string | number,
    updates: Partial<Booking>
  ) => Promise<APIResponse<Booking>>;
  deleteBooking: (id: string | number) => Promise<APIResponse>;
  getBooking: (id: string | number) => Promise<Booking | null>;
  getBookingsByDateRange: (
    startDate: Date,
    endDate: Date
  ) => Promise<Booking[]>;
  reload: () => Promise<void>;
}

export const useBookings = (): UseBookingsReturn => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useOnlineStatus();

  /**
   * Load bookings from IndexedDB
   */
  const loadBookings = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await db.bookings.toArray();
      setBookings(
        data.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  /**
   * Create booking
   */
  const createBooking = useCallback(
    async (bookingData: Partial<Booking>): Promise<APIResponse<Booking>> => {
      try {
        const booking: Booking = {
          ...bookingData,
          id: `temp_${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: "pending",
        } as Booking;

        // Always save to IndexedDB first
        await db.bookings.add(booking);

        // If online, try to sync immediately
        if (isConnected) {
          const result = await syncService.syncEntity("bookings", booking);
          if (result.success && result.data) {
            booking.id = result.data.id;
            booking.sync_status = "synced";
            await db.bookings.update(`temp_${Date.now()}`, booking);
          }
        }

        await loadBookings();
        return { success: true, data: booking };
      } catch (err) {
        const error = err as Error;
        console.error("Error creating booking:", error);
        return { success: false, error: error.message };
      }
    },
    [isConnected, loadBookings]
  );

  /**
   * Update booking
   */
  const updateBooking = useCallback(
    async (
      id: string | number,
      updates: Partial<Booking>
    ): Promise<APIResponse<Booking>> => {
      try {
        const existingBooking = await db.bookings.get(id as number);
        if (!existingBooking) {
          throw new Error("Booking not found");
        }

        const updatedBooking: Booking = {
          ...existingBooking,
          ...updates,
          updated_at: new Date().toISOString(),
          sync_status: "pending",
        };

        await db.bookings.update(id as number, updatedBooking);

        // If online, try to sync immediately
        if (isConnected) {
          await syncService.syncEntity("bookings", updatedBooking);
        }

        await loadBookings();
        return { success: true, data: updatedBooking };
      } catch (err) {
        const error = err as Error;
        console.error("Error updating booking:", error);
        return { success: false, error: error.message };
      }
    },
    [isConnected, loadBookings]
  );

  /**
   * Delete booking
   */
  const deleteBooking = useCallback(
    async (id: string | number): Promise<APIResponse> => {
      try {
        const booking = await db.bookings.get(id as number);
        if (!booking) {
          throw new Error("Booking not found");
        }

        // Mark as deleted instead of removing
        await db.bookings.update(id as number, {
          deleted_at: new Date().toISOString(),
          sync_status: "pending",
        });

        // If online, sync deletion
        if (isConnected) {
          await fetch(`${API_BASE_URL}/bookings/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          });
          await db.bookings.delete(id as number);
        }

        await loadBookings();
        return { success: true };
      } catch (err) {
        const error = err as Error;
        console.error("Error deleting booking:", error);
        return { success: false, error: error.message };
      }
    },
    [isConnected, loadBookings]
  );

  /**
   * Fetch booking by ID
   */
  const getBooking = useCallback(
    async (id: string | number): Promise<Booking | null> => {
      try {
        const booking = await db.bookings.get(id as number);
        return booking || null;
      } catch (err) {
        console.error("Error fetching booking:", err);
        return null;
      }
    },
    []
  );

  /**
   * Get bookings by date range
   */
  const getBookingsByDateRange = useCallback(
    async (startDate: Date, endDate: Date): Promise<Booking[]> => {
      try {
        const allBookings = await db.bookings.toArray();
        return allBookings.filter((booking) => {
          const bookingDate = new Date(booking.booking_date);
          return bookingDate >= startDate && bookingDate <= endDate;
        });
      } catch (err) {
        console.error("Error fetching bookings by date:", err);
        return [];
      }
    },
    []
  );

  return {
    bookings,
    loading,
    error,
    createBooking,
    updateBooking,
    deleteBooking,
    getBooking,
    getBookingsByDateRange,
    reload: loadBookings,
  };
};
