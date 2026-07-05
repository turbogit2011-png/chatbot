# FLOW.OS Trace Command — FM Logistic pilot

Route in this repository: `/flow-os`

## What is implemented in the MVP

- **FM LOGISTIC / PL-01 operational UI** with multi-client rules.
- **GS1 Intake Gate** for HRI / scanner input.
- Parser for GS1 application identifiers:
  - `(00)` SSCC — validates 18 digits and the GS1 check digit.
  - `(01)` GTIN.
  - `(10)` batch / lot.
  - `(15)` best before.
  - `(17)` expiry / use by.
  - `(37)` count.
- Decision engine:
  - **green** — create a putaway task;
  - **yellow** — create a Team Leader review exception;
  - **red** — create a Quality Hold exception.
- Client-specific minimum shelf-life rules and destination aisle rules.
- A simplified digital twin of pallet locations `601`, `605`, `615`.
- Trace ledger for pallet-level SSCC / batch / expiry / location history.
- Exception Center with ownership and auditable decisions.

## Test labels

### Accepted (demo label)

```text
(00)123456789012345675(01)05901234123457(10)ORANGE-2407(17)270930(37)48
```

Expected: **green**, then a putaway task is generated in the selected client's aisle.

### Missing batch

```text
(00)123456789012345675(01)05901234123457(17)270930(37)48
```

Expected: **red Quality Hold**.

### Invalid SSCC check digit

```text
(00)123456789012345676(01)05901234123457(10)ORANGE-2407(17)270930(37)48
```

Expected: **red Quality Hold**.

### Shelf-life review

Use a valid SSCC and an expiry that does not meet the selected client's configured shelf-life threshold. Expected: **yellow Team Leader review**.

## Production discovery before any integration

The MVP deliberately does not connect to any FM Logistic platform. Before production use, confirm:

1. The WMS, version and approved API / event interface.
2. ASN structure and expected SSCC matching rules.
3. Scanner fleet and FNC1 / GS separator behaviour (Zebra, Honeywell, Datalogic, etc.).
4. Client-specific FEFO, shelf-life, batch and segregation rules.
5. Quality Hold ownership, SLA and audit requirements.
6. Location master data and all storage constraints.
7. Identity, SSO, permissions, retention and monitoring requirements.

## Safe rollout sequence

1. One client, one inbound zone, two docks.
2. Run FLOW.OS in **dry-run** mode alongside the current process.
3. Compare decisions, exceptions and scan-to-putaway time.
4. Approve controlled write-back for a narrow flow only.
5. Expand only after operational and IT sign-off.
