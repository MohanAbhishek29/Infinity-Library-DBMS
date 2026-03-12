// Infinity Library DBMS - Static Client (sql.js WebAssembly Engine)
// The entire SQLite database runs INSIDE the browser. No server needed.

const DB_SCHEMA = `
DROP VIEW IF EXISTS active_borrowers_report;
DROP TRIGGER IF EXISTS after_book_borrowed;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS borrow_records;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE,
    aisle_number TEXT NOT NULL
);
CREATE TABLE authors (
    author_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    country TEXT
);
CREATE TABLE members (
    member_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    join_date DATE NOT NULL,
    membership_type TEXT DEFAULT 'Standard'
);
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
CREATE TABLE audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT,
    description TEXT,
    action_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER after_book_borrowed
AFTER INSERT ON borrow_records
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (action_type, description)
    VALUES ('BOOK_ISSUED', 'Member ' || NEW.member_id || ' borrowed Book ' || NEW.book_id || ' (Due: ' || NEW.due_date || ')');
    UPDATE books SET available_copies = available_copies - 1 WHERE book_id = NEW.book_id;
END;

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

INSERT INTO categories (category_name, aisle_number) VALUES ('Computer Science', 'A1'), ('Fiction', 'B4'), ('History', 'C2'), ('Mathematics', 'A3');
INSERT INTO authors (first_name, last_name, country) VALUES ('Alan', 'Turing', 'UK'), ('Isaac', 'Asimov', 'USA'), ('J.K.', 'Rowling', 'UK'), ('Stephen', 'Hawking', 'UK'), ('George', 'Orwell', 'UK');
INSERT INTO members (first_name, last_name, email, join_date, membership_type) VALUES ('Mohan', 'Naidu', 'mohan.n@student.edu', '2026-01-15', 'Premium'), ('Sita', 'Sharma', 'sita.s@student.edu', '2026-01-20', 'Standard'), ('Rahul', 'Verma', 'rahul.v@student.edu', '2026-02-05', 'Standard'), ('Priya', 'Patel', 'priya.p@student.edu', '2025-11-10', 'Premium'), ('Arjun', 'Reddy', 'arjun.r@student.edu', '2025-12-01', 'Standard'), ('Anjali', 'Menon', 'anjali.m@student.edu', '2026-02-18', 'Standard');
INSERT INTO books (title, isbn, publication_year, category_id, author_id, total_copies, available_copies) VALUES ('Computing Machinery and Intelligence', '978-0123456789', 1950, 1, 1, 3, 3), ('Foundation', '978-0008117498', 1951, 2, 2, 5, 5), ('Harry Potter and the Sorcerers Stone', '978-0590353427', 1997, 2, 3, 4, 4), ('A Brief History of Time', '978-0553380163', 1988, 3, 4, 3, 3), ('1984', '978-0451524935', 1949, 2, 5, 6, 6), ('Discrete Mathematics', '978-0131593183', 2005, 4, 1, 2, 2);
INSERT INTO borrow_records (member_id, book_id, borrow_date, due_date) VALUES (1, 1, '2026-02-20', '2026-03-05'), (2, 5, '2026-02-25', '2026-03-10'), (4, 3, '2026-02-26', '2026-03-12'), (5, 4, '2026-02-27', '2026-03-13');
`;

// Global DB reference (sql.js)
let db = null;

// DOM Elements
const sqlInput = document.getElementById('sqlInput');
const lineNumbers = document.getElementById('lineNumbers');
const runQueryBtn = document.getElementById('runQueryBtn');
const clearEditorBtn = document.getElementById('clearEditorBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const statusMessage = document.getElementById('statusMessage');
const resultTable = document.getElementById('resultTable');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const schemaTree = document.getElementById('schemaTree');
const schemaLoader = document.getElementById('schemaLoader');
const refreshSchemaBtn = document.getElementById('refreshSchemaBtn');
const toast = document.getElementById('toast');
const resultsSection = document.querySelector('.results-section');
const downloadDbBtn = document.getElementById('downloadDbBtn');

// Tabs
const tabEditor = document.getElementById('tabEditor');
const tabHistory = document.getElementById('tabHistory');
const editorWrapper = document.getElementById('editorWrapper');
const historyWrapper = document.getElementById('historyWrapper');
const tabData = document.getElementById('tabData');
const tabChart = document.getElementById('tabChart');
const gridContainer = document.getElementById('gridContainer');
const chartContainer = document.getElementById('chartContainer');

// Global Chart
let currentChart = null;
let currentExportData = { columns: [], rows: [] };

/* ========================================================
   INIT: Load sql.js WASM and create in-browser database
   ======================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    updateLineNumbers();
    loadQueryHistory();
    loadSavedSettings();

    try {
        const SQL = await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });
        db = new SQL.Database();
        db.exec(DB_SCHEMA);
        console.log('In-browser SQLite database initialized!');
        fetchSchema();
    } catch (err) {
        console.error('Failed to init sql.js:', err);
        schemaLoader.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Engine Load Failed';
    }
});

/* ========================================================
   TAB SWITCHING
   ======================================================== */
if (tabEditor) tabEditor.addEventListener('click', () => switchTab('editor'));
if (tabHistory) tabHistory.addEventListener('click', () => switchTab('history'));
if (tabData) tabData.addEventListener('click', () => switchTab('data'));
if (tabChart) tabChart.addEventListener('click', () => switchTab('chart'));

function switchTab(target) {
    if (target === 'editor') {
        tabEditor.classList.add('active'); tabHistory.classList.remove('active');
        editorWrapper.style.display = 'flex'; historyWrapper.style.display = 'none';
    } else if (target === 'history') {
        tabEditor.classList.remove('active'); tabHistory.classList.add('active');
        editorWrapper.style.display = 'none'; historyWrapper.style.display = 'block';
    } else if (target === 'data') {
        tabData.classList.add('active'); tabChart.classList.remove('active');
        gridContainer.style.display = 'block'; chartContainer.style.display = 'none';
    } else if (target === 'chart') {
        tabData.classList.remove('active'); tabChart.classList.add('active');
        gridContainer.style.display = 'none'; chartContainer.style.display = 'flex';
    }
}

/* ========================================================
   EDITOR LINE NUMBERS
   ======================================================== */
sqlInput.addEventListener('input', updateLineNumbers);
sqlInput.addEventListener('scroll', () => { lineNumbers.scrollTop = sqlInput.scrollTop; });

function updateLineNumbers() {
    const lines = sqlInput.value.split('\n').length;
    let numbersHTML = '';
    for (let i = 1; i <= lines; i++) numbersHTML += `${i}<br>`;
    lineNumbers.innerHTML = numbersHTML || '1';
}

/* ========================================================
   SCHEMA EXPLORER (reads from in-browser db)
   ======================================================== */
refreshSchemaBtn.addEventListener('click', () => {
    refreshSchemaBtn.style.transform = 'rotate(180deg)';
    setTimeout(() => refreshSchemaBtn.style.transform = 'rotate(0deg)', 300);
    fetchSchema();
});

function fetchSchema() {
    if (!db) return;
    schemaTree.innerHTML = '';
    schemaLoader.style.display = 'flex';

    try {
        const tables = db.exec("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'");
        if (!tables.length || !tables[0].values.length) {
            schemaLoader.innerHTML = 'No tables found';
            return;
        }

        schemaLoader.style.display = 'none';
        const schema = {};

        tables[0].values.forEach(([name, type]) => {
            const cols = db.exec(`PRAGMA table_info("${name}")`);
            schema[name] = {
                type: type.toUpperCase(),
                columns: cols.length ? cols[0].values.map(c => ({
                    field: c[1], type: c[2] || 'TEXT', key: c[5] ? 'PRI' : ''
                })) : []
            };
        });

        renderSchemaTree(schema);
    } catch (err) {
        console.error('Schema error:', err);
        schemaLoader.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error';
    }
}

function renderSchemaTree(schemaObj) {
    for (const [tableName, tableData] of Object.entries(schemaObj)) {
        const li = document.createElement('li');
        li.className = 'tree-table';

        const header = document.createElement('div');
        header.className = 'tree-table-name';
        const iconClass = tableData.type === 'VIEW' ? 'fa-eye' : 'fa-table';
        header.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${tableName}`;

        const ul = document.createElement('ul');
        ul.className = 'tree-columns';

        tableData.columns.forEach(col => {
            const colLi = document.createElement('li');
            colLi.className = 'tree-column';
            let keyIndicator = '';
            if (col.key === 'PRI') keyIndicator = ' <span class="key-pri" title="Primary Key">PK</span>';
            colLi.innerHTML = `<span>${col.field}${keyIndicator}</span> <span class="col-type">${col.type.toUpperCase()}</span>`;
            ul.appendChild(colLi);
        });

        header.addEventListener('click', () => {
            const isOpened = ul.classList.contains('open');
            document.querySelectorAll('.tree-columns').forEach(u => u.classList.remove('open'));
            document.querySelectorAll('.tree-table-name').forEach(h => h.style.background = 'transparent');
            if (!isOpened) {
                ul.classList.add('open');
                header.style.background = 'rgba(59, 130, 246, 0.1)';
            }
        });

        li.appendChild(header);
        li.appendChild(ul);
        schemaTree.appendChild(li);
    }
}

/* ========================================================
   QUERY EXECUTION (runs in-browser via sql.js)
   ======================================================== */
const explainQueryBtn = document.getElementById('explainQueryBtn');
const explainModal = document.getElementById('explainModal');
const explainNodes = document.getElementById('explainNodes');

runQueryBtn.addEventListener('click', executeUserQuery);

if (explainQueryBtn) {
    explainQueryBtn.addEventListener('click', () => {
        const textSelection = sqlInput.value.substring(sqlInput.selectionStart, sqlInput.selectionEnd);
        const query = (textSelection || sqlInput.value).trim();
        if (!query) { showToast("Select or type a query to explain"); return; }
        generateExplainPlan(query);
    });
}

sqlInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); executeUserQuery(); }
});

clearEditorBtn.addEventListener('click', () => {
    sqlInput.value = '';
    updateLineNumbers();
    sqlInput.focus();
});

function executeUserQuery() {
    if (!db) { showStatus('Database engine not loaded yet.', 'error'); return; }
    exportCsvBtn.style.display = 'none';

    const textSelection = sqlInput.value.substring(sqlInput.selectionStart, sqlInput.selectionEnd);
    const query = (textSelection || sqlInput.value).trim();

    if (!query) { showStatus('Error: Select or type an SQL query to execute.', 'error'); return; }

    const originalBtnHTML = runQueryBtn.innerHTML;
    runQueryBtn.innerHTML = '<div class="spinner"></div> Executing...';
    runQueryBtn.disabled = true;

    try {
        const type = query.trim().toUpperCase();

        if (type.startsWith('SELECT') || type.startsWith('PRAGMA')) {
            const results = db.exec(query);

            if (results.length > 0) {
                const columns = results[0].columns;
                const rows = results[0].values.map(row => {
                    const obj = {};
                    columns.forEach((col, i) => obj[col] = row[i]);
                    return obj;
                });

                saveToHistory(query, true);
                showStatus(`Query Executed. Retrieved ${rows.length} rows.`, 'success');
                hideEmptyState();
                switchTab('data');
                renderDataGrid(columns, rows);
                attemptVisualization(query, columns, rows);

                currentExportData = { columns, rows };
                if (rows.length > 0) exportCsvBtn.style.display = 'inline-flex';
            } else {
                saveToHistory(query, true);
                showStatus('Query returned 0 rows.', 'success');
                hideEmptyState();
                switchTab('data');
                renderDataGrid([], []);
            }
        } else {
            db.run(query);
            const changes = db.getRowsModified();
            saveToHistory(query, true);
            showStatus(`✅ Success! Query executed. Rows affected: ${changes}`, 'success');
            hideTable();
            tabChart.style.display = 'none';
            showEmptyState("Database Modified", "Rows were successfully updated.");
            showToast("Database Modified Successfully");

            if (type.includes('CREATE') || type.includes('DROP') || type.includes('ALTER')) {
                fetchSchema();
            }
        }
    } catch (err) {
        saveToHistory(query, false);
        showStatus(`SQLite Engine Error:\n${err.message}`, 'error');
        hideTable();
        tabChart.style.display = 'none';
    } finally {
        runQueryBtn.innerHTML = originalBtnHTML;
        runQueryBtn.disabled = false;
    }
}

/* ========================================================
   RESULT GRID & CSV EXPORT
   ======================================================== */
function renderDataGrid(columns, rows) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    if (rows.length === 0) { hideTable(); return; }

    const trHead = document.createElement('tr');
    columns.forEach(colName => {
        const th = document.createElement('th');
        th.textContent = colName;
        trHead.appendChild(th);
    });
    tableHead.appendChild(trHead);

    rows.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(colName => {
            const td = document.createElement('td');
            let val = row[colName];
            if (val === null) {
                td.innerHTML = '<span style="color:#ef4444; font-style:italic;">NULL</span>';
            } else {
                td.textContent = val;
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
    resultTable.style.display = 'table';
}

exportCsvBtn.addEventListener('click', () => {
    if (currentExportData.rows.length === 0) return;
    let csvContent = currentExportData.columns.map(c => `"${c}"`).join(",") + "\r\n";
    currentExportData.rows.forEach(row => {
        const rowArray = currentExportData.columns.map(colName => {
            let val = row[colName];
            if (val === null) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvContent += rowArray.join(",") + "\r\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const tempLink = document.createElement("a");
    tempLink.href = url;
    tempLink.setAttribute("download", `Infinity_Export_${Date.now()}.csv`);
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(url);
    showToast("CSV Download Started");
});

/* ========================================================
   VISUALIZATION & HISTORY
   ======================================================== */
function attemptVisualization(query, columns, rows) {
    if (!rows || rows.length < 1) { tabChart.style.display = 'none'; return; }
    const upperQuery = query.toUpperCase();
    const isAgg = upperQuery.includes('COUNT(') || upperQuery.includes('SUM(') || upperQuery.includes('GROUP BY');
    if (!isAgg || columns.length < 2) { tabChart.style.display = 'none'; return; }

    const labels = rows.map(r => r[columns[0]] || 'Unknown');
    const chartData = rows.map(r => Number(r[columns[1]]) || 0);
    tabChart.style.display = 'flex';

    if (currentChart) currentChart.destroy();
    const ctx = document.getElementById('resultChart').getContext('2d');
    const type = rows.length > 8 ? 'bar' : 'doughnut';

    currentChart = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: columns[1], data: chartData,
                backgroundColor: ['rgba(59,130,246,0.7)', 'rgba(16,185,129,0.7)', 'rgba(139,92,246,0.7)', 'rgba(245,158,11,0.7)', 'rgba(236,72,153,0.7)', 'rgba(14,165,233,0.7)'],
                borderColor: 'rgba(255,255,255,0.1)', borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#e2e8f0', font: { family: 'Outfit' } } } },
            scales: type === 'bar' ? {
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            } : {}
        }
    });
}

function generateExplainPlan(query) {
    openModal(explainModal);
    explainNodes.innerHTML = '';
    const upperQuery = query.toUpperCase();
    const steps = [];

    const fromMatch = upperQuery.match(/FROM\s+([A-Z0-9_]+)/);
    if (fromMatch) steps.push({ icon: 'fa-database', colorClass: 'icon-scan', title: 'Table Scan', desc: 'Engine reads data pages from the physical disk for table:', code: fromMatch[1] });

    const joinMatches = upperQuery.match(/JOIN\s+([A-Z0-9_]+)\s+ON/g);
    if (joinMatches) joinMatches.forEach(j => {
        const t = j.replace(/JOIN\s+/, '').replace(/\s+ON/, '');
        steps.push({ icon: 'fa-link', colorClass: 'icon-join', title: 'Nested Loop Join', desc: 'Engine merges matching rows in memory with table:', code: t });
    });

    const whereMatch = upperQuery.match(/WHERE\s+(.+?)(?:GROUP|ORDER|LIMIT|$)/);
    if (whereMatch) steps.push({ icon: 'fa-filter', colorClass: 'icon-filter', title: 'Predicate Filtering', desc: 'Engine discards rows that do not match the condition:', code: whereMatch[1].trim() });

    const selectMatch = upperQuery.match(/SELECT\s+(.+?)\s+FROM/);
    if (selectMatch) {
        let cols = selectMatch[1].trim();
        if (cols.length > 30) cols = cols.substring(0, 30) + '...';
        steps.push({ icon: 'fa-table-columns', colorClass: 'icon-project', title: 'Column Projection', desc: 'Engine extracts and formats only the requested columns:', code: cols });
    }

    if (steps.length === 0) { explainNodes.innerHTML = '<p style="text-align:center;padding:2rem;">Could not parse execution plan.</p>'; return; }

    steps.forEach((step, index) => {
        const delay = index * 0.4;
        explainNodes.insertAdjacentHTML('beforeend', `
            <div class="sql-node" style="animation-delay: ${delay}s">
                <div class="node-icon ${step.colorClass}"><i class="fa-solid ${step.icon}"></i></div>
                <div class="node-content">
                    <h4>Step ${index + 1}: ${step.title}</h4>
                    <p>${step.desc}</p>
                    ${step.code ? `<span class="node-code">${step.code}</span>` : ''}
                </div>
            </div>
        `);
    });
}

function saveToHistory(sql, success) {
    let history = JSON.parse(localStorage.getItem('dbms_history') || '[]');
    if (history.length > 0 && history[0].sql === sql) return;
    history.unshift({ sql, success, time: new Date().toISOString() });
    if (history.length > 15) history.pop();
    localStorage.setItem('dbms_history', JSON.stringify(history));
    loadQueryHistory();
}

function loadQueryHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    const history = JSON.parse(localStorage.getItem('dbms_history') || '[]');
    list.innerHTML = '';
    if (history.length === 0) { list.innerHTML = '<li class="history-empty">No query history yet.</li>'; return; }

    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        const statusColor = item.success ? 'var(--accent-tertiary)' : 'var(--accent-danger)';
        const date = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        li.innerHTML = `
            <div class="history-meta">
                <span style="color: ${statusColor}"><i class="fa-solid fa-circle" style="font-size:0.5rem"></i></span>
                <span>${date}</span>
            </div>
            <div class="history-sql">${item.sql.replace(/\n/g, ' ')}</div>
        `;
        li.addEventListener('click', () => { sqlInput.value = item.sql; updateLineNumbers(); switchTab('editor'); });
        list.appendChild(li);
    });
}

// Download DB as .sqlite file (exports from in-browser db)
if (downloadDbBtn) {
    downloadDbBtn.addEventListener('click', () => {
        if (!db) return;
        const data = db.export();
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'infinity_library.sqlite';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Database file download started");
    });
}

/* ========================================================
   UI UTILITIES
   ======================================================== */
function showStatus(text, type) { statusMessage.textContent = text; statusMessage.className = `status-message status-${type}`; }
function hideTable() { resultTable.style.display = 'none'; tableHead.innerHTML = ''; tableBody.innerHTML = ''; }
function showEmptyState(title = "Ready to Execute", subtitle = "Run a query to view data") {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) { emptyState.style.display = 'flex'; emptyState.querySelector('h3').textContent = title; emptyState.querySelector('p').textContent = subtitle; }
}
function hideEmptyState() { const e = document.getElementById('emptyState'); if (e) e.style.display = 'none'; }
function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); }, 3000); }

/* ========================================================
   MODALS & SETTINGS
   ======================================================== */
const modalOverlay = document.getElementById('modalOverlay');
const docsModal = document.getElementById('docsModal');
const settingsModal = document.getElementById('settingsModal');
const docsBtn = document.getElementById('docsBtn');
const settingsBtn = document.getElementById('settingsBtn');
const closeBtns = document.querySelectorAll('.close-modal');

if (docsBtn) docsBtn.addEventListener('click', () => openModal(docsModal));
if (settingsBtn) settingsBtn.addEventListener('click', () => openModal(settingsModal));
closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

function openModal(modal) { if (!modal) return; modalOverlay.classList.add('show'); modal.classList.add('show'); }
function closeModal() { if (modalOverlay) modalOverlay.classList.remove('show'); document.querySelectorAll('.modal').forEach(m => m.classList.remove('show')); }

// Theme Switcher
const themeBtns = document.querySelectorAll('.theme-btn');
themeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const theme = e.target.getAttribute('data-theme');
        applyTheme(theme);
        showToast(`Theme applied: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
    });
});

function applyTheme(theme) {
    localStorage.setItem('dbms_theme', theme);
    themeBtns.forEach(b => b.classList.remove('active'));
    document.querySelector(`.theme-btn[data-theme="${theme}"]`)?.classList.add('active');
    document.body.className = '';
    if (theme !== 'blue') document.body.classList.add(`theme-${theme}`);
}

// Line Numbers Toggle
const toggleLines = document.getElementById('toggleLines');
const lineNumbersDiv = document.getElementById('lineNumbers');
if (toggleLines) {
    toggleLines.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        localStorage.setItem('dbms_lines', isChecked ? 'true' : 'false');
        if (lineNumbersDiv) lineNumbersDiv.style.display = isChecked ? 'block' : 'none';
    });
}

function loadSavedSettings() {
    applyTheme(localStorage.getItem('dbms_theme') || 'blue');
    if (localStorage.getItem('dbms_lines') === 'false') {
        if (toggleLines) toggleLines.checked = false;
        if (lineNumbersDiv) lineNumbersDiv.style.display = 'none';
    }
}

// Factory Reset
const resetDbBtn = document.getElementById('resetDbBtn');
if (resetDbBtn) {
    resetDbBtn.addEventListener('click', () => {
        const confirmReset = confirm("Are you sure you want to completely erase the database and recreate the dummy data?");
        if (!confirmReset) return;
        resetDbBtn.innerHTML = '<div class="spinner"></div> Resetting...';
        try {
            db.exec(DB_SCHEMA);
            showToast("Database Factory Reset Successful");
            closeModal();
            fetchSchema();
            hideTable();
            showEmptyState("Database Reset", "The library has been restored to factory settings.");
        } catch (err) {
            alert('Reset Error: ' + err.message);
        } finally {
            resetDbBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Reset DB';
        }
    });
}
