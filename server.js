const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // This allows the database.sqlite to be downloaded directly

// Initialize SQLite Database
// It will instantly create a file named "database.sqlite" in the folder 
// without needing XAMPP or MySQL servers!
const dbPath = path.join(__dirname, 'database.sqlite');
const sqlFile = path.join(__dirname, 'database.sql');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to Library SQLite Database.');

        // This automatically reads "database.sql" and runs all queries so the 
        // student doesn't have to manually create the database!
        try {
            const sqlSchema = fs.readFileSync(sqlFile, 'utf8');
            db.exec(sqlSchema, (err) => {
                if (err) console.error("Could not run schema file: ", err.message);
                else console.log("Database initialized automatically with dummy data!");
            });
        } catch (readErr) {
            console.error("Could not read database.sql file:", readErr.message);
        }
    }
});

app.get('/api/schema', (req, res) => {
    // Queries the sqlite master table to find all tables and views created
    db.all("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'", [], (err, tables) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        let schema = {};
        if (tables.length === 0) return res.json({ success: true, schema });

        let processed = 0;
        tables.forEach(table => {
            const tName = table.name;
            const tType = table.type.toUpperCase();

            // PRAGMA gets column info in SQLite
            db.all(`PRAGMA table_info("${tName}")`, [], (err, cols) => {
                if (!err) {
                    schema[tName] = {
                        type: tType,
                        columns: cols.map(c => ({
                            field: c.name,
                            type: c.type,
                            key: c.pk ? 'PRI' : '' // 'PRI' for Primary Key string matching your frontend
                        }))
                    };
                }

                processed++;
                if (processed === tables.length) {
                    res.json({ success: true, schema });
                }
            });
        });
    });
});

app.post('/api/execute', (req, res) => {
    const userQuery = req.body.query;

    if (!userQuery || userQuery.trim() === '') {
        return res.status(400).json({ success: false, error: 'SQL query cannot be empty!' });
    }

    const type = userQuery.trim().toUpperCase();

    // In SQLite, db.all returns rows for SELECT queries.
    // db.run is used for INSERT, UPDATE, DELETE, CREATE, DROP...
    if (type.startsWith('SELECT') || type.startsWith('PRAGMA') || type.startsWith('SHOW')) {
        db.all(userQuery, [], (err, rows) => {
            if (err) {
                console.error('SQL Error:', err.message);
                return res.status(400).json({ success: false, error: err.message });
            }

            let responseData = { success: true, type: 'DataResult' };
            responseData.rows = rows;
            // Map columns from keys
            responseData.columns = rows.length > 0 ? Object.keys(rows[0]) : [];
            res.json(responseData);
        });
    } else {
        db.run(userQuery, function (err) {
            if (err) {
                console.error('SQL Error:', err.message);
                return res.status(400).json({ success: false, error: err.message });
            }

            res.json({
                success: true,
                type: 'ActionResult',
                affectedRows: this.changes,
                insertId: this.lastID,
                message: `✅ Success! Query executed. Rows affected: ${this.changes}`
            });
        });
    }
});

app.post('/api/reset', (req, res) => {
    try {
        const sqlSchema = fs.readFileSync(sqlFile, 'utf8');
        db.exec(sqlSchema, (err) => {
            if (err) {
                console.error("Could not reset db: ", err.message);
                return res.status(500).json({ success: false, error: "Reset failed: " + err.message });
            }
            res.json({ success: true, message: "Database formatted and reset strictly to dummy data!" });
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to read database schema file." });
    }
});

app.listen(port, () => {
    console.log(`=============================================`);
    console.log(`🚀 SQL Query Studio Backend is Online! `);
    console.log(`=============================================`);
    console.log(`Server Address : http://localhost:${port}`);
    console.log(`Database engine: SQLite3 (No Install Needed)`);
});
