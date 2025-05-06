document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - CSV Data Explorer");

    // --- Configuration ---
    const MAX_UNIQUE_VALUES_TO_LIST = 50; // Max unique values before switching to text input for filtering

    // --- DOM Elements ---
    const fileInput = document.getElementById('csvFileInput');
    const fileInfoDiv = document.getElementById('fileInfo');
    // Placeholders/Containers
    const dynamicFiltersDiv = document.getElementById('dynamicFilters');
    const dataTableContainer = document.getElementById('dataTableContainer');
    const chartsPlaceholder = document.getElementById('chartsPlaceholder');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const chart1Container = document.querySelector('#chart1Canvas')?.parentElement;
    const chart2Container = document.querySelector('#chart2Canvas')?.parentElement;


    // --- Global Data Stores ---
    let fullDataset = [];
    let headers = [];
    let dataTableInstance = null;
    let chart1Instance = null; // Added
    let chart2Instance = null; // Added

    // --- Function to display status/errors ---
    function showStatus(message, isError = false) {
        console.log(`Status Update${isError ? ' (Error)' : ''}: ${message}`);
        const statusHtml = `<p class="${isError ? 'error-message' : 'placeholder-text'}">${message}</p>`;
        if (dynamicFiltersDiv && (dynamicFiltersDiv.querySelector('.placeholder-text') || dynamicFiltersDiv.querySelector('.error-message'))) {
            dynamicFiltersDiv.innerHTML = statusHtml;
        }
         if (dataTableContainer && (dataTableContainer.querySelector('.placeholder-text') || dataTableContainer.querySelector('.error-message'))) {
             dataTableContainer.innerHTML = statusHtml;
         }
        // Only update charts placeholder if no charts are displayed yet or on error
        if (chartsPlaceholder && (!chart1Instance && !chart2Instance || isError)) {
             chartsPlaceholder.style.display = 'block';
             chartsPlaceholder.textContent = isError ? `Error: ${message}` : message;
        } else if (chartsPlaceholder) {
             chartsPlaceholder.style.display = 'none';
        }

        if (isError && fileInfoDiv) fileInfoDiv.textContent = '';
    }

     // --- Function to reset UI ---
     function resetUI() {
         console.log("Resetting UI...");
         showStatus('Upload a CSV to generate filters, table, and charts.');
         fileInfoDiv.textContent = '';
         fileInput.disabled = false;
         // Don't reset fileInput.value here, let the browser handle it
         fullDataset = [];
         headers = [];
         if (resetFiltersBtn) resetFiltersBtn.style.display = 'none';
         if (dynamicFiltersDiv) dynamicFiltersDiv.innerHTML = '<p class="placeholder-text">Upload a CSV to generate filters.</p>';

         // Destroy existing DataTable and remove table element
         if (dataTableInstance) {
              console.log("Resetting UI: Destroying previous DataTable instance.");
              dataTableInstance.destroy();
              dataTableInstance = null;
              const oldTable = document.getElementById('dataTable');
              if (oldTable) oldTable.remove();
         }
          if (dataTableContainer) dataTableContainer.innerHTML = '<p class="placeholder-text">Upload a CSV to view the data table.</p>';

         // Clear charts and hide canvases
         clearChart('chart1Canvas', chart1Instance); chart1Instance = null;
         clearChart('chart2Canvas', chart2Instance); chart2Instance = null;
         if (chart1Container) chart1Container.querySelector('canvas').style.display = 'none';
         if (chart2Container) chart2Container.querySelector('canvas').style.display = 'none';
         if(chartsPlaceholder) chartsPlaceholder.style.display = 'block'; // Show placeholder again
         if(chartsPlaceholder) chartsPlaceholder.textContent = 'Upload a CSV to generate charts.';
     }

    // --- Function to format numbers ---
    function formatNumber(num) {
        if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
             if (typeof num === 'string' && !isNaN(parseFloat(num)) && isFinite(Number(num))) {
                return parseFloat(num).toLocaleString();
             }
            return num === null || num === undefined ? '' : String(num);
        }
        return Number.isInteger(num) ? num.toLocaleString() : parseFloat(num.toFixed(3)).toLocaleString();
    }

    // --- Function to Analyze Data (Minimal - for potential future use) ---
    function analyzeData(data, headers) {
        console.log("Starting analysis (currently minimal)...");
         if (!data || data.length === 0 || !headers || headers.length === 0) return {};
        console.log("Analysis placeholder complete.");
        return {};
    }

     // --- Function to Create Table Structure ---
     function createTableStructure(headers) {
         console.log("Creating table structure for DataTables...");
          if (!dataTableContainer) { console.error("dataTableContainer not found!"); return null; }
         dataTableContainer.innerHTML = ''; // Clear placeholder

         if (!headers || headers.length === 0) {
             showStatus("Cannot create table: No headers available.", true); return null;
         }
         const table = document.createElement('table');
         table.id = 'dataTable';
         table.classList.add('display', 'compact', 'stripe', 'hover', 'order-column', 'cell-border');
         table.style.width = '100%';
         const thead = table.createTHead();
         const headerRow = thead.insertRow();
         headers.forEach(text => {
             const th = document.createElement('th');
             th.textContent = text;
             headerRow.appendChild(th);
         });
         table.createTBody();
         dataTableContainer.appendChild(table);
         console.log("Basic table structure created.");
         return table;
     }

     // --- Function to Initialize Data Table ---
     function initializeDataTable(data, headers) {
         console.log(`Initializing DataTable with ${data.length} rows.`);
         const tableElement = createTableStructure(headers);
         if (!tableElement) { console.error("Failed to create table structure."); return; }

         const dataForTable = data.map(row => headers.map(header => row.hasOwnProperty(header) ? (row[header] ?? '') : ''));

         try {
             if (typeof $ === 'undefined') throw new Error("jQuery is not loaded.");

             // Destroy previous instance if exists
             if (dataTableInstance) {
                 console.warn("Destroying previous DataTable instance before re-initializing.");
                 dataTableInstance.destroy();
                 const oldTable = document.getElementById('dataTable');
                 if(oldTable) oldTable.remove(); // Remove the old table from DOM
                  createTableStructure(headers); // Re-create structure
             }

             console.log("Initializing DataTables library...");
             dataTableInstance = $('#dataTable').DataTable({ // Assign to global instance
                 data: dataForTable,
                 paging: true, pageLength: 15, lengthChange: true,
                 lengthMenu: [ [10, 15, 25, 50, 100, -1], [10, 15, 25, 50, 100, "All"] ],
                 searching: true, ordering: true, info: true,
                 // scrollX: true,
                 destroy: true, // Important
                  language: { search: "_INPUT_", searchPlaceholder: "Search table..." }
             });
             console.log("DataTable initialized successfully.");

         } catch (error) {
             console.error("Error initializing DataTable:", error);
             showStatus(`Error displaying data table: ${error.message}`, true);
              dataTableInstance = null; // Clear instance on error
         }
     } // End initializeDataTable

    // --- Function to Generate Filter Controls ---
    function generateFilters(data, headers) {
         console.log("Phase 3: Generating filters...");
         if(!dynamicFiltersDiv) { console.error("Filter container not found!"); return; }
         dynamicFiltersDiv.innerHTML = '';

         if (!data || data.length === 0 || !headers || headers.length === 0) {
             dynamicFiltersDiv.innerHTML = '<p class="placeholder-text">No data available to generate filters.</p>';
             return;
         }

         headers.forEach(header => {
             let columnValues = data.map(row => row.hasOwnProperty(header) ? row[header] : undefined)
                                  .filter(v => v !== null && v !== undefined && v !== '');
             if (columnValues.length === 0) { console.log(`Skipping filter for empty column: ${header}`); return; }

             let numericCount = 0; let possibleNumeric = true;
             columnValues.forEach(v => {
                  if (typeof v === 'number') { numericCount++; }
                  else if (typeof v !== 'boolean') {
                      if (isNaN(parseFloat(String(v).trim())) || !isFinite(Number(String(v).trim()))) { possibleNumeric = false; }
                      else { numericCount++; }
                  }
             });
             let columnType = 'categorical';
             if (possibleNumeric && (numericCount / columnValues.length) > 0.8) { columnType = 'numeric'; }

             const filterGroup = document.createElement('div');
             filterGroup.classList.add('filter-group');
             const label = document.createElement('label');
             label.htmlFor = `filter-${header}`;
             label.textContent = header;
             filterGroup.appendChild(label);

             if (columnType === 'numeric') {
                 const numericValues = columnValues.map(v => Number(String(v).trim())).filter(n => !isNaN(n) && isFinite(n));
                  if (numericValues.length > 0) {
                    const minVal = Math.min(...numericValues); const maxVal = Math.max(...numericValues);
                    const minInput = document.createElement('input');
                    minInput.type = 'number'; minInput.id = `filter-min-${header}`; minInput.placeholder = `Min (${formatNumber(minVal)})`;
                    minInput.dataset.column = header; minInput.dataset.filterType = 'min'; minInput.step = 'any';
                    filterGroup.appendChild(minInput);
                    const maxInput = document.createElement('input');
                    maxInput.type = 'number'; maxInput.id = `filter-max-${header}`; maxInput.placeholder = `Max (${formatNumber(maxVal)})`;
                    maxInput.dataset.column = header; maxInput.dataset.filterType = 'max'; maxInput.step = 'any'; maxInput.style.marginTop = '5px';
                    filterGroup.appendChild(maxInput);
                  } else { label.textContent += " (Numeric - No valid data)"; }
             } else { // Categorical
                 const uniqueValues = [...new Set(columnValues)].sort((a, b) => String(a).localeCompare(String(b)));
                 if (uniqueValues.length <= MAX_UNIQUE_VALUES_TO_LIST && uniqueValues.length > 0) {
                     const select = document.createElement('select');
                     select.id = `filter-${header}`; select.dataset.column = header; select.dataset.filterType = 'select';
                     const allOption = document.createElement('option'); allOption.value = 'all'; allOption.textContent = `All`; select.appendChild(allOption);
                     uniqueValues.forEach(val => { const option = document.createElement('option'); option.value = val; option.textContent = val; select.appendChild(option); });
                     filterGroup.appendChild(select);
                 } else if (uniqueValues.length > 0) {
                     const textInput = document.createElement('input');
                     textInput.type = 'text'; textInput.id = `filter-${header}`; textInput.placeholder = `Filter ${header}... (text)`;
                     textInput.dataset.column = header; textInput.dataset.filterType = 'text';
                     filterGroup.appendChild(textInput);
                 } else { label.textContent += " (No distinct values)"; }
             }
             dynamicFiltersDiv.appendChild(filterGroup);
         });

         console.log("Filter controls generated.");
         addFilterListeners(); // Add listeners AFTER controls are in the DOM
     } // End generateFilters

    // --- Helper function to Create or Update Chart ---
    function updateOrCreateChart(canvasId, currentInstance, setInstanceCallback, chartConfig) {
        const canvasElement = document.getElementById(canvasId);
        if (!canvasElement) { console.error(`Canvas element with ID '${canvasId}' not found.`); return; }
        const ctx = canvasElement.getContext('2d');
        if (currentInstance) { currentInstance.destroy(); }
        try {
            const newInstance = new Chart(ctx, chartConfig);
            console.log(`Chart created/updated for ${canvasId}.`);
            setInstanceCallback(newInstance);
            canvasElement.style.display = 'block';
            if (canvasElement.parentElement) canvasElement.parentElement.style.display = 'block';
        } catch (error) {
             console.error(`Error creating chart for ${canvasId}:`, error);
             setInstanceCallback(null);
             ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        }
    }

    // --- Helper function to clear a chart canvas ---
    function clearChart(canvasId, chartInstance) {
        const canvas = document.getElementById(canvasId);
         if (chartInstance) {
             try { chartInstance.destroy(); } catch(e) { console.warn("Error destroying chart", e)}
         }
         if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none'; // Hide the canvas too
             if (canvas.parentElement) canvas.parentElement.style.display = 'none'; // Hide container too
        }
    }


    // --- Function to Update Charts (Phase 6 Implementation) ---
    function updateCharts(data, headers) {
        console.log(`Phase 6: Updating charts with ${data.length} rows.`);
        if (!data || data.length === 0) {
             console.log("No data to display charts.");
             clearChart('chart1Canvas', chart1Instance); chart1Instance = null;
             clearChart('chart2Canvas', chart2Instance); chart2Instance = null;
             if(chartsPlaceholder) chartsPlaceholder.style.display = 'block';
             if(chartsPlaceholder) chartsPlaceholder.textContent = 'No data available to generate charts (or all data filtered out).';
             return;
        } else {
             if(chartsPlaceholder) chartsPlaceholder.style.display = 'none';
        }

        // --- Chart 1: Bar Chart - Counts by Product_Category ---
        try {
            if (headers.includes('Product_Category')) {
                const categoryCounts = data.reduce((acc, row) => {
                    const category = row['Product_Category'];
                    if (category !== null && category !== undefined && category !== '') { acc[category] = (acc[category] || 0) + 1; } return acc;
                }, {});
                const chart1Labels = Object.keys(categoryCounts); const chart1Data = Object.values(categoryCounts);
                updateOrCreateChart('chart1Canvas', chart1Instance, (newInstance) => { chart1Instance = newInstance; }, {
                    type: 'bar', data: { labels: chart1Labels, datasets: [{ label: 'Count by Product Category', data: chart1Data, backgroundColor: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1 }] },
                    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true, title: { display: true, text: 'Count' } } }, plugins: { title: { display: true, text: 'Entries per Product Category' }, legend: { display: false } } }
                });
            } else { console.warn("Chart 1: 'Product_Category' column not found."); clearChart('chart1Canvas', chart1Instance); chart1Instance = null; }
        } catch (error) { console.error("Error creating Chart 1:", error); clearChart('chart1Canvas', chart1Instance); chart1Instance = null; }

        // --- Chart 2: Scatter Plot - Units_Sold vs Revenue ---
        try {
             if (headers.includes('Units_Sold') && headers.includes('Revenue')) {
                const scatterData = data.map(row => ({ x: row['Units_Sold'], y: row['Revenue'] })).filter(point => typeof point.x === 'number' && isFinite(point.x) && typeof point.y === 'number' && isFinite(point.y));
                if (scatterData.length > 0) {
                    updateOrCreateChart('chart2Canvas', chart2Instance, (newInstance) => { chart2Instance = newInstance; }, {
                        type: 'scatter', data: { datasets: [{ label: 'Units Sold vs Revenue', data: scatterData, backgroundColor: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgba(255, 99, 132, 1)', pointRadius: 5, pointHoverRadius: 7 }] },
                        options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Units Sold' } }, y: { type: 'linear', title: { display: true, text: 'Revenue ($)' } } }, plugins: { title: { display: true, text: 'Revenue vs Units Sold' }, legend: { display: false } } }
                    });
                } else { console.warn("Chart 2: Not enough valid numeric data points for Units_Sold/Revenue."); clearChart('chart2Canvas', chart2Instance); chart2Instance = null; }
             } else { console.warn("Chart 2: Required columns 'Units_Sold' or 'Revenue' not found."); clearChart('chart2Canvas', chart2Instance); chart2Instance = null; }
        } catch (error) { console.error("Error creating Chart 2:", error); clearChart('chart2Canvas', chart2Instance); chart2Instance = null; }
    } // End updateCharts


    // --- Function to Handle Filter Changes (Phase 5 Implementation) ---
    function handleFilterChange() {
        if (!fullDataset || fullDataset.length === 0) return;
        console.log("Handling filter change...");
        const activeFilters = {};

        dynamicFiltersDiv.querySelectorAll('select, input').forEach(filterElement => {
            const column = filterElement.dataset.column; const filterType = filterElement.dataset.filterType; const value = filterElement.value.trim();
            if (!activeFilters[column]) { activeFilters[column] = {}; }
            if (filterType && ((filterType === 'select' && value !== 'all') || (filterType !== 'select' && value !== ''))) {
                 activeFilters[column][filterType] = value;
             }
        });
        console.log("Active Filters:", activeFilters);

        const filteredData = fullDataset.filter(row => {
            for (const column in activeFilters) {
                if (activeFilters.hasOwnProperty(column) && row.hasOwnProperty(column)) {
                    const filtersForColumn = activeFilters[column]; const rowValue = row[column];
                    if (filtersForColumn.select && String(rowValue) !== String(filtersForColumn.select)) return false;
                    if (filtersForColumn.text && !String(rowValue).toLowerCase().includes(String(filtersForColumn.text).toLowerCase())) return false;
                    const minFilter = filtersForColumn.min;
                    if (minFilter !== undefined && minFilter !== '') { const numMin = parseFloat(minFilter); const numRowValue = parseFloat(rowValue); if (isNaN(numRowValue) || numRowValue < numMin) return false; }
                    const maxFilter = filtersForColumn.max;
                    if (maxFilter !== undefined && maxFilter !== '') { const numMax = parseFloat(maxFilter); const numRowValue = parseFloat(rowValue); if (isNaN(numRowValue) || numRowValue > numMax) return false; }
                } else if (activeFilters.hasOwnProperty(column)) { // Handle row missing a column that's being filtered
                     return false;
                }
            }
            return true;
        });
        console.log(`Filtered data count: ${filteredData.length}`);

        if (dataTableInstance) {
            console.log("Updating DataTable with filtered data...");
            const dataForTable = filteredData.map(row => headers.map(header => row.hasOwnProperty(header) ? (row[header] ?? '') : ''));
            dataTableInstance.clear().rows.add(dataForTable).draw();
            console.log("DataTable updated.");
        } else { console.warn("DataTable instance not found, cannot update table."); }

        // --- Update Charts ---
        updateCharts(filteredData, headers); // Pass filtered data to charts

    } // End handleFilterChange

    // --- Function to Handle Reset Button Click (Phase 5 Implementation) ---
    function handleResetFilters() {
        console.log("Resetting filters...");
        dynamicFiltersDiv.querySelectorAll('select').forEach(select => select.value = 'all');
        dynamicFiltersDiv.querySelectorAll('input').forEach(input => input.value = '');
        // Re-display full dataset in table and charts
        if (fullDataset) {
            initializeDataTable(fullDataset, headers); // Re-init table with full data
            updateCharts(fullDataset, headers); // Update charts with full data
        }
    } // End handleResetFilters

    // --- Add Filter Listeners (Phase 5 Implementation) ---
    function addFilterListeners() {
        console.log("Adding filter listeners...");
        if (!dynamicFiltersDiv || !resetFiltersBtn) {
            console.error("Could not find filter container or reset button to add listeners.");
            return;
        }
        // Use event delegation on the container
        dynamicFiltersDiv.removeEventListener('input', handleFilterChange); // Remove potential old listeners
        dynamicFiltersDiv.removeEventListener('change', handleFilterChange);
        resetFiltersBtn.removeEventListener('click', handleResetFilters);

        dynamicFiltersDiv.addEventListener('input', function(event) {
            if (event.target.matches('input[type="text"], input[type="number"]')) {
                handleFilterChange(); // Consider adding debounce here for performance
            }
        });
        dynamicFiltersDiv.addEventListener('change', function(event) {
             if (event.target.matches('select')) {
                handleFilterChange();
            }
        });
        resetFiltersBtn.addEventListener('click', handleResetFilters);
        console.log("Filter listeners added.");
    } // End addFilterListeners


    // --- Function to handle file parsing completion ---
    function onFileParsed(results) {
        console.log("PapaParse complete:", results);
        fileInput.disabled = false;

        if (results.errors && results.errors.length > 0) {
            console.warn("PapaParse encountered errors:", results.errors);
             showStatus(`CSV Parsing finished with ${results.errors.length} errors (check console). Attempting to display data...`, true);
        }

        if (results.data && results.data.length > 0) {
            fullDataset = results.data;
            headers = (results.meta.fields || Object.keys(fullDataset[0] || {})).filter(h => h && h.trim() !== '');

            if (!headers || headers.length === 0) {
                 showStatus("Could not determine headers from CSV.", true);
                 resetUI(); return;
            }

            console.log("Headers found:", headers);
            console.log(`Parsed ${fullDataset.length} rows.`);

            try {
                initializeDataTable(fullDataset, headers);
                generateFilters(fullDataset, headers);

                if(chartsPlaceholder) chartsPlaceholder.style.display = 'none';
                if (chart1Container) chart1Container.querySelector('canvas').style.display = 'block';
                if (chart2Container) chart2Container.querySelector('canvas').style.display = 'block';
                if (resetFiltersBtn) resetFiltersBtn.style.display = 'inline-block';

            } catch(error) {
                 console.error("Error during component initialization:", error);
                 showStatus(`Error setting up components: ${error.message}`, true);
            }

        } else {
            showStatus("No data rows found in the CSV file.", true);
            resetUI();
        }
   } // End onFileParsed

    // --- Function to handle parsing errors ---
    function onParseError(error) {
        console.error("PapaParse critical error:", error);
        showStatus(`Fatal error parsing CSV: ${error.message}`, true);
        resetUI();
        fileInput.disabled = false;
    }


   // --- Event Listener for File Input Change ---
   fileInput.addEventListener('change', function(event) {
       console.log("File input changed.");
       const files = event.target.files;
       // console.log(`Number of files selected: ${files ? files.length : 'null'}`);

       // ** Moved Reset UI to inside reader.onload **

       if (files && files.length > 0) {
           // console.log("Inside 'if (files.length > 0)' block.");
           const file = files[0];

           if (!file.type.match('text/csv') && !file.name.toLowerCase().endsWith('.csv') && file.type !== '') {
                // console.log("File type check triggered alert.");
                alert('Warning: File might not be a CSV. Attempting to parse anyway.');
           }

           console.log("File selected:", file.name, file.size, file.type);
           fileInfoDiv.textContent = `File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
           showStatus(`Reading file: ${file.name}...`);
           fileInput.disabled = true;

           const reader = new FileReader();

           reader.onload = function(e) {
               console.log("FileReader onload triggered.");
               // Reset UI *before* parsing and potentially showing errors
               resetUI();
               showStatus("Parsing CSV..."); // Show parsing status after reset
               Papa.parse(e.target.result, {
                    header: true,
                    skipEmptyLines: 'greedy',
                    dynamicTyping: true,
                    worker: false,
                    complete: onFileParsed,
                    error: onParseError
                });
           };

           reader.onerror = function(e) {
               console.error("FileReader onerror triggered:", reader.error);
               showStatus(`Error reading file: ${reader.error.message}`, true);
               // No need to call resetUI here as showStatus handles it on error
               fileInput.disabled = false;
           };

           // console.log("Calling reader.readAsText()...");
           reader.readAsText(file);
           // console.log("Called reader.readAsText().");

       } else {
           console.log("No file selected or selection cancelled.");
            resetUI(); // Reset UI if no file is selected
       }
   }); // End Event Listener

    // --- Initial UI State ---
    resetUI(); // Call reset on initial load

}); // End of DOMContentLoaded