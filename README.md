<div align="center">
  <img src="https://img.shields.io/badge/SQLite-07405e?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
</div>

<br>

# 📚 Infinity Library DBMS & SQL Studio

A top-tier, fully-featured Database Management System mini-project focused on a **Library Management System**. This project is deeply engineered with a custom self-contained Database Engine (No XAMPP required!) and features a stunning, premium "Glassmorphism" UI with real-time data visualization.

Designed for perfect Viva presentations and academic demonstrations to secure top marks.

---

## ✨ Enterprise-Level Features

- **Automated Sandbox Database**: Uses pure SQLite to generate and store a real physical `.sqlite` database file instantly on startup. No complex installation required.
- **Library Schema Pre-Loaded**: Includes complete tables for `books`, `members`, `categories`, and `borrow_records`, pre-filled with dummy data. Includes advanced schema components like **Views** and **Triggers**.
- **Interactive Code Editor:** Write raw SQL with syntax highlighting, line numbers (toggleable), and hotkey execution (`Ctrl + Enter`).
- **Live Data Visualizer**: Automatically detects queries with `COUNT()` or `GROUP BY` and instantly generates beautiful, interactive **Bar** and **Doughnut Charts** using Chart.js.
- **SQL Execution Explainer**: A visual step-by-step breakdown (Table Scan -> Filtering -> Projection) showing exactly *how* the engine processes your internal query.
- **Query History Panel**: Never lose a query. All successful queries are saved to your local browser storage and can be one-click redrawn.
- **Themes & Customization**: Instantly swap between "Infinity Blue", "Matrix Emerald", and "Cyber Purple" aesthetics.
- **Data Export & Backup**: One-click export of data grids to `.CSV`, and one-click download of the raw SQLite backup file.

## 🚀 Quick Start Guide

This project is entirely self-contained. You do not need XAMPP, MySQL Workbench, or a giant database server. 

### Prerequisites

All you need is [Node.js](https://nodejs.org/) installed on your computer.

### Installation

1. Clone or download this repository.
2. Double-click **`build.bat`**. This will automatically download the tiny engine dependencies (`express`, `sqlite3`). You only have to do this once.
3. Double-click **`run.bat`**. This will boot the database engine and automatically open a new tab in your default web browser (http://localhost:3000).

## 🗄️ Database Architecture

The system generates a fully relational Library Management scheme:

- **Tables**: `categories`, `authors`, `books`, `members`, `borrow_records`, `audit_logs`
- **Integrity**: Enforces cascading `FOREIGN KEY` constraints.
- **Triggers**: Includes an `after_book_borrowed` trigger that automatically updates the `available_copies` of a book when a new record is added, while writing to the `audit_logs`.
- **Views**: Includes a pre-compiled `active_borrowers_report` Virtual View for instant dashboard reporting.

## 🎨 System Reset

Messed up the database while testing?
1. Click the **Gear (Settings)** icon in the top right.
2. Click **Reset DB**.
3. The engine will instantly format the database, recreate all tables, and re-seed all the dummy values back to factory defaults.

---

*Engineered natively with Vanilla JS, CSS3, and Node.js for academic demonstration.*
