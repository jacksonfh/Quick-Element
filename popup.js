document.addEventListener('DOMContentLoaded', () => {
    const cssList = document.getElementById('cssList');
    const tagList = document.getElementById('tagList');
    
    const masterToggle = document.getElementById('masterToggle');
    const siteToggle = document.getElementById('siteToggle');
    const siteToggleRow = document.getElementById('siteToggleRow');
    const defaultSiteMode = document.getElementById('defaultSiteMode');
    const currentDomainEl = document.getElementById('currentDomain');

    const trackAllToggle = document.getElementById('trackAllToggle');
    const hoverDelayInput = document.getElementById('hoverDelayInput');
    const dynamicArrowToggle = document.getElementById('dynamicArrowToggle');
    const ignoreHoverToggle = document.getElementById('ignoreHoverToggle'); 

    const a11yToggle = document.getElementById('a11yToggle');
    const a11yPanel = document.getElementById('a11yPanel');
    const autoToggle = document.getElementById('autoToggle');
    const autoPanel = document.getElementById('autoPanel');
    const frameworkSelect = document.getElementById('frameworkSelect');
    const languageSelect = document.getElementById('languageSelect');
    const xpathSelect = document.getElementById('xpathSelect');

    let currentHost = '';
    let currentMode = 'enabled';
    let customSitesList = [];

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if(tabs[0] && tabs[0].url) {
            const url = new URL(tabs[0].url);
            currentHost = url.hostname;
            currentDomainEl.innerText = currentHost;
        }
    });

    chrome.storage.local.get([
        'customCSS', 'trackedTags', 'masterActive', 'customSites', 'disabledDomains', 'defaultSiteMode', 'theme', 'outlineColor', 
        'enableA11y', 'trackedA11y', 'enableAuto', 'framework', 'language', 'xpathMode',
        'trackAllElements', 'hoverDelay', 'dynamicArrow', 'ignoreHoverStyles'
    ], (result) => {
        renderList(result.customCSS || ['max-length', 'color', 'font-size', 'padding'], cssList, 'customCSS');
        renderList(result.trackedTags || ['INPUT', 'TEXTAREA'], tagList, 'trackedTags');
        
        document.body.className = `tester-popup theme-${result.theme || 'dark'}`; 
        document.getElementById('themeSelect').value = result.theme || 'dark';
        document.getElementById('outlineColor').value = result.outlineColor || '#ff80ff';
        
        masterToggle.checked = result.masterActive !== false; 
        if (!masterToggle.checked) siteToggleRow.classList.add('dimmed');

        currentMode = result.defaultSiteMode || 'enabled';
        defaultSiteMode.value = currentMode;
        
        customSitesList = result.customSites || result.disabledDomains || [];

        if (currentHost) {
            if (currentMode === 'enabled') {
                siteToggle.checked = !customSitesList.includes(currentHost);
            } else {
                siteToggle.checked = customSitesList.includes(currentHost);
            }
        }

        trackAllToggle.checked = result.trackAllElements || false;
        // Default updated to 20ms
        hoverDelayInput.value = result.hoverDelay !== undefined ? result.hoverDelay : 20;
        dynamicArrowToggle.checked = result.dynamicArrow !== false;
        ignoreHoverToggle.checked = result.ignoreHoverStyles || false; 

        autoToggle.checked = result.enableAuto || false;
        autoPanel.style.display = result.enableAuto ? 'block' : 'none';
        frameworkSelect.value = result.framework || 'playwright';
        languageSelect.value = result.language || 'js';
        xpathSelect.value = result.xpathMode || 'relative';

        a11yToggle.checked = result.enableA11y || false;
        a11yPanel.style.display = result.enableA11y ? 'block' : 'none';
        
        const savedA11y = result.trackedA11y || ['name', 'role', 'focusable'];
        document.querySelectorAll('.a11y-check').forEach(cb => {
            cb.checked = savedA11y.includes(cb.value);
            cb.addEventListener('change', saveA11yConfig);
        });
    });

    masterToggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ masterActive: e.target.checked });
        if (e.target.checked) siteToggleRow.classList.remove('dimmed');
        else siteToggleRow.classList.add('dimmed');
    });

    defaultSiteMode.addEventListener('change', (e) => {
        currentMode = e.target.value;
        customSitesList = [];
        chrome.storage.local.set({ defaultSiteMode: currentMode, customSites: customSitesList });
        if (currentMode === 'enabled') siteToggle.checked = true;
    });

    siteToggle.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        if (currentMode === 'enabled') {
            if (isChecked) customSitesList = customSitesList.filter(d => d !== currentHost);
            else if (!customSitesList.includes(currentHost)) customSitesList.push(currentHost);
        } else {
            if (isChecked) {
                if (!customSitesList.includes(currentHost)) customSitesList.push(currentHost);
            } else {
                customSitesList = customSitesList.filter(d => d !== currentHost);
            }
        }
        chrome.storage.local.set({ customSites: customSitesList });
    });

    trackAllToggle.addEventListener('change', (e) => chrome.storage.local.set({ trackAllElements: e.target.checked }));
    hoverDelayInput.addEventListener('change', (e) => chrome.storage.local.set({ hoverDelay: parseInt(e.target.value) || 0 }));
    dynamicArrowToggle.addEventListener('change', (e) => chrome.storage.local.set({ dynamicArrow: e.target.checked }));
    ignoreHoverToggle.addEventListener('change', (e) => chrome.storage.local.set({ ignoreHoverStyles: e.target.checked }));

    document.getElementById('tagInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('addTagBtn').click();
    });
    document.getElementById('cssInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('addCssBtn').click();
    });

    a11yToggle.addEventListener('change', (e) => {
        a11yPanel.style.display = e.target.checked ? 'block' : 'none';
        chrome.storage.local.set({ enableA11y: e.target.checked });
    });

    autoToggle.addEventListener('change', (e) => {
        autoPanel.style.display = e.target.checked ? 'block' : 'none';
        chrome.storage.local.set({ enableAuto: e.target.checked });
    });

    frameworkSelect.addEventListener('change', (e) => chrome.storage.local.set({ framework: e.target.value }));
    languageSelect.addEventListener('change', (e) => chrome.storage.local.set({ language: e.target.value }));
    xpathSelect.addEventListener('change', (e) => chrome.storage.local.set({ xpathMode: e.target.value }));

    function saveA11yConfig() {
        const selected = Array.from(document.querySelectorAll('.a11y-check:checked')).map(cb => cb.value);
        chrome.storage.local.set({ trackedA11y: selected });
    }

    document.getElementById('themeSelect').addEventListener('change', (e) => {
        chrome.storage.local.set({ theme: e.target.value });
        document.body.className = `tester-popup theme-${e.target.value}`;
    });
    
    document.getElementById('outlineColor').addEventListener('input', (e) => chrome.storage.local.set({ outlineColor: e.target.value }));

    document.getElementById('addTagBtn').addEventListener('click', () => {
        const newTag = document.getElementById('tagInput').value.trim().toUpperCase();
        if (!newTag) return;
        chrome.storage.local.get(['trackedTags'], (result) => {
            const tags = result.trackedTags || ['INPUT', 'TEXTAREA'];
            if (!tags.includes(newTag)) {
                tags.push(newTag);
                chrome.storage.local.set({ trackedTags: tags });
                renderList(tags, tagList, 'trackedTags');
                document.getElementById('tagInput').value = '';
            }
        });
    });

    document.getElementById('addCssBtn').addEventListener('click', () => {
        const newCss = document.getElementById('cssInput').value.trim().toLowerCase();
        if (!newCss) return;
        chrome.storage.local.get(['customCSS'], (result) => {
            const props = result.customCSS || ['max-length', 'color', 'font-size'];
            if (!props.includes(newCss)) {
                props.push(newCss);
                chrome.storage.local.set({ customCSS: props });
                renderList(props, cssList, 'customCSS');
                document.getElementById('cssInput').value = '';
            }
        });
    });

    setupDropZone(cssList, 'customCSS');
    setupDropZone(tagList, 'trackedTags');

    function renderList(items, container, storageKey) {
        container.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.draggable = true; 
            li.dataset.item = item;
            
            li.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <span class="drag-handle" style="display:flex; align-items:center; margin-right: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                        </svg>
                    </span> 
                    <span>${item}</span>
                </div>
                <button class="remove-btn" data-item="${item}">X</button>
            `;

            li.addEventListener('dragstart', () => setTimeout(() => li.classList.add('dragging'), 0));
            li.addEventListener('dragend', () => li.classList.remove('dragging'));

            li.querySelector('.remove-btn').addEventListener('click', (e) => {
                const itemToRemove = e.currentTarget.getAttribute('data-item');
                const newItems = items.filter(i => i !== itemToRemove);
                chrome.storage.local.set({ [storageKey]: newItems });
                renderList(newItems, container, storageKey);
            });
            container.appendChild(li);
        });
    }

    function setupDropZone(container, storageKey) {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingLi = container.querySelector('.dragging');
            if (!draggingLi) return;
            
            const siblings = [...container.querySelectorAll('li:not(.dragging)')];
            let nextSibling = siblings.find(sibling => {
                const box = sibling.getBoundingClientRect();
                return e.clientY <= box.top + box.height / 2;
            });
            container.insertBefore(draggingLi, nextSibling);
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const newItems = [...container.querySelectorAll('li')].map(li => li.dataset.item);
            chrome.storage.local.set({ [storageKey]: newItems });
        });
    }
});
