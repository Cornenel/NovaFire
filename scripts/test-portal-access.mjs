import assert from "node:assert/strict";
import { matchExistingCustomer } from "../src/lib/fsm/historical-records.ts";

const customers = [
  { id: "c1", name: "Acme Foods", email: "shared@example.com", phone: "0111111111" },
];

assert.equal(
  matchExistingCustomer(customers, {
    name: "Acme Foods",
    email: "shared@example.com",
    phone: "0111111111",
  })?.id,
  "c1",
  "portal customer linkage should reuse the same master customer record"
);

assert.equal(
  matchExistingCustomer(customers, {
    name: "Different Name",
    email: "other@example.com",
    phone: "0222222222",
  }),
  null,
  "unrelated signups must not match an existing customer automatically"
);

console.log("portal-access tests passed");
