# Architecture Diagrams

Here are the visual diagrams for your system. (These should render as actual drawings here in the artifact viewer).

## 1. High-Level Architecture

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

---

## 2. End-to-End Order Flow

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
