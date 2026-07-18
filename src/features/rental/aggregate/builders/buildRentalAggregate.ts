import type { RentalRecord } from "../../types";

import type { EquipmentRecord } from "@/features/equipment/types";

import type { AssignmentRecord } from "@/features/assignment/types";

import type { ProjectRecord } from "@/features/project/types";

import type { Operator } from "@/features/operators/types";

import type { DeurRecord } from "../../deur/types";

import type { RentalContractRecord } from "../../types/RentalContract";

import type {
  RentalAggregate,
  RentalEquipmentItemAggregate,
} from "../types";

interface BuildRentalAggregateParams {
  rental: RentalRecord;

  contract?: RentalContractRecord;

  equipment?: EquipmentRecord;

  assignment?: AssignmentRecord;

  project?: ProjectRecord;

  operator?: Operator;

  /**
   * All equipment participating in this rental. When provided, the
   * singular contract/equipment/assignment/operator fields below are
   * derived from equipmentItems[0] instead of the explicit params -
   * this is the path RentalWorkspaceProvider uses in production. The
   * explicit params remain supported directly for existing callers
   * that don't yet pass equipmentItems.
   */
  equipmentItems?: RentalEquipmentItemAggregate[];

  /**
   * Today's active DEUR
   */
  activeDeur?: DeurRecord;

  /**
   * Complete DEUR history
   * for this rental.
   */
  deurs?: DeurRecord[];

  billing?: Partial<RentalAggregate["billing"]>;
}

export function buildRentalAggregate({
  rental,
  contract,
  equipment,
  assignment,
  project,
  operator,
  equipmentItems = [],
  activeDeur,
  deurs = [],
  billing,
}: BuildRentalAggregateParams): RentalAggregate {
  const primaryItem = equipmentItems[0];

  return {
    rental,

    contract: primaryItem ? primaryItem.contract : contract,

    equipment: primaryItem ? primaryItem.equipment : equipment,

    assignment: primaryItem ? primaryItem.assignment : assignment,

    project,

    operator: primaryItem ? primaryItem.operator : operator,

    equipmentItems,

    activeDeur,

    deurs,

    billing: {
      hasStatement: false,

      invoicePreparationComplete: false,
      totalOperatingCharge: 0,

      totalIdleCharge: 0,

      totalMobilizationCharge: 0,

      totalAdjustment: 0,

      totalDemobilizationCharge: 0,

      subtotal: 0,

      invoiced: 0,

      collected: 0,

      outstanding: 0,

      ...billing,
    },
  };
}
