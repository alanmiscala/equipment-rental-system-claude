import type { RentalRecord } from "../types";

import type { RentalContractRecord } from "../types/RentalContract";

import type { EquipmentRecord } from "@/features/equipment/types";

import type { Operator } from "@/features/operators/types";

import type { ProjectRecord } from "@/features/project/types";

import type { AssignmentRecord } from "@/features/assignment/types";

import type { DeurRecord } from "../deur/types";

import type { RentalEquipmentItemRecord } from "../types/RentalEquipmentItem";

export interface BillingSummary {

  hasStatement?: boolean;

  invoiceStatus?: string;

  invoicePreparationComplete?: boolean;
  totalOperatingCharge: number;

  totalIdleCharge: number;

  totalMobilizationCharge: number;

  totalDemobilizationCharge: number;

  totalAdjustment: number;

  subtotal: number;

  invoiced: number;

  collected: number;

  outstanding: number;
}

/**
 * One equipment participating in the rental, with its related records
 * resolved. Today every rental resolves to exactly one of these (either
 * a persisted RentalEquipmentItemRecord, or one synthesized from the
 * rental's own single-equipment fields for backward compatibility).
 */
export interface RentalEquipmentItemAggregate {
  item: RentalEquipmentItemRecord;

  equipment?: EquipmentRecord;

  operator?: Operator;

  assignment?: AssignmentRecord;

  contract?: RentalContractRecord;

  deurs: DeurRecord[];
}

export interface RentalAggregate {
  rental: RentalRecord;

  /**
   * Commercial Contract
   * (Billing Rules)
   */
  contract?: RentalContractRecord;

  equipment?: EquipmentRecord;

  operator?: Operator;

  project?: ProjectRecord;

  assignment?: AssignmentRecord;

  activeDeur?: DeurRecord;

  /**
   * All equipment participating in this rental. Transitional: the
   * singular `contract` / `equipment` / `operator` / `assignment` fields
   * above are still populated (from equipmentItems[0]) for existing
   * consumers - do not remove them yet.
   */
  equipmentItems: RentalEquipmentItemAggregate[];

/**
 * All DEUR records belonging
 * to this rental.
 */
deurs: DeurRecord[];

billing: BillingSummary;
}
