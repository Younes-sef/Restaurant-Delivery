# API Design

This document outlines the RESTful API endpoints and WebSocket events for the Restaurant Delivery System. The system uses a `/api/v1/` prefix for all REST endpoints and follows strict Role-Based Access Control (RBAC).

## Standardized Responses

All list/GET endpoints that return multiple items utilize standardized pagination parameters (`?page=1&limit=20`) and return a structured JSON response:

```json
{
  "data": [
    // ... array of items
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

## REST API Endpoints

### 1. Authentication (Public)
- `POST /api/v1/auth/register` - Register a new customer
- `POST /api/v1/auth/login` - Authenticate a user and return a JWT
- `GET /api/v1/auth/me` - Get the current authenticated user's profile (Requires Auth)

### 2. Users & Addresses (Customer)
- `GET /api/v1/users/addresses` - List user's saved addresses
- `POST /api/v1/users/addresses` - Add a new address
- `PUT /api/v1/users/addresses/:id` - Update an address
- `DELETE /api/v1/users/addresses/:id` - Delete an address

### 3. Menu & Categories (Public)
- `GET /api/v1/categories` - List all active categories
- `GET /api/v1/categories/:id/menu-items` - List active menu items in a category
- `GET /api/v1/menu-items` - List all active menu items
- `GET /api/v1/menu-items/:id` - Get specific menu item details

### 4. Cart Management (Customer)
*Note: Cart state is managed server-side using Redis.*
- `GET /api/v1/cart` - Retrieve the current user's active cart (and calculate live totals)
- `POST /api/v1/cart/items` - Add a menu item to the cart
- `PUT /api/v1/cart/items/:menuItemId` - Update the quantity of an item
- `DELETE /api/v1/cart/items/:menuItemId` - Remove an item from the cart
- `DELETE /api/v1/cart` - Clear the entire cart

### 5. Order Management (Customer)
- `POST /api/v1/orders` - Place a new order (converts cart to order)
- `GET /api/v1/orders` - List customer's order history
- `GET /api/v1/orders/:id` - Get detailed order info and status
- `POST /api/v1/orders/:id/cancel` - Cancel an order (if status is PLACED)

### 6. Reviews (Customer)
- `POST /api/v1/orders/:id/reviews` - Submit a review for an order
- `GET /api/v1/menu-items/:id/reviews` - Get reviews for a menu item

### 7. Staff Operations (Staff)
- `GET /api/v1/staff/orders` - View incoming orders and their statuses
- `PUT /api/v1/staff/orders/:id/status` - Accept (CONFIRMED) or reject an order
- `POST /api/v1/staff/orders/:id/assign-driver` - Assign a driver to an order

### 8. Kitchen Operations (Kitchen)
- `GET /api/v1/kitchen/orders` - View CONFIRMED and PREPARING orders
- `PUT /api/v1/kitchen/orders/:id/status` - Update status to PREPARING or READY_FOR_PICKUP

### 9. Driver Operations (Driver)
- `PUT /api/v1/driver/status` - Update driver availability (ONLINE/OFFLINE/BUSY)
- `GET /api/v1/driver/deliveries` - List assigned active deliveries
- `PUT /api/v1/driver/deliveries/:id/status` - Update delivery status (PICKED_UP, DELIVERED)

### 10. Administrator Operations (Admin)
- `POST /api/v1/admin/categories` - Create a new category
- `PUT /api/v1/admin/categories/:id` - Update category details
- `DELETE /api/v1/admin/categories/:id` - Delete a category
- `POST /api/v1/admin/menu-items` - Add a new menu item
- `PUT /api/v1/admin/menu-items/:id` - Update menu item details
- `DELETE /api/v1/admin/menu-items/:id` - Delete a menu item

---

## WebSocket Events (WSS)

To meet the Non-Functional Requirement (NFR) of propagating order status updates to active clients within 2 seconds, the system uses WebSockets instead of HTTP polling.

### Subscriptions & Events

#### Staff
- **`order.created`**: Broadcasted to Staff clients when a Customer successfully places a new order. Allows staff to immediately review and accept/reject the order.

#### Customer & Kitchen
- **`order.status_updated`**: Broadcasted to the relevant Customer and Kitchen clients whenever an order's status changes (e.g., PLACED -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> PICKED_UP -> DELIVERED).

#### Driver
- **`driver.dispatched`**: Broadcasted to a specific Driver when Staff assigns an order delivery to them.
