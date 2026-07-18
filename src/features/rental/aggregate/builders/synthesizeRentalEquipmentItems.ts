import type { RentalRecord } from "../../types";

import type {
  RentalEquipmentItemRecord,
  RentalEquipmentItemStatus,
} from "../../types/RentalEquipmentItem";

/**
 * Backward-compatibility bridge for rentals created before
 * RentalEquipmentItemRecord existed.
 *
 * If persisted items already exist for this rental, they are returned
 * unchanged. Otherwise, exactly one item is synthesized from the
 * rental's own single-equipment fields, so existing rentals keep
 * behaving exactly as they do today without requiring a data migration.
 *
 * Pure function - no I/O, no repository access. The caller is
 * responsible for reading existing items from
 * rentalEquipmentItemRepository and passing them in.
 */
export function synthesizeRentalEquipmentItems(
  rental: RentalRecord,
  existingItems: RentalEquipmentItemRecord[]
): RentalEquipmentItemRecord[] {
  if (existingItems.length > 0) {
    return existingItems;
  }

  const timestamp = rental.createdAt ?? rental.dateOut;

  return [
    {
      id: `synthesized-${rental.id}`,

      rentalId: rental.id,

      equipmentId: rental.equipmentId,

      operatorId: rental.operatorId,

      assignmentId: rental.assignmentId,

      billingMethod: rental.billingMethod,

      status: mapRentalStatusToItemStatus(rental.status),

      dateOut: rental.dateOut,

      actualReturnDate: rental.actualReturn,

      createdAt: timestamp,

      updatedAt: timestamp,
    },
  ];
}

function mapRentalStatusToItemStatus(
  status: RentalRecord["status"]
): RentalEquipmentItemStatus {
  switch (status) {
    case "Returned":
      return "Returned";
    case "Closed":
      return "Closed";
    case "Cancelled":
      return "Cancelled";
    case "Draft":
    case "Assigned":
    case "Reserved":
    case "Released":
      return "Assigned";
    case "Active":
    default:
      return "Active";
  }
}
