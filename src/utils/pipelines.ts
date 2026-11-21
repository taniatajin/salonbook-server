import type { Document } from "mongodb";

export const withService: Document[] = [
  { $lookup: { from: "services", localField: "serviceId", foreignField: "_id", as: "service" } },
  { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
];

export const withCustomer: Document[] = [
  {
    $lookup: {
      from: "user",
      localField: "customerId",
      foreignField: "_id",
      as: "customer",
      pipeline: [{ $project: { name: 1, email: 1, image: 1, phone: 1 } }],
    },
  },
  { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
];

// transactions -> appointment -> service
export const withAppointmentAndService: Document[] = [
  {
    $lookup: {
      from: "appointments",
      localField: "appointmentId",
      foreignField: "_id",
      as: "appointment",
    },
  },
  { $unwind: { path: "$appointment", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "services",
      localField: "appointment.serviceId",
      foreignField: "_id",
      as: "service",
    },
  },
  { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
];