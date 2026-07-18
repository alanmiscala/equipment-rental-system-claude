import type {
    RentalContractRecord,
  } from "../types/RentalContract";
  
  const STORAGE_KEY =
    "equipment-rental-contracts";
  
  function read(): RentalContractRecord[] {
    const raw =
      localStorage.getItem(STORAGE_KEY);
  
    if (!raw) return [];
  
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  
  function save(
    data: RentalContractRecord[]
  ) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );
  }
  
  export const rentalContractRepository =
  {
    getAll() {
      return read();
    },
  
    getById(id: string) {
      return read().find(
        (x) => x.id === id
      );
    },
  
    getByRentalId(rentalId: string) {
      return read().find(
        (x) => x.rentalId === rentalId
      );
    },
  
    create(
      contract: RentalContractRecord
    ) {
      const data = read();
  
      // Guarantee only one contract exists per rental. Editing an existing
      // rental's terms must go through update(), not create().
      if (
        data.some(
          (x) => x.rentalId === contract.rentalId
        )
      ) {
        throw new Error(
          "A billing contract already exists for this rental."
        );
      }
  
      data.push(contract);
  
      save(data);
    },
  
    update(
      contract: RentalContractRecord
    ) {
      const data = read();
  
      const index =
        data.findIndex(
          (x) =>
            x.id === contract.id
        );
  
      if (index >= 0) {
        data[index] = contract;
        save(data);
      }
    },
  
    delete(id: string) {
      save(
        read().filter(
          (x) => x.id !== id
        )
      );
    },
  };