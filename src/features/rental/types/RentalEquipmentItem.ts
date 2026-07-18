import type { RentalBillingMethod } from "../types";

export type RentalEquipmentItemStatus =
  | "Assigned"
  | "Active"
  | "Returned"
  | "Closed"
  | "Cancelled";

/**
 * Represents one equipment participating in a Rental Agreement.
 *
 * A RentalRecord is the parent Rental Agreement; each piece of equipment
 * under it (its own operator, billing method, and DEURs) is a
 * RentalEquipmentItemRecord. Today every rental has exactly one of these
 * (see synthesizeRentalEquipmentItems for the backward-compatibility
 * bridge covering rentals created before this entity existed).
 */
export interface RentalEquipmentItemRecord {
  id: string;

  rentalId: string;

  equipmentId: string;

  operatorId?: string;

  assignmentId?: string;

  billingMethod?: RentalBillingMethod;

  status: RentalEquipmentItemStatus;

  dateOut: string;

  actualReturnDate?: string;

  createdAt: string;

  updatedAt: string;
}
