import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.resolve(__dirname, '../db');
const dbPath = path.join(dbDir, 'hotel.db');
const schemaPath = path.join(dbDir, 'schema.sql');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const sqliteInstance = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  }
});

export const db = {
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteInstance.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteInstance.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqliteInstance.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  exec(sql) {
    return new Promise((resolve, reject) => {
      sqliteInstance.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

export async function initDatabase() {
  await db.run('PRAGMA foreign_keys = ON;');
  await db.run('PRAGMA journal_mode = WAL;');

  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await db.exec(schemaSql);
  }

  const roomSample = await db.get("SELECT price_per_night FROM rooms WHERE room_number = '101'");
  if (!roomSample || roomSample.price_per_night < 500) {
    await seedIndianMarketData();
  }
}

export async function seedIndianMarketData() {
  await db.run('PRAGMA foreign_keys = OFF;');
  await db.run('DELETE FROM payments;');
  await db.run('DELETE FROM reservations;');
  await db.run('DELETE FROM guests;');
  await db.run('DELETE FROM rooms;');
  await db.run("DELETE FROM sqlite_sequence WHERE name IN ('payments', 'reservations', 'guests', 'rooms');");
  await db.run('PRAGMA foreign_keys = ON;');

  const rooms = [
    ['101', 'Standard', 2, 2200.00, 'Available', 'Cozy queen-bed room with city view, high-speed Wi-Fi, and smart TV.'],
    ['102', 'Standard', 2, 2200.00, 'Available', 'Quiet courtyard-facing standard room with tea/coffee maker.'],
    ['201', 'Deluxe', 3, 4200.00, 'Occupied', 'Spacious room with king bed, executive work desk, and mini-bar.'],
    ['202', 'Deluxe', 3, 4200.00, 'Available', 'Upper-floor deluxe room featuring panoramic sunset balcony.'],
    ['301', 'Suite', 4, 8500.00, 'Occupied', 'Executive penthouse suite with living room, kitchenette, and jacuzzi.'],
    ['302', 'Suite', 4, 8500.00, 'Maintenance', 'Corner suite currently undergoing annual HVAC maintenance.']
  ];

  for (const r of rooms) {
    await db.run(
      'INSERT INTO rooms (room_number, room_type, capacity, price_per_night, status, description) VALUES (?, ?, ?, ?, ?, ?)',
      r
    );
  }

  const guests = [
    ['Rajesh Sharma', '+91 98201 12345', 'rajesh.sharma@gmail.com', 'Bandra West, Mumbai, Maharashtra'],
    ['Sarah Jenkins', '+44 7700 900123', 's.jenkins@outlook.com', 'Kensington, London, United Kingdom'],
    ['Ananya Iyer', '+91 94440 88219', 'ananya.iyer@yahoo.in', 'Indiranagar, Bengaluru, Karnataka'],
    ['David Miller', '+1 415-555-0182', 'david.miller@techcorp.io', 'San Francisco, CA, United States'],
    ['Vikramaditya Singhania', '+91 98110 33451', 'vikram.singhania@heritage.co.in', 'Civil Lines, Jaipur, Rajasthan'],
    ['Elena Rossi', '+39 02 6978 4512', 'elena.rossi@milano.it', 'Via Montenapoleone, Milan, Italy']
  ];

  for (const g of guests) {
    await db.run(
      'INSERT INTO guests (full_name, phone, email, address) VALUES (?, ?, ?, ?)',
      g
    );
  }

  const today = new Date();
  const format = (d) => d.toISOString().split('T')[0];

  const d1 = new Date(today); d1.setDate(d1.getDate() - 1);
  const d2 = new Date(today); d2.setDate(d2.getDate() + 2);
  const d3 = new Date(today); d3.setDate(d3.getDate() + 1);
  const d4 = new Date(today); d4.setDate(d4.getDate() + 4);
  const d5 = new Date(today); d5.setDate(d5.getDate() - 5);
  const d6 = new Date(today); d6.setDate(d6.getDate() - 2);

  const res1 = await db.run(
    'INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, num_guests, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [1, 3, format(d1), format(d2), 2, 12600.00, 'Checked In']
  );

  const res2 = await db.run(
    'INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, num_guests, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [2, 5, format(d1), format(d2), 3, 25500.00, 'Checked In']
  );

  const res3 = await db.run(
    'INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, num_guests, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [3, 1, format(d3), format(d4), 2, 6600.00, 'Confirmed']
  );

  const res4 = await db.run(
    'INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, num_guests, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [4, 2, format(d5), format(d6), 1, 6600.00, 'Checked Out']
  );

  await db.run(
    'INSERT INTO payments (reservation_id, payment_date, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
    [res1.lastID, format(d1), 12600.00, 'UPI', 'Paid']
  );

  await db.run(
    'INSERT INTO payments (reservation_id, payment_date, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
    [res2.lastID, format(d1), 25500.00, 'Card', 'Paid']
  );

  await db.run(
    'INSERT INTO payments (reservation_id, payment_date, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
    [res3.lastID, format(today), 6600.00, 'UPI', 'Pending']
  );

  await db.run(
    'INSERT INTO payments (reservation_id, payment_date, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
    [res4.lastID, format(d5), 6600.00, 'Card', 'Paid']
  );
}
