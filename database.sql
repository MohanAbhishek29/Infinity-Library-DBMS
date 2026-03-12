-- DBMS MINI-PROJECT: LIBRARY MANAGEMENT SYSTEM (SQLite Version)

DROP VIEW IF EXISTS active_borrowers_report;
DROP TRIGGER IF EXISTS after_book_borrowed;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS borrow_records;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS categories;

-- ==========================================
-- 1. CATEGORIES TABLE
-- ==========================================
CREATE TABLE categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE,
    aisle_number TEXT NOT NULL
);

-- ==========================================
-- 2. AUTHORS TABLE
-- ==========================================
CREATE TABLE authors (
    author_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    country TEXT
);

-- ==========================================
-- 3. MEMBERS TABLE
-- ==========================================
CREATE TABLE members (
    member_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    join_date DATE NOT NULL,
    membership_type TEXT DEFAULT 'Standard'
);

-- ==========================================
-- 4. BOOKS TABLE
-- ==========================================
CREATE TABLE books (
    book_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    isbn TEXT UNIQUE NOT NULL,
    publication_year INTEGER,
    category_id INTEGER,
    author_id INTEGER,
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE SET NULL
);

-- ==========================================
-- 5. BORROW RECORDS TABLE
-- ==========================================
CREATE TABLE borrow_records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    borrow_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    status TEXT DEFAULT 'Issued',
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
);

-- ==========================================
-- 6. AUDIT LOGS TABLE
-- ==========================================
CREATE TABLE audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT,
    description TEXT,
    action_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TRIGGER DEFINITION
-- ==========================================
-- Triggers automatically when a book is borrowed to log the transaction
-- and conceptually would reduce available copies.
CREATE TRIGGER after_book_borrowed
AFTER INSERT ON borrow_records
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (action_type, description)
    VALUES ('BOOK_ISSUED', 'Member ' || NEW.member_id || ' borrowed Book ' || NEW.book_id || ' (Due: ' || NEW.due_date || ')');
    
    -- Reduce available copies
    UPDATE books 
    SET available_copies = available_copies - 1 
    WHERE book_id = NEW.book_id;
END;

-- ==========================================
-- VIEW DEFINITION
-- ==========================================
-- A complex query saved as a virtual table for easy reporting of active borrows.
CREATE VIEW active_borrowers_report AS
SELECT 
    br.record_id,
    m.first_name || ' ' || m.last_name AS member_name,
    m.email,
    b.title AS book_title,
    a.first_name || ' ' || a.last_name AS author_name,
    c.category_name,
    br.borrow_date,
    br.due_date,
    br.status
FROM borrow_records br
JOIN members m ON br.member_id = m.member_id
JOIN books b ON br.book_id = b.book_id
JOIN authors a ON b.author_id = a.author_id
JOIN categories c ON b.category_id = c.category_id
WHERE br.status = 'Issued';

-- ==========================================
-- DUMMY DATA INSERTIONS (25 Records Total)
-- ==========================================

-- Insert Categories (4)
INSERT INTO categories (category_name, aisle_number) VALUES 
('Computer Science', 'A1'),
('Fiction', 'B4'),
('History', 'C2'),
('Mathematics', 'A3');

-- Insert Authors (5)
INSERT INTO authors (first_name, last_name, country) VALUES 
('Alan', 'Turing', 'UK'),
('Isaac', 'Asimov', 'USA'),
('J.K.', 'Rowling', 'UK'),
('Stephen', 'Hawking', 'UK'),
('George', 'Orwell', 'UK');

-- Insert Members (6)
INSERT INTO members (first_name, last_name, email, join_date, membership_type) VALUES 
('Mohan', 'Naidu', 'mohan.n@student.edu', '2026-01-15', 'Premium'),
('Sita', 'Sharma', 'sita.s@student.edu', '2026-01-20', 'Standard'),
('Rahul', ' वर्मा', 'rahul.v@student.edu', '2026-02-05', 'Standard'),
('Priya', 'Patel', 'priya.p@student.edu', '2025-11-10', 'Premium'),
('Arjun', 'Reddy', 'arjun.r@student.edu', '2025-12-01', 'Standard'),
('Anjali', 'Menon', 'anjali.m@student.edu', '2026-02-18', 'Standard');

-- Insert Books (6)
INSERT INTO books (title, isbn, publication_year, category_id, author_id, total_copies, available_copies) VALUES 
('Computing Machinery and Intelligence', '978-0123456789', 1950, 1, 1, 3, 3),
('Foundation', '978-0008117498', 1951, 2, 2, 5, 5),
('Harry Potter and the Sorcerer''s Stone', '978-0590353427', 1997, 2, 3, 4, 4),
('A Brief History of Time', '978-0553380163', 1988, 3, 4, 3, 3),
('1984', '978-0451524935', 1949, 2, 5, 6, 6),
('Discrete Mathematics', '978-0131593183', 2005, 4, 1, 2, 2);

-- Insert Borrow Records (4)
-- This will automatically trigger the 'after_book_borrowed' trigger!
INSERT INTO borrow_records (member_id, book_id, borrow_date, due_date) VALUES 
(1, 1, '2026-02-20', '2026-03-05'),
(2, 5, '2026-02-25', '2026-03-10'),
(4, 3, '2026-02-26', '2026-03-12'),
(5, 4, '2026-02-27', '2026-03-13');
