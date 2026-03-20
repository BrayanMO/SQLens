// Base API URL
const API_URL = '/'; 

let currentAiSuggestion = null;
let allQueries = [];
let allModules = []; 
let currentFilter = 'all';

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
    const moduleFilters = document.getElementById('module-filters');
    const btnAdminModules = document.getElementById('btn-admin-modules');
    const adminModulesModal = document.getElementById('admin-modules-modal');
    const btnCloseAdminModal = document.getElementById('btn-close-admin-modal');
    const adminModulesList = document.getElementById('admin-modules-list');
    const moduleAdminForm = document.getElementById('module-admin-form');

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

    async function loadQueries() {
        if (!queriesContainer) return;
        queriesContainer.innerHTML = '<div class="spinner"></div>';
        try {
            const res = await fetch(`${API_URL}queries`);
            const data = await res.json();
            allQueries = data.data || [];
            renderQueries(allQueries);
        } catch (error) { queriesContainer.innerHTML = 'Error cargando queries'; }
    }
    window.loadQueries = loadQueries;

    function renderQueries(queries) {
        if (!queriesContainer) return;
        queriesContainer.innerHTML = '';
        const filtered = currentFilter === 'all' ? queries : queries.filter(q => q.module === currentFilter);
        if (!filtered.length) { 
            queriesContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); margin-top: 50px;">📭 No hay consultas aquí.</div>'; 
            return; 
        }
        filtered.forEach(q => {
            const mData = allModules.find(m => m.name === q.module) || { color: '#64748b', icon: '📁' };
            const card = document.createElement('div');
            card.className = 'query-card';
            card.innerHTML = `
                <div class="card-header">
                    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
                        <span class="module-badge" style="background: ${mData.color}20; color: ${mData.color}; border: 1px solid ${mData.color}40; width: fit-content;">${decodeIcon(mData.icon)} ${q.module}</span>
                        <h3 class="card-title">${escapeHtml(q.title)}</h3>
                    </div>
                    <span class="card-date">${formatDate(q.created_at)}</span>
                </div>
                <div class="card-context">${escapeHtml(q.context)}</div>
                ${q.dev ? `<div class="card-author">${escapeHtml(q.dev)}</div>` : ''}
                <div class="card-tags">${(q.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
                <div class="code-wrapper">
                    <button class="copy-btn btn-sm" data-action="copy">Copiar</button>
                    <pre><code class="code-font ${q.sql_query.length > 250 ? 'collapsed' : ''}">${escapeHtml(q.sql_query)}</code></pre>
                    ${q.sql_query.length > 250 ? '<button class="toggle-btn" data-action="toggle">Ver más</button>' : ''}
                </div>
                <div class="card-actions">
                    <button class="btn secondary btn-sm" data-action="edit" data-id="${q.id}">Editar</button>
                    <button class="btn danger btn-sm" data-action="delete" data-id="${q.id}">Eliminar</button>
                </div>
            `;
            queriesContainer.appendChild(card);
        });
    }

    function renderModuleFilters() {
        if (!moduleFilters) return;
        moduleFilters.innerHTML = `<li class="${currentFilter === 'all' ? 'active' : ''}" data-module="all"><span class="icon">📊</span> Todos</li>`;
        allModules.forEach(m => {
            const li = document.createElement('li');
            const isActive = currentFilter === m.name;
            li.className = isActive ? 'active' : '';
            li.dataset.module = m.name;
            
            // Si está activo, aplicamos una sutil sombra o borde del color del módulo
            if (isActive) {
                li.style.borderRight = `4px solid ${m.color}`;
                li.style.background = `${m.color}10`;
            }

            li.innerHTML = `<span class="icon" style="background: ${m.color}15; color: ${m.color}; border-radius: 6px; padding: 4px; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; font-size: 1rem;">${decodeIcon(m.icon)}</span> ${m.name.charAt(0).toUpperCase() + m.name.slice(1)}`;
            moduleFilters.appendChild(li);
        });
    }

    function renderModuleSelector() {
        const select = document.getElementById('module');
        if (select) select.innerHTML = allModules.map(m => `<option value="${m.name}">${m.name.charAt(0).toUpperCase() + m.name.slice(1)}</option>`).join('');
    }

    function renderAdminModulesList() {
        if (!adminModulesList) return;
        adminModulesList.innerHTML = allModules.map(m => `
            <div class="module-admin-item">
                <div class="module-info">
                    <div class="module-icon-preview" style="background: ${m.color}20; color: ${m.color}">${decodeIcon(m.icon)}</div>
                    <div><strong style="text-transform: capitalize;">${m.name}</strong><div style="font-size: 0.8rem; color: var(--text-secondary)">Color: ${m.color}</div></div>
                </div>
                <div class="module-admin-actions">
                    <button class="btn text-btn btn-sm" onclick="editModuleInAdmin(${m.id}, '${m.name}', '${decodeIcon(m.icon)}', '${m.color}')">Editar</button>
                    <button class="btn text-btn btn-sm danger" onclick="deleteModuleInAdmin(${m.id})">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    const openModal = (query = null, isEdit = false) => {
        modalError.textContent = '';
        if (query) {
            modalTitle.textContent = isEdit ? 'Editar Query' : 'Guardar Query';
            document.getElementById('query-id').value = isEdit ? query.id : ''; 
            document.getElementById('title').value = query.title || '';
            document.getElementById('context').value = query.context || '';
            document.getElementById('sql_query').value = query.sql_query || '';
            document.getElementById('module').value = query.module || 'otros';
            document.getElementById('dev').value = query.dev || '';
            document.getElementById('tags').value = query.tags ? query.tags.join(', ') : '';
        } else {
            modalTitle.textContent = 'Nueva Query';
            queryForm.reset();
            document.getElementById('query-id').value = '';
        }
        modalOverlay.classList.add('active');
    };

    const closeModal = () => modalOverlay.classList.remove('active');

    async function handleSaveQuery(e) {
        e.preventDefault();
        const id = document.getElementById('query-id').value;
        const payload = {
            title: document.getElementById('title').value,
            context: document.getElementById('context').value,
            sql_query: document.getElementById('sql_query').value,
            module: document.getElementById('module').value,
            dev: document.getElementById('dev').value,
            tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean)
        };
        try {
            const url = id ? `${API_URL}queries/${id}` : `${API_URL}queries`;
            const res = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.success) { closeModal(); loadQueries(); }
            else { modalError.textContent = data.error; }
        } catch (err) { alert('Error guardando'); }
    }

    async function performSearch(query) {
        if (!query.trim()) return loadQueries();
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

    // Now call Initial load
    await fetchModules();
    loadQueries();
    
    // Setup listeners
    btnNewQuery.addEventListener('click', () => openModal());
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    queryForm.addEventListener('submit', handleSaveQuery);
    btnCloseAiModal.addEventListener('click', () => aiModalOverlay.classList.remove('active'));

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
        if (!sqlText.trim()) return;
        btnAutoMetadata.textContent = 'Analizando...';
        try {
            const res = await fetch(`${API_URL}generate-metadata`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql_query: sqlText }) });
            const data = await res.json();
            if (data.success && data.data) {
                document.getElementById('title').value = data.data.title;
                document.getElementById('context').value = data.data.context;
                document.getElementById('module').value = data.data.module;
                document.getElementById('tags').value = data.data.tags.join(', ');
            }
        } catch (err) {}
        finally { btnAutoMetadata.textContent = '✨ Autocompletar con IA'; }
    });

    moduleFilters.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        moduleFilters.querySelectorAll('li').forEach(item => item.classList.remove('active'));
        li.classList.add('active');
        currentFilter = li.dataset.module;
        renderQueries(allQueries);
    });

    queriesContainer.addEventListener('click', (e) => {
        if (e.target.matches('[data-action="copy"]')) window.copyToClipboard(e.target);
        else if (e.target.matches('[data-action="delete"]')) window.deleteQuery(e.target.dataset.id);
        else if (e.target.matches('[data-action="edit"]')) {
            const q = allQueries.find(item => item.id == e.target.dataset.id);
            if (q) openModal(q, true);
        } else if (e.target.matches('[data-action="toggle"]')) {
            const code = e.target.parentElement.querySelector('code');
            code.classList.toggle('collapsed');
            e.target.textContent = code.classList.contains('collapsed') ? 'Ver más' : 'Ocultar';
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
    chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSendMessage());

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

    btnAdminModules.addEventListener('click', () => { adminModulesModal.classList.add('active'); renderAdminModulesList(); });
    btnCloseAdminModal.addEventListener('click', () => { adminModulesModal.classList.remove('active'); moduleAdminForm.reset(); });

    moduleAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('admin-module-id').value;
        const payload = {
            name: document.getElementById('admin-module-name').value,
            icon: encodeIcon(document.getElementById('admin-module-icon').value),
            color: document.getElementById('admin-module-color').value
        };
        try {
            const res = await fetch(id ? `/modules/${id}` : '/modules', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if ((await res.json()).success) { moduleAdminForm.reset(); await fetchModules(); renderAdminModulesList(); }
        } catch (err) {}
    });

    window.editModuleInAdmin = (id, name, icon, color) => {
        document.getElementById('admin-module-id').value = id;
        document.getElementById('admin-module-name').value = name;
        document.getElementById('admin-module-icon').value = icon;
        document.getElementById('admin-module-color').value = color;
    };

    window.deleteModuleInAdmin = async (id) => {
        if (await showConfirm('¿Eliminar Módulo?', 'Esto podría afectar a las queries asociadas.')) {
            try {
                const res = await fetch(`/modules/${id}`, { method: 'DELETE' });
                if ((await res.json()).success) { await fetchModules(); renderAdminModulesList(); }
            } catch (err) {}
        }
    };

    window.copyToClipboard = (el) => { navigator.clipboard.writeText(el.nextElementSibling.textContent); el.textContent = '¡Copiado!'; setTimeout(() => el.textContent = 'Copiar', 2000); };
    window.deleteQuery = async (id) => { 
        if (await showConfirm('¿Eliminar Query?', 'Esta consulta se borrará permanentemente de tu repositorio.')) { 
            await fetch(`${API_URL}queries/${id}`, { method: 'DELETE' }); 
            loadQueries(); 
        } 
    };

}); // End of DOMContentLoaded

function escapeHtml(unsafe) {
    return (unsafe || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
