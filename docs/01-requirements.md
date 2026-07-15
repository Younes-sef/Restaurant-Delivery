# Software Requirements Specification (SRS)

## 1. Functional Requirements

### 1.1 User & Session Management

#### Customer

The system shall allow customers to:

* Register a new account using a validated email address.
* Authenticate securely using JWT.
* Log in and log out.
* Update profile information (name, email, phone number).
* Manage multiple delivery addresses with custom labels (e.g., Home, Office).

---

#### Staff (Dispatcher / Operator)

The system shall allow staff members to:

* Authenticate securely using JWT.
* Log in and log out.
* View incoming customer orders in chronological order.
* Accept or reject customer orders.
* View available drivers.
* Assign an available driver to a confirmed order.

---

#### Kitchen Staff

The system shall allow kitchen staff to:

* Authenticate securely using JWT.
* Log in and log out.
* View confirmed orders.
* Set estimated preparation times for confirmed orders.
* Update the preparation lifecycle:

```text
Confirmed → Preparing → Ready for Pickup
```

---

#### Driver

The system shall allow drivers to:

* Authenticate securely using JWT.
* Log in and log out.
* Change availability status:

```text
Offline ↔ Available
```
* *Constraint:* A driver cannot change their status to **Offline** while an active delivery is assigned.
* View assigned deliveries.
* Accept or reject assigned deliveries.
* Update the delivery lifecycle:

```text
Ready for Pickup → Picked Up → Delivered (or Delivery Failed)
```
* Mark a delivery as **Delivery Failed** if the customer is unreachable after standard protocol (e.g., 5 minutes wait and 2 phone calls).

---

#### Restaurant Manager

The system shall allow managers to:

* Manage menu items and categories.
* Update menu availability.
* Manage operating hours.
* View business reports and administrative logs.
* Remove inappropriate customer reviews.

---

#### System Administrator

The system shall allow administrators to:

* Perform full system and user management (create/suspend roles).
* View system-level error logs and health metrics.

---

## 1.2 Menu & Restaurant Management

### Customer

The system shall allow customers to:

* Browse categorized menu items.
* Search menu items by name.
* View item details, pricing, images, ingredients, and allergen information.

### Manager

The system shall allow managers to:

* Create, update, and delete menu items and categories.
* Toggle menu item availability.
* Configure restaurant operating hours.

---

## 1.3 Cart & Payment Management

The system shall:

* Allow customers to add items, remove items, and update item quantities in the cart.
* Persist shopping carts on the server and synchronize across customer sessions.
* Calculate:
  * Subtotal
  * Taxes (based on configured rates)
  * Delivery fee
  * Grand total
* Allow customers to checkout using **Cash on Delivery (COD)** (initial version; online payments reserved for future extensibility).

---

## 1.4 Order Management

### Customer

The system shall allow customers to:

* Place an order (only allowed during active **Operating Hours**).
* Select a delivery address.
* View the current order status and estimated prep/delivery times.
* Cancel an order only while its status is **Placed**.
* *Constraint:* Orders cannot be modified once placed; they must be cancelled and replaced.

### Concurrency Rules

If a customer attempts to cancel an order while a staff member confirms it simultaneously:

* Only one transaction shall succeed.
* The losing transaction shall fail with an HTTP **409 Conflict** response.

### Order State Machine

The system shall enforce the following lifecycle:

```text
Placed
    ↓
Confirmed (or Auto-Cancelled if ignored for 15 mins)
    ↓
Preparing
    ↓
Ready for Pickup
    ↓
Picked Up
    ↓
Delivered (or Delivery Failed)
```

Invalid state transitions must be rejected.

### Driver Assignment

Driver assignment shall execute within a single database transaction.

The system must verify that:

* The order status is **Confirmed**.
* The driver status is **Available**.

If either condition changes during the transaction, the operation shall be rolled back.

---

## 1.5 Delivery Management

The system shall:

* Assign deliveries only to drivers whose status is **Available**.
* Automatically change a driver's status to **Busy** after assignment.
* Implement a **reassignment timeout**: if an assigned driver does not accept within a specified time frame (e.g., 2 minutes), unassign them, revert their status to **Available**, and notify the Dispatcher.
* Restore the driver's status to **Available** after delivery completion or failure.
* Record delivery timestamps (`assigned_at`, `picked_up_at`, `delivered_at`, `failed_at`).
* Maintain delivery history.

---

## 1.6 Notifications

The notification subsystem shall operate asynchronously.

Whenever an order changes status:

* A domain event shall be published and a background worker shall consume the event.
* Notifications shall be delivered independently from the HTTP request lifecycle.

Customer notifications include:

* Order Accepted (includes Prep Time Estimate)
* Order Rejected / Auto-Cancelled
* Preparing
* Picked Up
* Delivered / Delivery Failed

Staff and drivers shall receive notifications whenever new work is assigned, rejected, or times out.

---

## 1.7 Reviews

The system shall allow customers to:

* Rate a delivered order using a 1–5 star rating and submit textual feedback.
* Reviews may only be submitted after an order reaches the **Delivered** state.

---

# 2. Non-Functional Requirements

## 2.1 Performance

The system shall:

* Respond to standard API requests within **300 ms** under normal load.
* Propagate order status updates within **2 seconds**.
* Cache menu data using Redis, serving cached menu requests in under **50 ms**.

---

## 2.2 Scalability

The backend shall:

* Be implemented as a **Modular Monolith**.
* Support horizontal scaling and preserve strict module boundaries.
* Allow future migration to microservices with minimal architectural changes.

---

## 2.3 Reliability

The system shall:

* Prevent duplicate order creation using idempotency keys.
* Guarantee transactional consistency (e.g., driver assignments).
* Reject invalid state transitions.

---

## 2.4 Security

The system shall:

* Authenticate users using JWT and protect endpoints with Role-Based Access Control (RBAC).
* Hash passwords using Argon2 or bcrypt.
* Validate and sanitize all user input.
* Apply rate limiting to authentication endpoints.

---

## 2.5 Availability

The system shall:

* Target **99.9% availability** during restaurant operating hours.
* Continue processing orders even if the notification subsystem is temporarily unavailable.
* Retry failed background jobs automatically.

---

## 2.6 Maintainability & Observability

The system shall:

* Follow Clean Architecture principles, separating business logic from infrastructure concerns.
* Implement centralized exception handling and produce structured JSON logs.
* Expose health and metrics endpoints for monitoring (Prometheus/Grafana).

---

## 2.7 Extensibility

The architecture shall support future integration of:

* Online payment gateways (Stripe, PayPal)
* Coupon systems & Loyalty programs
* Real-time GPS tracking
* Inventory management
* Multiple restaurant branches
* Push notifications
* AI-powered analytics

---

## 2.8 Infrastructure & Deployment

The production environment shall utilize:

* **Load Balancer:** To distribute incoming HTTP traffic across multiple backend instances to enable horizontal scaling and to terminate SSL/TLS connections.
* **Health Checks:** The load balancer shall monitor backend instances and route traffic away from unhealthy nodes to guarantee the 99.9% availability target.
* **API Gateway (Recommended):** To handle edge-level rate limiting, initial request validation, and facilitate potential future microservice extraction.
