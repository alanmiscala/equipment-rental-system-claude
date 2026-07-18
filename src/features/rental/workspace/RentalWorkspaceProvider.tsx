import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useRental } from "@/features/rental/context/RentalContext";
import { useAssignment } from "@/features/assignment/context/AssignmentContext";
import { useEquipment } from "@/features/equipment/context/EquipmentContext";
import { useOperator } from "@/features/operators/context/OperatorContext";
import { useProject } from "@/features/project/context/ProjectContext";

import {
  buildRentalAggregate,
  type RentalAggregate,
  type RentalEquipmentItemAggregate,
} from "@/features/rental/aggregate";

import { deurRepository } from "@/features/rental/deur/repository/deurRepository";
import { rentalEquipmentItemRepository } from "@/features/rental/repository/rentalEquipmentItemRepository";
import { synthesizeRentalEquipmentItems } from "@/features/rental/aggregate/builders/synthesizeRentalEquipmentItems";
import { billingStatementRepository } from "@/features/rental/billingstatement/repository";
import { isInvoicePreparationComplete } from "@/features/rental/billingstatement/services/BillingReadiness";
import { subscribeRentalWorkspaceChange } from "./workspaceRefresh";

interface RentalWorkspaceProviderProps {
  rentalId: string;

  children: ReactNode;
}

interface RentalWorkspaceContextValue {
  aggregate: RentalAggregate;
}

const RentalWorkspaceContext =
  createContext<
    RentalWorkspaceContextValue | undefined
  >(undefined);

export default function RentalWorkspaceProvider({
  rentalId,
  children,
}: RentalWorkspaceProviderProps) {
  const { rentals, contracts } = useRental();
  const { assignments } = useAssignment();
  const { equipment: equipmentRecords } = useEquipment();
  const { operators } = useOperator();
  const { projects } = useProject();
  const [workspaceVersion, setWorkspaceVersion] = useState(0);

  useEffect(
    () => subscribeRentalWorkspaceChange(rentalId, () => setWorkspaceVersion(value => value + 1)),
    [rentalId]
  );
  const aggregate = useMemo(() => {
    const rental =
      rentals.find((item) => item.id === rentalId);

    if (!rental) {
      return undefined;
    }

    const project =
      projects.find((item) => item.id === rental.projectId);

    // NEW
    const deurs =
      deurRepository.getByRentalId(
        rental.id
      );

    const existingEquipmentItems =
      rentalEquipmentItemRepository.getByRentalId(rental.id);

    const equipmentItems: RentalEquipmentItemAggregate[] =
      synthesizeRentalEquipmentItems(rental, existingEquipmentItems).map(
        (item) => {
          const itemAssignment =
            item.assignmentId
              ? assignments.find((a) => a.id === item.assignmentId)
              : undefined;

          const itemEquipment =
            equipmentRecords.find((e) => e.id === item.equipmentId);

          const itemOperator =
            operators.find(
              (o) => o.id === (item.operatorId ?? itemAssignment?.operatorId)
            );

          const itemContract =
            contracts.find(
              (c) => c.rentalId === rental.id && c.equipmentId === item.equipmentId
            );

          const itemDeurs =
            deurs.filter((d) => d.equipmentId === item.equipmentId);

          return {
            item,
            equipment: itemEquipment,
            operator: itemOperator,
            assignment: itemAssignment,
            contract: itemContract,
            deurs: itemDeurs,
          };
        }
      );

    const statements = billingStatementRepository.getAll().filter(
      statement => statement.rentalId === rental.id
    );
    const latestStatement = statements.at(-1);
    const invoicePreparationComplete = isInvoicePreparationComplete(
      latestStatement?.invoiceStatus
    );

      const activeDeur =
      deurs.find(
        (d) =>
          !d.endOfDay &&
          d.status !== "Billed"
      );

    return buildRentalAggregate({
      rental,
      equipmentItems,
      project,
      activeDeur,
      deurs,
      billing: {
        hasStatement: statements.length > 0,
        invoiceStatus: latestStatement?.invoiceStatus,
        invoicePreparationComplete,
        subtotal: statements.reduce((sum, statement) => sum + statement.subtotal, 0),
      },
    });
  }, [rentalId, rentals, contracts, assignments, equipmentRecords, operators, projects, workspaceVersion]);

  if (!aggregate) {
    return (
      <div className="rounded-xl border bg-white p-8">
        Rental not found.
      </div>
    );
  }

  return (
    <RentalWorkspaceContext.Provider
      value={{
        aggregate,
      }}
    >
      {children}
    </RentalWorkspaceContext.Provider>
  );
}

export function useRentalWorkspaceAggregate() {
  const context =
    useContext(
      RentalWorkspaceContext
    );

  if (!context) {
    throw new Error(
      "useRentalWorkspaceAggregate must be used inside RentalWorkspaceProvider."
    );
  }

  return context.aggregate;
}
