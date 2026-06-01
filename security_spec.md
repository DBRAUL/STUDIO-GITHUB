# Security Specification: Logistika Enterprise Zero-Trust Data Rules

This document outlines the security architecture and ruleset designed to protect Logistika's persistent cloud data.

## 1. Data Invariants
- **Pedidos (Deliveries):** Must have a valid `ticket`, a `tienda` branch name, and an integer or null `orden`. Status transitions are validated.
- **Recolecciones (Pickups):** Must have a valid `id` and `solicitante` field. Status must be one of the enumerated states.
- **Choferes & GPS:** Location coordinates (`lat`, `lng`) must be double values, and each document represents a unique driver name or ID.
- **Proveedores & Tiendas:** Static catalogs containing directory addresses for logistics validation. Can only be uploaded or modified by supervisor credentials.
- **Historial Logs:** Read-only audits of finished transactions. No client edits or deletions are allowed once archived.

## 2. The "Dirty Dozen" Malicious Payloads
To secure the collections, we block several critical vulnerabilities:
1. **Unsigned-In Write:** Writing any records without an authenticated user account.
2. **ID Poisoning:** Injecting 50KB character arrays as document IDs.
3. **Ghost Fields:** Altering system state parameters directly (e.g. forced metadata bypass).
4. **Incorrect Status Lifecycle Bypass:** Setting an active delivery straight to `FINALIZADO` without assigning a driver.
5. **PII Blanket Harvest:** Harvesting other store addresses without active authorization.
6. **Privilege Escalation:** Self-assigning admin/supervisor permissions.
7. **Orphaned Writes:** Generating a task pointing to a non-existent store.
8. **Negative Coords Injection:** Setting Latitude/Longitude to invalid extreme values (e.g., 99999).
9. **Duplicate Key Collisions:** Forcing ticket takeovers by overriding existing active orders.
10. **GPS spoofing:** Simulating driver updates from unauthorized devices.
11. **Historic Records Overwrite:** Modifying completed deliveries in the archived logs.
12. **Recursive Cost Multiplication:** Rapid bulk reads of the driver GPS locations.

## 3. Test Cases (Mock Verification)
All operations attempt strict schema matching. Unsigned or malformed queries will trigger instant `PERMISSION_DENIED` errors.
