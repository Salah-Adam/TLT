// Renders a transaction as a localized sentence with the amount (green/red) and balance emphasized.
// Templates use single-brace tokens ({amount} {who} {balance}) so i18next's {{ }} interpolation leaves them alone.
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";

type TxLike = {
  direction: "in" | "out";
  amount: number;
  counterparty_name: string | null;
  counterparty_number: string | null;
  balance_after: number | null;
};

const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const localNum = (n?: string | null) => (n ?? "").replace(/^252/, "");

export function TxSentence({ tx, style }: { tx: TxLike; style?: any }) {
  const { t } = useTranslation();
  const isIn = tx.direction === "in";
  const hasBal = tx.balance_after != null;

  const who = tx.counterparty_name
    ? (tx.counterparty_number ? `${tx.counterparty_name} (${localNum(tx.counterparty_number)})` : tx.counterparty_name)
    : (tx.counterparty_number ? localNum(tx.counterparty_number) : t("tx.unknownParty"));

  const key = isIn ? (hasBal ? "tx.msgIn" : "tx.msgInNoBal") : (hasBal ? "tx.msgOut" : "tx.msgOutNoBal");
  const template = t(key);

  const parts: Record<string, { text: string; color?: string; bold?: boolean }> = {
    amount: { text: money(tx.amount), color: isIn ? colors.moneyIn : colors.moneyOut, bold: true },
    who: { text: who },
    balance: { text: money(tx.balance_after ?? 0), bold: true },
  };

  const nodes = template.split(/(\{\w+\})/g).map((seg, i) => {
    const m = seg.match(/^\{(\w+)\}$/);
    if (m && parts[m[1]]) {
      const pp = parts[m[1]];
      return <Text key={i} style={{ color: pp.color ?? colors.text, fontWeight: pp.bold ? "700" : "400" }}>{pp.text}</Text>;
    }
    return <Text key={i}>{seg}</Text>;
  });

  return <Text style={style}>{nodes}</Text>;
}