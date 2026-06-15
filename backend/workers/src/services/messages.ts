import type { TransactionNotification } from "./notifications";

export interface RenderedNotification {
  type: string;
  titleEn: string;
  titleSo: string;
  bodyEn: string;
  bodySo: string;
  data: Record<string, unknown>;
}

function money(amount: number, currency: string): string {
  const n = amount.toFixed(2);
  return currency === "USD" ? `$${n}` : `${n} ${currency}`;
}

/**
 * Compose a transaction notification in both languages from the raw job.
 * The app picks which language to display via the user's setting.
 */
export function renderTransactionNotification(n: TransactionNotification): RenderedNotification {
  const amt = money(n.amount, n.currency);
  const bal = n.balanceAfter != null ? money(n.balanceAfter, n.currency) : null;
  const isOut = n.direction === "out";

  const titleEn = isOut ? "Money sent" : "Money received";
  const titleSo = isOut ? "Lacag la diray" : "Lacag la helay";

  const bodyEn = isOut
    ? `You sent ${amt}.${bal ? ` Balance: ${bal}.` : ""}`
    : `You received ${amt}.${bal ? ` Balance: ${bal}.` : ""}`;

  const bodySo = isOut
    ? `Waxaad dirtay ${amt}.${bal ? ` Hadhaaga: ${bal}.` : ""}`
    : `Waxaad heshay ${amt}.${bal ? ` Hadhaaga: ${bal}.` : ""}`;

  return {
    type: isOut ? "transaction_sent" : "transaction_received",
    titleEn, titleSo, bodyEn, bodySo,
    data: {
      transactionId: n.transactionId,  
      direction: n.direction,
      amount: n.amount,
      currency: n.currency,
      balanceAfter: n.balanceAfter,
    },
  };
}

/** Choose the language to actually display/send, from the user's setting. */
export function pickLanguage(r: RenderedNotification, language: string): { title: string; body: string } {
  const so = language === "so";
  return {
    title: so ? r.titleSo : r.titleEn,
    body: so ? r.bodySo : r.bodyEn,
  };
}