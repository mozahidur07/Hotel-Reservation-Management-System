CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number TEXT NOT NULL UNIQUE,
  room_type TEXT NOT NULL CHECK(room_type IN ('Standard', 'Deluxe', 'Suite')),
  capacity INTEGER NOT NULL CHECK(capacity >= 1),
  price_per_night REAL NOT NULL CHECK(price_per_night >= 0),
  status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'Occupied', 'Maintenance')),
  description TEXT
);

CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  check_in_date TEXT NOT NULL,
  check_out_date TEXT NOT NULL,
  num_guests INTEGER NOT NULL CHECK(num_guests >= 1),
  total_price REAL NOT NULL CHECK(total_price >= 0),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE RESTRICT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL,
  payment_date TEXT NOT NULL DEFAULT (DATE('now')),
  amount REAL NOT NULL CHECK(amount >= 0),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('Cash', 'Card', 'UPI')),
  payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK(payment_status IN ('Pending', 'Paid', 'Refunded')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_reservations_room_dates ON reservations(room_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_guest ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id);
