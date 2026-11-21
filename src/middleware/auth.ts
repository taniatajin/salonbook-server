import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import type { Role } from "../types";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${process.env.AUTH_URL}/api/auth/jwks`));
  }
  return jwks;
}

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const { payload } = await jwtVerify(header.slice(7), getJwks(), {
      issuer: process.env.AUTH_URL,
    });

    const id = String(payload.id ?? payload.sub ?? "");
    if (!/^[a-f\d]{24}$/i.test(id)) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    const db = await getDb();
    const user = await db.collection("user").findOne({ _id: new ObjectId(id) });

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    if (user.isBlocked) {
      res.status(403).json({ message: "Your account has been blocked" });
      return;
    }

    req.user = {
      id,
      name: user.name,
      email: user.email,
      role: user.role === "admin" ? "admin" : "customer",
    };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "You do not have permission to perform this action" });
      return;
    }
    next();
  };
}