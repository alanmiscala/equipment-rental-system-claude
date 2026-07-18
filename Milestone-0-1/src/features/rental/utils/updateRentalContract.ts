import type {
    RentalContractRecord,
  } from "../types/RentalContract";
  
  export function updateRentalContract(
    existing: RentalContractRecord,
    changes: Partial<RentalContractRecord>
  ): RentalContractRecord {
  
    return {
      ...existing,
  
      ...changes,
  
      // rentalId identifies which rental this snapshot belongs to and must
      // never be changed by an update.
      rentalId:
        existing.rentalId,
  
      updatedAt:
        new Date().toISOString(),
    };
  }