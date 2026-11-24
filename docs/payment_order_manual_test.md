# Payment order manual test checklist

Use after deploying the production PayU fix.

1. **Concurrent buyers** — Two users start course checkout and pay near the same time. Each gets one enrollment for themselves only; no cross-user enrollments in `ENROLLMENTS` / `ENROLLMENT_TRANSACTIONS`.
2. **Coupon / wallet refresh** — Same user applies coupon, toggles wallet, then pays once. `PAYMENT_ORDERS` keeps one pending `txnid`; after pay, one `PAYMENT_GATEWAY` transaction with that `gateway_txn_id`.
3. **Double status refresh** — After PayU success, refresh the status page repeatedly. Still one enrollment and one transaction.
4. **API restart mid-flow** — Create order, restart API, complete PayU (or hit status GET). Order still loads from MySQL and fulfills.
5. **Free activate (amount 0)** — Course with zero payable after wallet/coupon still activates via status GET without PayU.
6. **Already enrolled** — Initiate `POST courses/payment-gateway-payloads` returns 400; no new order hash.
7. **Pay then kill app** — Complete PayU and close before status UI. Within ~2–4 minutes reconciler (or PayU `surl` callback) marks order `fulfilled`; reopening status shows paid with no second transaction.
