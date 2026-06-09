import type { Role } from "./token";

/**
 * The roles an Administrator may assign to a staff account (CONTEXT.md "Roles").
 * Deliberately excludes "user": Users are not staff and never authenticate with
 * a username + password. The schema's `staff.role` comment references this
 * vocabulary; app code validates assignments against it.
 */
export const STAFF_ROLES = ["stamper", "redeemer", "admin"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

/** Narrow an arbitrary string to a valid staff role. */
export function isStaffRole(value: unknown): value is StaffRole {
  return (
    typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value)
  );
}

export type { Role };
