// Advanced Web-based SQL Query Studio Logic - PREMIUM EDITION

// Base URLs
const SCHEMA_API = 'http://localhost:3000/api/schema';
const EXECUTE_API = 'http://localhost:3000/api/execute';

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

// Global Chart Instance
let currentChart = null;



// Global state to hold table data for CSV export
let currentExportData = { columns: [], rows: [] };

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchSchema();
    updateLineNumbers();
    loadQueryHistory();
    loadSavedSettings();
});

/* ========================================================
   0. TOGGLE TABS
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
}   /* ========================================================
   0. EDITOR LINE NUMBERS 
   ======================================================== */
sqlInput.addEventListener('input', updateLineNumbers);
sqlInput.addEventListener('scroll', () => {
    lineNumbers.scrollTop = sqlInput.scrollTop;
});

function updateLineNumbers() {
    const lines = sqlInput.value.split('\n').length;
    let numbersHTML = '';
    for (let i = 1; i <= lines; i++) {
        numbersHTML += `${i}<br>`;
    }
    lineNumbers.innerHTML = numbersHTML || '1';
}

/* ========================================================
   1. SCHEMA EXPLORER LOGIC
   ======================================================== */
refreshSchemaBtn.addEventListener('click', () => {
    refreshSchemaBtn.style.transform = 'rotate(180deg)';
    setTimeout(() => refreshSchemaBtn.style.transform = 'rotate(0deg)', 300);
    fetchSchema();
});

async function fetchSchema() {
    schemaTree.innerHTML = '';
    schemaLoader.style.display = 'flex';

    try {
        const response = await fetch(SCHEMA_API);
        const data = await response.json();

        if (response.ok && data.success) {
            renderSchemaTree(data.schema);
        } else {
            console.error(data.error);
            schemaLoader.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Start Node Server';
        }
    } catch (err) {
        console.error('Fetch error:', err);
        schemaLoader.innerHTML = '<i class="fa-solid fa-cloud-bolt"></i> Offline';
    }
}

/**
 * Builds the collapsing UI tree for the database schema
 */
function renderSchemaTree(schemaObj) {
    schemaLoader.style.display = 'none';

    for (const [tableName, tableData] of Object.entries(schemaObj)) {
        const li = document.createElement('li');
        li.className = 'tree-table';

        // Table Name Header
        const header = document.createElement('div');
        header.className = 'tree-table-name';

        const iconClass = tableData.type === 'VIEW' ? 'fa-eye' : 'fa-table';
        header.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${tableName}`;

        const ul = document.createElement('ul');
        ul.className = 'tree-columns';

        // Columns
        tableData.columns.forEach(col => {
            const colLi = document.createElement('li');
            colLi.className = 'tree-column';

            let keyIndicator = '';
            if (col.key === 'PRI') keyIndicator = ' <span class="key-pri" title="Primary Key">PK</span>';
            if (col.key === 'MUL') keyIndicator = ' <span class="key-mul" title="Foreign Key">FK</span>';

            colLi.innerHTML = `<span>${col.field}${keyIndicator}</span> <span class="col-type">${col.type.toUpperCase()}</span>`;
            ul.appendChild(colLi);
        });

        // Toggle Expand
        header.addEventListener('click', () => {
            const isOpened = ul.classList.contains('open');
            // Close others 
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
   2. QUERY EXECUTION LOGIC
   ======================================================== */

const explainQueryBtn = document.getElementById('explainQueryBtn');
const explainModal = document.getElementById('explainModal');
const explainNodes = document.getElementById('explainNodes');

runQueryBtn.addEventListener('click', executeUserQuery);

if (explainQueryBtn) {
    explainQueryBtn.addEventListener('click', () => {
        const textSelection = sqlInput.value.substring(sqlInput.selectionStart, sqlInput.selectionEnd);
        const query = (textSelection || sqlInput.value).trim();
        if (!query) {
            showToast("Select or type a query to explain");
            return;
        }
        generateExplainPlan(query);
    });
}

sqlInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        executeUserQuery();
    }
});

clearEditorBtn.addEventListener('click', () => {
    sqlInput.value = '';
    updateLineNumbers();
    sqlInput.focus();
});

async function executeUserQuery() {
    exportCsvBtn.style.display = 'none';

    const textSelection = sqlInput.value.substring(sqlInput.selectionStart, sqlInput.selectionEnd);
    const query = (textSelection || sqlInput.value).trim();

    if (!query) {
        showStatus('Error: Select or type an SQL query to execute.', 'error');
        return;
    }

    // Processing UI state
    const originalBtnHTML = runQueryBtn.innerHTML;
    runQueryBtn.innerHTML = '<div class="spinner"></div> Executing...';
    runQueryBtn.disabled = true;
    runQueryBtn.style.boxShadow = 'none';

    try {
        const response = await fetch(EXECUTE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });

        const data = await response.json();

        // Save to History (if valid attempt)
        saveToHistory(query, data.success);

        // -------------------------------------------------------------
        // GRACEFUL ERROR HANDLING
        // -------------------------------------------------------------
        if (!response.ok || !data.success) {
            showStatus(`SQLite Engine Error:\n${data.error}`, 'error');
            hideTable();
            tabChart.style.display = 'none';
        } else {
            if (data.type === 'DataResult') {
                showStatus(`Query Executed. Retrieved ${data.rows.length} rows.`, 'success');
                hideEmptyState();
                switchTab('data');
                renderDataGrid(data.columns, data.rows);
                attemptVisualization(query, data.columns, data.rows);

                currentExportData = { columns: data.columns, rows: data.rows };
                if (data.rows.length > 0) exportCsvBtn.style.display = 'inline-flex';

            } else {
                showStatus(data.message, 'success');
                hideTable();
                tabChart.style.display = 'none';
                showEmptyState("Database Modified", "Rows were successfully updated.");
                showToast("Database Modified Successfully");

                if (query.toUpperCase().includes('CREATE') || query.toUpperCase().includes('DROP') || query.toUpperCase().includes('ALTER')) {
                    fetchSchema();
                }
            }
        }
    } catch (err) {
        console.error('Network Error:', err);
        showStatus('CRITICAL ERROR: Could not talk to the local Node layer.', 'error');
    } finally {
        runQueryBtn.innerHTML = originalBtnHTML;
        runQueryBtn.disabled = false;
        runQueryBtn.style.boxShadow = '';
    }
}

/* ========================================================
   3. RESULT GRID AND EXPORT
   ======================================================== */
function renderDataGrid(columns, rows) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (rows.length === 0) {
        hideTable();
        return;
    }

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

            if (val && typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                val = new Date(val).toLocaleString();
            }

            // Syntax highlight NULLs mapping to SQL aesthetic
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

    let csvContent = "";
    const headers = currentExportData.columns.map(c => `"${c}"`).join(",");
    csvContent += headers + "\r\n";

    currentExportData.rows.forEach(row => {
        const rowArray = currentExportData.columns.map(colName => {
            let val = row[colName];
            if (val === null) return '""';
            const escapedString = String(val).replace(/"/g, '""');
            return `"${escapedString}"`;
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
   4. ADVANCED VISUALIZATION & HISTORY
   ======================================================== */

// Attempt to draw a chart if the query seems like an aggregation
function attemptVisualization(query, columns, rows) {
    if (!rows || rows.length < 1) { tabChart.style.display = 'none'; return; }

    const upperQuery = query.toUpperCase();
    const isAgg = upperQuery.includes('COUNT(') || upperQuery.includes('SUM(') || upperQuery.includes('GROUP BY');

    if (!isAgg || columns.length < 2) {
        tabChart.style.display = 'none';
        return;
    }

    // Assume col[0] is label, col[1] is data
    const labels = rows.map(r => r[columns[0]] || 'Unknown');
    const chartData = rows.map(r => Number(r[columns[1]]) || 0);

    tabChart.style.display = 'flex'; // Show the visualize tab button!

    if (currentChart) currentChart.destroy();

    const ctx = document.getElementById('resultChart').getContext('2d');

    // Pick chart type based on row count
    const type = rows.length > 8 ? 'bar' : 'doughnut';

    currentChart = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: columns[1],
                data: chartData,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(139, 92, 246, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(14, 165, 233, 0.7)'
                ],
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#e2e8f0', font: { family: 'Outfit' } } }
            },
            scales: type === 'bar' ? {
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            } : {}
        }
    });
}

// Visualizes how the engine executes the query
function generateExplainPlan(query) {
    openModal(explainModal);
    explainNodes.innerHTML = '';

    // Simple RegEx parsing for demo purposes
    const upperQuery = query.toUpperCase();
    const steps = [];

    // 1. FROM (Table Scan)
    const fromMatch = upperQuery.match(/FROM\s+([A-Z0-9_]+)/);
    if (fromMatch) {
        steps.push({
            icon: 'fa-database',
            colorClass: 'icon-scan',
            title: 'Table Scan',
            desc: `Engine reads data pages from the physical disk for table:`,
            code: fromMatch[1]
        });
    }

    // 2. JOINs
    const joinMatches = upperQuery.match(/JOIN\s+([A-Z0-9_]+)\s+ON/g);
    if (joinMatches) {
        joinMatches.forEach(j => {
            const t = j.replace(/JOIN\s+/, '').replace(/\s+ON/, '');
            steps.push({
                icon: 'fa-link',
                colorClass: 'icon-join',
                title: 'Nested Loop Join',
                desc: `Engine merges matching rows in memory with table:`,
                code: t
            });
        });
    }

    // 3. WHERE (Filtering)
    const whereMatch = upperQuery.match(/WHERE\s+(.+?)(?:GROUP|ORDER|LIMIT|$)/);
    if (whereMatch) {
        steps.push({
            icon: 'fa-filter',
            colorClass: 'icon-filter',
            title: 'Predicate Filtering',
            desc: `Engine discards rows that do not match the condition:`,
            code: whereMatch[1].trim()
        });
    }

    // 4. SELECT (Projection)
    const selectMatch = upperQuery.match(/SELECT\s+(.+?)\s+FROM/);
    if (selectMatch) {
        let cols = selectMatch[1].trim();
        if (cols.length > 30) cols = cols.substring(0, 30) + '...';
        steps.push({
            icon: 'fa-table-columns',
            colorClass: 'icon-project',
            title: 'Column Projection',
            desc: `Engine extracts and formats only the requested columns:`,
            code: cols
        });
    }

    // Render Steps with staggered animation
    if (steps.length === 0) {
        explainNodes.innerHTML = '<p style="text-align:center; padding: 2rem;">Could not parse execution plan for this query.</p>';
        return;
    }

    steps.forEach((step, index) => {
        const delay = index * 0.4;
        const html = `
            <div class="sql-node" style="animation-delay: ${delay}s">
                <div class="node-icon ${step.colorClass}"><i class="fa-solid ${step.icon}"></i></div>
                <div class="node-content">
                    <h4>Step ${index + 1}: ${step.title}</h4>
                    <p>${step.desc}</p>
                    ${step.code ? `<span class="node-code">${step.code}</span>` : ''}
                </div>
            </div>
        `;
        explainNodes.insertAdjacentHTML('beforeend', html);
    });
}

function saveToHistory(sql, success) {
    let history = JSON.parse(localStorage.getItem('dbms_history') || '[]');
    // Avoid exact consecutive duplicates
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

    if (history.length === 0) {
        list.innerHTML = '<li class="history-empty">No query history yet.</li>';
        return;
    }

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

        li.addEventListener('click', () => {
            sqlInput.value = item.sql;
            updateLineNumbers();
            switchTab('editor');
        });

        list.appendChild(li);
    });
}

// Download local DB backup
if (downloadDbBtn) {
    downloadDbBtn.addEventListener('click', () => {
        window.open('http://localhost:3000/database.sqlite', '_blank');
        showToast("Database file download started");
    });
}

/* ========================================================
   5. UI UTILITIES
   ======================================================== */
function showStatus(text, type) {
    statusMessage.textContent = text;
    statusMessage.className = `status-message status-${type}`;
}

function hideTable() {
    resultTable.style.display = 'none';
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
}

function showEmptyState(title = "Ready to Execute", subtitle = "Run a query to view data") {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.style.display = 'flex';
        emptyState.querySelector('h3').textContent = title;
        emptyState.querySelector('p').textContent = subtitle;
    }
}

function hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'none';
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/* ========================================================
   5. MODALS AND SETTINGS LOGIC
   ======================================================== */
const modalOverlay = document.getElementById('modalOverlay');
const docsModal = document.getElementById('docsModal');
const settingsModal = document.getElementById('settingsModal');

const docsBtn = document.getElementById('docsBtn');
const settingsBtn = document.getElementById('settingsBtn');
const closeBtns = document.querySelectorAll('.close-modal');

// Open Modals
if (docsBtn) docsBtn.addEventListener('click', () => openModal(docsModal));
if (settingsBtn) settingsBtn.addEventListener('click', () => openModal(settingsModal));

// Close Modals
closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

function openModal(modal) {
    if (!modal) return;
    modalOverlay.classList.add('show');
    modal.classList.add('show');
}

function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('show');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
}

// Theme Switcher Logic
const themeBtns = document.querySelectorAll('.theme-btn');
themeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const theme = e.target.getAttribute('data-theme');
        applyTheme(theme);
        showToast(`Theme applied: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
    });
});

function applyTheme(theme) {
    // Save to local storage
    localStorage.setItem('dbms_theme', theme);

    // Update button UI
    themeBtns.forEach(b => b.classList.remove('active'));
    document.querySelector(`.theme-btn[data-theme="${theme}"]`)?.classList.add('active');

    // Apply body class
    document.body.className = '';
    if (theme !== 'blue') {
        document.body.classList.add(`theme-${theme}`);
    }
}

// Line Numbers Toggle Logic
const toggleLines = document.getElementById('toggleLines');
const lineNumbersDiv = document.getElementById('lineNumbers');
if (toggleLines) {
    toggleLines.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        localStorage.setItem('dbms_lines', isChecked ? 'true' : 'false');
        if (lineNumbersDiv) {
            lineNumbersDiv.style.display = isChecked ? 'block' : 'none';
        }
    });
}

function loadSavedSettings() {
    // Load Theme
    const savedTheme = localStorage.getItem('dbms_theme') || 'blue';
    applyTheme(savedTheme);

    // Load Line Toggles
    const savedLines = localStorage.getItem('dbms_lines');
    if (savedLines === 'false') {
        if (toggleLines) toggleLines.checked = false;
        if (lineNumbersDiv) lineNumbersDiv.style.display = 'none';
    }
}

// Factory Reset Logic
const resetDbBtn = document.getElementById('resetDbBtn');
if (resetDbBtn) {
    resetDbBtn.addEventListener('click', async () => {
        const confirmReset = confirm("Are you sure you want to completely erase the database and recreate the dummy data? All custom data will be lost.");
        if (!confirmReset) return;

        resetDbBtn.innerHTML = '<div class="spinner"></div> Resetting...';

        try {
            const response = await fetch('http://localhost:3000/api/reset', { method: 'POST' });
            const data = await response.json();

            if (response.ok && data.success) {
                showToast("Database Factory Reset Successful");
                closeModal();
                fetchSchema();
                hideTable();
                showEmptyState("Database Reset", "The library has been restored to factory settings.");
            } else {
                alert('Reset Error: ' + data.error);
            }
        } catch (err) {
            alert('Could not reach backend to reset database.');
        } finally {
            resetDbBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Reset DB';
        }
    });
}
