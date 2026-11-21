import { TIME_SLOTS } from "../constants";

export type AppointmentInput = {
  serviceId: string;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string;
  message: string;
};

type Result = { data: AppointmentInput } | { error: string };

export function parseAppointmentBody(body: unknown): Result {
  const b = (body ?? {}) as Record<string, unknown>;

  const serviceId = typeof b.serviceId === "string" ? b.serviceId : "";
  const appointmentDate = typeof b.appointmentDate === "string" ? b.appointmentDate : "";
  const timeSlot = typeof b.timeSlot === "string" ? b.timeSlot : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";

  const parsed = new Date(`${appointmentDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== appointmentDate
  ) {
    return { error: "Please select a valid appointment date" };
  }

  // timezone-er jonno ek din tolerance
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (appointmentDate < yesterday.toISOString().slice(0, 10)) {
    return { error: "Appointment date cannot be in the past" };
  }

  if (!(TIME_SLOTS as readonly string[]).includes(timeSlot)) {
    return { error: "Please select a valid time slot" };
  }
  if (message.length > 300) {
    return { error: "Message must be 300 characters or fewer" };
  }

  return { data: { serviceId, appointmentDate, timeSlot, message } };
}