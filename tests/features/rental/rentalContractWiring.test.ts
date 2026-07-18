import { beforeEach, describe, expect, it } from "vitest";

import { rentalContractRepository } from "@/features/rental/repository/rentalContractRepository";
import { createRentalContract } from "@/features/rental/utils/createRentalContract";
import { updateRentalContract } from "@/features/rental/utils/updateRentalContract";
import type { RentalContractRecord } from "@/features/rental/types/RentalContract";
import { buildRentalAggregate } from "@/features/rental/aggregate/builders/buildRentalAggregate";
import { RentalAggregateAssembler } from "@/features/rental/aggregate/assembler/RentalAggregateAssembler";
import type { RentalRecord } from "@/features/rental/types";

function baseContractInput(rentalId: string): Omit<
  RentalContractRecord,
  "id" | "createdAt" | "updatedAt"
> {
  return {
    rentalId,
    contractNo: "CN-0001",
    customerId: "customer-1",
    equipmentId: "equipment-1",
    projectId: "project-1",
    rentalType: "Operated Rental",
    billingMethod: "Per Hour",
    currency: "PHP",
    unitRate: 1500,
    operatorIncluded: false,
    startDate: "2026-07-01",
    expectedEndDate: "2026-08-01",
    status: "Active",
  };
}

function baseRental(id: string): RentalRecord {
  return {
    id,
    equipmentId: "equipment-1",
    customer: "Acme Co.",
    project: "Project X",
    rentedBy: "",
    dateOut: "2026-07-01",
    statusId: "",
    status: "Active",
  };
}

describe("createRentalContract / updateRentalContract", () => {
  it("stores the rentalId that was provided", () => {
    const contract = createRentalContract(baseContractInput("rental-1"));
    expect(contract.rentalId).toBe("rental-1");
  });

  it("never changes rentalId on update, even if requested", () => {
    const contract = createRentalContract(baseContractInput("rental-1"));
    const updated = updateRentalContract(contract, {
      unitRate: 2000,
      // @ts-expect-error - rentalId must not be reassignable via update
      rentalId: "rental-2",
    });
    expect(updated.rentalId).toBe("rental-1");
    expect(updated.unitRate).toBe(2000);
  });
});

describe("rentalContractRepository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getByRentalId returns the contract belonging to that rental", () => {
    const contractA = createRentalContract(baseContractInput("rental-a"));
    const contractB = createRentalContract(baseContractInput("rental-b"));
    rentalContractRepository.create(contractA);
    rentalContractRepository.create(contractB);

    expect(rentalContractRepository.getByRentalId("rental-a")?.id).toBe(contractA.id);
    expect(rentalContractRepository.getByRentalId("rental-b")?.id).toBe(contractB.id);
    expect(rentalContractRepository.getByRentalId("rental-missing")).toBeUndefined();
  });

  it("prevents a second contract from being created for the same rental", () => {
    const first = createRentalContract(baseContractInput("rental-a"));
    rentalContractRepository.create(first);

    const second = createRentalContract(baseContractInput("rental-a"));

    expect(() => rentalContractRepository.create(second)).toThrow();
    expect(rentalContractRepository.getAll().filter((x) => x.rentalId === "rental-a")).toHaveLength(1);
  });
});

describe("buildRentalAggregate / RentalAggregateAssembler contract wiring", () => {
  it("buildRentalAggregate attaches the contract when one is provided", () => {
    const rental = baseRental("rental-1");
    const contract = createRentalContract(baseContractInput("rental-1"));

    const aggregate = buildRentalAggregate({ rental, contract, deurs: [] });

    expect(aggregate.contract).toBe(contract);
  });

  it("buildRentalAggregate leaves contract undefined when none is provided", () => {
    const rental = baseRental("rental-1");

    const aggregate = buildRentalAggregate({ rental, deurs: [] });

    expect(aggregate.contract).toBeUndefined();
  });

  it("RentalAggregateAssembler forwards the contract through to the aggregate", () => {
    const rental = baseRental("rental-1");
    const contract = createRentalContract(baseContractInput("rental-1"));

    const aggregate = RentalAggregateAssembler.assemble({ rental, contract, deurs: [] });

    expect(aggregate.contract).toBe(contract);
  });
});
