import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbUri = process.env.DATABASE_URL || process.env.MYSQL_URL;
const isRailwayInternal = dbUri && (dbUri.includes('railway.internal') || dbUri.includes('localhost'));

const sslSetting = process.env.DB_SSL === 'true'
  ? { rejectUnauthorized: false }
  : (process.env.DB_SSL === 'false' || isRailwayInternal)
    ? undefined
    : (dbUri && !isRailwayInternal)
      ? { rejectUnauthorized: false }
      : undefined;

const poolConfig = dbUri
  ? {
      uri: dbUri,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true,
      ssl: sslSetting
    }
  : {
      host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
      port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'bookleaf',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true,
      ssl: sslSetting
    };

const pool = mysql.createPool(poolConfig);

export async function initDatabase() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS authors (
        author_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50) NULL,
        city VARCHAR(100) NULL,
        joined_date VARCHAR(50) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_authors_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS books (
        book_id VARCHAR(50) PRIMARY KEY,
        author_id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        isbn VARCHAR(50) NULL,
        genre VARCHAR(100) NULL,
        publication_date VARCHAR(50) NULL,
        status VARCHAR(100) NOT NULL,
        mrp DECIMAL(10,2) NULL,
        author_royalty_per_copy DECIMAL(10,2) NULL,
        total_copies_sold INT DEFAULT 0,
        total_royalty_earned DECIMAL(12,2) DEFAULT 0,
        royalty_paid DECIMAL(12,2) DEFAULT 0,
        royalty_pending DECIMAL(12,2) DEFAULT 0,
        last_royalty_payout_date VARCHAR(50) NULL,
        print_partner VARCHAR(100) NULL,
        available_on JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_books_author (author_id),
        INDEX idx_books_status (status),
        FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'author') NOT NULL,
        author_id VARCHAR(50) NULL,
        name VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_users_email (email),
        INDEX idx_users_role (role),
        FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_number VARCHAR(50) UNIQUE NOT NULL,
        author_id VARCHAR(50) NOT NULL,
        book_id VARCHAR(50) NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status ENUM('Open', 'In Progress', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open',
        category VARCHAR(100) NOT NULL,
        ai_category VARCHAR(100) NOT NULL,
        priority ENUM('Critical', 'High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
        ai_priority VARCHAR(50) NOT NULL,
        ai_priority_reason TEXT NULL,
        ai_draft_response TEXT NULL,
        assigned_to VARCHAR(255) NULL,
        attachment_url TEXT NULL,
        attachment_name VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tickets_author (author_id),
        INDEX idx_tickets_book (book_id),
        INDEX idx_tickets_status (status),
        INDEX idx_tickets_category (category),
        INDEX idx_tickets_priority (priority),
        INDEX idx_tickets_created (created_at),
        FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        sender_type ENUM('author', 'admin', 'system') NOT NULL,
        sender_id VARCHAR(255) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_messages_ticket (ticket_id),
        INDEX idx_messages_created (created_at),
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ticket_internal_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        admin_id VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255) NOT NULL,
        note TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notes_ticket (ticket_id),
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } finally {
    conn.release();
  }
}

export default pool;
