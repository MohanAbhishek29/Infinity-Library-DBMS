# DBMS Mini-Project Viva Preparation Guide

**Project Name:** Infinity Studio - Library Management System
**Prepared For:** Manaswini ✨ (Go get that 1st Place!)
**Built for:** 2nd Year B.Tech

This document contains everything you need to know to confidently explain this project to your professors during your Viva presentation. Manaswini, you have a completely unique, premium project that goes way beyond normal expectations—you've got this! Included are advanced DBMS concepts like **Foreign Keys, Triggers, Views**, and **Raw SQL Execution**.

## 1. Project Explanation (What did you build?)
**Professor:** "What is your project about?"
**You:** "I built 'Infinity DB Studio', a custom Web-Based SQL Query execution environment for a modern Library Management System. Instead of a standard form-based website, I built an interactive tool where librarians can view the database schema dynamically on a sidebar, write raw SQL queries in a developer-style code editor, and instantly execute them to view the results in a dynamic data grid. It also includes an automated CSV Export feature."

## 2. Tech Stack (What technologies did you use?)
*   **Frontend:** Pure HTML, CSS (using modern Glassmorphism Dark Mode and CSS Grid architectures), and Vanilla JavaScript (Fetch API).
*   **Backend:** Node.js with the Express.js framework.
*   **Database:** SQLite (Using the `sqlite3` npm package).

**Professor:** "Why did you use SQLite instead of MySQL or Oracle?"
**You:** "I chose SQLite because it is a serverless, zero-configuration database. This means my web app is highly portable and lightweight. It creates a local `.sqlite` file instantly without needing to install heavy background processes like XAMPP, making it perfect for a standalone desktop web app demonstration."

## 3. Database Schema (The tables and relationships)
The database contains **6 Tables**:
1.  **`categories`**: Stores book genres/categories (Primary Key: `category_id`).
2.  **`authors`**: Stores author details (Primary Key: `author_id`).
3.  **`members`**: Stores library members/users (Primary Key: `member_id`).
4.  **`books`**: Stores the actual books. Has two Foreign Keys mapping back to `categories` and `authors`. 
5.  **`borrow_records`**: Logs the transactions when a member checks out a book. Has two Foreign Keys linking to `members` and `books`. Uses `ON DELETE CASCADE` so if a book is removed, its history is cleaned up.
6.  **`audit_logs`**: A system table used by the database Trigger to log events.

## 4. Advanced Concepts Used (VIVA HIGHLIGHTS!)
*If they ask "What makes this project advanced?", talk about these three things:*

### A. The Database Trigger
**Concept:** A Trigger is a set of SQL statements that automatically "fire" off when a specific event happens in the database.
**How you used it:** "I created an `AFTER INSERT` trigger named `after_book_borrowed`. Whenever a new record is added to the `borrow_records` table, the trigger automatically does two things: 1. It inserts a log into `audit_logs` for security tracking. 2. It automatically updates the `books` table to reduce the `available_copies` by 1. This ensures data consistency without needing backend logic."

### B. The Database View
**Concept:** A View is a virtual table based on the result-set of an complex SQL statement.
**How you used it:** "I created a view called `active_borrowers_report`. It performs a massive SQL `JOIN` across 5 tables (`borrow_records`, `members`, `books`, `authors`, and `categories`) filtering only by 'Issued' books. Instead of writing that massive JOIN query every time a librarian wants to see who owes books, they simply run `SELECT * FROM active_borrowers_report`."

### C. Foreign Key Constraints (Cascade & Set Null)
**How you used it:** "I implemented standard Referencial Integrity. For example, in the `borrow_records` table, the Foreign Keys use `ON DELETE CASCADE`. If a Member is deleted from the system due to a ban, all of their borrow logs are automatically erased so we don't have orphan records floating in the database."

## 5. Live Queries to Run During the Presentation!
*Copy and paste these exact queries sequentially into your web app to impress the professors:*

**Step 1:** Show a basic SELECT query
```sql
SELECT title, isbn, publication_year, total_copies FROM books WHERE publication_year < 1960;
```

**Step 2:** Show an Aggregate query with GROUP BY
```sql
SELECT c.category_name, COUNT(b.book_id) as total_books
FROM categories c
LEFT JOIN books b ON c.category_id = b.category_id
GROUP BY c.category_name;
```

**Step 3:** Show the complex VIEW working
```sql
SELECT * FROM active_borrowers_report;
```

**Step 4:** Trigger the Database "Trigger" by issuing a book!
*(Run this query first)*
```sql
INSERT INTO borrow_records (member_id, book_id, borrow_date, due_date) VALUES (3, 6, '2026-02-27', '2026-03-15');
```
*(Then, run this query to prove the database logged it AND reduced the book copies automatically!)*
```sql
SELECT * FROM audit_logs;

SELECT title, available_copies FROM books WHERE book_id = 6;
```

---

**All the absolute best for your presentation, Manaswini! Show them what you've built, explain the engine flow with confidence, and secure that top spot! You are going to crush it. 🚀🏆**
