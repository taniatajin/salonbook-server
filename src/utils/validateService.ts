import { SERVICE_CATEGORIES } from "../constants";

export type ServiceInput = {
  serviceName: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  image?: string;
  status?: "active" | "inactive";
};

type Result = { data: ServiceInput } | { error: string };

export function parseServiceBody(body: unknown, imageRequired: boolean): Result {
  const b = (body ?? {}) as Record<string, unknown>;

  const serviceName = typeof b.serviceName === "string" ? b.serviceName.trim() : "";
  const category = typeof b.category === "string" ? b.category : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  const price = Number(b.price);
  const duration = Number(b.duration);
  const image = typeof b.image === "string" ? b.image.trim() : "";
  const status = b.status === "active" || b.status === "inactive" ? b.status : undefined;

  if (serviceName.length < 2) return { error: "Service name must be at least 2 characters" };
  if (!(SERVICE_CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Please select a valid category" };
  }
  if (description.length < 10) return { error: "Description must be at least 10 characters" };
  if (!Number.isFinite(price) || price <= 0) return { error: "Price must be a positive number" };
  if (!Number.isFinite(duration) || duration <= 0) {
    return { error: "Duration must be a positive number" };
  }
  if (imageRequired && !image) return { error: "Service image is required" };
  if (image && !/^https?:\/\//i.test(image)) return { error: "Service image must be a valid URL" };

  return {
    data: {
      serviceName,
      category,
      description,
      price,
      duration,
      ...(image ? { image } : {}),
      ...(status ? { status } : {}),
    },
  };
}