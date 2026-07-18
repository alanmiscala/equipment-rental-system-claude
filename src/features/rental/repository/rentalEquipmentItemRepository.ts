import type { RentalEquipmentItemRecord } from "../types/RentalEquipmentItem";

import { notifyRentalWorkspaceChange } from "@/features/rental/workspace/workspaceRefresh";

import { storage } from "@/core/storage";

const STORAGE_KEY = "equipment-rental-equipment-items";

class RentalEquipmentItemRepository {

  getAll(): RentalEquipmentItemRecord[] {

    try {
      const records = storage.get<unknown>(STORAGE_KEY);
      return Array.isArray(records) ? (records as RentalEquipmentItemRecord[]) : [];
    } catch {
      return [];
    }

  }

  getById(id: string) {
    return this.getAll().find(
      (x) => x.id === id
    );
  }

  getByRentalId(rentalId: string) {
    return this.getAll().filter(
      (x) => x.rentalId === rentalId
    );
  }

  create(record: RentalEquipmentItemRecord) {

    const all =
      this.getAll();

    all.push(record);

    this.saveAll(all);

    notifyRentalWorkspaceChange(record.rentalId);

    return record;

  }

  update(record: RentalEquipmentItemRecord) {

    if (!this.getById(record.id)) {
      return undefined;
    }

    const updated =
      this.getAll().map((x) =>
        x.id === record.id ? record : x
      );

    this.saveAll(updated);

    notifyRentalWorkspaceChange(record.rentalId);

    return record;

  }

  delete(id: string) {

    const existing =
      this.getById(id);

    if (!existing) {
      return undefined;
    }

    this.saveAll(
      this.getAll().filter((x) => x.id !== id)
    );

    notifyRentalWorkspaceChange(existing.rentalId);

    return existing;

  }

  private saveAll(records: RentalEquipmentItemRecord[]) {
    storage.set(STORAGE_KEY, records);
  }

}

export const rentalEquipmentItemRepository =
  new RentalEquipmentItemRepository();
