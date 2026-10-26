import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './database.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const queriesFilePath = path.resolve(__dirname, '../db/queries.sql');

router.get('/dashboard', async (req, res, next) => {
  try {
    const totalRoomsRow = await db.get('SELECT COUNT(*) as count FROM rooms');
    const availableRoomsRow = await db.get("SELECT COUNT(*) as count FROM rooms WHERE status = 'Available'");
    const occupiedRoomsRow = await db.get("SELECT COUNT(*) as count FROM rooms WHERE status = 'Occupied'");
    const maintenanceRoomsRow = await db.get("SELECT COUNT(*) as count FROM rooms WHERE status = 'Maintenance'");
    const totalGuestsRow = await db.get('SELECT COUNT(*) as count FROM guests');
    const totalReservationsRow = await db.get('SELECT COUNT(*) as count FROM reservations');
    const confirmedReservationsRow = await db.get("SELECT COUNT(*) as count FROM reservations WHERE status = 'Confirmed'");
    const checkedInGuestsRow = await db.get("SELECT COUNT(*) as count FROM reservations WHERE status = 'Checked In'");
    const totalPaymentsRow = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status != 'Refunded'");

    const recentReservations = await db.all(`
      SELECT 
        r.id,
        r.check_in_date,
        r.check_out_date,
        r.num_guests,
        r.total_price,
        r.status,
        g.full_name AS guest_name,
        rm.room_number,
        rm.room_type
      FROM reservations r
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      ORDER BY r.id DESC
      LIMIT 6
    `);

    const totalRooms = totalRoomsRow?.count || 0;
    const occupiedRooms = occupiedRoomsRow?.count || 0;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    res.json({
      stats: {
        totalRooms,
        availableRooms: availableRoomsRow?.count || 0,
        occupiedRooms,
        maintenanceRooms: maintenanceRoomsRow?.count || 0,
        totalGuests: totalGuestsRow?.count || 0,
        totalReservations: totalReservationsRow?.count || 0,
        confirmedReservations: confirmedReservationsRow?.count || 0,
        checkedInGuests: checkedInGuestsRow?.count || 0,
        totalPayments: Number(totalPaymentsRow?.total || 0).toFixed(2),
        occupancyRate
      },
      recentReservations
    });
  } catch (err) {
    next(err);
  }
});

router.get('/rooms', async (req, res, next) => {
  try {
    const { search, type, status } = req.query;
    let query = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (room_number LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (type) {
      query += ' AND room_type = ?';
      params.push(type);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY room_number ASC';
    const rooms = await db.all(query, params);
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

router.post('/rooms', async (req, res, next) => {
  try {
    const { room_number, room_type, capacity, price_per_night, status = 'Available', description = '' } = req.body;

    if (!room_number || !room_type || !capacity || price_per_night === undefined) {
      return res.status(400).json({ error: 'Missing required room fields.' });
    }

    const validTypes = ['Standard', 'Deluxe', 'Suite'];
    if (!validTypes.includes(room_type)) {
      return res.status(400).json({ error: `Room type must be one of: ${validTypes.join(', ')}` });
    }

    const validStatuses = ['Available', 'Occupied', 'Maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = await db.get('SELECT id FROM rooms WHERE room_number = ?', [room_number]);
    if (existing) {
      return res.status(400).json({ error: `Room ${room_number} already exists.` });
    }

    const result = await db.run(
      'INSERT INTO rooms (room_number, room_type, capacity, price_per_night, status, description) VALUES (?, ?, ?, ?, ?, ?)',
      [room_number.trim(), room_type, Number(capacity), Number(price_per_night), status, description.trim()]
    );

    const created = await db.get('SELECT * FROM rooms WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/rooms/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { room_number, room_type, capacity, price_per_night, status, description } = req.body;

    const existing = await db.get('SELECT * FROM rooms WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room_number && room_number !== existing.room_number) {
      const duplicate = await db.get('SELECT id FROM rooms WHERE room_number = ? AND id != ?', [room_number, id]);
      if (duplicate) {
        return res.status(400).json({ error: `Room ${room_number} already exists.` });
      }
    }

    await db.run(
      `UPDATE rooms 
       SET room_number = COALESCE(?, room_number),
           room_type = COALESCE(?, room_type),
           capacity = COALESCE(?, capacity),
           price_per_night = COALESCE(?, price_per_night),
           status = COALESCE(?, status),
           description = COALESCE(?, description)
       WHERE id = ?`,
      [
        room_number ? room_number.trim() : null,
        room_type || null,
        capacity ? Number(capacity) : null,
        price_per_night !== undefined ? Number(price_per_night) : null,
        status || null,
        description !== undefined ? description.trim() : null,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM rooms WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/rooms/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const activeBooking = await db.get(
      "SELECT id FROM reservations WHERE room_id = ? AND status IN ('Pending', 'Confirmed', 'Checked In')",
      [id]
    );
    if (activeBooking) {
      return res.status(400).json({ error: 'Cannot delete room with active or pending reservations.' });
    }

    const result = await db.run('DELETE FROM rooms WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    res.json({ success: true, message: 'Room deleted successfully.' });
  } catch (err) {
    if (err.message.includes('FOREIGN KEY')) {
      return res.status(400).json({ error: 'Cannot delete room with historical reservation records.' });
    }
    next(err);
  }
});

router.get('/guests', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        g.*,
        COUNT(r.id) AS total_stays,
        COALESCE(SUM(r.total_price), 0) AS total_expenditure
      FROM guests g
      LEFT JOIN reservations r ON g.id = r.guest_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (g.full_name LIKE ? OR g.phone LIKE ? OR g.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY g.id ORDER BY g.id DESC';
    const guests = await db.all(query, params);
    res.json(guests);
  } catch (err) {
    next(err);
  }
});

router.post('/guests', async (req, res, next) => {
  try {
    const { full_name, phone, email, address = '' } = req.body;
    if (!full_name || !phone || !email) {
      return res.status(400).json({ error: 'Full name, phone, and email are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const duplicate = await db.get('SELECT id FROM guests WHERE phone = ? OR email = ?', [phone.trim(), email.trim()]);
    if (duplicate) {
      return res.status(400).json({ error: 'A guest with this phone number or email already exists.' });
    }

    const result = await db.run(
      'INSERT INTO guests (full_name, phone, email, address) VALUES (?, ?, ?, ?)',
      [full_name.trim(), phone.trim(), email.trim().toLowerCase(), address.trim()]
    );

    const created = await db.get('SELECT * FROM guests WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/guests/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, phone, email, address } = req.body;

    const existing = await db.get('SELECT * FROM guests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Guest not found.' });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
    }

    const duplicate = await db.get(
      'SELECT id FROM guests WHERE (phone = ? OR email = ?) AND id != ?',
      [phone || existing.phone, (email || existing.email).toLowerCase(), id]
    );
    if (duplicate) {
      return res.status(400).json({ error: 'Phone number or email is already in use by another guest.' });
    }

    await db.run(
      `UPDATE guests 
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           address = COALESCE(?, address)
       WHERE id = ?`,
      [
        full_name ? full_name.trim() : null,
        phone ? phone.trim() : null,
        email ? email.trim().toLowerCase() : null,
        address !== undefined ? address.trim() : null,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM guests WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/guests/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const activeBooking = await db.get(
      "SELECT id FROM reservations WHERE guest_id = ? AND status IN ('Pending', 'Confirmed', 'Checked In')",
      [id]
    );
    if (activeBooking) {
      return res.status(400).json({ error: 'Cannot delete guest with active reservations.' });
    }

    const result = await db.run('DELETE FROM guests WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Guest not found.' });
    }

    res.json({ success: true, message: 'Guest deleted successfully.' });
  } catch (err) {
    if (err.message.includes('FOREIGN KEY')) {
      return res.status(400).json({ error: 'Cannot delete guest with reservation history. Cancel or archive bookings first.' });
    }
    next(err);
  }
});

router.get('/reservations', async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT 
        r.*,
        g.full_name AS guest_name,
        g.phone AS guest_phone,
        g.email AS guest_email,
        rm.room_number,
        rm.room_type,
        rm.price_per_night,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE reservation_id = r.id AND payment_status != 'Refunded') AS paid_amount
      FROM reservations r
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (g.full_name LIKE ? OR rm.room_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY r.id DESC';
    const reservations = await db.all(query, params);
    res.json(reservations);
  } catch (err) {
    next(err);
  }
});

router.post('/reservations', async (req, res, next) => {
  try {
    const { guest_id, room_id, check_in_date, check_out_date, num_guests, initial_payment } = req.body;

    if (!guest_id || !room_id || !check_in_date || !check_out_date || !num_guests) {
      return res.status(400).json({ error: 'All reservation fields are required.' });
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ error: 'Invalid dates provided.' });
    }
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'Check-out date must be strictly after check-in date.' });
    }

    const guest = await db.get('SELECT id FROM guests WHERE id = ?', [guest_id]);
    if (!guest) {
      return res.status(404).json({ error: 'Selected guest does not exist.' });
    }

    const room = await db.get('SELECT * FROM rooms WHERE id = ?', [room_id]);
    if (!room) {
      return res.status(404).json({ error: 'Selected room does not exist.' });
    }
    if (room.status === 'Maintenance') {
      return res.status(400).json({ error: 'This room is currently under maintenance.' });
    }
    if (Number(num_guests) > room.capacity) {
      return res.status(400).json({ error: `Room ${room.room_number} capacity is ${room.capacity} guest(s).` });
    }

    const overlap = await db.get(
      `SELECT id, check_in_date, check_out_date FROM reservations 
       WHERE room_id = ? 
         AND status IN ('Confirmed', 'Checked In', 'Pending')
         AND check_in_date < ? 
         AND check_out_date > ?`,
      [room_id, check_out_date, check_in_date]
    );

    if (overlap) {
      return res.status(409).json({
        error: `Room ${room.room_number} is already booked from ${overlap.check_in_date} to ${overlap.check_out_date}.`
      });
    }

    const diffDays = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const total_price = diffDays * room.price_per_night;

    const result = await db.run(
      'INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, num_guests, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [guest_id, room_id, check_in_date, check_out_date, Number(num_guests), total_price, 'Confirmed']
    );

    const reservationId = result.lastID;

    if (initial_payment && initial_payment.amount > 0) {
      await db.run(
        'INSERT INTO payments (reservation_id, payment_date, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
        [
          reservationId,
          check_in_date,
          Number(initial_payment.amount),
          initial_payment.payment_method || 'Card',
          initial_payment.payment_status || 'Paid'
        ]
      );
    }

    const created = await db.get(`
      SELECT r.*, g.full_name AS guest_name, rm.room_number, rm.room_type
      FROM reservations r
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      WHERE r.id = ?
    `, [reservationId]);

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/reservations/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { check_in_date, check_out_date, num_guests } = req.body;

    const reservation = await db.get('SELECT * FROM reservations WHERE id = ?', [id]);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const checkIn = new Date(check_in_date || reservation.check_in_date);
    const checkOut = new Date(check_out_date || reservation.check_out_date);
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'Check-out date must be strictly after check-in date.' });
    }

    const room = await db.get('SELECT * FROM rooms WHERE id = ?', [reservation.room_id]);
    if (num_guests && Number(num_guests) > room.capacity) {
      return res.status(400).json({ error: `Room capacity is ${room.capacity} guest(s).` });
    }

    const inDateStr = check_in_date || reservation.check_in_date;
    const outDateStr = check_out_date || reservation.check_out_date;

    const overlap = await db.get(
      `SELECT id, check_in_date, check_out_date FROM reservations 
       WHERE room_id = ? 
         AND id != ?
         AND status IN ('Confirmed', 'Checked In', 'Pending')
         AND check_in_date < ? 
         AND check_out_date > ?`,
      [reservation.room_id, id, outDateStr, inDateStr]
    );

    if (overlap) {
      return res.status(409).json({
        error: `Room conflict: booked from ${overlap.check_in_date} to ${overlap.check_out_date}.`
      });
    }

    const diffDays = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const total_price = diffDays * room.price_per_night;

    await db.run(
      `UPDATE reservations 
       SET check_in_date = ?, check_out_date = ?, num_guests = COALESCE(?, num_guests), total_price = ?,
           status = COALESCE(?, status)
       WHERE id = ?`,
      [inDateStr, outDateStr, num_guests ? Number(num_guests) : null, total_price, req.body.status || null, id]
    );

    if (req.body.status) {
      if (req.body.status === 'Checked In') {
        await db.run("UPDATE rooms SET status = 'Occupied' WHERE id = ?", [reservation.room_id]);
      } else {
        const otherOccupant = await db.get(
          "SELECT id FROM reservations WHERE room_id = ? AND status = 'Checked In' AND id != ?",
          [reservation.room_id, id]
        );
        if (!otherOccupant) {
          await db.run("UPDATE rooms SET status = 'Available' WHERE id = ? AND status != 'Maintenance'", [reservation.room_id]);
        }
      }
    }

    const updated = await db.get('SELECT * FROM reservations WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/reservations/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be: ${validStatuses.join(', ')}` });
    }

    const reservation = await db.get('SELECT * FROM reservations WHERE id = ?', [id]);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    await db.run('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);

    if (status === 'Checked In') {
      await db.run("UPDATE rooms SET status = 'Occupied' WHERE id = ?", [reservation.room_id]);
    } else {
      const otherOccupant = await db.get(
        "SELECT id FROM reservations WHERE room_id = ? AND status = 'Checked In' AND id != ?",
        [reservation.room_id, id]
      );
      if (!otherOccupant) {
        await db.run("UPDATE rooms SET status = 'Available' WHERE id = ? AND status != 'Maintenance'", [reservation.room_id]);
      }
    }

    const updated = await db.get(`
      SELECT r.*, g.full_name AS guest_name, rm.room_number, rm.room_type
      FROM reservations r
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      WHERE r.id = ?
    `, [id]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/payments', async (req, res, next) => {
  try {
    const { status, reservation_id } = req.query;
    let query = `
      SELECT 
        p.*,
        r.check_in_date,
        r.check_out_date,
        g.full_name AS guest_name,
        rm.room_number
      FROM payments p
      JOIN reservations r ON p.reservation_id = r.id
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND p.payment_status = ?';
      params.push(status);
    }
    if (reservation_id) {
      query += ' AND p.reservation_id = ?';
      params.push(reservation_id);
    }

    query += ' ORDER BY p.id DESC';
    const payments = await db.all(query, params);
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

router.post('/payments', async (req, res, next) => {
  try {
    const { reservation_id, amount, payment_method, payment_status = 'Paid', payment_date } = req.body;

    if (!reservation_id || amount === undefined || !payment_method) {
      return res.status(400).json({ error: 'Reservation ID, amount, and payment method are required.' });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }

    const reservation = await db.get('SELECT id FROM reservations WHERE id = ?', [reservation_id]);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const dateStr = payment_date || new Date().toISOString().split('T')[0];

    const result = await db.run(
      'INSERT INTO payments (reservation_id, payment_date, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
      [reservation_id, dateStr, Number(amount), payment_method, payment_status]
    );

    const created = await db.get(`
      SELECT p.*, g.full_name AS guest_name, rm.room_number
      FROM payments p
      JOIN reservations r ON p.reservation_id = r.id
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      WHERE p.id = ?
    `, [result.lastID]);

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/payments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, payment_status, payment_date } = req.body;

    const existing = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    if (amount !== undefined && Number(amount) <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }

    await db.run(
      `UPDATE payments 
       SET amount = COALESCE(?, amount),
           payment_method = COALESCE(?, payment_method),
           payment_status = COALESCE(?, payment_status),
           payment_date = COALESCE(?, payment_date)
       WHERE id = ?`,
      [
        amount !== undefined ? Number(amount) : null,
        payment_method || null,
        payment_status || null,
        payment_date || null,
        id
      ]
    );

    const updated = await db.get(`
      SELECT p.*, g.full_name AS guest_name, rm.room_number
      FROM payments p
      JOIN reservations r ON p.reservation_id = r.id
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      WHERE p.id = ?
    `, [id]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/payments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.run('DELETE FROM payments WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }
    res.json({ success: true, message: 'Payment record deleted.' });
  } catch (err) {
    next(err);
  }
});

function loadSqlExamples() {
  if (!fs.existsSync(queriesFilePath)) return [];
  const raw = fs.readFileSync(queriesFilePath, 'utf8');
  const sections = raw.split(/(?=-- CATEGORY:)/g);

  return sections.map((sec, idx) => {
    const lines = sec.trim().split('\n');
    let category = 'General';
    let description = '';
    const sqlLines = [];

    for (const line of lines) {
      if (line.startsWith('-- CATEGORY:')) {
        category = line.replace('-- CATEGORY:', '').trim();
      } else if (line.startsWith('-- Description:')) {
        description = line.replace('-- Description:', '').trim();
      } else {
        sqlLines.push(line);
      }
    }

    const sql = sqlLines.join('\n').trim();
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

    return {
      id: idx + 1,
      title: `${category} Query #${idx + 1}`,
      category,
      description,
      sql,
      isExecutable: isSelect
    };
  }).filter(q => q.sql.length > 0);
}

router.get('/sql-examples', (req, res) => {
  const examples = loadSqlExamples();
  res.json(examples);
});

router.post('/sql-examples/:id/run', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const examples = loadSqlExamples();
    const example = examples.find(e => e.id === id);

    if (!example) {
      return res.status(404).json({ error: 'SQL demonstration query not found.' });
    }

    if (!example.isExecutable) {
      return res.status(400).json({ error: 'This statement is DDL/DML for display purposes only.' });
    }

    const rows = await db.all(example.sql);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    res.json({
      queryId: id,
      category: example.category,
      sql: example.sql,
      columns,
      rows,
      rowCount: rows.length
    });
  } catch (err) {
    next(err);
  }
});

export default router;
