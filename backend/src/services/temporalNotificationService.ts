import axios from "axios";

const TEMPORAL_API_URL =
  process.env.TEMPORAL_API_URL || "http://localhost:8000";

class TemporalNotificationClient {
  /**
   * Start a booking workflow (sends confirmation + schedules reminders)
   */
  async startBookingWorkflow(booking: any) {
    try {
      const response = await axios.post(
        `${TEMPORAL_API_URL}/workflows/booking/start`,
        {
          booking_id: booking.id,
          client_id: booking.client_id,
          appointment_datetime: this.formatDateTime(
            booking.booking_date,
            booking.start_time,
          ),
          client_phone: booking.client.whatsapp || booking.client.phone,
          client_name: `${booking.client.first_name} ${booking.client.last_name}`,
          treatment_name: booking.treatment.name,
          staff_name: `${booking.staff.first_name} ${booking.staff.last_name}`,
        },
        {
          timeout: 10000, // 10 second timeout
        },
      );

      console.log(`✅ Booking workflow started: ${response.data.workflow_id}`);
      return response.data;
    } catch (error) {
      console.error({ error }, "❌ Failed to start booking workflow:");
      // Don't fail the booking if notification fails
      return null;
    }
  }

  /**
   * Cancel a booking workflow (stops reminders + sends cancellation)
   */
  async cancelBookingWorkflow(bookingId: number, cancellationReason = null) {
    try {
      const response = await axios.post(
        `${TEMPORAL_API_URL}/workflows/booking/cancel`,
        {
          booking_id: bookingId,
          cancellation_reason: cancellationReason,
        },
        {
          timeout: 10000,
        },
      );

      console.log(`✅ Booking workflow cancelled for booking ${bookingId}`);
      return response.data;
    } catch (error) {
      console.error({ error }, "❌ Failed to cancel booking workflow:");
      return null;
    }
  }

  /**
   * Reschedule a booking (cancels old + starts new workflow)
   */
  async rescheduleBookingWorkflow(booking: any) {
    try {
      const response = await axios.post(
        `${TEMPORAL_API_URL}/workflows/booking/reschedule`,
        {
          booking_id: booking.id,
          new_appointment_datetime: this.formatDateTime(
            booking.booking_date,
            booking.start_time,
          ),
          client_phone: booking.client.whatsapp || booking.client.phone,
          client_name: `${booking.client.first_name} ${booking.client.last_name}`,
          treatment_name: booking.treatment.name,
          staff_name: `${booking.staff.first_name} ${booking.staff.last_name}`,
        },
        {
          timeout: 10000,
        },
      );

      console.log(`✅ Booking workflow rescheduled for booking ${booking.id}`);
      return response.data;
    } catch (error) {
      console.error({ error }, "❌ Failed to reschedule booking workflow:");
      return null;
    }
  }

  /**
   * Check if notification service is healthy
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${TEMPORAL_API_URL}/health`, {
        timeout: 5000,
      });
      return response.data.temporal_connected === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper to format date and time to ISO string
   */
  formatDateTime(date: any, time: any) {
    // Combine date and time objects into ISO string
    const dateStr =
      date instanceof Date ? date.toISOString().split("T")[0] : date;
    const timeStr =
      time instanceof Date
        ? time.toISOString().split("T")[1].split(".")[0]
        : time;
    return `${dateStr}T${timeStr}`;
  }
}

export const notificationClient = new TemporalNotificationClient();
