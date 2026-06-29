# Security Specification: Transport Commission Manager

This document defines the security specification and threat model for the Transport Commission Manager application. All Firestore operations must strictly comply with these rules.

## 1. Core Data Invariants
- **Multi-Tenant Isolation**: Every document in any collection must contain a `userId` field matching the authenticated Firebase User ID who created it. No user can read or write any document owned by another user.
- **Unambiguous Primary Keys**: All records use client-generated or server-generated unique keys (e.g., `drv-xxxx`, `veh-xxxx`, `bkg-xxxx`). Document IDs must be verified for correct formatting to prevent ID poisoning or character injection.
- **Timestamp Integrity**: Document creation timestamps should be validated to maintain structural consistency.

## 2. The "Dirty Dozen" Threat Payloads (Forbidden Actions)
These represent malicious payloads designed to breach multi-tenancy, inject bad data types, or manipulate financial calculations. The security rules are hardened to block all twelve:

1. **Identity Spoofing (Foreign owner)**: Creating a record with a `userId` belonging to someone else.
2. **Read Scrape (Unauthorized query)**: Querying the database without specifying a `where("userId", "==", request.auth.uid)` clause to fetch all users' records.
3. **Privilege Escalation (Self-Assigned RBAC)**: Creating a record with administrative attributes where none are allowed.
4. **ID Poisoning (Buffer Injection)**: Saving a record with a 1.5MB junk-character document ID.
5. **Shadow Update (Ghost Fields)**: Modifying a record to inject unexpected parameters like `{ isVerifiedAgent: true }`.
6. **Financial Tampering (Fare Override)**: Updating the commission value of an existing booking without ownership.
7. **Commission Status Hijack**: Marking a ledger commission entry as 'Cleared' directly without verifying authentic booking ownership.
8. **Negative Cost Spoofing**: Submitting a financial expense with an amount of `-10000` to reverse bookkeeping ledgers.
9. **Null Value Type Spoof**: Injecting a Boolean or Object into text fields such as `fullName` or `phoneNumber`.
10. **State short-circuiting**: Moving a Booking straight from 'Pending' to 'Delivered' bypasses legal checkpoints.
11. **Immutability Breach**: Attempting to alter the original `createdAt` date of a driver's registration.
12. **PII Blanket Scrape**: Attacking details such as CNIC and address via non-indexed list operations.

## 3. Firestore Rules Verification Test Suite Outline
A comprehensive verification suite is established to confirm that any malicious payload returning from the "Dirty Dozen" threats results in an immediate `PERMISSION_DENIED` status.

### Test Runner Structure:
- **Test 1**: Deny unauthenticated reads on any collection.
- **Test 2**: Deny reading another user's driver record.
- **Test 3**: Deny writing a driver record with a mismatched `userId`.
- **Test 4**: Deny updates to read-only fields (e.g., changing `id` or `createdAt` on any entity).
- **Test 5**: Deny creating records with invalid type structures (e.g., negative expense values or excessively long string IDs).
