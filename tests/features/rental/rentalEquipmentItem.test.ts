import { beforeEach, describe, expect, it } from "vitest";

import { rentalEquipmentItemRepository } from "@/features/rental/repository/rentalEquipmentItemRepository";
import { synthesizeRentalEquipmentItems } from "@/features/rental/aggregate/builders/synthesizeRentalEquipmentItems";
import { buildRentalAggregate } from "@/features/rental/aggregate/builders/buildRentalAggregate";
import type { RentalRecord } from "@/features/rental/types";
import type { RentalEquipmentItemRecord } from "@/features/rental/types/RentalEquipmentItem";
import type { RentalContractRecord } from "@/features/rental/types/RentalContract";
import type { EquipmentRecord } from "@/features/equipment/types";
import type { Operator } from "@/features/operators/types";

function baseRental(overrides: Partial<RentalRecord> = {}): RentalRecord {
  return {
    id: "rental-1",
    equipmentId: "equipment-1",
    operatorId: "operator-1",
    assignmentId: "assignment-1",
    customer: "Acme Co.",
    project: "Project X",
    rentedBy: "",
    dateOut: "2026-07-01",
    statusId: "",
    status: "Active",
    rentalType: "Operated Rental",
    billingMethod: "Per Hour",
    ...overrides,
  };
}

function baseItem(overrides: Partial<RentalEquipmentItemRecord> = {}): RentalEquipmentItemRecord {
  return {
    id: "item-1",
    rentalId: "rental-1",
    equipmentId: "equipment-1",
    operatorId: "operator-1",
    assignmentId: "assignment-1",
    billingMethod: "Per Hour",
    status: "Active",
    dateOut: "2026-07-01",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("rentalEquipmentItemRepository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("create + getById round-trip", () => {
    const item = baseItem();
    rentalEquipmentItemRepository.create(item);
    expect(rentalEquipmentItemRepository.getById("item-1")?.id).toBe("item-1");
  });

  it("getByRentalId returns all items for that rental", () => {
    rentalEquipmentItemRepository.create(baseItem({ id: "item-1", equipmentId: "equipment-1" }));
    rentalEquipmentItemRepository.create(baseItem({ id: "item-2", equipmentId: "equipment-2" }));
    rentalEquipmentItemRepository.create(baseItem({ id: "item-3", rentalId: "rental-2", equipmentId: "equipment-3" }));

    const items = rentalEquipmentItemRepository.getByRentalId("rental-1");
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.id).sort()).toEqual(["item-1", "item-2"]);
  });

  it("update persists changes", () => {
    rentalEquipmentItemRepository.create(baseItem());
    rentalEquipmentItemRepository.update(baseItem({ status: "Returned" }));
    expect(rentalEquipmentItemRepository.getById("item-1")?.status).toBe("Returned");
  });

  it("delete removes the record", () => {
    rentalEquipmentItemRepository.create(baseItem());
    rentalEquipmentItemRepository.delete("item-1");
    expect(rentalEquipmentItemRepository.getById("item-1")).toBeUndefined();
  });

  it("getAll returns every persisted item", () => {
    rentalEquipmentItemRepository.create(baseItem({ id: "item-1" }));
    rentalEquipmentItemRepository.create(baseItem({ id: "item-2", rentalId: "rental-2" }));
    expect(rentalEquipmentItemRepository.getAll()).toHaveLength(2);
  });
});

describe("synthesizeRentalEquipmentItems (backfill helper)", () => {
  it("synthesizes exactly one item from the rental's own fields when none exist", () => {
    const rental = baseRental();
    const items = synthesizeRentalEquipmentItems(rental, []);

    expect(items).toHaveLength(1);
    expect(items[0].rentalId).toBe(rental.id);
    expect(items[0].equipmentId).toBe(rental.equipmentId);
    expect(items[0].operatorId).toBe(rental.operatorId);
    expect(items[0].assignmentId).toBe(rental.assignmentId);
    expect(items[0].status).toBe("Active");
  });

  it("returns existing persisted items unchanged when they exist", () => {
    const rental = baseRental();
    const existing = [baseItem({ id: "real-item" })];
    const items = synthesizeRentalEquipmentItems(rental, existing);
    expect(items).toBe(existing);
    expect(items).toHaveLength(1);
  });

  it("maps every rental lifecycle status to a sensible item status", () => {
    expect(synthesizeRentalEquipmentItems(baseRental({ status: "Returned" }), [])[0].status).toBe("Returned");
    expect(synthesizeRentalEquipmentItems(baseRental({ status: "Closed" }), [])[0].status).toBe("Closed");
    expect(synthesizeRentalEquipmentItems(baseRental({ status: "Cancelled" }), [])[0].status).toBe("Cancelled");
    expect(synthesizeRentalEquipmentItems(baseRental({ status: "Draft" }), [])[0].status).toBe("Assigned");
  });
});

describe("buildRentalAggregate + equipmentItems", () => {
  it("equipmentItems.length === 1 for a rental with no persisted items (backfilled)", () => {
    const rental = baseRental();
    const items = synthesizeRentalEquipmentItems(rental, []);
    const aggregate = buildRentalAggregate({
      rental,
      equipmentItems: items.map((item) => ({ item, deurs: [] })),
      deurs: [],
    });
    expect(aggregate.equipmentItems).toHaveLength(1);
  });

  it("aggregate.equipment matches aggregate.equipmentItems[0].equipment", () => {
    const rental = baseRental();
    const equipment = { id: "equipment-1" } as EquipmentRecord;
    const aggregate = buildRentalAggregate({
      rental,
      equipmentItems: [{ item: baseItem(), equipment, deurs: [] }],
      deurs: [],
    });
    expect(aggregate.equipment).toBe(aggregate.equipmentItems[0].equipment);
    expect(aggregate.equipment).toBe(equipment);
  });

  it("aggregate.operator matches aggregate.equipmentItems[0].operator", () => {
    const rental = baseRental();
    const operator = { id: "operator-1" } as Operator;
    const aggregate = buildRentalAggregate({
      rental,
      equipmentItems: [{ item: baseItem(), operator, deurs: [] }],
      deurs: [],
    });
    expect(aggregate.operator).toBe(aggregate.equipmentItems[0].operator);
    expect(aggregate.operator).toBe(operator);
  });

  it("aggregate.contract matches aggregate.equipmentItems[0].contract", () => {
    const rental = baseRental();
    const contract = { id: "contract-1", rentalId: "rental-1" } as RentalContractRecord;
    const aggregate = buildRentalAggregate({
      rental,
      equipmentItems: [{ item: baseItem(), contract, deurs: [] }],
      deurs: [],
    });
    expect(aggregate.contract).toBe(aggregate.equipmentItems[0].contract);
    expect(aggregate.contract).toBe(contract);
  });

  it("falls back to explicit singular params when equipmentItems is not provided (legacy callers)", () => {
    const rental = baseRental();
    const contract = { id: "contract-1", rentalId: "rental-1" } as RentalContractRecord;
    const aggregate = buildRentalAggregate({ rental, contract, deurs: [] });
    expect(aggregate.contract).toBe(contract);
    expect(aggregate.equipmentItems).toEqual([]);
  });
});
