// Main Application State
let macros = [];
let filteredMacros = [];
let selectedFile = null;
let selectedOwner = "all"; // "all", "Ivo", "Chenghao"
let currentPage = 1;
const itemsPerPage = 50;

// Tokenizer for SPEC Syntax Highlighting
function highlightSPEC(code) {
    const tokens = [
        { type: 'comment', regex: /#[^\n]*/ },
        { type: 'string', regex: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/ },
        { type: 'keyword', regex: /\b(def|local|global|if|else|for|while|return|print|printf|eprint|exit|break|continue|unix|get_angles|move_em|on|off|open|close|sleep|p|split|plotselect|plotlist|dscan|d2scan|mvr|mv|pic)\b/ },
        { type: 'number', regex: /\b\d+(\.\d+)?\b/ },
        { type: 'function', regex: /\b[a-zA-Z_0-9]+(?=\()/ },
        { type: 'variable', regex: /\$[0-9#\*]/ },
        { type: 'operator', regex: /[+\-*\/=<>!&|%]+/ }
    ];

    let html = '';
    let pos = 0;
    while (pos < code.length) {
        let match = null;
        let matchedType = null;
        
        for (const token of tokens) {
            token.regex.lastIndex = 0;
            const m = token.regex.exec(code.substring(pos));
            if (m && m.index === 0) {
                match = m[0];
                matchedType = token.type;
                break;
            }
        }
        
        if (match) {
            let val = match.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += `<span class="token-${matchedType}">${val}</span>`;
            pos += match.length;
        } else {
            let c = code[pos];
            if (c === '&') html += '&amp;';
            else if (c === '<') html += '&lt;';
            else if (c === '>') html += '&gt;';
            else html += c;
            pos++;
        }
    }
    return html;
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    // Load data from global window object (loaded from macros_data.js)
    if (window.MACROS_DATA) {
        macros = window.MACROS_DATA;
        initApp();
    } else {
        document.getElementById("macro-list").innerHTML = `
            <div class="loading-placeholder" style="color: var(--accent-rose);">
                Error: Could not load macros data. Please ensure 'macros_data.js' exists in the same directory.
            </div>
        `;
    }
});

function initApp() {
    calculateStats();
    buildSidebar();
    setupEventListeners();
    filterAndRender();
}

// Calculate Dashboard Stats
function calculateStats() {
    const ownerMacros = selectedOwner === "all" 
        ? macros 
        : macros.filter(m => m.owner === selectedOwner);
        
    const totalMacros = ownerMacros.length;
    
    // Unique names
    const uniqueNames = new Set(ownerMacros.map(m => m.name)).size;
    
    // Total unique files
    const uniqueFiles = new Set(ownerMacros.map(m => m.file)).size;
    
    // Documented count
    const documented = ownerMacros.filter(m => m.description && m.description.trim().length > 0).length;
    const docPercent = totalMacros > 0 ? Math.round((documented / totalMacros) * 100) : 0;
    
    // Update DOM
    document.getElementById("stat-total-macros").textContent = totalMacros.toLocaleString();
    document.getElementById("stat-unique-macros").textContent = uniqueNames.toLocaleString();
    document.getElementById("stat-total-files").textContent = uniqueFiles.toLocaleString();
    document.getElementById("stat-documented").textContent = `${documented.toLocaleString()} (${docPercent}%)`;
}

// Build Folder/Files hierarchy in the Sidebar
function buildSidebar() {
    const fileListEl = document.getElementById("file-list");
    fileListEl.innerHTML = "";
    
    const ownerMacros = selectedOwner === "all" 
        ? macros 
        : macros.filter(m => m.owner === selectedOwner);
        
    // Count macros per file
    const fileCounts = {};
    ownerMacros.forEach(m => {
        fileCounts[m.file] = (fileCounts[m.file] || 0) + 1;
    });
    
    // Group files by directory
    const directories = {};
    Object.keys(fileCounts).forEach(filePath => {
        const parts = filePath.split('/');
        let dirName = "Root";
        let fileName = filePath;
        
        if (parts.length > 1) {
            dirName = parts.slice(0, -1).join('/');
            fileName = parts[parts.length - 1];
        }
        
        if (!directories[dirName]) {
            directories[dirName] = [];
        }
        directories[dirName].push({
            path: filePath,
            name: fileName,
            count: fileCounts[filePath]
        });
    });
    
    // Sort directories and files within directories
    const sortedDirs = Object.keys(directories).sort();
    
    sortedDirs.forEach(dirPath => {
        const dirGroup = document.createElement("div");
        dirGroup.className = "directory-group";
        
        const dirHeader = document.createElement("div");
        dirHeader.className = "directory-name";
        dirHeader.textContent = dirPath;
        dirGroup.appendChild(dirHeader);
        
        // Sort files in this directory
        const filesInDir = directories[dirPath].sort((a, b) => a.name.localeCompare(b.name));
        
        filesInDir.forEach(fileObj => {
            const fileItem = document.createElement("div");
            fileItem.className = "file-item";
            fileItem.dataset.filepath = fileObj.path;
            if (selectedFile === fileObj.path) {
                fileItem.classList.add("active");
            }
            
            const nameSpan = document.createElement("span");
            nameSpan.textContent = fileObj.name;
            nameSpan.style.overflow = "hidden";
            nameSpan.style.textOverflow = "ellipsis";
            nameSpan.style.whiteSpace = "nowrap";
            
            const badge = document.createElement("span");
            badge.className = "file-badge";
            badge.textContent = fileObj.count;
            
            fileItem.appendChild(nameSpan);
            fileItem.appendChild(badge);
            
            fileItem.addEventListener("click", () => {
                selectFileFilter(fileObj.path);
            });
            
            dirGroup.appendChild(fileItem);
        });
        
        fileListEl.appendChild(dirGroup);
    });
}

// Select a file to filter on
function selectFileFilter(filePath) {
    selectedFile = filePath;
    
    // Update sidebar active state
    document.querySelectorAll(".file-item").forEach(item => {
        if (item.dataset.filepath === filePath) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });
    
    // Update active filters bar
    const filterBar = document.getElementById("active-filters-bar");
    const filterTag = document.getElementById("active-file-tag");
    
    if (filePath) {
        filterTag.textContent = filePath.split('/').pop() + ` (${filePath})`;
        filterBar.style.display = "flex";
    } else {
        filterBar.style.display = "none";
    }
    
    currentPage = 1;
    filterAndRender();
}

// Setup all DOM event listeners
function setupEventListeners() {
    // Spec Profile Tabs
    document.querySelectorAll(".profile-tab").forEach(tab => {
        tab.addEventListener("click", (e) => {
            document.querySelectorAll(".profile-tab").forEach(t => t.classList.remove("active"));
            e.target.classList.add("active");
            
            selectedOwner = e.target.dataset.owner;
            selectedFile = null; // Clear active file filter
            
            // Hide active filter bar
            document.getElementById("active-filters-bar").style.display = "none";
            
            currentPage = 1;
            calculateStats();
            buildSidebar();
            filterAndRender();
        });
    });

    // Search input typing
    const searchInput = document.getElementById("search-input");
    const clearBtn = document.getElementById("search-clear-btn");
    
    searchInput.addEventListener("input", () => {
        clearBtn.style.display = searchInput.value ? "block" : "none";
        currentPage = 1;
        filterAndRender();
    });
    
    clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        clearBtn.style.display = "none";
        currentPage = 1;
        filterAndRender();
        searchInput.focus();
    });
    
    // Search Filter checkboxes
    document.getElementById("filter-name").addEventListener("change", filterAndRender);
    document.getElementById("filter-docs").addEventListener("change", filterAndRender);
    document.getElementById("filter-code").addEventListener("change", filterAndRender);
    
    // Sort Select
    document.getElementById("sort-select").addEventListener("change", () => {
        currentPage = 1;
        filterAndRender();
    });
    
    // Clear File Filter Buttons
    document.getElementById("reset-file-filter").addEventListener("click", () => {
        selectFileFilter(null);
    });
    document.getElementById("remove-file-filter-tag").addEventListener("click", () => {
        selectFileFilter(null);
    });
    
    // Pagination Controls
    document.getElementById("pag-prev").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderMacrosList();
            scrollToTop();
        }
    });
    
    document.getElementById("pag-next").addEventListener("click", () => {
        const totalPages = Math.ceil(filteredMacros.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderMacrosList();
            scrollToTop();
        }
    });
    
    // Modal Close
    document.getElementById("modal-close-btn").addEventListener("click", closeModal);
    document.getElementById("modal-backdrop").addEventListener("click", closeModal);
    
    // Close modal on escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeModal();
        }
    });
    
    // Modal Copy Code Button
    document.getElementById("modal-copy-code-btn").addEventListener("click", (e) => {
        const codeText = document.getElementById("modal-code").textContent;
        copyToClipboard(codeText, e.target);
    });
}

function scrollToTop() {
    document.querySelector(".content-area").scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// Perform Search, Filter, Sort, then Render
function filterAndRender() {
    const searchVal = document.getElementById("search-input").value.trim().toLowerCase();
    const searchTerms = searchVal.split(/\s+/).filter(t => t.length > 0);
    
    const searchName = document.getElementById("filter-name").checked;
    const searchDocs = document.getElementById("filter-docs").checked;
    const searchCode = document.getElementById("filter-code").checked;
    
    // 1. Filter
    filteredMacros = macros.filter(m => {
        // Owner filter match
        if (selectedOwner !== "all" && m.owner !== selectedOwner) {
            return false;
        }
        
        // File filter match
        if (selectedFile && m.file !== selectedFile) {
            return false;
        }
        
        // Search terms match (AND logic: every search term must match at least one active field)
        if (searchTerms.length > 0) {
            return searchTerms.every(term => {
                let termMatched = false;
                
                if (searchName && m.name.toLowerCase().includes(term)) {
                    termMatched = true;
                }
                if (searchDocs && m.description.toLowerCase().includes(term)) {
                    termMatched = true;
                }
                if (searchCode && m.code.toLowerCase().includes(term)) {
                    termMatched = true;
                }
                
                return termMatched;
            });
        }
        
        return true;
    });
    
    // 2. Sort
    const sortVal = document.getElementById("sort-select").value;
    filteredMacros.sort((a, b) => {
        if (sortVal === "name-asc") {
            return a.name.localeCompare(b.name);
        } else if (sortVal === "name-desc") {
            return b.name.localeCompare(a.name);
        } else if (sortVal === "file-asc") {
            const fileComp = a.file.localeCompare(b.file);
            return fileComp !== 0 ? fileComp : a.name.localeCompare(b.name);
        } else if (sortVal === "lines-desc") {
            const aLen = a.end_line - a.start_line + 1;
            const bLen = b.end_line - b.start_line + 1;
            return bLen - aLen;
        } else if (sortVal === "lines-asc") {
            const aLen = a.end_line - a.start_line + 1;
            const bLen = b.end_line - b.start_line + 1;
            return aLen - bLen;
        }
        return 0;
    });
    
    // Update toolbar counts
    document.getElementById("count-number").textContent = filteredMacros.length.toLocaleString();
    
    // Render list
    renderMacrosList();
}

// Render the current page of macros
function renderMacrosList() {
    const listContainer = document.getElementById("macro-list");
    listContainer.innerHTML = "";
    
    if (filteredMacros.length === 0) {
        listContainer.innerHTML = `
            <div class="loading-placeholder">
                No macros found matching your filters.
            </div>
        `;
        updatePagination(0);
        return;
    }
    
    const totalPages = Math.ceil(filteredMacros.length / itemsPerPage);
    if (currentPage > totalPages) {
        currentPage = totalPages || 1;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredMacros.length);
    const pageItems = filteredMacros.slice(startIndex, endIndex);
    
    pageItems.forEach((macro, idx) => {
        const card = createMacroCard(macro, startIndex + idx);
        listContainer.appendChild(card);
    });
    
    updatePagination(totalPages);
}

// Create Card HTML Element for a single macro
function createMacroCard(macro, index) {
    const card = document.createElement("div");
    card.className = "macro-card";
    
    // Arguments display
    const argsStr = macro.arguments.length > 0 ? `(${macro.arguments.join(", ")})` : "()";
    
    // Lines count
    const lineCount = macro.end_line - macro.start_line + 1;
    
    // Header
    const cardHeader = document.createElement("div");
    cardHeader.className = "macro-card-header";
    
    const nameWrapper = document.createElement("div");
    nameWrapper.className = "macro-name-wrapper";
    
    const nameEl = document.createElement("span");
    nameEl.className = "macro-name";
    nameEl.textContent = macro.name;
    nameEl.title = "View macro details";
    nameEl.addEventListener("click", () => openModal(macro));
    
    const argsEl = document.createElement("span");
    argsEl.className = "macro-args";
    argsEl.textContent = argsStr;
    
    nameWrapper.appendChild(nameEl);
    nameWrapper.appendChild(argsEl);
    
    const metaEl = document.createElement("div");
    metaEl.className = "macro-meta";
    metaEl.innerHTML = `
        <span class="owner-badge owner-${macro.owner.toLowerCase()}">${macro.owner}</span>
        <span class="macro-meta-file" title="${macro.file}">${macro.file.split('/').pop()}</span>
        <span>&bull;</span>
        <span>Lines ${macro.start_line}-${macro.end_line} (${lineCount} l)</span>
    `;
    
    cardHeader.appendChild(nameWrapper);
    cardHeader.appendChild(metaEl);
    card.appendChild(cardHeader);
    
    // Description / Comments
    const descEl = document.createElement("div");
    if (macro.description && macro.description.trim().length > 0) {
        descEl.className = "macro-desc";
        descEl.textContent = macro.description;
    } else {
        descEl.className = "macro-desc empty";
        descEl.textContent = "No documentation comments found.";
    }
    card.appendChild(descEl);
    
    // Collapsible Code Box
    const codeToggle = document.createElement("div");
    codeToggle.className = "macro-code-toggle";
    
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "toggle-code-btn";
    toggleBtn.innerHTML = `<span class="caret">▼</span> Show Source Code`;
    
    const codeContainer = document.createElement("div");
    codeContainer.className = "code-container";
    
    const codeHeader = document.createElement("div");
    codeHeader.className = "code-actions-header";
    
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", (e) => {
        copyToClipboard(macro.code, copyBtn);
    });
    
    const viewFullBtn = document.createElement("button");
    viewFullBtn.className = "copy-btn";
    viewFullBtn.textContent = "Maximize";
    viewFullBtn.addEventListener("click", () => {
        openModal(macro);
    });
    
    codeHeader.appendChild(copyBtn);
    codeHeader.appendChild(viewFullBtn);
    
    const preEl = document.createElement("pre");
    const codeEl = document.createElement("code");
    // We lazy-render syntax highlighting when shown for performance
    let isHighlighted = false;
    
    codeContainer.appendChild(codeHeader);
    preEl.appendChild(codeEl);
    codeContainer.appendChild(preEl);
    
    toggleBtn.addEventListener("click", () => {
        const isCollapsed = !codeContainer.classList.contains("show");
        if (isCollapsed) {
            codeContainer.classList.add("show");
            toggleBtn.classList.add("expanded");
            toggleBtn.innerHTML = `<span class="caret">▼</span> Hide Source Code`;
            
            // Highlight code if not already done
            if (!isHighlighted) {
                codeEl.innerHTML = highlightSPEC(macro.code);
                isHighlighted = true;
            }
        } else {
            codeContainer.classList.remove("show");
            toggleBtn.classList.remove("expanded");
            toggleBtn.innerHTML = `<span class="caret">▼</span> Show Source Code`;
        }
    });
    
    codeToggle.appendChild(toggleBtn);
    codeToggle.appendChild(codeContainer);
    card.appendChild(codeToggle);
    
    return card;
}

// Update pagination state and elements
function updatePagination(totalPages) {
    const prevBtn = document.getElementById("pag-prev");
    const nextBtn = document.getElementById("pag-next");
    const currentSpan = document.getElementById("pag-current");
    const totalSpan = document.getElementById("pag-total");
    
    currentSpan.textContent = totalPages > 0 ? currentPage : 0;
    totalSpan.textContent = totalPages;
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
}

// Clipboard Copy Helper
function copyToClipboard(text, buttonEl) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = buttonEl.textContent;
        buttonEl.textContent = "Copied!";
        buttonEl.classList.add("copied");
        setTimeout(() => {
            buttonEl.textContent = originalText;
            buttonEl.classList.remove("copied");
        }, 1500);
    }).catch(err => {
        console.error("Failed to copy text: ", err);
    });
}

// Modal View Functions
function openModal(macro) {
    const modal = document.getElementById("macro-modal");
    
    document.getElementById("modal-file-path").textContent = `${macro.file} : Lines ${macro.start_line}-${macro.end_line}`;
    
    const modalOwner = document.getElementById("modal-owner-badge");
    modalOwner.textContent = macro.owner;
    modalOwner.className = `owner-badge owner-${macro.owner.toLowerCase()}`;
    
    document.getElementById("modal-title").textContent = macro.name;
    
    const argsStr = macro.arguments.length > 0 ? `(${macro.arguments.join(", ")})` : "()";
    document.getElementById("modal-args").textContent = argsStr;
    
    const descEl = document.getElementById("modal-desc");
    if (macro.description && macro.description.trim().length > 0) {
        descEl.textContent = macro.description;
        descEl.style.display = "block";
    } else {
        descEl.textContent = "No documentation comments found.";
        descEl.style.display = "block";
    }
    
    const codeEl = document.getElementById("modal-code");
    codeEl.innerHTML = highlightSPEC(macro.code);
    
    modal.classList.add("show");
    document.body.style.overflow = "hidden"; // Disable background scrolling
}

function closeModal() {
    const modal = document.getElementById("macro-modal");
    modal.classList.remove("show");
    document.body.style.overflow = ""; // Re-enable scrolling
}
