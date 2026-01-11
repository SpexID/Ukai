const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const multer =require('multer') ;
const authMiddleware = require('./authMiddleware');
const authRole = require('./authorizeRole');
const app = express();
const cloudinary = require('./cloudinary');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const http = require('http'); // 🟢 tambahkan baris ini
const WebSocket = require('ws');
const axios = require('axios');
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// MIDTRANSSS
// midtrans.js
const midtransClient = require('midtrans-client');

const isProduction = true;  // ubah ke true saat produksi
const serverKey = process.env.MIDTRANS_SERVER_KEY;
const clientKey = process.env.MIDTRANS_CLIENT_KEY;

let snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: serverKey,
  clientKey: clientKey
});
const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});
module.exports = { snap, clientKey };
app.post('/create-transaction', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { order_id, gross_amount, customer_details, item_details, paket_id } = req.body;

    if (!order_id || !gross_amount) {
      return res.status(400).json({ error: 'order_id dan gross_amount required' });
    }

    // double-check paket_id dan harga di DB (jika paket_id disertakan)
    if (paket_id) {
      const qPak = await pool.query('SELECT price FROM pakets WHERE id = $1', [paket_id]);
      if (qPak.rows.length === 0) return res.status(404).json({ error: 'Paket tidak ditemukan' });
      const priceDB = Number(qPak.rows[0].price || 0);
      if (priceDB !== Number(gross_amount)) {
        // kalau mismatch, tolak (atau pakai priceDB sebagai kebenaran)
        return res.status(400).json({ error: 'Jumlah pembayaran tidak sesuai harga paket' });
      }
    }

    // 1) simpan order di DB (PENDING)
    await pool.query(
      `INSERT INTO orders (order_id, user_id, paket_id, gross_amount, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (order_id) DO UPDATE SET updated_at = now()`,
      [order_id, user_id, paket_id || null, gross_amount, 'PENDING']
    );

    // 2) siapkan parameter Snap
    const parameter = {
      transaction_details: {
        order_id: order_id,
        gross_amount: Number(gross_amount),
      },
      customer_details: customer_details || {},
      item_details: item_details || [],
    };

    // optional: tambahkan credit_card atau enabled_payments dsb
    const transaction = await snap.createTransaction(parameter);

    // transaction.token & transaction.redirect_url tersedia
    return res.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id,
    });
  } catch (err) {
    console.error('create-transaction error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
app.post('/midtrans-notification', express.json(), async (req, res) => {
  try {
    console.log("📩 Midtrans webhook received:", JSON.stringify(req.body, null, 2));

    const notification = req.body;
    let statusResponse;

    // === Coba ambil status dari Midtrans API ===
    try {
      statusResponse = await core.transaction.notification(notification);
    } catch (apiErr) {
      console.warn("⚠️ Midtrans API error (kemungkinan test payload):", apiErr.message);
      // fallback ke data mentah dari webhook
      statusResponse = notification;
    }

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status || "unknown";
    const fraudStatus = statusResponse.fraud_status || "-";

    console.log("🔔 Notification received:", transactionStatus, orderId);

    // === Cek dulu order di DB ===
    const q = await pool.query(
      `SELECT user_id, paket_id FROM orders WHERE order_id = $1`,
      [orderId]
    );

    if (q.rows.length === 0) {
      console.warn("⚠️ Order ID tidak ditemukan di database:", orderId);
      return res.status(200).json({ message: "Order not found, ignored" });
    }

    const { user_id, paket_id } = q.rows[0];

    // === Update status berdasarkan transaksi ===
    if (transactionStatus === "capture" || transactionStatus === "settlement") {
      await pool.query(`UPDATE orders SET status = 'PAID', updated_at = NOW() WHERE order_id = $1`, [orderId]);
      await pool.query(
        `INSERT INTO user_pakets (user_id, paket_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, paket_id) DO NOTHING`,
        [user_id, paket_id]
      );
      console.log(`✅ Order ${orderId} ditandai sebagai PAID`);
    } else if (transactionStatus === "pending") {
      await pool.query(`UPDATE orders SET status = 'PENDING', updated_at = NOW() WHERE order_id = $1`, [orderId]);
      console.log(`🕒 Order ${orderId} masih pending`);
    } else if (["deny", "cancel", "expire"].includes(transactionStatus)) {
      await pool.query(`UPDATE orders SET status = 'FAILED', updated_at = NOW() WHERE order_id = $1`, [orderId]);
      console.log(`❌ Order ${orderId} gagal (${transactionStatus})`);
    } else {
      console.log(`ℹ️ Status ${transactionStatus} tidak dikenali, diabaikan`);
    }

    res.status(200).json({ message: "Notification processed" });
  } catch (err) {
    console.error("❌ Notification Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get('/orders/:orderId/status', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    // cek dulu DB lokal
    const q = await pool.query('SELECT order_id, status, user_id, paket_id FROM orders WHERE order_id = $1', [orderId]);
    if (q.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const order = q.rows[0];
    // jika sudah PAID di DB, kembalikan langsung
    if (['PAID', 'SETTLEMENT', 'paid', 'settlement'].includes(String(order.status).toUpperCase())) {
      return res.json({ order_id: orderId, status: order.status });
    }

    // panggil Midtrans Get Status API
    const url = `${MIDTRANS_BASE}/v2/${encodeURIComponent(orderId)}/status`;
    const basicAuth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString('base64');

    const resp = await axios.get(url, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    const statusResp = resp.data;
    const transaction_status = statusResp.transaction_status;
    const fraud_status = statusResp.fraud_status;

    // update DB berdasarkan response
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      await pool.query('UPDATE orders SET status=$1, updated_at=now() WHERE order_id=$2', ['PAID', orderId]);
      if (order.paket_id) {
        await pool.query('INSERT INTO user_pakets (user_id, paket_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [order.user_id, order.paket_id]);
      }
    } else {
      // tulis status apapun ke DB agar sinkron
      await pool.query('UPDATE orders SET status=$1, updated_at=now() WHERE order_id=$2', [transaction_status.toUpperCase(), orderId]);
    }

    return res.json({ order_id: orderId, midtrans: statusResp });
  } catch (err) {
    console.error('GET /orders/:orderId/status error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// === WEBHOOK ===
app.post('/midtrans/webhook', async (req, res) => {
  try {
    const notification = req.body;
    const statusResponse = await core.transaction.notification(notification);

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log("📩 Webhook diterima:", { orderId, transactionStatus, fraudStatus });

    // Update status ke database kamu
    if (transactionStatus === "capture" && fraudStatus === "accept") {
      await updateOrderStatus(orderId, "SUCCESS");
    } else if (transactionStatus === "settlement") {
      await updateOrderStatus(orderId, "SUCCESS");
    } else if (transactionStatus === "pending") {
      await updateOrderStatus(orderId, "PENDING");
    } else if (
      transactionStatus === "deny" ||
      transactionStatus === "cancel" ||
      transactionStatus === "expire"
    ) {
      await updateOrderStatus(orderId, "FAILED");
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Webhook error");
  }
});

/////////////////////////////////////////////////////////////////////////////////////////
// app.use((req, res, next) => {
//   const allowedOrigins = ['http://localhost:5173', 'https://rumah-ukai.my.id'];
//   const origin = req.headers.origin;
//   if (allowedOrigins.includes(origin)) {
//     res.header('Access-Control-Allow-Origin', origin);
//   }
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//   res.header('Access-Control-Allow-Credentials', 'true'); // penting kalau pakai cookies
//   next();
// });
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', 'https://rumah-ukai.my.id');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   next();
// });
// // CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:5173']; // cukup satu, jangan dobel
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// helper: jika pdf_url adalah Google Drive share, ubah ke direct download
function normalizeGoogleDriveUrl(url) {
  if (!url) return url;
  // contoh share: https://drive.google.com/file/d/FILEID/view?usp=sharing
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) {
    const id = m[1];
    return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  // handle other forms (sharing with open?id=...)
  const q = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (q && q[1]) {
    return `https://drive.google.com/uc?export=download&id=${q[1]}`;
  }
  return url;
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // kalau error coba 587
  secure: true, // true untuk 465, false untuk 587
  auth: {
    user: process.env.EMAIL_USER, // alamat email
    pass: process.env.EMAIL_PASS  // App Password, bukan password biasa
  },
  connectionTimeout: 10000, // 10 detik
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false
  }
});

app.post(
  '/user/send-code',
  // rate limiter dideklarasikan inline sebagai middleware
  // rateLimit({
  //   windowMs: 15 * 60 * 1000, // 15 menit
  //   max: 8, // max 8 request per IP per window
  //   standardHeaders: true,
  //   legacyHeaders: false,
  //   handler: (req, res) => {
  //     return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
  //   },
  // }),
  async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email required' });
      }

      const emailNormalized = email.trim().toLowerCase();

      // Cari user berdasarkan email (case-insensitive)
      const q = await pool.query(
        'SELECT id, verification_expires FROM users WHERE LOWER(email) = $1',
        [emailNormalized]
      );

      // Jika user tidak ditemukan -> log internal, tapi tetap kembalikan respons generik
      if (q.rows.length === 0) {
        console.log(`send-code: request for non-existing email ${emailNormalized} from IP ${req.ip}`);
        return res.json({ message: 'Jika akun tersedia, kode verifikasi akan dikirim ke email.' });
      }

      const user = q.rows[0];

      // Simple cooldown: cek apakah kode sebelumnya baru saja dikirim (< 60 detik)
      if (user.verification_expires) {
        const prevExpires = new Date(user.verification_expires);
        const oneMinuteAgo = new Date(Date.now() - 60 * 100);
        // Jika prevExpires masih lebih besar dari oneMinuteAgo, berarti baru dikirim
        // if (prevExpires > oneMinuteAgo) {
        //   console.log(`send-code: cooldown for user id=${user.id} IP=${req.ip}`);
        //   return res.status(429).json({ error: 'Tunggu sebentar sebelum mengirim kode lagi.' });
        // }
      }

      // generate kode 6 digit (gunakan crypto.randomInt kalau tersedia)
      const code =
        typeof crypto.randomInt === 'function'
          ? crypto.randomInt(100000, 1000000).toString()
          : Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

      // simpan kode dan expiry ke DB
      await pool.query(
        `UPDATE users
         SET verification_code = $1, verification_expires = $2
         WHERE id = $3`,
        [code, expires, user.id]
      );

      // buat transporter nodemailer (dibuat di sini agar tidak perlu dependensi luar)
      const transporter = nodemailer.createTransport({
        service: 'gmail', // sesuaikan jika pakai SMTP lain
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS, // app password atau credential sesuai provider
        },
      });

      // kirim email (bungkus di try/catch terpisah supaya bisa tangani error mail)
      try {
        await transporter.sendMail({
          from: `"Kode verifikasi" <${process.env.EMAIL_USER}>`,
          to: emailNormalized,
          subject: 'Kode Reset Password',
          text: `Kode reset password Anda: ${code}. Berlaku 10 menit.`,
          html: `<p>Kode reset password Anda: <b>${code}</b><br/>Berlaku 10 menit.</p>`,
        });
      } catch (mailErr) {
        console.error('send-code: failed sending mail for user id=', user.id, mailErr);
        // Opsional: rollback kode di DB jika perlu; di sini kita biarkan tapi beri pesan generik
        return res.status(500).json({ error: 'Gagal mengirim email. Silakan coba lagi nanti.' });
      }

      console.log(`send-code: code sent to user id=${user.id} email=${emailNormalized} IP=${req.ip}`);
      // Balas generik (tidak mengkonfirmasi eksistensi akun)
      return res.json({ message: 'Jika akun tersedia, kode verifikasi akan dikirim ke email.' });
    } catch (err) {
      console.error('send-code: unexpected error', err.stack || err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
// POST /verify-code  (public - forgot password flow)
app.post('/user/verify-code', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'email, code, dan newPassword dibutuhkan' });
    }

    const emailNorm = email.trim().toLowerCase();
    const q = await pool.query(
      `SELECT id, verification_code, verification_expires
       FROM users WHERE LOWER(email) = $1`,
      [emailNorm]
    );

    if (q.rows.length === 0) {
      // jangan bocorkan bahwa akun tidak ada — respon generik
      console.log(`verify-code: attempt for non-existing email ${emailNorm} IP=${req.ip}`);
      return res.status(400).json({ error: 'Kode salah atau telah kadaluarsa' });
    }

    const user = q.rows[0];

    if (!user.verification_code || user.verification_code !== code) {
      return res.status(400).json({ error: 'Kode salah atau telah kadaluarsa' });
    }

    if (!user.verification_expires || new Date() > new Date(user.verification_expires)) {
      return res.status(400).json({ error: 'Kode sudah expired' });
    }

    // hash password baru dan update DB
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users
       SET password = $1, verification_code = NULL, verification_expires = NULL
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    return res.json({ message: 'Password berhasil diganti' });
  } catch (err) {
    console.error('verify-code (public) error:', err.stack || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



// ✅ Get current user (profile)
app.get('/user', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, foto FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ✅ Update foto user
app.patch('/user/foto', authMiddleware, async (req, res) => {
  const { foto } = req.body;

  if (!foto) {
    return res.status(400).json({ error: 'Foto is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET foto = $1 WHERE id = $2 RETURNING foto',
      [foto, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Foto updated successfully',
      foto: result.rows[0].foto,
    });
  } catch (error) {
    console.error('Error updating foto:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Tambah paket untuk user (secure)
app.post('/user-pakets', authMiddleware, async (req, res) => {
  const { paket_id, order_id } = req.body;
  const user_id = req.user.id;

  if (!paket_id) {
    return res.status(400).json({ error: 'paket_id is required' });
  }

  try {
    // ambil harga di DB
    const q = await pool.query('SELECT price FROM pakets WHERE id = $1', [paket_id]);
    if (q.rows.length === 0) return res.status(404).json({ error: 'Paket tidak ditemukan' });
    const price = Number(q.rows[0].price || 0);

    // if caller wants finalize via order_id (after payment)
    if (order_id) {
      const qOrder = await pool.query('SELECT order_id, user_id, paket_id, status FROM orders WHERE order_id = $1', [order_id]);
      if (qOrder.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });
      const order = qOrder.rows[0];

      if (order.user_id !== user_id) return res.status(403).json({ error: 'Order tidak milik user ini' });
      if (order.paket_id !== paket_id) return res.status(400).json({ error: 'Order tidak sesuai paket' });

      // hanya finalize kalau status PAID/SETTLEMENT
      if (!['PAID', 'SETTLEMENT', 'settlement', 'paid'].includes(order.status)) {
        return res.status(400).json({ error: 'Pembayaran belum terkonfirmasi' });
      }

      await pool.query('INSERT INTO user_pakets (user_id, paket_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user_id, paket_id]);
      return res.status(201).json({ message: 'Paket added after payment' });
    }

    // jika paket gratis → langsung insert
    if (price === 0) {
      await pool.query('INSERT INTO user_pakets (user_id, paket_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user_id, paket_id]);
      return res.status(201).json({ free: true, message: 'Paket gratis berhasil ditambahkan' });
    }

    // paket berbayar: beri tahu frontend untuk melanjutkan pembayaran
    return res.status(402).json({ error: 'Paket berbayar, lakukan pembayaran', needsPayment: true });
  } catch (err) {
    console.error('secure user-pakets error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



// Get semua paket user
app.get('/user-pakets', authMiddleware, async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT p.* 
       FROM pakets p
       INNER JOIN user_pakets up ON p.id = up.paket_id
       WHERE up.user_id = $1`,
      [user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user pakets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body; // <-- role dihapus, tidak diambil dari client
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailNorm = email.trim().toLowerCase();

    // cari user berdasarkan email (case-insensitive)
    const existingQ = await pool.query(
      'SELECT id, verified FROM users WHERE LOWER(email) = $1',
      [emailNorm]
    );

    // generate kode & expiry (6 digit)
    const code = (typeof crypto.randomInt === 'function')
      ? crypto.randomInt(100000, 1000000).toString()
      : Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    // buat transporter (sesuaikan provider / env var)
    const transporter = nodemailer.createTransport({
      service: 'gmail', // ubah jika perlu
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // jika user sudah ada
    if (existingQ.rows.length > 0) {
      const user = existingQ.rows[0];
      if (user.verified) {
        // sudah verified -> tolak pendaftaran ulang
        return res.status(400).json({ error: 'Email already registered' });
      }

      // belum verified -> update password & kode (resend)
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users
         SET password = $1,
             verification_code = $2,
             verification_expires = $3
         WHERE id = $4`,
        [hashedPassword, code, expires, user.id]
      );

      // kirim email kode
      try {
        await transporter.sendMail({
          from: `"Kode verifikasi" <${process.env.EMAIL_USER}>`,
          to: emailNorm,
          subject: 'Kode Verifikasi Pendaftaran (ulang)',
          text: `Kode verifikasi Anda: ${code}. Berlaku 10 menit.`,
          html: `<p>Kode verifikasi Anda: <b>${code}</b><br/>Berlaku 10 menit.</p>`,
        });
      } catch (mailErr) {
        console.error('register (resend) sendMail err:', mailErr);
        return res.status(500).json({ error: 'Gagal mengirim email. Coba lagi nanti.' });
      }

      return res.json({
        message: 'Akun belum diverifikasi — kode verifikasi telah dikirim ulang ke email jika akun tersedia.'
      });
    }

    // user baru -> insert user dengan role tetap 'user' (bukan dari client)
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQ = await pool.query(
      `INSERT INTO users (email, password, role, verification_code, verification_expires, verified)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, email`,
      [emailNorm, hashedPassword, 'user', code, expires]
    );

    // kirim email kode
    try {
      await transporter.sendMail({
        from: `"Kode Verifikasi" <${process.env.EMAIL_USER}>`,
        to: emailNorm,
        subject: 'Kode Verifikasi Pendaftaran',
        text: `Kode verifikasi Anda: ${code}. Berlaku 10 menit.`,
        html: `<p>Kode verifikasi Anda: <b>${code}</b><br/>Berlaku 10 menit.</p>`,
      });
    } catch (mailErr) {
      console.error('register sendMail err:', mailErr);
      // optional: hapus user baru jika kirim email gagal
      // await pool.query('DELETE FROM users WHERE id = $1', [insertQ.rows[0].id]);
      return res.status(500).json({ error: 'Gagal mengirim email. Silakan coba lagi nanti.' });
    }

    return res.status(201).json({ message: 'Registrasi sukses — kode verifikasi dikirim ke email.' });
  } catch (err) {
    console.error('register error:', err.stack || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------
// POST /register/verify
// ---------------------
// (Verifikasi kode, set verified true, dan kembalikan JWT agar pengguna otomatis login)
app.post('/register/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email dan kode diperlukan' });

    const emailNorm = email.trim().toLowerCase();
    const q = await pool.query(
      `SELECT id, verification_code, verification_expires, verified
       FROM users WHERE LOWER(email) = $1`,
      [emailNorm]
    );

    if (q.rows.length === 0) {
      return res.status(400).json({ error: 'Kode salah atau email tidak ditemukan' });
    }

    const user = q.rows[0];

    if (user.verified) {
      return res.status(400).json({ error: 'Akun sudah terverifikasi' });
    }

    if (!user.verification_code || user.verification_code !== code) {
      return res.status(400).json({ error: 'Kode salah' });
    }

    if (!user.verification_expires || new Date() > new Date(user.verification_expires)) {
      return res.status(400).json({ error: 'Kode sudah expired' });
    }

    // set verified true dan bersihkan kode
    await pool.query(
      `UPDATE users
       SET verified = true, verification_code = NULL, verification_expires = NULL
       WHERE id = $1`,
      [user.id]
    );

    // buat payload & token
    // ambil info user lebih lengkap bila perlu (email/role)
    const userInfoQ = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [user.id]);
    const payload = {
      id: userInfoQ.rows[0].id,
      email: userInfoQ.rows[0].email,
      role: userInfoQ.rows[0].role,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    const expirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000;

    return res.json({ message: 'Verifikasi sukses', token, expiresIn: expirationTime, user: payload });
  } catch (err) {
    console.error('register/verify error:', err.stack || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



// ================= Login =================
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Login attempt', email, password);

    // buat case-insensitive
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'User not found' });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid password' });

    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    const expirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000;

    res.json({
      token,
      expiresIn: expirationTime,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});







app.post('/user-pakets', authMiddleware, async (req, res) => {
  const { paket_id } = req.body;
  if (!paket_id) return res.status(400).json({ error: 'paket_id required' });

  try {
    // Ambil info paket
    const result = await pool.query('SELECT * FROM pakets WHERE id=$1', [paket_id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Paket tidak ditemukan' });

    const paket = result.rows[0];

    // Cek apakah sudah dimiliki user
    const check = await pool.query(
      'SELECT * FROM user_pakets WHERE user_id=$1 AND paket_id=$2',
      [req.user.id, paket_id]
    );
    if (check.rowCount > 0) return res.status(400).json({ error: 'Paket sudah dimiliki' });

    if (Number(paket.price) === 0) {
      // Gratis → langsung tambah
      await pool.query('INSERT INTO user_pakets(user_id, paket_id) VALUES($1, $2)', [req.user.id, paket_id]);
      return res.json({ free: true, message: 'Paket gratis berhasil ditambahkan' });
    }

    // Bayar → buat url pembayaran (contoh dummy)
    const paymentUrl = `https://payment.example.com/pay?paket=${paket_id}&user=${req.user.id}`;
    res.json({ free: false, paymentUrl });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/user-pakets', authMiddleware, async (req, res) => {
  const { paket_id } = req.body;
  if (!paket_id) return res.status(400).json({ error: 'paket_id required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ambil paket dari DB (pastikan kolom price bertipe numeric/integer)
    const paketQ = await client.query('SELECT id, name, price FROM pakets WHERE id = $1', [paket_id]);
    if (paketQ.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Paket tidak ditemukan' });
    }

    const paket = paketQ.rows[0];
    // Logging untuk debugging
    console.log('POST /user-pakets called', { userId: req.user.id, paket_id, paketPriceFromDb: paket.price });

    // Pastikan price adalah number
    const priceNum = Number(paket.price ?? 0);
    if (Number.isNaN(priceNum)) {
      await client.query('ROLLBACK');
      console.error('Price is NaN for paket', paket_id, 'raw:', paket.price);
      return res.status(500).json({ error: 'Invalid paket price on server' });
    }

    // Cek apakah user sudah punya paket
    const checkQ = await client.query('SELECT 1 FROM user_pakets WHERE user_id = $1 AND paket_id = $2', [req.user.id, paket_id]);
    if (checkQ.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Paket sudah dimiliki', paket_id, price: priceNum });
    }

    if (priceNum === 0) {
      // Gratis -> insert
      await client.query(
        'INSERT INTO user_pakets (user_id, paket_id, created_at) VALUES ($1, $2, now()) ON CONFLICT DO NOTHING',
        [req.user.id, paket_id]
      );

      await client.query('COMMIT');
      return res.json({ free: true, message: 'Paket gratis berhasil ditambahkan', paket_id, price: priceNum });
    }

    // Berbayar -> jangan insert, beri path pembayaran internal
    await client.query('ROLLBACK'); // tidak melakukan insert
    const paymentPath = `/pembayaran?paket=${encodeURIComponent(paket_id)}`;

    return res.json({ free: false, paymentPath, paket_id, price: priceNum });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /user-pakets error:', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// contoh endpoint buat admin menambah paket (sudah ada di projectmu; contoh sederhana)
app.post('/pakets', authMiddleware, authRole(['admin', 'superadmin']), async (req, res) => {
  const { id, name, price, image, closed_at, detail1, detail2, detail3, detail4, detail5 } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO pakets (id, name, price, image, closed_at, detail1, detail2, detail3, detail4, detail5, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
       RETURNING *`,
      [id, name, price, image, closed_at, detail1, detail2, detail3, detail4, detail5]
    );
    return res.status(201).json({ message: 'Paket created', data: result.rows[0] });
  } catch (err) {
    console.error('POST /pakets error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});
// Public routes
app.get('/pakets', async (req, res) => {
  try {
    const hotels = await pool.query('SELECT * FROM pakets');
    res.json(hotels.rows);
  } catch (error) {
    console.error('Error fetching pakets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ambil detail paket (termasuk price) — authoritative
app.get('/pakets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const q = await pool.query('SELECT id, name, price, image, detail1, detail2, detail3, detail4, detail5 FROM pakets WHERE id = $1', [id]);
    if (q.rows.length === 0) return res.status(404).json({ error: 'Paket tidak ditemukan' });
    return res.json(q.rows[0]);
  } catch (err) {
    console.error('GET /pakets/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// ✅ Create new paket (Admin only)
// ✅ Assign (buy) paket for current user
app.post('/mypakets', authMiddleware, async (req, res) => {
  const { paket_id } = req.body;

  try {
    // Cek apakah paket ada
    const paketCheck = await pool.query('SELECT * FROM pakets WHERE id = $1', [paket_id]);
    if (paketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Paket not found' });
    }

    // Cek apakah user sudah punya paket
    const existing = await pool.query(
      'SELECT * FROM user_pakets WHERE user_id = $1 AND paket_id = $2',
      [req.user.id, paket_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already owns this paket' });
    }

    // Insert ke user_pakets
    const result = await pool.query(
      `INSERT INTO user_pakets (user_id, paket_id)
       VALUES ($1, $2)
       RETURNING *`,
      [req.user.id, paket_id]
    );

    res.status(201).json({
      message: 'Paket successfully added to user',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error adding paket to user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ✅ Get all pakets owned by current user
app.get('/mypakets', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.price, up.bought_at
       FROM user_pakets up
       JOIN pakets p ON up.paket_id = p.id
       WHERE up.user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user pakets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Assign (buy) paket for current user
app.post('/mypakets', authMiddleware, async (req, res) => {
  const { paket_id } = req.body;

  try {
    // Cek apakah paket ada
    const paketCheck = await pool.query('SELECT * FROM pakets WHERE id = $1', [paket_id]);
    if (paketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Paket not found' });
    }

    // Cek apakah user sudah punya paket
    const existing = await pool.query(
      'SELECT * FROM user_pakets WHERE user_id = $1 AND paket_id = $2',
      [req.user.id, paket_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already owns this paket' });
    }

    // Insert ke user_pakets
    const result = await pool.query(
      `INSERT INTO user_pakets (user_id, paket_id)
       VALUES ($1, $2)
       RETURNING *`,
      [req.user.id, paket_id]
    );

    res.status(201).json({
      message: 'Paket successfully added to user',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error adding paket to user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





app.get('/tryouts', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, p.closed_at 
      FROM tryouts t
      JOIN pakets p ON t.paket_id = p.id
      ORDER BY t.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tryouts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post(
  '/tryouts',
  authMiddleware,
  authRole(['admin', 'superadmin']),
  async (req, res) => {
    const { id, name, description, paket_id, duration_minutes, pdf_url } = req.body;

    if (!id || !name || !paket_id) {
      return res.status(400).json({ error: 'id, name, and paket_id are required' });
    }

    // Extract fileId from google drive link (if any)
    let finalPdfUrl = null;
    if (pdf_url) {
      const match = pdf_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        const fileId = match[1];
        finalPdfUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      } else {
        // fallback: kalau user langsung kasih direct link / preview link
        finalPdfUrl = pdf_url;
      }
    }

    try {
      const result = await pool.query(
        `INSERT INTO tryouts (id, name, description, paket_id, duration_minutes, pdf_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, name, description || null, paket_id, duration_minutes || 100, finalPdfUrl]
      );

      res.status(201).json({
        message: 'Tryout created successfully',
        tryout: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating tryout:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


// GET tryout by ID// GET tryout by ID (auto filter expired in SQL)
app.get('/tryouts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT t.*, p.closed_at
      FROM tryouts t
      JOIN pakets p ON t.paket_id = p.id
      WHERE t.id = $1
      `,
      [id.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tryout not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tryout by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
  
}

// app.get('/tryouts/:id/pdf-file', authMiddleware, async (req, res) => {
//   const { id } = req.params;
//   const userId = req.user.id;

//   try {
//     // Ambil info tryout dari DB
//     const tryoutRes = await pool.query(
//       `SELECT t.id, t.name, t.pdf_url, t.paket_id, p.closed_at
//        FROM tryouts t
//        JOIN pakets p ON t.paket_id = p.id
//        WHERE t.id = $1`,
//       [id]
//     );

//     if (tryoutRes.rows.length === 0) {
//       return res.status(404).json({ error: 'Tryout not found' });
//     }

//     const tryout = tryoutRes.rows[0];

//     // cek expired
//     if (tryout.closed_at && new Date(tryout.closed_at) < new Date()) {
//       return res.status(403).json({ error: 'Paket expired, tidak bisa buka PDF' });
//     }

//     // cek apakah user punya paket ini
//     const paketRes = await pool.query(
//       `SELECT 1 FROM user_pakets WHERE user_id = $1 AND paket_id = $2 LIMIT 1`,
//       [userId, tryout.paket_id]
//     );
//     if (paketRes.rows.length === 0) {
//       return res.status(403).json({ error: 'Kamu tidak memiliki paket ini' });
//     }

//     // cek attempt
//     const attemptRes = await pool.query(
//       `SELECT 1 FROM quiz_attempt WHERE user_id = $1 AND tryout_id = $2 LIMIT 1`,
//       [userId, id]
//     );
//     if (attemptRes.rows.length === 0) {
//       return res.status(403).json({ error: 'Kamu harus attempt dulu sebelum buka PDF' });
//     }

//     // 🔥 Bersihkan link Google Drive
//     let finalUrl = tryout.pdf_url;
//     const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([^/]+)\/view/i;
//     const match = finalUrl.match(driveRegex);
//     if (match && match[1]) {
//       const fileId = match[1];
//       finalUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
//     }

//     // Ambil file PDF pakai Axios
//     const pdfResponse = await axios.get(finalUrl, { responseType: 'arraybuffer' });

//     res.setHeader('Content-Type', 'application/pdf');
//     res.send(Buffer.from(pdfResponse.data));

//   } catch (error) {
//     console.error('Error proxying PDF:', error);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

app.get('/tryouts/:id/pdf-file', async (req, res) => {
  try {
    // Misal ambil link PDF dari DB
    const pdfUrl = 'https://drive.google.com/uc?export=download&id=1cX2raILDrgtpcWo51hUacA8jTvnW431j';

    // Fetch binary PDF
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });

    res.setHeader('Content-Type', 'application/pdf');
    res.send(response.data);
  } catch (err) {
    console.error('Error proxying PDF:', err);
    res.status(500).json({ error: 'Failed to fetch PDF' });
  }
});
// Fungsi konversi Google Drive link ke format download
function convertDriveUrl(url) {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
}

function extractDriveId(url) {
  if (!url) return null;
  const m = String(url).match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  const m2 = String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m2 ? m2[1] : null;
}

app.get('/tryout-pdf-url', async (req, res) => {
  try {
    const { tryoutId } = req.query;
    if (!tryoutId) return res.status(400).send('tryoutId required');

    const result = await pool.query('SELECT pdf_url FROM tryouts WHERE id = $1', [tryoutId]);
    if (result.rows.length === 0) return res.status(404).send('TryoutId tidak ditemukan');

    const rawUrl = String(result.rows[0].pdf_url).trim();
    const driveId = extractDriveId(rawUrl);

    res.json({
      pdfUrl: rawUrl,
      driveId,
      previewUrl: driveId ? `https://drive.google.com/file/d/${driveId}/preview` : rawUrl,
      viewUrl: driveId ? `https://drive.google.com/file/d/${driveId}/view?usp=sharing` : rawUrl,
      downloadUrl: driveId ? `https://drive.google.com/uc?export=download&id=${driveId}` : rawUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});



app.get('/tryouts/:id/pdf-file', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const tryoutRes = await pool.query(
      `SELECT t.id, t.pdf_url, t.paket_id, p.closed_at
       FROM tryouts t
       JOIN pakets p ON t.paket_id = p.id
       WHERE t.id = $1`,
      [id]
    );

    if (tryoutRes.rows.length === 0) return res.status(404).json({ error: 'Tryout not found' });

    const tryout = tryoutRes.rows[0];

    if (tryout.closed_at && new Date(tryout.closed_at) < new Date())
      return res.status(403).json({ error: 'Paket expired' });

    const paketRes = await pool.query(
      `SELECT 1 FROM user_pakets WHERE user_id = $1 AND paket_id = $2 LIMIT 1`,
      [userId, tryout.paket_id]
    );
    if (paketRes.rows.length === 0)
      return res.status(403).json({ error: 'Kamu tidak memiliki paket ini' });

    // 🔥 Proxy file Google Drive
    let finalUrl = tryout.pdf_url;
    const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([^/]+)\/view/i;
    const match = finalUrl.match(driveRegex);
    if (match && match[1]) {
      const fileId = match[1];
      finalUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    const pdfResp = await fetch(finalUrl);
    if (!pdfResp.ok) return res.status(500).json({ error: 'Gagal fetch PDF dari Google Drive' });

    const buffer = await pdfResp.arrayBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Error proxying PDF:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/tryouts/:id/pdf/stream', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const tryoutRes = await pool.query(
      `SELECT t.id, t.name, t.pdf_url, t.paket_id, p.closed_at
       FROM tryouts t
       JOIN pakets p ON t.paket_id = p.id
       WHERE t.id = $1
      `,
      [id]
    );

    if (tryoutRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tryout not found' });
    }
    const tryout = tryoutRes.rows[0];

    // cek expired paket
    if (tryout.closed_at && new Date(tryout.closed_at) < new Date()) {
      return res.status(403).json({ error: 'Paket expired, tidak bisa buka PDF' });
    }

    // cek kepemilikan paket
    const paketRes = await pool.query(
      `SELECT 1 FROM user_pakets WHERE user_id = $1 AND paket_id = $2 LIMIT 1`,
      [userId, tryout.paket_id]
    );
    if (paketRes.rows.length === 0) {
      return res.status(403).json({ error: 'Kamu tidak memiliki paket ini' });
    }

    // cek apakah user sudah attempt tryout ini
    const attemptRes = await pool.query(
      `SELECT 1 FROM quiz_attempt WHERE user_id = $1 AND tryout_id = $2 LIMIT 1`,
      [userId, id]
    );
    if (attemptRes.rows.length === 0) {
      return res.status(403).json({ error: 'Kamu harus attempt dulu sebelum buka PDF' });
    }

    if (!tryout.pdf_url) {
      return res.status(404).json({ error: 'PDF not uploaded for this tryout' });
    }

    // Normalize (jika google drive link)
    const sourceUrl = normalizeGoogleDriveUrl(tryout.pdf_url);

    // Fetch remote file as arraybuffer/stream
    const resp = await axios.get(sourceUrl, {
      responseType: 'arraybuffer', // kita ambil binary
      // optional: timeout, headers
      timeout: 20000,
    });

    // Set headers: inline (so browser won't download a file automatically) 
    // Note: client will get binary and use pdfjs to render
    res.setHeader('Content-Type', 'application/pdf');
    // prevent caching if you want
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.send(Buffer.from(resp.data));
  } catch (err) {
    console.error('Error streaming tryout PDF:', err);
    if (err.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: 'Timeout fetching source PDF' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});


const upload = multer();// ✅ Update PDF URL untuk Tryout tertentu
// PATCH update PDF URL untuk tryout (auto clean Google Drive link)
app.patch(
  '/tryouts/:id/pdf',
  authMiddleware,
  authRole(['admin', 'superadmin']),
  async (req, res) => {
    const { id } = req.params;
    let { pdf_url } = req.body;

    if (!pdf_url) {
      return res.status(400).json({ error: 'pdf_url is required' });
    }

    try {
      // 🔥 Bersihkan link Google Drive jika masih format /view
      const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([^/]+)\/view/i;
      const match = pdf_url.match(driveRegex);
      if (match && match[1]) {
        const fileId = match[1];
        pdf_url = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }

      // Update DB
      const result = await pool.query(
        `UPDATE tryouts SET pdf_url = $1 WHERE id = $2 RETURNING id, name, pdf_url`,
        [pdf_url, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tryout not found' });
      }

      res.json({
        message: 'PDF URL updated successfully',
        tryout: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating PDF URL:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
app.get('/time', (req, res) => {
  const now = new Date();
  const server_now = now.toISOString();
  const server_time = now.toLocaleTimeString('en-US', { hour12: false });
  res.json({ server_now, server_time });
});

// =====================
// ✅ Setup HTTP + WebSocket Server
// =====================
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('[WS] client connected');

  const sendTime = () => {
    const now = new Date();
    ws.send(JSON.stringify({
      type: 'time',
      server_now: now.toISOString(),
      server_time: now.toLocaleTimeString('en-US', { hour12: false }),
    }));
  };

  // kirim waktu setiap 1 detik
  const interval = setInterval(sendTime, 1000);

  ws.on('close', () => {
    console.log('[WS] client disconnected');
    clearInterval(interval);
  });
});


// ✅ Protected routes
app.get('/quizattempt', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM quiz_attempt WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quiz_attempt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ✅ GET /quizattempt/active/:tryoutId
app.get('/quizattempt/active/:tryoutId', authMiddleware, async (req, res) => {
  try {
    const { tryoutId } = req.params;

    const activeRes = await pool.query(
      `
      SELECT *,
             NOW() AT TIME ZONE 'UTC' AS server_now,
             (start_time + (duration_minutes * INTERVAL '1 minute')) AT TIME ZONE 'UTC' AS end_time
      FROM quiz_attempt
      WHERE user_id = $1 AND tryout_id = $2 AND status = 'ongoing'
      ORDER BY attempt_number DESC
      LIMIT 1
      `,
      [req.user.id, tryoutId]
    );

    if (activeRes.rows.length === 0) {
      return res.status(404).json({ error: 'No active attempt found' });
    }

    const attempt = activeRes.rows[0];
    res.json({
      ...attempt,
      server_now: new Date(attempt.server_now).toISOString(),
      end_time: new Date(attempt.end_time).toISOString(),
    });
  } catch (err) {
    console.error('Error fetching active attempt:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/quizattempt/ranking/:tryoutId/:attemptNumber', authMiddleware, async (req, res) => {
  const { tryoutId, attemptNumber } = req.params;

  try {
    // Ambil semua peserta untuk attempt tertentu
    const result = await pool.query(
      `SELECT user_id, grade
       FROM quiz_attempt 
       WHERE tryout_id = $1 AND attempt_number = $2 AND grade IS NOT NULL
       ORDER BY grade DESC`,
      [tryoutId, attemptNumber]
    );

    const attempts = result.rows;

    if (attempts.length === 0) {
      return res.json({
        message: "Belum ada attempt untuk tryout ini.",
        rank: null,
        total: 0,
      });
    }

    // Hitung ranking user yang login
    const total = attempts.length;
    let rank = null;

    for (let i = 0; i < attempts.length; i++) {
      if (attempts[i].user_id === req.user.id) {
        rank = i + 1; // Ranking mulai dari 1
        break;
      }
    }

    // Jika user belum ikut attempt ini
    if (!rank) {
      return res.json({
        message: "Anda belum mengerjakan attempt ini.",
        rank: null,
        total,
      });
    }

    res.json({
      tryoutId,
      attemptNumber: Number(attemptNumber),
      rank,
      total,
      text: `Ranking ${rank}/${total}`,
    });

  } catch (error) {
    console.error('Error computing ranking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/quizattempt/:tryoutId', authMiddleware, async (req, res) => {
  const { tryoutId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM quiz_attempt WHERE user_id = $1 AND tryout_id = $2 ORDER BY attempt_number DESC',
      [req.user.id, tryoutId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quiz_attempt by user/tryout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Get specific attempt berdasarkan tryoutId + attempt_number
app.get('/quizattempt/:tryoutId/:attemptNumber', authMiddleware, async (req, res) => {
  const { tryoutId, attemptNumber } = req.params;
  try {
    const result = await pool.query(
      `SELECT qa.*,
              NOW() AS server_now,
              (qa.start_time + (qa.duration_minutes * INTERVAL '1 minute')) AS end_time
       FROM quiz_attempt qa
       WHERE qa.tryout_id = $1 AND qa.user_id = $2 AND qa.attempt_number = $3
       LIMIT 1`,
      [tryoutId, req.user.id, attemptNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const row = result.rows[0];
    const payload = {
      ...row,
      server_now: row.server_now ? new Date(row.server_now).toISOString() : new Date().toISOString(),
      end_time: row.end_time ? new Date(row.end_time).toISOString() : null,
    };

    res.json(payload);
  } catch (error) {
    console.error('Error fetching quiz_attempt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ✅ POST /quizattempt/start
// POST /quizattempt/start
// ===============================================
// Start Quiz Attempt Endpoint
// ===============================================

app.post('/quizattempt/start', authMiddleware, async (req, res) => {
  try {
    const { tryout_id } = req.body;
    if (!tryout_id) {
      return res.status(400).json({ error: 'tryout_id is required' });
    }

    // ✅ Ambil data tryout dan cek apakah kadaluarsa
    const tryoutRes = await pool.query(
      `
      SELECT t.paket_id, p.closed_at, t.duration_minutes
      FROM tryouts t
      LEFT JOIN pakets p ON t.paket_id = p.id
      WHERE t.id = $1
      LIMIT 1
      `,
      [tryout_id]
    );

    if (tryoutRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tryout tidak ditemukan' });
    }

    const { closed_at, duration_minutes: durationFromTryout } = tryoutRes.rows[0];

    // ❌ Paket sudah kadaluarsa
    if (closed_at && new Date(closed_at) < new Date()) {
      return res.status(403).json({ error: 'Paket ini sudah kadaluarsa dan tidak dapat dimulai' });
    }

    // Gunakan duration dari tryout, default 0 jika null
    const durationMinutes = Number(durationFromTryout) || 0;

    // 🔹 Ambil urutan pertanyaan dari tabel tryout_questions
    const tqRes = await pool.query(
      `
      SELECT question_id 
      FROM tryout_questions 
      WHERE tryout_id = $1 
      ORDER BY question_order ASC
      `,
      [tryout_id]
    );

    let questionIds = tqRes.rows.map(r => r.question_id);

    // Jika kosong, fallback ke tabel questions (legacy)
    if (!questionIds.length) {
      const qRes = await pool.query(
        'SELECT id FROM questions WHERE tryout_id = $1 ORDER BY id ASC',
        [tryout_id]
      );
      questionIds = qRes.rows.map(r => r.id);
    }

    if (!questionIds.length) {
      return res.status(404).json({ error: 'Tidak ada pertanyaan untuk tryout ini' });
    }

    const questionOrder = questionIds.join(',');
    const answerOrder = Array(questionIds.length).fill('-').join(',');

    // 🔹 Tentukan attempt_number
    const lastAttempt = await pool.query(
      `
      SELECT attempt_number 
      FROM quiz_attempt 
      WHERE user_id = $1 AND tryout_id = $2 
      ORDER BY attempt_number DESC 
      LIMIT 1
      `,
      [req.user.id, tryout_id]
    );

    const attemptNumber =
      lastAttempt.rows.length > 0
        ? lastAttempt.rows[0].attempt_number + 1
        : 1;

    // 🔹 Simpan attempt baru
    const insertRes = await pool.query(
      `
      INSERT INTO quiz_attempt
      (user_id, tryout_id, attempt_number, question_order, answer_order, status, start_time, duration_minutes)
      VALUES ($1, $2, $3, $4, $5, 'ongoing', NOW(), $6)
      RETURNING *
      `,
      [req.user.id, tryout_id, attemptNumber, questionOrder, answerOrder, durationMinutes]
    );

    const inserted = insertRes.rows[0];

    // 🔹 Cek apakah tabel punya kolom end_time
    try {
      const colCheck = await pool.query(
        `
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'quiz_attempt' 
          AND column_name = 'end_time' 
        LIMIT 1
        `
      );

      if (colCheck.rows.length > 0) {
        // Update end_time = start_time + duration_minutes
        await pool.query(
          `
          UPDATE quiz_attempt
          SET end_time = (start_time + ($1 * INTERVAL '1 minute'))
          WHERE id = $2
          `,
          [durationMinutes, inserted.id]
        );
      }
    } catch (errCol) {
      console.warn('Warning: gagal set end_time (ignored):', errCol);
    }

    // 🔹 Ambil waktu server_now dan end_time
    const timingRes = await pool.query(
      `
      SELECT 
        NOW() AT TIME ZONE 'UTC' AS server_now,
        (qa.start_time + (qa.duration_minutes * INTERVAL '1 minute')) AT TIME ZONE 'UTC' AS end_time
      FROM quiz_attempt qa
      WHERE qa.id = $1
      LIMIT 1
      `,
      [inserted.id]
    );

    const timingRow = timingRes.rows[0] || {};
    const server_now = timingRow.server_now
      ? new Date(timingRow.server_now).toISOString()
      : new Date().toISOString();
    const end_time = timingRow.end_time
      ? new Date(timingRow.end_time).toISOString()
      : null;

    // 🔹 Ambil attempt final agar data lengkap
    const finalAttemptRes = await pool.query(
      `SELECT * FROM quiz_attempt WHERE id = $1 LIMIT 1`,
      [inserted.id]
    );
    const finalAttempt = finalAttemptRes.rows[0] || inserted;

    // ✅ Response ke frontend
    res.status(201).json({
      ...finalAttempt,
      server_now,
      end_time,
    });

  } catch (err) {
    console.error('❌ Error starting quizattempt:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// ✅ PATCH update quiz_attempt by tryoutId + attempt_number
app.patch('/quizattempt/:tryoutId/:attemptNumber', authMiddleware, async (req, res) => {
  const { tryoutId, attemptNumber } = req.params;
  const { answer_order, status, submitted_at, grade } = req.body;

  try {
    // 🔹 Ambil attempt sebelum perubahan
    const beforeRes = await pool.query(
      `SELECT * FROM quiz_attempt WHERE tryout_id = $1 AND user_id = $2 AND attempt_number = $3`,
      [tryoutId, req.user.id, Number(attemptNumber)]
    );
    const prevAttempt = beforeRes.rows[0] || null;

    if (!prevAttempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    // 🔹 Validasi waktu — apakah sudah lewat end_time
    const startMs = prevAttempt.start_time ? new Date(prevAttempt.start_time).getTime() : null;
    const durationMinutes = prevAttempt.duration_minutes || 0;
    const endMs = startMs !== null ? startMs + durationMinutes * 60 * 1000 : null;
    const serverNowMs = Date.now();
    const expiredByServer = endMs !== null ? serverNowMs > endMs : false;

    // 🔹 Build query dinamis
    const fields = [];
    const values = [];

    if (typeof answer_order !== 'undefined') {
      fields.push(`answer_order = $${fields.length + 1}`);
      values.push(answer_order);
    }
    if (typeof status !== 'undefined') {
      fields.push(`status = $${fields.length + 1}`);
      values.push(status);
    }
    if (typeof submitted_at !== 'undefined') {
      fields.push(`submitted_at = $${fields.length + 1}`);
      values.push(submitted_at);
    }
    if (typeof grade !== 'undefined') {
      fields.push(`grade = $${fields.length + 1}`);
      values.push(grade);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(tryoutId);
    values.push(req.user.id);
    values.push(Number(attemptNumber));

    const query = `
      UPDATE quiz_attempt
      SET ${fields.join(', ')}
      WHERE tryout_id = $${fields.length + 1}
        AND user_id = $${fields.length + 2}
        AND attempt_number = $${fields.length + 3}
      RETURNING *
    `;

    const updateRes = await pool.query(query, values);
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const updatedAttempt = updateRes.rows[0];

    // 🔹 Response dengan info waktu sinkron
    const responsePayload = {
      ...updatedAttempt,
      server_now: new Date(serverNowMs).toISOString(),
      end_time: endMs ? new Date(endMs).toISOString() : null,
      expiredByServer: !!expiredByServer,
    };

    return res.json(responsePayload);
  } catch (error) {
    console.error('Error patching quiz_attempt:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});





// ✅ GET questions by tryout_id
// GET questions
// GET /questions?tryoutId=...
app.get('/questions', authMiddleware, async (req, res) => {
  const tryoutId = req.query.tryoutId;

  try {
    if (!tryoutId) {
      // jika tryoutId tidak dikirim, kembalikan semua questions (bank soal)
      const all = await pool.query('SELECT * FROM questions ORDER BY id ASC');
      return res.json(all.rows);
    }

    // Jika tryoutId ada -> ambil soal via tryout_questions dengan urutan admin
    const q = await pool.query(
      `SELECT q.*
       FROM tryout_questions tq
       JOIN questions q ON q.id = tq.question_id
       WHERE tq.tryout_id = $1
       ORDER BY tq.question_order ASC`,
      [String(tryoutId)]
    );

    return res.json(q.rows);
  } catch (error) {
    console.error('Error fetching questions by tryout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/questions', authMiddleware, async (req, res) => {
  const {
    tryout_id,
    question_text,
    option_a,
    option_b,
    option_c,
    option_d,
    option_e,
    answer_key,
    explanation,
    image_url,
    table_headers,
    table_rows,
    explanation_image,
    explanation_table_headers,
    explanation_table_rows,
  } = req.body;

  try {
    if (!question_text || !answer_key) {
      return res.status(400).json({ error: 'question_text and answer_key are required' });
    }

    // Insert into bank questions (keep tryout_id nullable for now)
    const result = await pool.query(
      `INSERT INTO questions (
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        option_e,
        answer_key,
        explanation,
        image_url,
        table_headers,
        table_rows,
        explanation_image_url,
        explanation_table_headers,
        explanation_table_rows
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      ) RETURNING *`,
      [
        question_text,
        option_a || null,
        option_b || null,
        option_c || null,
        option_d || null,
        option_e || null,
        answer_key,
        explanation || null,
        image_url || null,
        table_headers || null,
        table_rows || null,
        explanation_image || null,
        explanation_table_headers || null,
        explanation_table_rows || null,
      ]
    );

    const newQuestion = result.rows[0];

    // If client also provided tryout_id, add mapping automatically
    if (tryout_id) {
      // compute next order
      const r = await pool.query(
        'SELECT COALESCE(MAX(question_order),0) + 1 AS next_order FROM tryout_questions WHERE tryout_id = $1',
        [tryout_id]
      );
      const nextOrder = r.rows[0].next_order;
      await pool.query(
        'INSERT INTO tryout_questions (tryout_id, question_id, question_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [tryout_id, newQuestion.id, nextOrder]
      );
    }

    res.status(201).json(newQuestion);
  } catch (error) {
    console.error('Error inserting question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /tryout_questions/:tryoutId
app.get('/tryout_questions/:tryoutId', authMiddleware, async (req, res) => {
  const { tryoutId } = req.params;
  try {
    const r = await pool.query(
      `SELECT tq.question_order, q.*
       FROM tryout_questions tq
       JOIN questions q ON q.id = tq.question_id
       WHERE tq.tryout_id = $1
       ORDER BY tq.question_order ASC`,
      [tryoutId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Error fetching tryout_questions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /tryout_questions
// body: { tryout_id, question_id, question_order? }
// auth protected (admin)
app.post('/tryout_questions', authMiddleware, authRole(['admin','superadmin']), async (req, res) => {
  const { tryout_id, question_id } = req.body;
  let { question_order } = req.body;

  if (!tryout_id || !question_id) {
    return res.status(400).json({ error: 'tryout_id and question_id are required' });
  }

  try {
    // if question_order not provided, auto assign max+1
    if (typeof question_order === 'undefined' || question_order === null) {
      const r = await pool.query(
        'SELECT COALESCE(MAX(question_order),0) + 1 AS next_order FROM tryout_questions WHERE tryout_id = $1',
        [tryout_id]
      );
      question_order = r.rows[0].next_order;
    } else {
      // ensure integer
      question_order = Number(question_order);
      if (Number.isNaN(question_order) || question_order < 1) {
        return res.status(400).json({ error: 'question_order must be a positive integer' });
      }
    }

    // attempt insert, unique constraints will prevent duplicates
    const result = await pool.query(
      `INSERT INTO tryout_questions (tryout_id, question_id, question_order)
       VALUES ($1,$2,$3) RETURNING *`,
      [tryout_id, question_id, question_order]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting tryout_question:', err);
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'Duplicate tryout/question or question_order' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/ukaiuser', authMiddleware, async (req, res) => {
  try {
    const users = await pool.query('SELECT * FROM users');
    res.json(users.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
