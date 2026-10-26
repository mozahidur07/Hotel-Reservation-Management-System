# Hotel Reservation & Management System

Hotel Management & Reservation System built for academic demonstration, featuring a single-page management dashboard backed by an ACID-compliant SQLite database and an Express REST API.

---

## Project Team Details (Group 9)

| Student Name | Student Code |
| :--- | :--- |
| **MD NASIM** | `BWU/BTS/25/011` |
| **MOZAHIDUR RAHAMAN** | `BWU/BTS/25/030` |
| **RAJIB MALDAS** | `BWU/BTS/25/032` |
| **FARHAD HOSSEIN MONDAL** | `BWU/BTS/25/049` |
| **RAMIZ SARKAR** | `BWU/BTS/25/112` |


---

## 1. Technology Stack

- **Frontend:** React 18, Tailwind CSS, Lucide React
- **Build Tool:** Vite 5
- **Backend:** Node.js, Express 4
- **Database:** SQLite 3 (native driver, WAL mode, foreign key enforcement)
- **Architecture:** Monolithic single repository, unified single port `3000`

---

## 2. Project Structure

```
Hotel-Reservation-System/
├── src/
│   ├── components/
│   │   ├── ConfirmModal.jsx     # Destructive action safeguards
│   │   ├── DashboardView.jsx    # Real-time metrics and occupancy
│   │   ├── GuestsView.jsx       # Guest CRM and booking history
│   │   ├── Header.jsx           # Management header and status
│   │   ├── PaymentsView.jsx     # Billing and transaction ledger
│   │   ├── ReservationsView.jsx # Date overlap check and state machine
│   │   ├── RoomsView.jsx        # Inventory, tariffs, and capacity
│   │   ├── Sidebar.jsx          # Software navigation and DB indicator
│   │   ├── SqlLabView.jsx       # Interactive DBMS query evaluation
│   │   └── Toast.jsx            # Action notifications
│   ├── App.jsx                  # Main application orchestrator
│   ├── main.jsx                 # React root mounting
│   └── index.css                # Tailwind directives and themes
├── server/
│   ├── database.js              # SQLite connection, migration, seeds
│   ├── index.js                 # Unified HTTP server (API + Vite/Dist)
│   └── routes.js                # REST API endpoints & business logic
├── db/
│   ├── hotel.db                 # Persistent SQLite database
│   ├── schema.sql               # Relational DDL definitions & indexes
│   └── queries.sql              # Categorized DBMS queries
├── public/                      # Static web assets
├── package.json                 # Unified dependencies and scripts
├── vite.config.js               # Vite bundler configuration
├── tailwind.config.js           # Tailwind configuration
└── index.html                   # Single-page application template
```

---

## 3. Database Schema

The database consists of 4 normalized relational tables:

1. **`rooms`**:
   - `id` (INTEGER PRIMARY KEY)
   - `room_number` (TEXT UNIQUE)
   - `room_type` (Standard, Deluxe, Suite)
   - `capacity` (INTEGER >= 1)
   - `price_per_night` (REAL >= 0)
   - `status` (Available, Occupied, Maintenance)
   - `description` (TEXT)

2. **`guests`**:
   - `id` (INTEGER PRIMARY KEY)
   - `full_name`, `phone` (UNIQUE), `email` (UNIQUE), `address`, `created_at`

3. **`reservations`**:
   - `id` (INTEGER PRIMARY KEY)
   - `guest_id` (FK -> guests.id)
   - `room_id` (FK -> rooms.id)
   - `check_in_date`, `check_out_date`, `num_guests`, `total_price`
   - `status` (Pending, Confirmed, Checked In, Checked Out, Cancelled)
   - `created_at`

4. **`payments`**:
   - `id` (INTEGER PRIMARY KEY)
   - `reservation_id` (FK -> reservations.id)
   - `payment_date`, `amount`, `payment_method` (Cash, Card, UPI), `payment_status` (Pending, Paid, Refunded)

---

## 4. Key Management Features

- **Management Software UI:** Designed as an administrative Property Management System (PMS) rather than an end-user booking portal.
- **Automated Overlap Detection:** Server-side SQL date intersection algorithm prevents double-booking active reservations for the same room.
- **Workflow State Machine:** Enforces validated transitions:
  `Pending -> Confirmed -> Checked In -> Checked Out`
- **Dynamic Tariff Calculation:** Computes duration in nights and price based on room rate and selected dates.
- **Interactive DBMS SQL Lab:** Displays and executes categorized SQL statements (DDL, DML, multi-table INNER/LEFT JOINs, Aggregates, Subqueries) directly against the live database with result tables.

---

## 5. Startup Instructions

### Install Dependencies
```bash
npm install
```

### Development Mode (with Vite HMR)
```bash
npm run dev
```
Accessible at: `http://localhost:3000`

### Production Build & Serve
```bash
npm run build
npm start
```
Accessible at: `http://localhost:3000`

---

