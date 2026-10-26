-- CATEGORY: DDL
-- Description: Creates the rooms table with uniqueness and check constraints.
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number TEXT NOT NULL UNIQUE,
  room_type TEXT NOT NULL CHECK(room_type IN ('Standard', 'Deluxe', 'Suite')),
  capacity INTEGER NOT NULL CHECK(capacity >= 1),
  price_per_night REAL NOT NULL CHECK(price_per_night >= 0),
  status TEXT NOT NULL DEFAULT 'Available',
  description TEXT
);

-- CATEGORY: DML
-- Description: Inserts a new guest into the database with parameterized values.
INSERT INTO guests (full_name, phone, email, address)
VALUES ('Rajesh Sharma', '+91 98201 12345', 'rajesh.sharma@gmail.com', 'Bandra West, Mumbai, Maharashtra');

-- CATEGORY: DML
-- Description: Updates room status upon guest check-in.
UPDATE rooms 
SET status = 'Occupied' 
WHERE id = 1;

-- CATEGORY: JOIN
-- Description: Retrieves confirmed reservations joined with guest contact info and room details.
SELECT 
  r.id AS reservation_id,
  g.full_name AS guest_name,
  g.phone AS guest_phone,
  rm.room_number,
  rm.room_type,
  r.check_in_date,
  r.check_out_date,
  r.status,
  r.total_price
FROM reservations r
INNER JOIN guests g ON r.guest_id = g.id
INNER JOIN rooms rm ON r.room_id = rm.id
ORDER BY r.check_in_date DESC;

-- CATEGORY: JOIN
-- Description: Left outer join showing all rooms and their active reservations if any.
SELECT 
  rm.room_number,
  rm.room_type,
  rm.price_per_night,
  r.id AS current_reservation_id,
  r.status AS reservation_status,
  r.check_in_date,
  r.check_out_date
FROM rooms rm
LEFT JOIN reservations r ON rm.id = r.room_id AND r.status IN ('Confirmed', 'Checked In')
ORDER BY rm.room_number ASC;

-- CATEGORY: Aggregate Functions
-- Description: Calculates revenue metrics, average stay price, and reservation counts grouped by room type.
SELECT 
  rm.room_type,
  COUNT(r.id) AS total_bookings,
  ROUND(AVG(r.total_price), 2) AS avg_booking_value,
  ROUND(SUM(r.total_price), 2) AS total_revenue
FROM rooms rm
LEFT JOIN reservations r ON rm.id = r.room_id AND r.status != 'Cancelled'
GROUP BY rm.room_type;

-- CATEGORY: Aggregate Functions
-- Description: Calculates total collected payments and average transaction size by payment method.
SELECT 
  payment_method,
  COUNT(id) AS transaction_count,
  ROUND(SUM(amount), 2) AS total_collected,
  ROUND(AVG(amount), 2) AS avg_transaction
FROM payments
WHERE payment_status = 'Paid'
GROUP BY payment_method;

-- CATEGORY: Subqueries
-- Description: Identifies guests who have spent more than the overall average reservation spend.
SELECT 
  g.id,
  g.full_name,
  g.email,
  (SELECT COUNT(*) FROM reservations r WHERE r.guest_id = g.id) AS booking_count,
  ROUND((SELECT SUM(total_price) FROM reservations r WHERE r.guest_id = g.id), 2) AS total_spent
FROM guests g
WHERE (SELECT SUM(total_price) FROM reservations r WHERE r.guest_id = g.id) > (
  SELECT AVG(total_price) FROM reservations WHERE status != 'Cancelled'
)
ORDER BY total_spent DESC;

-- CATEGORY: Subqueries
-- Description: Finds rooms that currently have zero active reservations.
SELECT 
  id,
  room_number,
  room_type,
  capacity,
  price_per_night,
  status
FROM rooms
WHERE id NOT IN (
  SELECT DISTINCT room_id 
  FROM reservations 
  WHERE status IN ('Confirmed', 'Checked In')
);
