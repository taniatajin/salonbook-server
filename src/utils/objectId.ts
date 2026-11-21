import { ObjectId } from "mongodb";

// invalid id hole null dey, tai server crash kore na
export function toObjectId(id: unknown): ObjectId | null {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}