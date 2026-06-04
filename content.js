let inspectorActive = false; 
let isLocked = false;
let lockedMenuType = 'main'; 
let currentTarget = null; 

let tetherToElement = true; 
let positionAbove = true;   
let lastMouse = { x: 0, y: 0 }; 

let trackedCSS = []; 
let trackedTags = []; 
let enableA11y = false;
let trackedA11y = [];
let enableAuto = false;
let testFramework = 'playwright';
let testLanguage = 'js';
let xpathMode = 'relative'; 

let trackAllElements = false;
let hoverDelay = 20; 
let dynamicArrow = true;
let ignoreHoverStyles = false; 

let showHighlight = true;
let showOutline = true;
let showTooltip = true;
let showHotkeys = true; 

let lastRefreshTime = 0; 

// NEW: The Map that tracks which SVG belongs to which DOM Element
let pictureArrows = new Map();

const shield = document.createElement('div');
shield.id = 'tester-glass-shield';
shield.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:2147483645; opacity:0; cursor:crosshair;';
document.body.appendChild(shield);

function isExtensionValid() {
    try {
        return !!chrome.runtime?.id;
    } catch (e) {
        return false;
    }
}

function updateShieldState() {
    if (inspectorActive && ignoreHoverStyles && !isLocked) {
        shield.style.display = 'block';
    } else {
        shield.style.display = 'none';
    }
}

function loadConfig() {
    if (!isExtensionValid()) return;
    chrome.storage.local.get([
        'customCSS', 'trackedTags', 'masterActive', 'customSites', 'disabledDomains', 'defaultSiteMode', 'theme', 'outlineColor',
        'enableA11y', 'trackedA11y', 'enableAuto', 'framework', 'language', 'xpathMode',
        'trackAllElements', 'hoverDelay', 'dynamicArrow', 'ignoreHoverStyles',
        'showOutline', 'showTooltip', 'showHotkeys', 'showHighlight', 'highlightColor'
    ], (result) => {
        trackedCSS = result.customCSS || ['max-length', 'color', 'font-size', 'padding'];
        trackedTags = result.trackedTags || ['INPUT', 'TEXTAREA'];
        
        enableA11y = result.enableA11y || false;
        trackedA11y = result.trackedA11y || ['name', 'role', 'focusable'];
        enableAuto = result.enableAuto || false;
        testFramework = result.framework || 'playwright';
        testLanguage = result.language || 'js';
        xpathMode = result.xpathMode || 'relative'; 
        
        trackAllElements = result.trackAllElements || false;
        hoverDelay = result.hoverDelay !== undefined ? result.hoverDelay : 20; 
        dynamicArrow = result.dynamicArrow !== false;
        ignoreHoverStyles = result.ignoreHoverStyles || false; 
        showOutline = result.showOutline !== false;
        showHighlight = result.showHighlight !== false;
        showTooltip = result.showTooltip !== false;
        showHotkeys = result.showHotkeys !== false;

        tooltip.className = `theme-${result.theme || 'dark'}`; 
        
        document.documentElement.style.setProperty('--tester-user-outline', result.outlineColor || '#ff80ff');
        document.documentElement.style.setProperty('--tester-user-highlight', result.highlightColor || '#ffee0093'); 

        const isMasterOn = result.masterActive !== false;
        const defaultMode = result.defaultSiteMode || 'enabled';
        const customSites = result.customSites || result.disabledDomains || []; 
        
        let siteActive = true;
        if (defaultMode === 'enabled') {
            siteActive = !customSites.includes(window.location.hostname);
        } else {
            siteActive = customSites.includes(window.location.hostname);
        }
        
        inspectorActive = isMasterOn && siteActive;
        updateShieldState();
        
        if (inspectorActive && currentTarget && tooltip.style.display === 'block') {
            updateTooltipPosition(currentTarget);
            if (!isLocked) tooltip.innerHTML = renderHoverUI(currentTarget);
        }
        
        if (!inspectorActive) cleanUp();
    });
}

if (isExtensionValid()) {
    chrome.storage.onChanged.addListener(() => loadConfig());
}

// NEW: The engine that keeps the SVG arrows glued to their target elements
function updateAllArrows() {
    pictureArrows.forEach((arrow, el) => {
        // If the element was deleted from the page, clean up the arrow to prevent memory leaks
        if (!document.body.contains(el)) {
            arrow.remove();
            pictureArrows.delete(el);
            return;
        }

        const rect = el.getBoundingClientRect();
        let topPos = rect.top - 42;
        let leftPos = rect.left - 42;
        let scaleX = 1;
        let scaleY = 1;

        // Dynamic edge-collision detection. Flips the arrow if too close to the screen boundaries!
        if (topPos < 0) {
            topPos = rect.bottom + 2;
            scaleY = -1; 
        }
        if (leftPos < 0) {
            leftPos = rect.right + 2;
            scaleX = -1;
        }
        
        arrow.style.transform = `translate(${leftPos}px, ${topPos}px) scale(${scaleX}, ${scaleY})`;
    });
}

// Listen to scrolls dynamically across the whole page to glue the arrows down
window.addEventListener('scroll', updateAllArrows, true);
window.addEventListener('resize', updateAllArrows);

document.addEventListener('keydown', (e) => {
    if (!isExtensionValid() || !inspectorActive || !currentTarget) return;
    const key = e.key.toLowerCase();
    const isInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
    
    let target = e.target;
    let fromShield = false;

    if (e.altKey && key === 's') {
        e.preventDefault();
        ignoreHoverStyles = !ignoreHoverStyles; 
        chrome.storage.local.set({ ignoreHoverStyles: ignoreHoverStyles });
        updateShieldState();
        
        if (showTooltip && currentTarget) {
            tooltip.innerHTML = isLocked ? renderLockedMenu(true) : renderHoverUI(currentTarget);
            updateTooltipPosition(currentTarget);
        }
        return;
    }

    if (e.altKey && key === 'o') {
        e.preventDefault();
        showOutline = !showOutline;
        chrome.storage.local.set({ showOutline: showOutline });
        if (currentTarget) {
            if (showOutline) currentTarget.classList.add('tester-outline-hover');
            else currentTarget.classList.remove('tester-outline-hover');
        }
        return;
    }

    if (e.altKey && key === 'h') {
        e.preventDefault();
        showHighlight = !showHighlight;
        chrome.storage.local.set({ showHighlight: showHighlight });
        if (currentTarget) {
            if (showHighlight) currentTarget.classList.add('tester-highlight-hover');
            else currentTarget.classList.remove('tester-highlight-hover');
        }
        return;
    }

    if (e.altKey && key === 'i') {
        e.preventDefault();
        showTooltip = !showTooltip;
        chrome.storage.local.set({ showTooltip: showTooltip });
        if (showTooltip && currentTarget) {
            tooltip.innerHTML = isLocked ? renderLockedMenu(true) : renderHoverUI(currentTarget);
            tooltip.style.display = 'block';
            updateTooltipPosition(currentTarget);
        } else {
            tooltip.style.display = 'none';
        }
        return;
    }

    if (e.altKey && key === 'k') { 
        e.preventDefault();
        showHotkeys = !showHotkeys;
        chrome.storage.local.set({ showHotkeys: showHotkeys });
        if (showTooltip && currentTarget && !isLocked) {
            tooltip.innerHTML = renderHoverUI(currentTarget); 
        }
        return;
    }

    if (e.altKey && key === 'c') {
        e.preventDefault();
        document.querySelectorAll('.tester-pic-outline, .tester-pic-highlight, .tester-pic-arrow').forEach(el => {
            el.classList.remove('tester-pic-outline', 'tester-pic-highlight', 'tester-pic-arrow');
        });
        
        // Wipe all SVGs off the screen and clear the Map memory
        pictureArrows.forEach(arrow => arrow.remove());
        pictureArrows.clear();
        return;
    }

    if (e.altKey && key === 'x') { 
        e.preventDefault();
        if (currentTarget && currentTarget.parentElement && currentTarget.parentElement.tagName !== 'HTML') {
            currentTarget.classList.remove('tester-outline-hover', 'tester-highlight-hover');
            currentTarget = currentTarget.parentElement;
            if (showOutline) currentTarget.classList.add('tester-outline-hover');
            if (showHighlight) currentTarget.classList.add('tester-highlight-hover');
            
            if (showTooltip) {
                tooltip.innerHTML = isLocked ? renderLockedMenu(true) : renderHoverUI(currentTarget);
                updateTooltipPosition(currentTarget);
            }
        }
        return;
    }

    if (e.altKey && key === 'z') { 
        e.preventDefault();
        if (currentTarget && currentTarget.firstElementChild) {
            currentTarget.classList.remove('tester-outline-hover', 'tester-highlight-hover');
            currentTarget = currentTarget.firstElementChild;
            if (showOutline) currentTarget.classList.add('tester-outline-hover');
            if (showHighlight) currentTarget.classList.add('tester-highlight-hover');
            
            if (showTooltip) {
                tooltip.innerHTML = isLocked ? renderLockedMenu(true) : renderHoverUI(currentTarget);
                updateTooltipPosition(currentTarget);
            }
        }
        return;
    }

    if (e.altKey && key === ',') { 
        e.preventDefault();
        if (currentTarget && currentTarget.previousElementSibling) {
            currentTarget.classList.remove('tester-outline-hover', 'tester-highlight-hover');
            currentTarget = currentTarget.previousElementSibling;
            if (showOutline) currentTarget.classList.add('tester-outline-hover');
            if (showHighlight) currentTarget.classList.add('tester-highlight-hover');
            
            if (showTooltip) {
                tooltip.innerHTML = isLocked ? renderLockedMenu(true) : renderHoverUI(currentTarget);
                updateTooltipPosition(currentTarget);
            }
        }
        return;
    }

    if (e.altKey && key === '.') { 
        e.preventDefault();
        if (currentTarget && currentTarget.nextElementSibling) {
            currentTarget.classList.remove('tester-outline-hover', 'tester-highlight-hover');
            currentTarget = currentTarget.nextElementSibling;
            if (showOutline) currentTarget.classList.add('tester-outline-hover');
            if (showHighlight) currentTarget.classList.add('tester-highlight-hover');
            
            if (showTooltip) {
                tooltip.innerHTML = isLocked ? renderLockedMenu(true) : renderHoverUI(currentTarget);
                updateTooltipPosition(currentTarget);
            }
        }
        return;
    }

    if (isInput) return; 
    
    if (!isLocked && (e.altKey && key === 'l')) {
        e.preventDefault();
        lockedMenuType = 'main';
        lockElement(currentTarget);
        return;
    }

    if (e.altKey && key === 'm' && !e.shiftKey && isValidTarget(target)){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        lockedMenuType = 'picture'; 
        lockElement(target);
        if (fromShield && ignoreHoverStyles) shield.style.display = 'block';
        return;
    }

    if (e.altKey && key === 't') { tetherToElement = !tetherToElement; updateTooltipPosition(currentTarget); return;}
    if (e.altKey && key === 'p') { positionAbove = !positionAbove; updateTooltipPosition(currentTarget); return;}
});

const tooltip = document.createElement('div');
tooltip.id = 'tester-tooltip';
tooltip.style.display = 'none';
tooltip.addEventListener('click', (e) => e.stopPropagation());
document.body.appendChild(tooltip);

loadConfig();

function isValidTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el === shield || el.closest('#tester-tooltip')) return false;
    
    const invalidTags = ['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'NOSCRIPT'];
    if (invalidTags.includes(el.tagName)) return false;

    if (trackAllElements) return true;
    return trackedTags.includes(el.tagName);
}

function injectColorSwatches(val) {
    if (!val || typeof val !== 'string') return val;
    const colorRegex = /(#([0-9a-fA-F]{3,8})|(rgba?|hsla?)\([^)]+\))/g;
    return val.replace(colorRegex, match => `<span class="color-swatch" style="background-color: ${match};"></span>${match}`);
}

function safelyGetCSSData(el, returnAll = false) {
    const hadOutline = el.classList.contains('tester-outline-hover');
    const hadHighlight = el.classList.contains('tester-highlight-hover');
    
    if (hadOutline) el.classList.remove('tester-outline-hover');
    if (hadHighlight) el.classList.remove('tester-highlight-hover');

    const computed = window.getComputedStyle(el);
    let results = returnAll ? '' : [];
    
    if (returnAll) {
        for (let i = 0; i < computed.length; i++) {
            results += `${computed[i]}: ${computed.getPropertyValue(computed[i])};\n`;
        }
    } else {
        trackedCSS.forEach(prop => {
            let val = (prop === 'max-length' || prop === 'maxlength') ? el.getAttribute('maxlength') || 'N/A' : computed.getPropertyValue(prop) || 'N/A';
            results.push({ prop: prop, val: val });
        });
    }

    if (hadOutline && showOutline) el.classList.add('tester-outline-hover');
    if (hadHighlight && showHighlight) el.classList.add('tester-highlight-hover');
    
    return results;
}

function generateElementHeader(el) {
    const tag = el.tagName.toLowerCase();
    let classStr = el.getAttribute('class') || '';
    classStr = classStr.split(' ').filter(c => c && !c.includes('tester-')).map(c => '.' + c).join('');
    return `<span class="dev-tag">${tag}</span><span class="dev-class">${classStr}</span>`;
}

function generateCSSBlock(el) {
    const cssData = safelyGetCSSData(el, false);
    return cssData.map(item => `${item.prop}: <span class="val">${injectColorSwatches(item.val)}</span>`).join('<br>');
}

function generateRawCopyText() {
    const cssData = safelyGetCSSData(currentTarget, false);
    return cssData.map(item => `${item.prop}: ${item.val};`).join('\n');
}

function generateA11yBlock(el) {
    if (!enableA11y || trackedA11y.length === 0) return '';
    let html = `<div class="section-title">Accessibility</div>`;
    
    trackedA11y.forEach(prop => {
        if (prop === 'name') {
            const name = el.getAttribute('aria-label') || el.innerText.trim().substring(0, 25) || 'N/A';
            html += `Name: <span class="a11y-val">${name}</span><br>`;
        }
        if (prop === 'role') {
            html += `Role: <span class="a11y-val">${el.getAttribute('role') || 'generic'}</span><br>`;
        }
        if (prop === 'focusable') {
            const isFocusable = el.tabIndex >= 0 || ['a','button','input','textarea','select'].includes(el.tagName.toLowerCase());
            html += `Focusable: <span class="a11y-val">${isFocusable ? '✅' : '🚫'}</span><br>`;
        }
        if (prop === 'contrast') {
            const bg = window.getComputedStyle(el).backgroundColor;
            const fg = window.getComputedStyle(el).color;
            html += `Contrast: <span class="a11y-val" title="FG: ${fg} | BG: ${bg}">(${injectColorSwatches(fg)} on ${injectColorSwatches(bg)})</span><br>`;
        }
    });
    return html;
}

function renderHoverUI(target) {
    let shieldText = ignoreHoverStyles ? `<span style="color:var(--tester-danger);">[S]hield OFF</span>` : `[S]hield ON`;
    
    let hotkeysHTML = showHotkeys ? `
        <hr>
        <div style="font-size: 10px; opacity: 0.8; text-align: center; margin-top: 4px;">
            All hotkeys are Alt/Option+[ ] 
        </div>
        <hr>
        <div style="font-size: 10px; opacity: 0.8; text-align: center; margin-top: 4px;">
            [O]utlines | [I]nfo | ${shieldText} | [H]ighlight | [K]ey Tips
        </div>
        <div style="font-size: 10px; opacity: 0.8; text-align: center; color: var(--tester-tag); font-weight: bold; margin-top: 4px;">
            Shift+Click to [L]ock | Alt+Click to [M]ark
        </div>
        <div style="font-size: 10px; opacity: 0.8; text-align: center; margin-top: 4px;">
            [X/Z/,/.] Up/Down/Left/Right | [T]ether | [P]osition | [C]lear
        </div>
    ` : ``;

    return `
        <div style="font-family: monospace; font-size: 13px; margin-bottom: 4px; word-break: break-all; white-space: normal;">
            ${generateElementHeader(target)}
        </div>
        <hr>
        <div style="text-align:left; font-size:11px; line-height:1.5;">
            ${generateCSSBlock(target)}
            ${generateA11yBlock(target)}
        </div>
        ${hotkeysHTML}
    `;
}

let hoverTimer;

document.addEventListener('mousemove', (e) => {
    if (!isExtensionValid() || !inspectorActive || isLocked) return; 

    if (Math.abs(e.clientX - lastMouse.x) < 3 && Math.abs(e.clientY - lastMouse.y) < 3) {
        return; 
    }

    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
    let target = e.target;
    
    if (target === shield) {
        shield.style.display = 'none';
        target = document.elementFromPoint(e.clientX, e.clientY);
        shield.style.display = 'block'; 
    }
    
    if (!isValidTarget(target)) {
        cleanUp();
        return;
    }

    if (currentTarget === target) {
        if (showTooltip) {
            updateTooltipPosition(currentTarget);
            
            const now = Date.now();
            if (now - lastRefreshTime > 1000) {
                lastRefreshTime = now;
                tooltip.innerHTML = renderHoverUI(currentTarget);
            }
        }
        return;
    }

    const executeHover = () => {
        if (currentTarget && currentTarget !== target) {
            currentTarget.classList.remove('tester-outline-hover', 'tester-highlight-hover');
        }
        currentTarget = target;
        lastRefreshTime = Date.now();
        
        if (showOutline) target.classList.add('tester-outline-hover');
        if (showHighlight) target.classList.add('tester-highlight-hover');
        
        if (showTooltip) {
            tooltip.innerHTML = renderHoverUI(target);
            tooltip.style.display = 'block'; 
            updateTooltipPosition(currentTarget);
        } else {
            tooltip.style.display = 'none';
        }
    };

    clearTimeout(hoverTimer);
    
    if (hoverDelay === 0) {
        executeHover();
    } else {
        hoverTimer = setTimeout(executeHover, hoverDelay);
    }
});

function updateTooltipPosition(element) {
    if (!element || (!showTooltip && lockedMenuType !== 'picture')) return;
    const rect = element.getBoundingClientRect();
    const tHeight = tooltip.offsetHeight;
    const tWidth = tooltip.offsetWidth;
    let targetX, targetY;
    let effAbove = positionAbove; 

    if (tetherToElement) {
        if (effAbove && (rect.top - tHeight - 15 < 0)) effAbove = false;
        else if (!effAbove && (rect.bottom + tHeight + 15 > window.innerHeight)) effAbove = true;
    } else {
        if (effAbove && (lastMouse.y - tHeight - 15 < 0)) effAbove = false;
        else if (!effAbove && (lastMouse.y + tHeight + 15 > window.innerHeight)) effAbove = true;
    }

    if (tetherToElement) {
        targetX = rect.left + (rect.width / 2); 
        targetY = effAbove ? rect.top - tHeight - 10 : rect.bottom + 10;
    } else {
        targetX = lastMouse.x;
        targetY = effAbove ? lastMouse.y - tHeight - 15 : lastMouse.y + 15;
    }

    let maxLeft = window.innerWidth - tWidth - 15;
    let finalX = Math.min(Math.max(15, targetX), maxLeft);
    let maxTop = window.innerHeight - tHeight - 15;
    let finalY = Math.min(Math.max(15, targetY), maxTop);

    tooltip.style.left = finalX + 'px';
    tooltip.style.top = finalY + 'px';

    tooltip.classList.remove('arrow-up', 'arrow-down');
    tooltip.classList.add(effAbove ? 'arrow-down' : 'arrow-up');

    if (dynamicArrow) {
        let relativeArrowX = lastMouse.x - finalX;
        relativeArrowX = Math.max(15, Math.min(relativeArrowX, tWidth - 15));
        tooltip.style.setProperty('--arrow-x', relativeArrowX + 'px');
    } else {
        tooltip.style.removeProperty('--arrow-x'); 
    }
}

document.addEventListener('click', (e) => {
    if (!isExtensionValid() || !inspectorActive) return;

    let target = e.target;
    let fromShield = false;

    if (target === shield) {
        shield.style.display = 'none';
        target = document.elementFromPoint(e.clientX, e.clientY);
        fromShield = true;
    }

    if (e.altKey && !e.shiftKey && isValidTarget(target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        lockedMenuType = 'picture'; 
        lockElement(target);
        if (fromShield && ignoreHoverStyles) shield.style.display = 'block';
        return;
    }

    if (isLocked) {
        if (tooltip.contains(target)) return;
        cleanUp();
        return; 
    }

    if (e.shiftKey && !e.altKey && isValidTarget(target)) {
        e.preventDefault(); 
        e.stopPropagation();
        e.stopImmediatePropagation();
        lockedMenuType = 'main'; 
        lockElement(target);
    }
}, true); 

function lockElement(targetElement) {
    isLocked = true;
    currentTarget = targetElement;
    tooltip.classList.add('locked-mode'); 
    shield.style.display = 'none'; 
    
    if (showTooltip || lockedMenuType === 'picture') {
        if (lockedMenuType === 'picture') {
            renderPictureMenu();
        } else {
            renderLockedMenu();
        }
        tooltip.style.display = 'block';
    } else {
        tooltip.style.display = 'none'; 
    }
}

function renderPictureMenu() {
    const hasOutline = currentTarget.classList.contains('tester-pic-outline');
    const hasHighlight = currentTarget.classList.contains('tester-pic-highlight');
    const hasArrow = currentTarget.classList.contains('tester-pic-arrow');

    let html = `
        <button id="closeMenuBtn" class="close-icon-btn">X</button>
        <div style="font-family: monospace; font-size: 13px; margin-bottom: 8px; padding-right: 15px; word-break: break-all;">
            ${generateElementHeader(currentTarget)}
        </div>
        <div style="font-size: 11px; text-align: center; margin-bottom: 6px; font-weight: bold; color: var(--tester-val);">Picture Mode</div>
        <div class="action-grid">
            <button id="picOutlineBtn" style="background: var(--tester-success); outline: ${hasOutline ? '2px solid white' : 'none'}; outline-offset: -2px;">Outline</button>
            <button id="picHighlightBtn" style="background: var(--tester-success); outline: ${hasHighlight ? '2px solid white' : 'none'}; outline-offset: -2px;">Highlight</button>
            <button id="picArrowBtn" style="background: var(--tester-success); outline: ${hasArrow ? '2px solid white' : 'none'}; outline-offset: -2px;">Arrow</button>
            <button id="picClearBtn" style="background: var(--tester-danger)">Clear</button>
        </div>
    `;

    tooltip.innerHTML = html;
    updateTooltipPosition(currentTarget);
    
    document.getElementById('closeMenuBtn').onclick = () => cleanUp();
    
    document.getElementById('picOutlineBtn').onclick = (e) => {
        currentTarget.classList.toggle('tester-pic-outline');
        e.currentTarget.style.outline = currentTarget.classList.contains('tester-pic-outline') ? '2px solid white' : 'none';
    };
    
    document.getElementById('picHighlightBtn').onclick = (e) => {
        currentTarget.classList.toggle('tester-pic-highlight');
        e.currentTarget.style.outline = currentTarget.classList.contains('tester-pic-highlight') ? '2px solid white' : 'none';
    };
    
    // NEW: Arrow Injection Logic
    document.getElementById('picArrowBtn').onclick = (e) => {
        const arrowActive = currentTarget.classList.toggle('tester-pic-arrow');
        e.currentTarget.style.outline = arrowActive ? '2px solid white' : 'none';
        
        if (arrowActive) {
            let arrow = document.createElement('div');
            arrow.className = 'tester-drawn-arrow';
            // Injecting a crisp, professional SVG
            arrow.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--tester-user-outline, #ff80ff)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.4));">
                                   <line x1="4" y1="4" x2="20" y2="20"></line>
                                   <polyline points="14 20 20 20 20 14"></polyline>
                               </svg>`;
            document.body.appendChild(arrow);
            pictureArrows.set(currentTarget, arrow);
            updateAllArrows();
        } else {
            let arrow = pictureArrows.get(currentTarget);
            if (arrow) { 
                arrow.remove(); 
                pictureArrows.delete(currentTarget); 
            }
        }
    };
    
    document.getElementById('picClearBtn').onclick = () => {
        currentTarget.classList.remove('tester-pic-outline', 'tester-pic-highlight', 'tester-pic-arrow');
        let arrow = pictureArrows.get(currentTarget);
        if (arrow) { 
            arrow.remove(); 
            pictureArrows.delete(currentTarget); 
        }
        cleanUp();
    };
}

function renderLockedMenu(returnHtmlString = false) {
    const isInput = currentTarget.tagName === 'INPUT' || currentTarget.tagName === 'TEXTAREA';
    let autoHTML = enableAuto ? `
    <div class="action-grid">
        <button id="copyElPropsBtn" class="btn-success" style="background: var(--tester-success)">HTML+CSS</button>
        <button id="showLocatorsBtn" class="btn-success" style="background: var(--tester-locator)">Locators</button>
    </div>`:
    `<button id="copyElPropsBtn" class="action-row" style="background: var(--tester-success)">HTML+CSS</button>`;
    let fillBtnHTML = isInput ? `<button id="fillMax" class="action-row" style="background: var(--tester-success)">Fill Max + Overflow</button>` : '';

    let html = `
        <button id="closeMenuBtn" class="close-icon-btn">X</button>
        <div style="font-family: monospace; font-size: 13px; margin-bottom: 8px; padding-right: 15px; word-break: break-all;">
            ${generateElementHeader(currentTarget)}
        </div>
        
        <div style="text-align:left; font-size:11px; line-height:1.5; margin-bottom: 8px;">
            ${generateCSSBlock(currentTarget)}
            ${generateA11yBlock(currentTarget)}
        </div>
        <hr>
        
        <div class="action-grid">
            <button id="copyCssBtn" class="btn-success" style="background: var(--tester-success)">Copy CSS</button>
            <button id="copyAllCssBtn" class="btn-success" style="background: var(--tester-success)">All CSS</button>
        </div>
        ${autoHTML}
        ${fillBtnHTML}
    `;

    if (returnHtmlString) return html;
    
    tooltip.innerHTML = html;
    updateTooltipPosition(currentTarget);
    
    document.getElementById('closeMenuBtn').onclick = () => cleanUp();
    
    document.getElementById('copyCssBtn').onclick = (e) => copyToClipboard(generateRawCopyText(), e.currentTarget);
    document.getElementById('copyAllCssBtn').onclick = (e) => copyToClipboard(safelyGetCSSData(currentTarget, true), e.currentTarget);

    document.getElementById('copyElPropsBtn').onclick = (e) => {
        currentTarget.classList.remove('tester-outline-hover', 'tester-highlight-hover');
        const cloneHTML = currentTarget.outerHTML;
        if (showOutline) currentTarget.classList.add('tester-outline-hover');
        if (showHighlight) currentTarget.classList.add('tester-highlight-hover');
        copyToClipboard(`--- HTML ---\n${cloneHTML}\n\n--- Properties ---\n${generateRawCopyText()}`, e.currentTarget);
    };

    if (enableAuto) document.getElementById('showLocatorsBtn').onclick = () => renderLocatorMenu();
    if (isInput) document.getElementById('fillMax').onclick = () => { fillAndOverride(currentTarget, currentTarget.getAttribute('maxlength')); cleanUp(); };
}

function renderLocatorMenu() {
    const locators = getSmartLocators(currentTarget);
    let listHTML = locators.map(loc => {
        let safeLoc = loc.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<button class="loc-btn" data-clipboard-text="${safeLoc}">${loc.replace(/</g, '&lt;')}</button>`;
    }).join('');
    
    tooltip.innerHTML = `
        <button id="closeMenuBtn" class="close-icon-btn">X</button>
        <div style="font-family: monospace; font-size: 13px; margin-bottom: 8px; padding-right: 15px;">${generateElementHeader(currentTarget)}</div>
        <div style="font-size: 11px; margin-bottom: 4px; color: var(--tester-locator)">${testFramework.toUpperCase()} Locators:</div>
        <div class="locator-list">
            ${listHTML}
            <button id="backToActionsBtn" style="background: var(--tester-list-bg); text-align: center;">← Back</button>
        </div>
    `;

    updateTooltipPosition(currentTarget);
    document.getElementById('closeMenuBtn').onclick = () => cleanUp();
    document.getElementById('backToActionsBtn').onclick = () => renderLockedMenu();
    document.querySelectorAll('.loc-btn').forEach(btn => btn.onclick = (e) => copyToClipboard(e.currentTarget.getAttribute('data-clipboard-text'), e.currentTarget));
}

function getAbsoluteXPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.tagName.toLowerCase() === 'html') return '/html';
    if (el.tagName.toLowerCase() === 'body') return '/html/body';
    
    let ix = 0;
    let siblings = el.parentNode.childNodes;
    for (let i = 0; i < siblings.length; i++) {
        let sibling = siblings[i];
        if (sibling === el) return getAbsoluteXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + (ix + 1) + ']';
        if (sibling.nodeType === 1 && sibling.tagName === el.tagName) ix++;
    }
    return '';
}

function getSmartLocators(el) {
    let locators = [];
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : null;
    let testId = null;
    ['data-testid', 'data-cy', 'data-qa', 'data-test'].forEach(attr => { if (el.hasAttribute(attr)) testId = `[${attr}="${el.getAttribute(attr)}"]`; });
    const text = el.innerText ? el.innerText.trim().substring(0, 30) : null;

    let relXpath = text ? `//${tag}[contains(text(), '${text}')]` : `//${tag}`;
    let finalXpath = xpathMode === 'absolute' ? getAbsoluteXPath(el) : relXpath;

    if (testFramework === 'playwright') {
        if (testId) locators.push(`page.locator('${testId}')`);
        if (text && tag === 'button') locators.push(`page.getByRole('button', { name: '${text}' })`);
        if (text) locators.push(`page.getByText('${text}')`);
        if (id) locators.push(`page.locator('${id}')`);
        locators.push(`page.locator('${finalXpath}')`); 
    } else if (testFramework === 'cypress') {
        if (testId) locators.push(`cy.get('${testId}')`);
        if (text) locators.push(`cy.contains('${text}')`);
        if (id) locators.push(`cy.get('${id}')`);
        locators.push(`cy.xpath('${finalXpath}')`);
    } else if (testFramework === 'selenium') {
        if (testLanguage === 'python') {
            if (id) locators.push(`driver.find_element(By.ID, "${el.id}")`);
            if (testId) locators.push(`driver.find_element(By.CSS_SELECTOR, '${testId}')`);
            locators.push(`driver.find_element(By.XPATH, "${finalXpath}")`);
        } else {
            if (id) locators.push(`By.id("${el.id}")`);
            if (testId) locators.push(`By.cssSelector("${testId}")`);
            locators.push(`By.xpath("${finalXpath}")`);
        }
    } else if (testFramework === 'robot') {
        if (id) locators.push(`id:${el.id}`);
        if (testId) locators.push(`css:${testId}`);
        locators.push(`xpath:${finalXpath}`);
    } else if (testFramework === 'wdio') {
        if (id) locators.push(`$('${id}')`);
        if (testId) locators.push(`$('${testId}')`);
        if (text) locators.push(`$('=${text}')`);
        locators.push(`$('${finalXpath}')`);
    }
    
    if (locators.length === 0) locators.push(`'${tag}${el.className ? '.' + el.className.split(' ')[0] : ''}'`);
    return locators;
}

function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const og = btn.innerText;
        btn.innerText = "Copied!";
        setTimeout(() => btn.innerText = og, 1000);
    });
}

function fillAndOverride(element, length) {
    element.removeAttribute('maxlength');
    element.value = "X".repeat((isNaN(length) ? 500 : parseInt(length)) + 10); 
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

function cleanUp() {
    isLocked = false;
    lockedMenuType = 'main'; 
    tooltip.style.display = 'none';
    tooltip.classList.remove('locked-mode'); 
    updateShieldState(); 
    if (currentTarget) { 
        currentTarget.classList.remove('tester-outline-hover', 'tester-highlight-hover'); 
        currentTarget = null; 
    }
}