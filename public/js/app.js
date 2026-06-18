// Base API URL
const API_URL = '/'; 

// Auth Interceptor
const originalFetch = window.fetch;
window.fetch = async function(resource, config) {
    config = config || {};
    config.headers = config.headers || {};
    
    const token = localStorage.getItem('sqlens_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await originalFetch(resource, config);
    // If 401 Unauthorized, clear token and redirect to login
    if (response.status === 401 && !resource.includes('/auth/')) {
        localStorage.removeItem('sqlens_token');
        window.location.href = '/login.html';
    }
    return response;
};

// Redirect if no token exists on load
if (!localStorage.getItem('sqlens_token') && window.location.pathname !== '/login.html') {
    window.location.href = '/login.html';
}

let currentAiSuggestion = null;
let allQueries = [];
let allModules = [];
let allTeams = [];   // ← equipos (L3, L2, QA, MC...)
let currentFilterType = 'all';
let currentFilterModule = 'all';

// --- Pagination state ---
let currentPage = 1;
let paginationMeta = { total: 0, page: 1, limit: 20, totalPages: 1 };
const PAGE_LIMIT = 20;

// --- Sidebar summary (ALL records, not paginated) ---
let allQueriesSummary = [];

// Helper for Hex Icons (Emojis)
function decodeIcon(iconStr) {
    if (!iconStr) return '📁';
    if (iconStr.startsWith('hex:')) {
        try {
            const hex = iconStr.replace('hex:', '');
            return String.fromCodePoint(parseInt(hex, 16));
        } catch (e) { return '📁'; }
    }
    return iconStr;
}

function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const okBtn = document.getElementById('btn-confirm-ok');
        const cancelBtn = document.getElementById('btn-confirm-cancel');
        
        document.getElementById('confirm-modal-title').textContent = title;
        document.getElementById('confirm-modal-message').textContent = message;
        
        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };
        const cleanup = () => {
            modal.classList.remove('active');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
        };
        
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        modal.classList.add('active');
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (e) { return ''; }
}

function encodeIcon(iconStr) {
    if (!iconStr) return '📁';
    // If it's a multicharacter emoji or special char, encode as hex
    const codePoint = iconStr.codePointAt(0);
    if (codePoint > 127) { // Non-ASCII
        return `hex:${codePoint.toString(16).toUpperCase()}`;
    }
    return iconStr;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const queriesContainer = document.getElementById('queries-container');
    const btnNewQuery = document.getElementById('btn-new-query');
    const searchInput = document.getElementById('searchInput');
    const btnSmartFallback = document.getElementById('btn-smart-fallback');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const modalOverlay = document.getElementById('query-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const queryForm = document.getElementById('query-form');
    const modalError = document.getElementById('modal-error');
    const modalTitle = document.getElementById('modal-title');
    const aiModalOverlay = document.getElementById('smart-search-modal');
    const btnCloseAiModal = document.getElementById('btn-close-ai-modal');
    const btnSaveAiQuery = document.getElementById('btn-save-ai-query');
    const aiExplanation = document.getElementById('ai-explanation');
    const aiSqlCode = document.getElementById('ai-sql-code');
    const aiWarnings = document.getElementById('ai-warnings');
    const btnCopyAi = document.getElementById('btn-copy-ai');
    const btnAdminModules = document.getElementById('btn-admin-modules');
    const adminModulesModal = document.getElementById('admin-modules-modal');
    const btnCloseAdminModal = document.getElementById('btn-close-admin-modal');
    const adminModulesList = document.getElementById('admin-modules-list');
    const moduleAdminForm = document.getElementById('module-admin-form');

    const btnConfigToggle = document.getElementById('btn-config-toggle');
    const configMenu = document.getElementById('config-menu');
    const configChevron = document.getElementById('config-chevron');
    const btnPosDirectory = document.getElementById('btn-pos-directory');
    const posModal = document.getElementById('pos-modal');
    const btnClosePosModal = document.getElementById('btn-close-pos-modal');
    const posListContainer = document.getElementById('pos-list-container');
    const posAdminForm = document.getElementById('pos-admin-form');
    const adminPosList = document.getElementById('admin-pos-list');
    
    const teamAdminForm = document.getElementById('team-admin-form');
    const adminTeamsList = document.getElementById('admin-teams-list');
    
    let allPOs = [];

    // Define Functions
    async function fetchModules() {
        try {
            const res = await fetch('/modules');
            const data = await res.json();
            if (data.success) {
                allModules = data.data;
                renderModuleFilters();
                renderModuleSelector();
            }
        } catch (err) { console.error('Error fetching modules:', err); }
    }

    async function fetchTeams() {
        try {
            const res = await fetch('/teams');
            const data = await res.json();
            if (data.success) {
                allTeams = data.data;
            }
        } catch (err) { console.error('Error fetching teams:', err); }
    }

    // Trae solo type+module de TODOS los registros (sin páginación) para el sidebar
    async function fetchQueriesSummary() {
        try {
            const res = await fetch('/queries/summary');
            const data = await res.json();
            if (data.success) {
                allQueriesSummary = data.data;
                renderModuleFilters();
            }
        } catch (err) { console.error('Error fetching summary:', err); }
    }

    async function loadQueries(page = 1) {
        if (!queriesContainer) return;
        currentPage = page;
        queriesContainer.innerHTML = '<div class="loader-container"><div class="spinner"></div></div>';
        try {
            const res = await fetch(`${API_URL}queries?page=${page}&limit=${PAGE_LIMIT}`);
            const data = await res.json();
            allQueries = data.data || [];
            paginationMeta = data.meta || { total: 0, page, limit: PAGE_LIMIT, totalPages: 1 };
            // Solo actualiza el acordeón del sidebar, NO registra nuevos listeners
            renderModuleFilters();
            renderQueries(allQueries);
        } catch (error) { queriesContainer.innerHTML = '<div style="text-align:center;color:var(--danger);padding:40px">❌ Error cargando registros</div>'; }
    }
    window.loadQueries = loadQueries;

    // Carga TODOS los registros de un tipo/módulo desde el backend (sin paginación)
    async function loadFilteredQueries(type, module = null) {
        if (!queriesContainer) return;
        queriesContainer.innerHTML = '<div class="loader-container"><div class="spinner"></div></div>';
        try {
            let url = `${API_URL}queries?type=${encodeURIComponent(type)}`;
            if (module) url += `&module=${encodeURIComponent(module)}`;
            const res = await fetch(url);
            const data = await res.json();
            allQueries = data.data || [];
            // Sin paginación para vistas filtradas
            paginationMeta = { total: 0, page: 1, limit: 9999, totalPages: 1 };
            renderQueries(allQueries);
        } catch (error) { queriesContainer.innerHTML = '<div style="text-align:center;color:var(--danger);padding:40px">❌ Error cargando registros</div>'; }
    }

    function renderQueries(queries) {
        if (!queriesContainer) return;
        queriesContainer.innerHTML = '';
        
        const filtered = queries.filter(q => {
            if (currentFilterType === 'favorites') return q.is_favorite;
            const matchType = currentFilterType === 'all' || q.type === currentFilterType;
            const matchModule = currentFilterModule === 'all' || q.module === currentFilterModule;
            return matchType && matchModule;
        });

        if (!filtered.length) { 
            queriesContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); margin-top: 50px;">📭 No hay consultas aquí.</div>'; 
            return; 
        }
        filtered.forEach(q => {
            const mData = allModules.find(m => m.name.toLowerCase() === (q.module || '').toLowerCase()) || { color: '#64748b', icon: '📁' };
            const typeIcons = { sql: '🗄️', prompt: '✨', note: '📝', sicc: '💻', ods: '🗂️', prol: '📊', servicios: '🛠️', servidores: '🖥️', conexiones: '🔗', usuarios_contrasenas: '🔑' };
            const tIcon = typeIcons[q.type] || '🗄️';
            const isFav = q.is_favorite ? '⭐' : '☆';
            
            let contentHtml = '';
            if (q.type === 'note') {
                contentHtml = `<div class="markdown-body" style="padding: 15px; background: var(--bg-light); border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.95rem;">${marked.parse(q.sql_query)}</div>`;
            } else {
                const lang = q.type === 'sql' ? 'language-sql' : 'language-markdown';
                contentHtml = `
                <div class="code-wrapper">
                    <button class="copy-btn btn-sm" data-action="copy">Copiar</button>
                    <pre class="${q.sql_query.length > 250 ? 'collapsed' : ''}"><code class="code-font ${lang}">${escapeHtml(q.sql_query)}</code></pre>
                    ${q.sql_query.length > 250 ? '<button class="toggle-btn" data-action="toggle">Ver más</button>' : ''}
                </div>`;
            }

            const card = document.createElement('div');
            card.className = 'query-card';
            card.innerHTML = `
                <div class="card-header">
                    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
                        <span class="module-badge" style="background: ${mData.color}20; color: ${mData.color}; border: 1px solid ${mData.color}40; width: fit-content;">${decodeIcon(mData.icon)} ${q.module}</span>
                        <h3 class="card-title">${tIcon} ${escapeHtml(q.title)}</h3>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="card-date">${formatDate(q.created_at)}</span>
                        <button class="btn-fav" data-action="favorite" data-id="${q.id}" title="Favorito">${isFav}</button>
                    </div>
                </div>
                <div class="card-context">${escapeHtml(q.context)}</div>
                ${q.dev ? `<div class="card-author">${escapeHtml(q.dev)}</div>` : ''}
                <div class="card-tags">${(q.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
                ${contentHtml}
                <div class="card-actions">
                    <button class="btn secondary btn-sm" data-action="edit" data-id="${q.id}">Editar</button>
                    <button class="btn danger btn-sm" data-action="delete" data-id="${q.id}">Eliminar</button>
                </div>
            `;
            queriesContainer.appendChild(card);
        });
        
        // Highlight syntax
        if (window.Prism) {
            Prism.highlightAllUnder(queriesContainer);
        }

        // Render pagination only when in 'all' mode (not filtered client-side)
        renderPagination();
    }

    function renderPagination() {
        // Remove existing pagination if any
        const existingPagination = document.getElementById('pagination-wrapper');
        if (existingPagination) existingPagination.remove();

        // Only show pagination on full load (not on client-side filter or search)
        if (currentFilterType !== 'all' || currentFilterModule !== 'all') return;
        if (paginationMeta.totalPages <= 1) return;

        const { page, totalPages, total, limit } = paginationMeta;
        const from = (page - 1) * limit + 1;
        const to = Math.min(page * limit, total);

        const wrapper = document.createElement('div');
        wrapper.id = 'pagination-wrapper';
        wrapper.className = 'pagination-wrapper';

        // Info text
        const info = document.createElement('div');
        info.className = 'pagination-info';
        info.textContent = `Mostrando ${from}–${to} de ${total} registros`;
        wrapper.appendChild(info);

        // Controls
        const controls = document.createElement('div');
        controls.className = 'pagination-controls';

        // Helper to create a page button
        const makeBtn = (label, pageNum, extraClass = '') => {
            const btn = document.createElement('button');
            btn.className = `page-btn${extraClass ? ' ' + extraClass : ''}`;
            btn.innerHTML = label;
            if (pageNum !== null) {
                btn.dataset.page = pageNum;
                btn.addEventListener('click', () => loadQueries(pageNum));
            }
            return btn;
        };

        // Prev button
        const prevBtn = makeBtn('‹', page - 1, 'nav-btn');
        if (page <= 1) prevBtn.disabled = true;
        controls.appendChild(prevBtn);

        // Page number buttons with smart ellipsis
        const getPageNumbers = (current, total) => {
            const delta = 2;
            const pages = [];
            const left = Math.max(2, current - delta);
            const right = Math.min(total - 1, current + delta);

            pages.push(1);
            if (left > 2) pages.push('...');
            for (let i = left; i <= right; i++) pages.push(i);
            if (right < total - 1) pages.push('...');
            if (total > 1) pages.push(total);
            return pages;
        };

        getPageNumbers(page, totalPages).forEach(p => {
            if (p === '...') {
                controls.appendChild(makeBtn('…', null, 'ellipsis'));
            } else {
                const btn = makeBtn(p, p);
                if (p === page) {
                    btn.classList.add('active');
                    btn.disabled = true;
                }
                controls.appendChild(btn);
            }
        });

        // Next button
        const nextBtn = makeBtn('›', page + 1, 'nav-btn');
        if (page >= totalPages) nextBtn.disabled = true;
        controls.appendChild(nextBtn);

        wrapper.appendChild(controls);
        queriesContainer.appendChild(wrapper);
    }

    function renderModuleFilters() {
        const accordionContainer = document.getElementById('accordion-container');
        if (!accordionContainer) return;
        accordionContainer.innerHTML = '';

        const typeGroups = [
            { id: 'sql',                 title: '🗄️ Consultas SQL' },
            { id: 'prompt',              title: '✨ Prompts de IA' },
            { id: 'note',                title: '📝 Apuntes y Procesos' },
            { id: 'sicc',               title: '💻 SICC' },
            { id: 'ods',                title: '🗂️ ODS' },
            { id: 'prol',               title: '📊 PROL' },
            { id: 'servicios',          title: '🛠️ Servicios' },
            { id: 'servidores',         title: '🖥️ Servidores' },
            { id: 'conexiones',         title: '🔗 Conexiones' },
            { id: 'usuarios_contrasenas', title: '🔑 Usuarios y Contraseñas' }
        ];

        // --- Render por equipo ---
        allTeams.forEach(team => {
            // Módulos que pertenecen a este equipo
            const teamModules = allModules.filter(m => m.team_id === team.id);
            // Tipos que tienen al menos un registro en algún módulo de este equipo
            const relevantTypes = typeGroups.filter(group =>
                allQueriesSummary.some(q => q.type === group.id && teamModules.some(m => m.name === q.module))
            );

            // Cabecera del equipo (siempre se muestra aunque esté vacío)
            const teamSection = document.createElement('div');
            teamSection.className = 'team-section';
            teamSection.dataset.teamId = team.id;

            const teamHeader = document.createElement('div');
            teamHeader.className = 'team-header';
            teamHeader.innerHTML = `
                <div class="team-header-inner">
                    <span class="team-icon" style="color:${team.color}">${decodeIcon(team.icon)}</span>
                    <span class="team-name">${team.name}</span>
                    <span class="team-badge" style="background:${team.color}22; color:${team.color}; border:1px solid ${team.color}44">${teamModules.length}</span>
                </div>
                <span class="team-chevron">▾</span>
            `;

            const teamBody = document.createElement('div');
            teamBody.className = 'team-body';

            // Toggle equipo
            let isTeamOpen = false; // empieza cerrado
            // NO agregar 'team-open' al cargar
            teamHeader.addEventListener('click', () => {
                isTeamOpen = !isTeamOpen;
                teamSection.classList.toggle('team-open', isTeamOpen);
            });

            if (relevantTypes.length === 0) {
                // Sin registros en este equipo
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'team-empty';
                emptyMsg.textContent = 'Sin registros aún';
                teamBody.appendChild(emptyMsg);
            } else {
                // Render acordeones de tipo dentro del equipo
                relevantTypes.forEach(group => {
                    const divGroup = document.createElement('div');
                    divGroup.className = `accordion-group ${currentFilterType === group.id ? 'open' : ''}`;

                    const header = document.createElement('div');
                    header.className = `accordion-header ${currentFilterType === group.id && currentFilterModule === 'all' ? 'active' : ''}`;
                    header.innerHTML = `
                        ${group.title}
                        <span class="accordion-toggle">▶</span>
                    `;
                    header.addEventListener('click', () => {
                        const isOpen = divGroup.classList.contains('open');
                        document.querySelectorAll('.accordion-group').forEach(g => g.classList.remove('open'));
                        if (!isOpen) divGroup.classList.add('open');

                        currentFilterType = group.id;
                        currentFilterModule = 'all';
                        updateSidebarActiveStates();
                        loadFilteredQueries(group.id);
                    });

                    const content = document.createElement('div');
                    content.className = 'accordion-content';
                    const ul = document.createElement('ul');

                    // Solo módulos de ESTE equipo con registros de este tipo
                    const activeModulesForType = [...new Set(
                        allQueriesSummary
                            .filter(q => q.type === group.id && teamModules.some(m => m.name === q.module))
                            .map(q => q.module)
                    )];

                    teamModules.forEach(m => {
                        if (!activeModulesForType.includes(m.name)) return;

                        const li = document.createElement('li');
                        const isActive = currentFilterType === group.id && currentFilterModule === m.name;
                        li.className = isActive ? 'active' : '';
                        li.dataset.module = m.name;
                        li.dataset.type = group.id;

                        if (isActive) {
                            li.style.borderRight = `4px solid ${m.color}`;
                            li.style.background = `${m.color}10`;
                        }

                        li.innerHTML = `<span class="icon" style="background: ${m.color}15; color: ${m.color}; border-radius: 6px; padding: 4px; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; font-size: 1rem;">${decodeIcon(m.icon)}</span> <span>${m.name}</span>`;

                        li.addEventListener('click', (e) => {
                            e.stopPropagation();
                            currentFilterType = group.id;
                            currentFilterModule = m.name;
                            updateSidebarActiveStates();
                            loadFilteredQueries(group.id, m.name);
                        });

                        ul.appendChild(li);
                    });

                    content.appendChild(ul);
                    divGroup.appendChild(header);
                    divGroup.appendChild(content);
                    teamBody.appendChild(divGroup);
                });
            }

            teamSection.appendChild(teamHeader);
            teamSection.appendChild(teamBody);
            accordionContainer.appendChild(teamSection);
        });

        updateSidebarActiveStates();
    }

    function updateSidebarActiveStates() {
        const btnAll = document.getElementById('btn-filter-all');
        const btnFav = document.getElementById('btn-filter-favorites');
        
        if (btnAll) {
            if (currentFilterType === 'all') btnAll.classList.add('active');
            else btnAll.classList.remove('active');
        }
        if (btnFav) {
            if (currentFilterType === 'favorites') btnFav.classList.add('active');
            else btnFav.classList.remove('active');
        }

        document.querySelectorAll('.accordion-header:not(#btn-filter-all):not(#btn-filter-favorites)').forEach(header => {
            const groupDiv = header.closest('.accordion-group');
            const groupId = groupDiv.querySelector('li') ? groupDiv.querySelector('li').dataset.type : '';
            if (currentFilterType === groupId && currentFilterModule === 'all') {
                header.classList.add('active');
            } else {
                header.classList.remove('active');
            }
        });

        document.querySelectorAll('.accordion-content li').forEach(li => {
            if (li.dataset.module === currentFilterModule && li.dataset.type === currentFilterType) {
                li.classList.add('active');
                const mData = allModules.find(m => m.name === currentFilterModule);
                if(mData) {
                    li.style.borderRight = `4px solid ${mData.color}`;
                    li.style.background = `${mData.color}10`;
                }
            } else {
                li.classList.remove('active');
                li.style.borderRight = '';
                li.style.background = '';
            }
        });
    }

    function renderTeamSelector() {
        const teamSelect = document.getElementById('query_team');
        if (!teamSelect) return;
        teamSelect.innerHTML = allTeams.map(t =>
            `<option value="${t.id}">${decodeIcon(t.icon)} ${t.name}</option>`
        ).join('');
        // Trigger module filter for the first team
        filterModulesByTeam(parseInt(teamSelect.value));
    }

    function filterModulesByTeam(teamId) {
        const moduleSelect = document.getElementById('module');
        if (!moduleSelect) return;
        const filtered = allModules.filter(m => m.team_id === teamId);
        if (filtered.length === 0) {
            moduleSelect.innerHTML = '<option value="">-- Sin módulos en este equipo --</option>';
        } else {
            moduleSelect.innerHTML = filtered.map(m =>
                `<option value="${m.name}">${decodeIcon(m.icon)} ${m.name}</option>`
            ).join('');
        }
    }

    function renderModuleSelector() {
        // Populate the team selector first, then let it drive module filtering
        renderTeamSelector();
    }


    function renderAdminModulesList() {
        if (!adminModulesList) return;
        adminModulesList.innerHTML = allModules.map(m => {
            const teamName = m.team_name || '—';
            const teamColor = m.team_color || '#64748b';
            return `
            <div class="module-admin-item">
                <div class="module-info">
                    <div class="module-icon-preview" style="background: ${m.color}20; color: ${m.color}">${decodeIcon(m.icon)}</div>
                    <div>
                        <strong>${m.name}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); display:flex; gap:8px; margin-top:2px;">
                            <span>Color: ${m.color}</span>
                            <span style="background:${teamColor}22; color:${teamColor}; border:1px solid ${teamColor}44; border-radius:4px; padding:1px 6px; font-weight:600;">${teamName}</span>
                        </div>
                    </div>
                </div>
                <div class="module-admin-actions">
                    <button class="btn text-btn btn-sm" onclick="editModuleInAdmin(${m.id}, '${m.name}', '${decodeIcon(m.icon)}', '${m.color}', ${m.team_id || 'null'})">Editar</button>
                    <button class="btn text-btn btn-sm danger" onclick="deleteModuleInAdmin(${m.id})">Eliminar</button>
                </div>
            </div>
        `}).join('');
    }
    function renderAdminTeamSelect() {
        const teamSelect = document.getElementById('admin-module-team');
        if (!teamSelect) return;
        teamSelect.innerHTML = allTeams.map(t =>
            `<option value="${t.id}">${decodeIcon(t.icon)} ${t.name}</option>`
        ).join('');
    }


    const queryType = document.getElementById('query_type');
    const labelSqlQuery = document.getElementById('label-sql-query');


    if (queryType && labelSqlQuery) {
        queryType.addEventListener('change', (e) => {
            const v = e.target.value;
            if (v === 'sql') labelSqlQuery.textContent = 'Código SQL';
            else if (v === 'prompt') labelSqlQuery.textContent = 'Prompt de IA (Texto)';
            else if (v === 'sicc') labelSqlQuery.textContent = 'Consulta / Contenido SICC';
            else if (v === 'ods') labelSqlQuery.textContent = 'Consulta / Contenido ODS';
            else if (v === 'prol') labelSqlQuery.textContent = 'Consulta / Contenido PROL';
            else if (v === 'servicios') labelSqlQuery.textContent = 'Detalle de Servicios';
            else if (v === 'servidores') labelSqlQuery.textContent = 'Configuración de Servidores';
            else if (v === 'conexiones') labelSqlQuery.textContent = 'Detalle de Conexiones';
            else if (v === 'usuarios_contrasenas') labelSqlQuery.textContent = 'Usuarios y Contraseñas';
            else labelSqlQuery.textContent = 'Apunte / Documentación';
        });
    }

    const openModal = (query = null, isEdit = false) => {
        modalError.textContent = '';
        if (query) {
            modalTitle.textContent = isEdit ? '✨ Editar Registro' : '✨ Guardar Registro';
            document.getElementById('query_id').value = isEdit ? query.id : ''; 
            document.getElementById('title').value = (query.title || '').toUpperCase();
            document.getElementById('context').value = query.context || '';
            document.getElementById('sql_query').value = query.sql_query || '';
            document.getElementById('dev').value = query.dev || '';
            document.getElementById('tags').value = query.tags ? query.tags.join(', ') : '';
            // Pre-select team and filter modules accordingly
            const matchingModule = allModules.find(m => m.name.toLowerCase() === (query.module || '').toLowerCase());
            if (matchingModule && matchingModule.team_id) {
                const teamSelect = document.getElementById('query_team');
                if (teamSelect) {
                    teamSelect.value = matchingModule.team_id;
                    filterModulesByTeam(matchingModule.team_id);
                }
            }
            document.getElementById('module').value = matchingModule ? matchingModule.name : '';
            if (queryType) {
                queryType.value = query.type || 'sql';
                queryType.dispatchEvent(new Event('change'));
            }
        } else {
            modalTitle.textContent = '✨ Agregar Registro';
            queryForm.reset();
            document.getElementById('query_id').value = '';
            // Reset team select and re-filter modules for first team
            renderTeamSelector();
            if (queryType) {
                queryType.value = 'sql';
                queryType.dispatchEvent(new Event('change'));
            }
        }
        modalOverlay.classList.add('active');
    };

    const closeModal = () => modalOverlay.classList.remove('active');

    async function handleSaveQuery(e) {
        e.preventDefault();
        const id = document.getElementById('query_id').value;
        const payload = {
            title: document.getElementById('title').value.toUpperCase(),
            context: document.getElementById('context').value,
            sql_query: document.getElementById('sql_query').value,
            module: document.getElementById('module').value,
            dev: document.getElementById('dev').value,
            type: document.getElementById('query_type') ? document.getElementById('query_type').value : 'sql',
            tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean)
        };
        try {
            const url = id ? `${API_URL}queries/${id}` : `${API_URL}queries`;
            const res = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.success) { closeModal(); fetchQueriesSummary(); loadQueries(currentPage); }
            else { modalError.textContent = data.error; }
        } catch (err) { alert('Error guardando'); }
    }

    async function performSearch(query) {
        if (!query.trim()) return loadQueries(1);
        // Reset pagination meta so pagination bar disappears during search
        paginationMeta = { total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 1 };
        try {
            const res = await fetch(`${API_URL}search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
            allQueries = (await res.json()).data || []; 
            renderQueries(allQueries);
        } catch (err) {}
    }

    async function performSmartSearch(query) {
        try {
            const res = await fetch(`${API_URL}smart-search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
            const data = await res.json();
            if (!data.success) return alert('Error IA: ' + data.error);
            if (data.data.source === 'database') { allQueries = data.data.results; renderQueries(allQueries); }
            else { 
                currentAiSuggestion = data.data.suggestion; 
                aiWarnings.textContent = "⚠️ " + currentAiSuggestion.warnings; 
                aiExplanation.innerHTML = marked.parse(currentAiSuggestion.explanation); 
                aiSqlCode.textContent = currentAiSuggestion.sql || '-- No SQL'; 
                aiModalOverlay.classList.add('active'); 
            }
        } catch (err) { alert('Error IA'); }
    }

    async function fetchPOs() {
        try {
            const res = await fetch('/pos');
            const data = await res.json();
            if (data.success) {
                allPOs = data.data;
            }
        } catch (err) { console.error('Error fetching POs:', err); }
    }

    // Now call Initial load
    await fetchTeams();
    await fetchModules();
    await fetchPOs();
    await fetchQueriesSummary(); // Carga resumen completo para el sidebar
    loadQueries(1);
    
    // Setup listeners
    btnNewQuery.addEventListener('click', () => openModal());
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    queryForm.addEventListener('submit', handleSaveQuery);
    btnCloseAiModal.addEventListener('click', () => aiModalOverlay.classList.remove('active'));

    // Cuando el usuario cambia de equipo en el modal → filtrar módulos
    const queryTeamSelect = document.getElementById('query_team');
    if (queryTeamSelect) {
        queryTeamSelect.addEventListener('change', (e) => {
            filterModulesByTeam(parseInt(e.target.value));
        });
    }

    // --- Listeners estáticos del sidebar (registrados UNA SOLA VEZ) ---
    const btnFilterAll = document.getElementById('btn-filter-all');
    if (btnFilterAll) {
        btnFilterAll.addEventListener('click', () => {
            currentFilterType = 'all';
            currentFilterModule = 'all';
            document.querySelectorAll('.accordion-group').forEach(g => g.classList.remove('open'));
            updateSidebarActiveStates();
            loadQueries(1);
        });
    }
    const btnFilterFavorites = document.getElementById('btn-filter-favorites');
    if (btnFilterFavorites) {
        btnFilterFavorites.addEventListener('click', async () => {
            currentFilterType = 'favorites';
            currentFilterModule = 'all';
            document.querySelectorAll('.accordion-group').forEach(g => g.classList.remove('open'));
            updateSidebarActiveStates();
            // Carga todos los favoritos desde el backend
            queriesContainer.innerHTML = '<div class="loader-container"><div class="spinner"></div></div>';
            try {
                const res = await fetch(`${API_URL}queries?is_favorite=true&limit=9999`);
                const data = await res.json();
                allQueries = (data.data || []).filter(q => q.is_favorite);
                paginationMeta = { total: 0, page: 1, limit: 9999, totalPages: 1 };
                renderQueries(allQueries);
            } catch (e) {}
        });
    }

    const titleInput = document.getElementById('title');
    if (titleInput) {
        titleInput.addEventListener('input', (e) => {
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            e.target.value = e.target.value.toUpperCase();
            e.target.setSelectionRange(start, end);
        });
    }

    let searchTimeout;
    searchInput.addEventListener('input', () => {
        const val = searchInput.value;
        btnClearSearch.style.display = val.trim().length > 0 ? 'inline-block' : 'none';
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => performSearch(val), 300);
    });

    btnSmartFallback.addEventListener('click', () => {
        if (searchInput.value.trim().length > 0) performSmartSearch(searchInput.value);
    });

    btnCopyAi.addEventListener('click', () => {
        navigator.clipboard.writeText(aiSqlCode.textContent);
        btnCopyAi.textContent = '¡Copiado!';
        setTimeout(() => btnCopyAi.textContent = 'Copiar', 2000);
    });

    btnSaveAiQuery.addEventListener('click', () => {
        aiModalOverlay.classList.remove('active');
        openModal({
            title: searchInput.value,
            context: currentAiSuggestion.explanation,
            sql_query: currentAiSuggestion.sql,
            tags: currentAiSuggestion.tags || [],
            module: currentAiSuggestion.module || 'otros'
        });
    });

    const btnAutoMetadata = document.getElementById('btn-auto-metadata');
    btnAutoMetadata.addEventListener('click', async () => {
        const sqlText = document.getElementById('sql_query').value;
        const titleText = document.getElementById('title').value;
        const typeVal = document.getElementById('query_type') ? document.getElementById('query_type').value : 'sql';
        if (!sqlText.trim()) return;
        btnAutoMetadata.textContent = 'Analizando...';
        try {
            const res = await fetch(`${API_URL}generate-metadata`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    sql_query: sqlText, 
                    title: titleText ? titleText.trim() : '',
                    type: typeVal
                }) 
            });
            const data = await res.json();
            if (data.success && data.data) {
                document.getElementById('context').value = data.data.context;
                document.getElementById('tags').value = data.data.tags.join(', ');
            }
        } catch (err) {}
        finally { btnAutoMetadata.textContent = '✨ Autocompletar con IA'; }
    });



    queriesContainer.addEventListener('click', async (e) => {
        if (e.target.matches('[data-action="copy"]')) window.copyToClipboard(e.target);
        else if (e.target.matches('[data-action="delete"]')) window.deleteQuery(e.target.dataset.id);
        else if (e.target.closest('[data-action="favorite"]')) {
            const btn = e.target.closest('[data-action="favorite"]');
            const q = allQueries.find(item => item.id == btn.dataset.id);
            if (q) {
                // Optimistic UI update
                q.is_favorite = !q.is_favorite;
                btn.textContent = q.is_favorite ? '⭐' : '☆';
                try {
                    await fetch(`${API_URL}queries/${q.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_favorite: q.is_favorite })
                    });
                } catch (err) {}
            }
        }
        else if (e.target.matches('[data-action="edit"]')) {
            const q = allQueries.find(item => item.id == e.target.dataset.id);
            if (q) openModal(q, true);
        } else if (e.target.matches('[data-action="toggle"]')) {
            const pre = e.target.parentElement.querySelector('pre');
            if (pre) {
                pre.classList.toggle('collapsed');
                e.target.textContent = pre.classList.contains('collapsed') ? 'Ver más' : 'Ocultar';
            }
        }
    });

    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatWindow = document.getElementById('chat-window');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const chatMessages = document.getElementById('chat-messages');
    let chatHistory = [];

    chatToggleBtn.addEventListener('click', () => chatWindow.classList.toggle('active'));
    closeChat.addEventListener('click', () => chatWindow.classList.remove('active'));

    // Draggable Chat Logic
    let isDragging = false;
    let startX, startY;
    const chatHeader = document.querySelector('.chat-header');

    chatHeader.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        startX = e.clientX - chatWindow.offsetLeft;
        startY = e.clientY - chatWindow.offsetTop;
        chatWindow.style.transition = 'none';
        chatWindow.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        chatWindow.style.left = (e.clientX - startX) + 'px';
        chatWindow.style.top = (e.clientY - startY) + 'px';
        chatWindow.style.bottom = 'auto';
        chatWindow.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            chatWindow.style.transition = 'opacity 0.3s, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            chatWindow.style.userSelect = 'auto';
        }
    });

    const handleSendMessage = async () => {
        const msg = chatInput.value.trim();
        if (!msg) return;
        const userDiv = document.createElement('div'); userDiv.className = 'message user'; userDiv.textContent = msg; chatMessages.appendChild(userDiv);
        chatInput.value = '';
        const typingDiv = document.createElement('div'); typingDiv.className = 'message assistant typing'; typingDiv.textContent = '...'; chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        try {
            const res = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, history: chatHistory }) });
            const data = await res.json();
            chatMessages.removeChild(typingDiv);
            if (data.success) {
                const assistantDiv = document.createElement('div'); assistantDiv.className = 'message assistant'; assistantDiv.innerHTML = marked.parse(data.data); chatMessages.appendChild(assistantDiv);
                chatHistory.push({ role: 'user', content: msg }, { role: 'assistant', content: data.data });
            }
        } catch (err) { chatMessages.removeChild(typingDiv); }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };
    sendChatBtn.addEventListener('click', handleSendMessage);
    const adjustChatInputHeight = () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    };

    chatInput.addEventListener('input', adjustChatInputHeight);

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
            chatInput.style.height = 'auto';
        }
    });

    const btnSuggestModule = document.getElementById('btn-suggest-module');
    if (btnSuggestModule) {
        btnSuggestModule.addEventListener('click', async () => {
            const name = document.getElementById('admin-module-name').value;
            if (!name) return;
            btnSuggestModule.textContent = '⏳';
            try {
                const res = await fetch('/suggest-module-metadata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('admin-module-icon').value = data.data.icon;
                    document.getElementById('admin-module-color').value = data.data.color;
                }
            } catch (err) {} finally { btnSuggestModule.textContent = '✨'; }
        });
    }

    const btnSuggestTeam = document.getElementById('btn-suggest-team');
    if (btnSuggestTeam) {
        btnSuggestTeam.addEventListener('click', async () => {
            const name = document.getElementById('admin-team-name').value;
            if (!name) return;
            btnSuggestTeam.textContent = '⏳';
            try {
                const res = await fetch('/suggest-module-metadata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('admin-team-icon').value = data.data.icon;
                    document.getElementById('admin-team-color').value = data.data.color;
                }
            } catch (err) {} finally { btnSuggestTeam.textContent = '✨'; }
        });
    }

    if (btnAdminModules) {
        btnAdminModules.addEventListener('click', () => {
            adminModulesModal.classList.add('active');
            renderAdminTeamSelect();
            renderAdminModulesList();
            renderAdminPOs();
            renderAdminTeams();
        });
    }

    btnCloseAdminModal.addEventListener('click', () => { adminModulesModal.classList.remove('active'); moduleAdminForm.reset(); });

    // Config Tabs Logic
    const configTabs = document.querySelectorAll('.tab-btn');
    const configPanes = document.querySelectorAll('.tab-pane');
    configTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            configTabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.color = 'var(--text-secondary)';
            });
            configPanes.forEach(p => p.style.display = 'none');
            
            tab.classList.add('active');
            tab.style.borderBottomColor = 'var(--primary-color)';
            tab.style.color = 'var(--text-color)';
            document.getElementById(tab.dataset.tab).style.display = 'block';
        });
    });

    // Toggle Accordion de Configuración
    if (btnConfigToggle && configMenu && configChevron) {
        btnConfigToggle.addEventListener('click', () => {
            const isExpanded = configMenu.style.display === 'flex';
            configMenu.style.display = isExpanded ? 'none' : 'flex';
            configChevron.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    }

    // PO Directory Logic
    function renderPOs() {
        if (!posListContainer) return;
        posListContainer.innerHTML = allPOs.length === 0 ? '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">No hay POs configurados</div>' : allPOs.map(item => `
            <div style="background: var(--input-bg); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                <h3 style="margin: 0 0 5px 0; color: var(--accent-blue); font-size: 1.1rem;">${escapeHtml(item.project_name)}</h3>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.95rem;">Responsables: <strong style="color: var(--text-primary);">${escapeHtml(item.owners)}</strong></p>
            </div>
        `).join('');
    }

    function renderAdminPOs() {
        if (!adminPosList) return;
        adminPosList.innerHTML = allPOs.map(item => `
            <div class="module-admin-item">
                <div class="module-info">
                    <div class="module-icon-preview" style="background: rgba(168, 177, 255, 0.2); color: #a8b1ff">👤</div>
                    <div><strong style="text-transform: capitalize;">${escapeHtml(item.project_name)}</strong><div style="font-size: 0.8rem; color: var(--text-secondary)">${escapeHtml(item.owners)}</div></div>
                </div>
                <div class="module-admin-actions">
                    <button class="btn text-btn btn-sm" onclick="editPOInAdmin(${item.id}, '${escapeHtml(item.project_name).replace(/'/g, "\\'")}', '${escapeHtml(item.owners).replace(/'/g, "\\'")}')">Editar</button>
                    <button class="btn text-btn btn-sm danger" onclick="deletePOInAdmin(${item.id})">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    function renderAdminTeams() {
        if (!adminTeamsList) return;
        adminTeamsList.innerHTML = allTeams.map(item => `
            <div class="module-admin-item">
                <div class="module-info">
                    <div class="module-icon-preview" style="background: ${item.color}20; color: ${item.color}">${decodeIcon(item.icon)}</div>
                    <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-secondary)">Orden: ${item.position}</div>
                    </div>
                </div>
                <div class="module-admin-actions">
                    <button class="btn text-btn btn-sm" onclick="editTeamInAdmin(${item.id}, '${escapeHtml(item.name).replace(/'/g, "\\'")}', '${escapeHtml(decodeIcon(item.icon)).replace(/'/g, "\\'")}', '${item.color}', ${item.position})">Editar</button>
                    <button class="btn text-btn btn-sm danger" onclick="deleteTeamInAdmin(${item.id})">Eliminar</button>
                </div>
            </div>
        `).join('');
    }


    if (btnPosDirectory) {
        btnPosDirectory.addEventListener('click', () => {
            renderPOs();
            posModal.classList.add('active');
        });
    }

    if (btnClosePosModal) {
        btnClosePosModal.addEventListener('click', () => {
            posModal.classList.remove('active');
        });
    }

    moduleAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('admin-module-id').value;
        const teamSelect = document.getElementById('admin-module-team');
        const payload = {
            name: document.getElementById('admin-module-name').value,
            icon: encodeIcon(document.getElementById('admin-module-icon').value),
            color: document.getElementById('admin-module-color').value,
            team_id: teamSelect && teamSelect.value ? parseInt(teamSelect.value) : null
        };
        try {
            const res = await fetch(id ? `/modules/${id}` : '/modules', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if ((await res.json()).success) { moduleAdminForm.reset(); await fetchModules(); renderAdminModulesList(); }
        } catch (err) {}
    });

    window.editModuleInAdmin = (id, name, icon, color, teamId) => {
        document.getElementById('admin-module-id').value = id;
        document.getElementById('admin-module-name').value = name;
        document.getElementById('admin-module-icon').value = icon;
        document.getElementById('admin-module-color').value = color;
        const teamSelect = document.getElementById('admin-module-team');
        if (teamSelect && teamId) teamSelect.value = teamId;
    };

    window.deleteModuleInAdmin = async (id) => {
        if (await showConfirm('¿Eliminar Módulo?', 'Esto podría afectar a las queries asociadas.')) {
            try {
                const res = await fetch(`/modules/${id}`, { method: 'DELETE' });
                if ((await res.json()).success) { await fetchModules(); renderAdminModulesList(); }
            } catch (err) {}
        }
    };

    if (posAdminForm) {
        posAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('admin-pos-id').value;
            const payload = {
                project_name: document.getElementById('admin-pos-project').value,
                owners: document.getElementById('admin-pos-owners').value
            };
            try {
                const res = await fetch(id ? `/pos/${id}` : '/pos', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if ((await res.json()).success) { posAdminForm.reset(); document.getElementById('admin-pos-id').value = ''; await fetchPOs(); renderAdminPOs(); }
            } catch (err) {}
        });
    }

    window.editPOInAdmin = (id, project_name, owners) => {
        document.getElementById('admin-pos-id').value = id;
        document.getElementById('admin-pos-project').value = project_name;
        document.getElementById('admin-pos-owners').value = owners;
    };

    window.deletePOInAdmin = async (id) => {
        if (await showConfirm('¿Eliminar PO?', 'Esta acción no se puede deshacer.')) {
            try {
                const res = await fetch(`/pos/${id}`, { method: 'DELETE' });
                if ((await res.json()).success) { await fetchPOs(); renderAdminPOs(); }
            } catch (err) {}
        }
    };

    if (teamAdminForm) {
        teamAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('admin-team-id').value;
            const payload = {
                name: document.getElementById('admin-team-name').value,
                icon: encodeIcon(document.getElementById('admin-team-icon').value),
                color: document.getElementById('admin-team-color').value,
                position: parseInt(document.getElementById('admin-team-position').value) || 0
            };
            try {
                const res = await fetch(id ? `/teams/${id}` : '/teams', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if ((await res.json()).success) { teamAdminForm.reset(); document.getElementById('admin-team-id').value = ''; await fetchTeams(); renderAdminTeams(); renderTeamSelector(); renderAdminTeamSelect(); }
            } catch (err) {}
        });
    }

    window.editTeamInAdmin = (id, name, icon, color, position) => {
        document.getElementById('admin-team-id').value = id;
        document.getElementById('admin-team-name').value = name;
        document.getElementById('admin-team-icon').value = icon;
        document.getElementById('admin-team-color').value = color;
        document.getElementById('admin-team-position').value = position;
    };

    window.deleteTeamInAdmin = async (id) => {
        if (await showConfirm('¿Eliminar Equipo?', 'Esta acción no se puede deshacer.')) {
            try {
                const res = await fetch(`/teams/${id}`, { method: 'DELETE' });
                if ((await res.json()).success) { await fetchTeams(); renderAdminTeams(); renderTeamSelector(); renderAdminTeamSelect(); }
            } catch (err) {}
        }
    };

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('sqlens_token');
            window.location.href = '/login.html';
        });
    }
    
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const prismLink = document.querySelector('link[href*="prism"]');
    let isDark = localStorage.getItem('sqlens_theme') === 'dark';
    
    const applyTheme = (dark) => {
        if (dark) {
            document.body.setAttribute('data-theme', 'dark');
            if (btnThemeToggle) btnThemeToggle.innerHTML = '<span class="icon">☀️</span> Modo Claro';
            if (prismLink) prismLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
        } else {
            document.body.removeAttribute('data-theme');
            if (btnThemeToggle) btnThemeToggle.innerHTML = '<span class="icon">🌙</span> Modo Oscuro';
            if (prismLink) prismLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css';
        }
    };
    
    applyTheme(isDark);
    
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            isDark = !isDark;
            localStorage.setItem('sqlens_theme', isDark ? 'dark' : 'light');
            applyTheme(isDark);
        });
    }

    window.copyToClipboard = (el) => { navigator.clipboard.writeText(el.nextElementSibling.textContent); el.textContent = '¡Copiado!'; setTimeout(() => el.textContent = 'Copiar', 2000); };
    window.deleteQuery = async (id) => { 
        if (await showConfirm('¿Eliminar Query?', 'Esta consulta se borrará permanentemente de tu repositorio.')) { 
            await fetch(`${API_URL}queries/${id}`, { method: 'DELETE' }); 
            fetchQueriesSummary();
            loadQueries(currentPage); 
        } 
    };

    // ── Mobile Sidebar Toggle ────────────────────────────────────────
    const btnSidebarToggle = document.getElementById('btn-sidebar-toggle');
    const sidebarOverlay   = document.getElementById('sidebar-overlay');
    const sidebarEl        = document.querySelector('.sidebar');

    function openMobileSidebar() {
        sidebarEl.classList.add('mobile-open');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // evita scroll detrás
    }

    function closeMobileSidebar() {
        sidebarEl.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (btnSidebarToggle) {
        btnSidebarToggle.addEventListener('click', () => {
            if (sidebarEl.classList.contains('mobile-open')) {
                closeMobileSidebar();
            } else {
                openMobileSidebar();
            }
        });
    }

    // Cerrar al hacer clic en el overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }

    // Cerrar sidebar al seleccionar un filtro en móvil
    if (sidebarEl) {
        sidebarEl.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                // Cerrar si hizo clic en un ítem de navegación o en Nuevo Registro
                const isNavItem = e.target.closest('.accordion-header, .accordion-content li, #btn-filter-all, #btn-filter-favorites, #btn-new-query');
                if (isNavItem) {
                    setTimeout(closeMobileSidebar, 150); // pequeño delay para ver el efecto
                }
            }
        });
    }
    // ────────────────────────────────────────────────────────────────

    // ── WhatsApp Support Button ──────────────────────────────────────
    const waToggleBtn   = document.getElementById('wa-toggle-btn');
    const waPopup       = document.getElementById('wa-popup');
    const btnCloseWa    = document.getElementById('btn-close-wa-popup');

    function openWaPopup() {
        waPopup.classList.add('open');
    }

    function closeWaPopup() {
        waPopup.classList.remove('open');
    }

    if (waToggleBtn) {
        waToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            waPopup.classList.contains('open') ? closeWaPopup() : openWaPopup();
        });
    }

    if (btnCloseWa) {
        btnCloseWa.addEventListener('click', (e) => {
            e.stopPropagation();
            closeWaPopup();
        });
    }

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (waPopup && !waPopup.contains(e.target) && e.target !== waToggleBtn) {
            closeWaPopup();
        }
    });
    // ────────────────────────────────────────────────────────────────

}); // End of DOMContentLoaded

function escapeHtml(unsafe) {
    return (unsafe || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
