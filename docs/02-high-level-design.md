# High Level Design (HLD)

This document outlines the high-level architecture of the Restaurant Delivery System based on the established requirements.

## System Architecture Diagram

The system follows a Modular Monolith architecture pattern, utilizing an API Gateway at the edge, a primary relational database, Redis for caching, and an asynchronous event-driven subsystem for notifications and background tasks.

```mermaid
flowchart TD
    %% Clients
    subgraph Clients["Clients (Web & Mobile)"]
        Customer[Customer App]
        Driver[Driver App]
        Kitchen[Kitchen Tablet]
        Admin[Manager/Admin Portal]
    end

    %% Edge
    subgraph Edge["Infrastructure Edge"]
        LB["Load Balancer & API Gateway\n(SSL, Rate Limiting, Health Checks)"]
    end

    %% Backend Monolith
    subgraph Backend["Modular Monolith Backend"]
        Auth["Auth & User Module\n(JWT, RBAC)"]
        Menu["Menu Module"]
        Order["Order Management Module\n(State Machine)"]
        Delivery["Delivery Module\n(Driver Assignment)"]
    end

    %% Async Processing
    subgraph Async["Asynchronous Processing"]
        Broker[("Event Bus\n(e.g., Redis Pub/Sub, RabbitMQ)")]
        Workers["Background Workers\n(Notification Handlers)"]
    end

    %% Data Stores
    subgraph Data["Data Layer"]
        DB[("Primary Database\n(ACID Transactions)")]
        Cache[("Redis\n(Caching & Idempotency)")]
    end

    %% Observability
    subgraph Obs["Observability"]
        Metrics["Prometheus & Grafana"]
    end

    %% Connections
    Customer & Driver & Kitchen & Admin -->|HTTPS / WSS| LB
    
    LB -->|Routes to| Auth
    LB --> Menu
    LB --> Order
    LB --> Delivery

    %% Backend to Data
    Auth & Menu & Order & Delivery --> DB
    Menu -->|Read/Write Cache| Cache
    Auth -->|Token Verification| Cache

    %% Event Driven Flow
    Order -->|Publish Order Events| Broker
    Delivery -->|Publish Delivery Events| Broker
    
    Broker -->|Consume Events| Workers
    Workers -->|Send Push/Email| External[("External Notification Service")]
    
    %% Observability
    Backend -.->|Exposes /metrics| Metrics
```

## Component Details

### 1. Clients
*   **Customer App:** Consumer-facing interface for browsing menus, placing orders, and tracking status (using **Leaflet** for real-time map rendering).
*   **Driver App:** Interface for delivery personnel to receive assignments, update delivery stages, and broadcast location.
*   **Kitchen Tablet:** Interface for kitchen staff to manage order preparation states.
*   **Manager/Admin Portal:** Web application for menu, user, and restaurant management.

### 2. Infrastructure Edge
*   **Load Balancer / API Gateway:** The single entry point into the backend. It terminates SSL/TLS connections, handles cross-cutting concerns like rate limiting (Security 2.4), and routes traffic to healthy backend instances to ensure high availability (2.5).

### 3. Modular Monolith Backend
The core application containing all business logic, segmented into strict modules:
*   **Auth Module:** Handles user registration, login, and issues/verifies JWTs.
*   **Menu Module:** Manages items, categories, and availability. Optimized for high read volume.
*   **Order Module:** Enforces the order state machine and handles concurrent operations (e.g., preventing dual cancellation/confirmation).
*   **Delivery Module:** Handles driver states, reassignments, and delivery lifecycle.

### 4. Asynchronous Processing
*   **Event Bus:** Decouples core systems from secondary processes. When an order changes state, an event is published here.
*   **Background Workers:** Listen for events on the bus. Primarily responsible for sending notifications without blocking the HTTP request thread, fulfilling requirement 1.6.

### 5. Data Layer
*   **Primary Database:** A relational database (e.g., PostgreSQL or MySQL) ensuring strict transactional consistency (ACID) for order processing and driver assignments.
*   **Redis Cache:** Used for extremely fast retrieval of menu data (under 50ms per req 2.1) and storing idempotency keys to prevent duplicate requests.

### 6. Observability
*   The backend exposes a `/metrics` endpoint. **Prometheus** scrapes these metrics, and **Grafana** visualizes them for system health monitoring (2.6).

---

## End-to-End Order Lifecycle Flow

This sequence diagram illustrates the step-by-step flow of data and events across the system's architecture, from the moment a customer places an order to when it is delivered.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    actor Kitchen
    actor Driver
    participant API as API Gateway
    participant Backend as Modular Monolith
    participant DB as Primary DB
    participant Broker as Event Bus
    participant Worker as Background Worker

    %% Order Placement
    Customer->>API: Place Order
    API->>Backend: Forward Request
    Backend->>DB: Save Order (Status: Placed)
    Backend->>Broker: Publish "Order Placed" Event
    Backend-->>Customer: 201 Created (Order Placed)

    %% Staff Confirmation
    Broker-->>Worker: Consume "Order Placed"
    Worker-->>Kitchen: Push Notification: New Order Alert
    
    Kitchen->>API: Confirm Order & Set Prep Time
    API->>Backend: Update Status to "Confirmed"
    
    %% Driver Assignment (Atomic Transaction)
    Note over Backend,DB: Atomic Transaction block
    Backend->>DB: Save Status & Assign Available Driver
    
    Backend->>Broker: Publish "Order Confirmed" & "Driver Assigned" Events
    Backend-->>Kitchen: 200 OK
    
    %% Notifications
    Broker-->>Worker: Consume Events
    Worker-->>Customer: Notify: "Order Accepted"
    Worker-->>Driver: Notify: "New Delivery Assigned"
    
    %% Preparation and Pickup
    Kitchen->>API: Mark "Ready for Pickup"
    API->>Backend: Update Status
    Backend->>DB: Save Status
    Backend->>Broker: Publish "Ready for Pickup" Event
    Broker-->>Worker: Consume Event
    Worker-->>Driver: Notify: "Order Ready at Kitchen"
    Worker-->>Customer: Notify: "Order Ready"
    
    Driver->>API: Mark "Picked Up"
    API->>Backend: Update Status
    Backend->>DB: Save Status
    Backend->>Broker: Publish "Picked Up" Event
    Broker-->>Worker: Consume Event
    Worker-->>Customer: Notify: "Order is on the way!"

    %% Delivery Completion
    Driver->>API: Mark "Delivered"
    API->>Backend: Update Status
    
    Note over Backend,DB: Atomic Transaction block
    Backend->>DB: Save Order Status & Set Driver "Available"
    
    Backend->>Broker: Publish "Delivered" Event
    Backend-->>Driver: 200 OK
    Broker-->>Worker: Consume Event
    Worker-->>Customer: Notify: "Order Delivered! Leave a review."
```
