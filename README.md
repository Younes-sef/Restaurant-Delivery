# 🍔 Restaurant Delivery System

> A production-ready food delivery platform for a single restaurant, designed using modern software engineering principles and built with a scalable modular architecture.

---

# Project Overview

## Introduction

The Restaurant Delivery System is a full-stack web application that enables customers to browse a restaurant's menu, place delivery orders, and track their order status in real time.

Unlike marketplace platforms such as Uber Eats or DoorDash, this system is designed for a **single restaurant** that manages its own menu, staff, kitchen operations, and delivery drivers.

The project is being developed as a real-world software engineering case study, emphasizing clean architecture, maintainability, scalability, and industry best practices rather than simply implementing application features.

---

# Objectives

The main objectives of this project are to:

- Design a production-ready backend architecture
- Apply software engineering best practices
- Build a maintainable and scalable system
- Demonstrate system design skills
- Practice Domain-Driven Design concepts
- Learn event-driven communication
- Implement secure authentication and authorization
- Deploy a production-ready application

---

# Problem Statement

Many small and medium-sized restaurants rely on phone calls, messaging applications, or third-party delivery platforms to manage customer orders.

These approaches often introduce problems such as:

- Manual order management
- Communication delays
- Order mistakes
- Limited delivery tracking
- High third-party commission fees
- Lack of centralized management

This project aims to provide a centralized platform that streamlines the entire food ordering and delivery workflow.

---

# Target Users

The system supports five user roles.

| Role | Description |
|------|-------------|
| Customer | Places food orders and tracks deliveries |
| Staff | Manages incoming orders and assigns drivers |
| Kitchen Staff | Prepares customer orders |
| Driver | Delivers orders to customers |
| Administrator | Manages the entire system |

---

# Core Features

## Customer

- User authentication
- Browse menu
- Search menu items
- Shopping cart
- Place delivery orders
- Order tracking
- Order reviews

## Staff

- Manage incoming orders
- Accept or reject orders
- Assign drivers

## Kitchen Staff

- View confirmed orders
- Update preparation status

## Driver

- Accept assigned deliveries
- Update delivery progress

## Administrator

- User management
- Menu management
- Review management

---

# System Architecture

The project follows a **Modular Monolithic Architecture**.

This architecture was selected because it offers:

- Simple deployment
- High maintainability
- Clear module boundaries
- Easier debugging
- Future migration path to microservices

Each business domain is implemented as an independent module while remaining part of a single application.

---

# Technology Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| Next.js | React framework |
| TypeScript | Type safety |
| Tailwind CSS | UI styling |
| TanStack Query | Server state management |
| Zustand | Client state management |

---

## Backend

| Technology | Purpose |
|------------|---------|
| NestJS | Backend framework |
| TypeScript | Type safety |
| Prisma ORM | Database access |
| PostgreSQL | Relational database |
| Redis | Caching |
| RabbitMQ | Asynchronous messaging |
| JWT | Authentication |
| Swagger | API documentation |


---

# Architecture Principles

This project follows the following engineering principles:

- Clean Architecture
- Modular Design
- Separation of Concerns
- SOLID Principles
- RESTful API Design
- Event-Driven Communication
- Role-Based Access Control (RBAC)

---

# Project Structure

```
restaurant-delivery-system/

docs/
backend/

README.md
```

---

# Development Methodology

The project is developed using a design-first approach.

Development phases include:

1. Requirements Analysis
2. System Design
3. Database Design
4. API Design
5. Backend Development
6. Frontend Development
7. Testing
8. Deployment


---

# Project Goals

This project is intended to demonstrate practical experience in:

- Software Architecture
- System Design
- Backend Engineering
- Full-Stack Development
- Distributed Systems
- Production Deployment
- DevOps
