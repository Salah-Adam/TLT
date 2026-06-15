import { renderTransactionNotification, pickLanguage } from "./services/messages";


const sent = renderTransactionNotification({
  userId: "u", transactionId: "tx-123",
  direction: "out", amount: 0.5, currency: "USD", balanceAfter: 2.79,
});
console.log("SENT en:", sent.titleEn, "—", sent.bodyEn);
console.log("SENT so:", sent.titleSo, "—", sent.bodySo);
console.log("SENT data:", sent.data);

const recv = renderTransactionNotification({
  userId: "u", transactionId: "tx-456",
  direction: "in", amount: 12, currency: "USD", balanceAfter: 30,
});
console.log("RECV en:", recv.titleEn, "—", recv.bodyEn);
console.log("RECV so:", recv.titleSo, "—", recv.bodySo);

console.log("Picked (so):", pickLanguage(sent, "so"));



// import { renderTransactionNotification, pickLanguage } from "./services/messages";

// const sent = renderTransactionNotification({
//   userId: "u", direction: "out", amount: 0.5, currency: "USD", balanceAfter: 2.79,
// });
// console.log("SENT en:", sent.titleEn, "—", sent.bodyEn);
// console.log("SENT so:", sent.titleSo, "—", sent.bodySo);

// const recv = renderTransactionNotification({
//   userId: "u", direction: "in", amount: 12, currency: "USD", balanceAfter: 30,
// });
// console.log("RECV en:", recv.titleEn, "—", recv.bodyEn);
// console.log("RECV so:", recv.titleSo, "—", recv.bodySo);

// const noBal = renderTransactionNotification({
//   userId: "u", direction: "out", amount: 5, currency: "USD", balanceAfter: null,
// });
// console.log("NO-BAL en:", noBal.bodyEn);

// console.log("Picked (so):", pickLanguage(sent, "so"));