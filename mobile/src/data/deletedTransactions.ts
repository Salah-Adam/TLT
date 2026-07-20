// Recently-deleted transactions (30-day recovery window). Online-only — no offline cache,
// since it's a rare network view and restoring requires the server anyway.
import { api } from "../api/client";

export type DeletedTx = {
  id: string;
  amount: number;
  currency: string;
  direction: "in" | "out";
  type: string | null;
  counterparty_name: string | null;
  counterparty_number: string | null;
  counterparty_available: boolean;
  transacted_at: string;
  deleted_at: string;
  permanent_delete_at: string;
};

export async function listDeleted(): Promise<DeletedTx[]> {
  return (await api.get<DeletedTx[]>("/api/v1/transactions/deleted")) ?? [];
}

export async function recoverDeleted(id: string): Promise<void> {
  await api.post(`/api/v1/transactions/${id}/recover`);
}