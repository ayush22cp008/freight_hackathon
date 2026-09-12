# DeliveryProof

## 1. DeliveryProof — Product Introduction

Welcome to **DeliveryProof** (formerly Freight), an AI-assisted accountability and evidence platform for the logistics industry. 

DeliveryProof establishes an immutable, evidence-backed timeline of facility interactions and delivery events. It serves as a shared source of truth connecting Companies (Senders/Receivers) and Drivers, ensuring that every claim—from arrival times to detention periods to final delivery—is backed by verified event history.

## 2. The Real Problem

In the logistics industry, legitimate detention (wait-time) earnings are frequently lost or fiercely disputed. The core issue is that evidence of arrival, check-in, and departure at facilities is often manual, fragmented across different systems, or completely missing. 

## 3. Why This Problem Is Serious

Drivers are the primary operational actors affected by these disputes, frequently losing out on compensation for time spent waiting at facilities. Companies and carriers, as secondary business stakeholders, suffer from delayed billing, strained relationships, and the operational overhead of investigating claims without a shared source of truth.

## 4. Why It Is Hard to Prove

Traditional evidence collection is flawed:
- Location (GPS) and ELD data alone prove a truck's proximity to a facility, but they do *not* prove facility interaction (e.g., that a driver actually checked in at the dock).
- Traditional Electronic Proof of Delivery (ePOD) systems focus entirely on the final delivery outcome (the signature) rather than the chronological timeline of events leading up to it.

## 5. What We Discovered Through Research

Our research highlighted that disputes rarely center on whether goods were delivered, but rather on *when* specific facility interactions occurred. Without an integrated, immutable timeline, proving detention or delays becomes a "he said, she said" battle between the driver and the facility.

## 6. The Market Gap

Existing TMS, ELD, and visibility solutions solve portions of the workflow, but there is a clear gap:
- No system provides an evidence-first, shared-truth accountability layer specifically focused on actual delivery/facility interactions.
- Drivers lack a unified tool to generate indisputable, chronological proof of their operational timeline.

## 7. Our Solution — DeliveryProof

DeliveryProof bridges this gap by enforcing an evidence-backed, shared-truth layer around every facility interaction. It captures the chronological timeline of a trip—from pickup arrival to final receiver confirmation—and uses AI to summarize these raw events into coherent, undeniable narratives for dispute resolution.

## 8. What Makes DeliveryProof Different

- **Evidence-First Focus:** We focus on the chronological interaction record, not just the final signature.
- **Zero-Integration Value:** The platform establishes accountability immediately, without requiring deep integrations into existing legacy facility software.
- **Clear Boundaries:** *What DeliveryProof is NOT:* We do not claim to magically eliminate facility delays, guarantee detention payment, replace every TMS/ELD function, or turn reviewers into unrestricted super-admins. DeliveryProof is strictly an evidence and accountability layer.

## 9. 👥 What Each Role Does

### Driver
The Driver is the operational delivery executor. They browse available trips, accept assignments, execute the delivery, record evidence at each stage, and complete the trip.
*Canonical Journey:* `Dashboard → Available Trips → Trip Detail → Accept Trip → My Active Trip → Delivery Completion → Completed Trips → Trip History / Timeline`

### Company
A single business participant that acts as either the **Sender** or **Receiver** for a given trip. Senders and Receivers are *not* separate account types; they are trip-specific hats.
- *Sender Journey:* `Create Trip → Receiver Request PENDING → Receiver Accepts → Publish → Driver Marketplace → Driver Claims → Delivery Progress → Completion → History`
- *Receiver Journey:* `Dashboard → Needs Attention → Accept/Reject Delivery Request → Incoming Deliveries → Pending Request → Accept/Reject → (Post-acceptance) Check-in/Completion workflow`

### Reviewer
The platform's identity verification authority. **The Reviewer is NOT an unrestricted administrator.** The Reviewer examines onboarding evidence (e.g., Driving Licence for Drivers, GST document for Companies) and approves or rejects the applicant. They have no access to operational delivery trips or confidential trip evidence.
*Canonical Journey:* `Verification Queue → Applicant Verification → Evidence Examination → Identity / Role Verified → Approve / Reject → Decision Result → Verification History`

---

> **Important Distinction: "Evidence"**
> 1. **Onboarding Evidence:** Documents (Licences, GSTs) submitted by applicants and inspected by the Reviewer for identity verification. This is independent of any trip.
> 2. **Delivery Evidence:** Timestamps, photos, and GPS events generated during the operational delivery workflow by Drivers and Companies.

---

## 10. 🚀 Judge Quick Start

Ready to try DeliveryProof? Here is the fastest path to see the system in action.

**Public Deployed URL:** `(Please refer to the submission link / deployment URL provided in our project profile)`

**Recommended Fast-Path Walkthrough:**
1. **Log in as Company (Sender):** Use the provided company demo credentials (e.g., `testc2` / `testc2@...`). Create a new Trip.
2. **Log in as Company (Receiver):** Use a second company account. Go to "Needs Attention", find the incoming delivery request, and Accept it.
3. **Log in as Company (Sender):** Publish the accepted trip to the marketplace.
4. **Log in as Driver:** Use the provided driver demo credentials. Claim the trip from the marketplace and begin the delivery workflow (recording events like Arrival, Goods Loaded, etc.).
5. **Log in as Reviewer:** Use the reviewer credential (`ayushhalpati.2004@gmail.com`). View the Verification Queue to see how onboarding identity checks are handled completely separate from the delivery workflow.

## 11. 🔄 How the System Works

**The Operational Delivery Chain:**
1. Company (Sender) creates a trip.
2. Receiver Agreement handshake occurs (Receiver accepts the incoming trip).
3. Sender Publishes the trip to the marketplace.
4. Driver Claims the trip.
5. Driver executes the delivery, recording evidence at each stage.
6. Receiving company completes their check-in/confirmation.
7. Trip completes and is stored in the timeline history.

**The Onboarding Verification Chain (Separate):**
1. Applicant registers.
2. Reviewer examines onboarding evidence.
3. Reviewer approves or rejects the identity.
4. Verification result is recorded in history.

## 12. 🎨 User Experience — Three Roles, One Product

DeliveryProof offers three distinct, role-aware portals (Driver, Company, Reviewer) unified by a single shared design system. Each role sees only the data and actions relevant to their responsibilities, ensuring a clean, focused user experience.

## 13. 🏗️ Technical Architecture — How We Built It

DeliveryProof is built on a modern Next.js stack with a Supabase backend. Key implemented architectural concepts include:
- **Role-Aware Authentication & Authorization:** Secure routing and data access based on `FreightIdentity`.
- **Atomic Driver Claim:** Marketplace transactions ensure a trip is claimed by exactly one driver without race conditions.
- **Receiver Agreement Gate:** Trips cannot be published until the designated receiving company explicitly accepts the request.
- **Delivery Evidence Flow:** Immutable logging of chronological events.
- **Unified Trip Detail:** A single source of truth for trip state accessed differently based on role context.

## 14. 🔐 Security & Trust Model

Our security model enforces least-privilege access:
- **Server-Side Authorization:** Role-sensitive actions are gated on the server.
- **Receiver Protections:** Accept/reject actions are strictly limited to the receiving company associated with the trip.
- **Trip Gating:** A new governance rule ensures a company cannot select itself as the receiver for new trips.
- **Known Security Caveat:** While the application uses server-side gating (R-05), a known Row Level Security (RLS) gap for the Reviewer service-role (REV-03) is documented in our blueprints and awaits a future full RLS rewrite.

## 15. 🤖 AI — Where AI Is Actually Used

DeliveryProof uses AI specifically for **narrative and claims generation**, not for deterministic logistics logic.
- **What is Deterministic:** GPS, timestamps, and state machines remain strictly mathematical and programmatic.
- **What is AI-Assisted:** Once a trip completes, an AI Evidence Summary is generated from the raw, deterministic timeline events, providing a human-readable, factual summary that can be immediately used for dispute resolution.

## 16. ✅ Real Verification / Testing

The product has undergone rigorous verification:
- **Driver, Company, and Reviewer Baselines:** Fully implemented, verified, and locked.
- **Cross-Portal E2E:** A full manual execution successfully traced a trip from creation (anand → bilimora) through driver claim, delivery lifecycle, receiver confirmation, and AI summary generation.
- **Final Regression:** Completed and verified by the team, proving continuity across the unified system.

## 17. 📈 Impact

By standardizing delivery evidence, DeliveryProof reduces the administrative overhead of dispute resolution, ensures drivers are compensated for actual facility time, and provides companies with an undeniable audit trail of their freight operations.

## 18. 🎥 Demo

Please see our Devpost/Submission page for the complete live-demo video walkthrough of the DeliveryProof platform!

## 19. 🛠️ Technology Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL), Next.js API Routes
- **Authentication:** Supabase Auth (Role-based Identity)
- **Deployment:** Vercel

## 20. 🚀 Future Scope

- **Offline Mode:** Enhancing the driver app to queue evidence offline and sync upon reconnection.
- **Full RLS Rewrite:** Closing the documented REV-03 Reviewer service-role security gap.
- **Hardware Integrations:** IoT integration for automated temperature and seal-break evidence.

## 21. 📁 Project / Architecture References

Authoritative project blueprints and investigation records can be found in our external records repository (`Freight_Records`), which tracks all architectural decisions, governance rules, and testing checkpoints.
