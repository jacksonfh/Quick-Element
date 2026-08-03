document.addEventListener("DOMContentLoaded", () => {
  const cssList = document.getElementById("cssList");
  const tagList = document.getElementById("tagList");

  const masterToggle = document.getElementById("masterToggle");
  const siteToggle = document.getElementById("siteToggle");
  const siteToggleRow = document.getElementById("siteToggleRow");
  const defaultSiteMode = document.getElementById("defaultSiteMode");
  const currentDomainEl = document.getElementById("currentDomain");

  const showOutlineToggle = document.getElementById("showOutlineToggle");
  const showHighlightToggle = document.getElementById("showHighlightToggle");
  const showTooltipToggle = document.getElementById("showTooltipToggle");
  const showHotkeyToggle = document.getElementById("showHotkeyToggle");
  const trackAllToggle = document.getElementById("trackAllToggle");
  const hoverDelayInput = document.getElementById("hoverDelayInput");
  const dynamicArrowToggle = document.getElementById("dynamicArrowToggle");
  const ignoreHoverToggle = document.getElementById("ignoreHoverToggle");

  const a11yToggle = document.getElementById("a11yToggle");
  const a11yPanel = document.getElementById("a11yPanel");
  const autoToggle = document.getElementById("autoToggle");
  const autoPanel = document.getElementById("autoPanel");
  const frameworkSelect = document.getElementById("frameworkSelect");
  const languageSelect = document.getElementById("languageSelect");
  const xpathSelect = document.getElementById("xpathSelect");

  const profileSelect = document.getElementById("profileSelect");
  const createNewProfileBtn = document.getElementById("createNewProfileBtn");
  const newProfileContainer = document.getElementById("newProfileContainer");
  const newProfileName = document.getElementById("newProfileName");
  const confirmNewProfileBtn = document.getElementById("confirmNewProfileBtn");
  const deleteProfileBtn = document.getElementById("deleteProfileBtn");
  const showAttributesToggle = document.getElementById("showAttributesToggle");

  let currentHost = "";
  let currentMode = "enabled";
  let customSitesList = [];
  let profiles = {};
  let activeProfile = "Track Everything";

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0] && tabs[0].url) {
      const url = new URL(tabs[0].url);
      currentHost = url.hostname;
      currentDomainEl.innerText = currentHost;
    }
  });

  chrome.storage.local.get(
    [
      "customCSS",
      "trackedTags",
      "masterActive",
      "customSites",
      "disabledDomains",
      "defaultSiteMode",
      "theme",
      "outlineColor",
      "enableA11y",
      "trackedA11y",
      "enableAuto",
      "framework",
      "language",
      "xpathMode",
      "trackAllElements",
      "hoverDelay",
      "dynamicArrow",
      "ignoreHoverStyles",
      "showOutline",
      "showTooltip",
      "showHotkeys",
      "showHighlight",
      "highlightColor",
      "highlightOpacity",
      "censorMode",
      "profiles",
      "activeProfile",
    ],
    (result) => {
      const defaultProfiles = {
        "QA Tester": {
          css: [
            "max-length",
            "color",
            "font-size",
            "padding",
            "z-index",
            "visibility",
            "cursor",
          ],
          tags: ["INPUT", "TEXTAREA", "BUTTON", "A", "SELECT"],
          trackAllElements: false,
        },
        "Frontend Dev": {
          css: [
            "display",
            "position",
            "width",
            "height",
            "margin",
            "padding",
            "color",
            "background-color",
          ],
          tags: ["DIV", "SPAN", "P", "A", "IMG", "HEADER", "FOOTER", "BUTTON"],
          trackAllElements: false,
        },
        Presenter: {
          css: ["background-color", "border-radius", "box-shadow", "filter"],
          tags: ["DIV", "IMG", "P", "SPAN"],
          trackAllElements: false,
        },
        "Track Everything": {
          css: ["width", "height", "margin", "padding"],
          tags: [],
          trackAllElements: true,
        },
      };

      profiles = result.profiles || {};
      activeProfile = result.activeProfile;

      // Migrate / Fallback
      if (!profiles["Track Everything"])
        profiles = { ...defaultProfiles, ...profiles };
      if (!activeProfile || activeProfile === "Default")
        activeProfile = "Track Everything";

      chrome.storage.local.set({
        profiles: profiles,
        activeProfile: activeProfile,
      });

      updateProfileDropdown();

      let activeCSS = result.customCSS || profiles[activeProfile].css;
      let activeTags = result.trackedTags || profiles[activeProfile].tags;

      renderList(activeCSS, cssList, "customCSS");
      renderList(activeTags, tagList, "trackedTags");
      trackAllToggle.checked =
        result.trackAllElements !== undefined
          ? result.trackAllElements
          : profiles[activeProfile].trackAllElements;

      document.body.className = `tester-popup theme-${result.theme || "dark"}`;
      document.getElementById("themeSelect").value = result.theme || "dark";
      document.getElementById("outlineColor").value =
        result.outlineColor || "#ff80ff";
      document.getElementById("HighlightColor").value =
        result.highlightColor || "#ffee00";
      document.getElementById("HighlightOpacity").value =
        result.highlightOpacity !== undefined ? result.highlightOpacity : 0.5;
      document.getElementById("censorModeSelect").value =
        result.censorMode || "blur";

      masterToggle.checked = result.masterActive !== false;
      if (!masterToggle.checked) siteToggleRow.classList.add("dimmed");

      currentMode = result.defaultSiteMode || "enabled";
      defaultSiteMode.value = currentMode;

      customSitesList = result.customSites || result.disabledDomains || [];

      if (currentHost) {
        if (currentMode === "enabled") {
          siteToggle.checked = !customSitesList.includes(currentHost);
        } else {
          siteToggle.checked = customSitesList.includes(currentHost);
        }
      }

      showOutlineToggle.checked = result.showOutline !== false;
      showHighlightToggle.checked = result.showHighlight !== false;
      showTooltipToggle.checked = result.showTooltip !== false;
      showHotkeyToggle.checked = result.showHotkeys !== false;
      hoverDelayInput.value =
        result.hoverDelay !== undefined ? result.hoverDelay : 5;
      dynamicArrowToggle.checked = result.dynamicArrow !== false;
      ignoreHoverToggle.checked = result.ignoreHoverStyles || false;

      autoToggle.checked = result.enableAuto || false;
      autoPanel.style.display = result.enableAuto ? "block" : "none";
      frameworkSelect.value = result.framework || "playwright";
      languageSelect.value = result.language || "js";
      xpathSelect.value = result.xpathMode || "relative";

      a11yToggle.checked = result.enableA11y || false;
      a11yPanel.style.display = result.enableA11y ? "block" : "none";

      const savedA11y = result.trackedA11y || ["name", "role", "focusable"];
      document.querySelectorAll(".a11y-check").forEach((cb) => {
        cb.checked = savedA11y.includes(cb.value);
        cb.addEventListener("change", saveA11yConfig);
      });
    },
  );

  // --- PROFILE LOGIC ---
  function updateProfileDropdown() {
    profileSelect.innerHTML = "";
    Object.keys(profiles).forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.innerText = name;
      if (name === activeProfile) opt.selected = true;
      profileSelect.appendChild(opt);
    });
  }

  profileSelect.addEventListener("change", (e) => {
    activeProfile = e.target.value;
    const p = profiles[activeProfile];
    chrome.storage.local.set({
      activeProfile: activeProfile,
      customCSS: p.css,
      trackedTags: p.tags,
      trackAllElements: p.trackAllElements || false,
    });
    renderList(p.css, cssList, "customCSS");
    renderList(p.tags, tagList, "trackedTags");
    trackAllToggle.checked = p.trackAllElements || false;
  });

  createNewProfileBtn.addEventListener("click", () => {
    newProfileContainer.style.display =
      newProfileContainer.style.display === "none" ? "flex" : "none";
    if (newProfileContainer.style.display === "flex") {
      newProfileName.focus();
    }
  });

  confirmNewProfileBtn.addEventListener("click", () => {
    const name = newProfileName.value.trim();
    if (!name) return;

    chrome.storage.local.get(
      ["customCSS", "trackedTags", "trackAllElements"],
      (res) => {
        profiles[name] = {
          css: res.customCSS || [],
          tags: res.trackedTags || [],
          trackAllElements: res.trackAllElements || false,
        };
        activeProfile = name;
        chrome.storage.local.set({
          profiles: profiles,
          activeProfile: activeProfile,
        });
        updateProfileDropdown();
        newProfileName.value = "";
        newProfileContainer.style.display = "none";
        showAttributesToggle.checked = result.showAttributes !== false;
      },
    );
  });

  deleteProfileBtn.addEventListener("click", () => {
    if (Object.keys(profiles).length <= 1) return;
    delete profiles[activeProfile];
    activeProfile = Object.keys(profiles)[0];
    const p = profiles[activeProfile];
    chrome.storage.local.set({
      profiles: profiles,
      activeProfile: activeProfile,
      customCSS: p.css,
      trackedTags: p.tags,
      trackAllElements: p.trackAllElements || false,
    });
    updateProfileDropdown();
    renderList(p.css, cssList, "customCSS");
    renderList(p.tags, tagList, "trackedTags");
    trackAllToggle.checked = p.trackAllElements || true;
  });

  // NEW: Flash visual indicator
  let saveIndicatorTimer;
  function flashSaveIndicator() {
    const indicator = document.getElementById("profileSaveIndicator");
    indicator.style.opacity = "1";
    clearTimeout(saveIndicatorTimer);
    saveIndicatorTimer = setTimeout(() => {
      indicator.style.opacity = "0";
    }, 1200);
  }

  // RESTORED: Auto-saving into the actual profile
  function saveProfileData(storageKey, newItems, inputIdToFlash = null) {
    if (storageKey === "customCSS") profiles[activeProfile].css = newItems;
    if (storageKey === "trackedTags") profiles[activeProfile].tags = newItems;
    if (storageKey === "trackAllElements")
      profiles[activeProfile].trackAllElements = newItems;
    chrome.storage.local.set({ [storageKey]: newItems, profiles: profiles });

    flashSaveIndicator(); // Still flash the top header for general profile changes

    // Flash the specific input box if provided
    if (inputIdToFlash) {
      const inputEl = document.getElementById(inputIdToFlash);
      if (inputEl) {
        const ogTransition = inputEl.style.transition;
        inputEl.style.transition = "background-color 0.2s";
        inputEl.style.backgroundColor = "var(--tester-success)";
        setTimeout(() => {
          inputEl.style.backgroundColor = "";
          setTimeout(() => (inputEl.style.transition = ogTransition), 200);
        }, 300);
      }
    }
  }

  // --- GENERAL EVENT LISTENERS ---
  masterToggle.addEventListener("change", (e) => {
    chrome.storage.local.set({ masterActive: e.target.checked });
    if (e.target.checked) siteToggleRow.classList.remove("dimmed");
    else siteToggleRow.classList.add("dimmed");
  });

  defaultSiteMode.addEventListener("change", (e) => {
    currentMode = e.target.value;
    customSitesList = [];
    chrome.storage.local.set({
      defaultSiteMode: currentMode,
      customSites: customSitesList,
    });
    if (currentMode === "enabled") siteToggle.checked = true;
  });

  siteToggle.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    if (currentMode === "enabled") {
      if (isChecked)
        customSitesList = customSitesList.filter((d) => d !== currentHost);
      else if (!customSitesList.includes(currentHost))
        customSitesList.push(currentHost);
    } else {
      if (isChecked) {
        if (!customSitesList.includes(currentHost))
          customSitesList.push(currentHost);
      } else {
        customSitesList = customSitesList.filter((d) => d !== currentHost);
      }
    }
    chrome.storage.local.set({ customSites: customSitesList });
  });

  showOutlineToggle.addEventListener("change", (e) =>
    chrome.storage.local.set({ showOutline: e.target.checked }),
  );
  showHighlightToggle.addEventListener("change", (e) =>
    chrome.storage.local.set({ showHighlight: e.target.checked }),
  );
  showTooltipToggle.addEventListener("change", (e) =>
    chrome.storage.local.set({ showTooltip: e.target.checked }),
  );
  showHotkeyToggle.addEventListener("change", (e) =>
    chrome.storage.local.set({ showHotkeys: e.target.checked }),
  );
  trackAllToggle.addEventListener("change", (e) =>
    saveProfileData("trackAllElements", e.target.checked),
  );
  hoverDelayInput.addEventListener("change", (e) =>
    chrome.storage.local.set({ hoverDelay: parseInt(e.target.value) || 0 }),
  );
  dynamicArrowToggle.addEventListener("change", (e) =>
    chrome.storage.local.set({ dynamicArrow: e.target.checked }),
  );
  ignoreHoverToggle.addEventListener("change", (e) =>
    chrome.storage.local.set({ ignoreHoverStyles: e.target.checked }),
  );
  document
    .getElementById("censorModeSelect")
    .addEventListener("change", (e) =>
      chrome.storage.local.set({ censorMode: e.target.value }),
    );

  document.getElementById("tagInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("addTagBtn").click();
  });
  document.getElementById("cssInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("addCssBtn").click();
  });

  showAttributesToggle.addEventListener("change", (e) =>
    chrome.storage.local.set({
      showAttributes: e.target.checked,
    }),
  );

  a11yToggle.addEventListener("change", (e) => {
    a11yPanel.style.display = e.target.checked ? "block" : "none";
    chrome.storage.local.set({ enableA11y: e.target.checked });
  });

  autoToggle.addEventListener("change", (e) => {
    autoPanel.style.display = e.target.checked ? "block" : "none";
    chrome.storage.local.set({ enableAuto: e.target.checked });
  });

  frameworkSelect.addEventListener("change", (e) =>
    chrome.storage.local.set({ framework: e.target.value }),
  );
  languageSelect.addEventListener("change", (e) =>
    chrome.storage.local.set({ language: e.target.value }),
  );
  xpathSelect.addEventListener("change", (e) =>
    chrome.storage.local.set({ xpathMode: e.target.value }),
  );

  function saveA11yConfig() {
    const selected = Array.from(
      document.querySelectorAll(".a11y-check:checked"),
    ).map((cb) => cb.value);
    chrome.storage.local.set({ trackedA11y: selected });
  }

  document.getElementById("themeSelect").addEventListener("change", (e) => {
    chrome.storage.local.set({ theme: e.target.value });
    document.body.className = `tester-popup theme-${e.target.value}`;
  });

  document
    .getElementById("outlineColor")
    .addEventListener("input", (e) =>
      chrome.storage.local.set({ outlineColor: e.target.value }),
    );
  document
    .getElementById("HighlightColor")
    .addEventListener("input", (e) =>
      chrome.storage.local.set({ highlightColor: e.target.value }),
    );
  document.getElementById("HighlightOpacity").addEventListener("input", (e) =>
    chrome.storage.local.set({
      highlightOpacity: parseFloat(e.target.value),
    }),
  );

  document.getElementById("addTagBtn").addEventListener("click", () => {
    const newTag = document
      .getElementById("tagInput")
      .value.trim()
      .toUpperCase();
    if (!newTag) return;
    chrome.storage.local.get(["trackedTags"], (res) => {
      const tags = res.trackedTags || [];
      if (!tags.includes(newTag)) {
        tags.push(newTag);
        saveProfileData("trackedTags", tags, "tagInput"); // <--- ADDED 'tagInput'
        renderList(tags, tagList, "trackedTags");
        document.getElementById("tagInput").value = "";
      }
    });
  });

  document.getElementById("addCssBtn").addEventListener("click", () => {
    const newCss = document
      .getElementById("cssInput")
      .value.trim()
      .toLowerCase();
    if (!newCss) return;
    chrome.storage.local.get(["customCSS"], (res) => {
      const props = res.customCSS || [];
      if (!props.includes(newCss)) {
        props.push(newCss);
        saveProfileData("customCSS", props, "cssInput"); // <--- ADDED 'cssInput'
        renderList(props, cssList, "customCSS");
        document.getElementById("cssInput").value = "";
      }
    });
  });

  document.getElementById("addCssBtn").addEventListener("click", () => {
    const newCss = document
      .getElementById("cssInput")
      .value.trim()
      .toLowerCase();
    if (!newCss) return;
    chrome.storage.local.get(["customCSS"], (res) => {
      const props = res.customCSS || [];
      if (!props.includes(newCss)) {
        props.push(newCss);
        saveProfileData("customCSS", props, "cssInput"); // <--- ADDED 'cssInput'
        renderList(props, cssList, "customCSS");
        document.getElementById("cssInput").value = "";
      }
    });
  });

  setupDropZone(cssList, "customCSS");
  setupDropZone(tagList, "trackedTags");

  function renderList(items, container, storageKey) {
    container.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
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

      li.addEventListener("dragstart", () =>
        setTimeout(() => li.classList.add("dragging"), 0),
      );
      li.addEventListener("dragend", () => li.classList.remove("dragging"));

      li.querySelector(".remove-btn").addEventListener("click", (e) => {
        const itemToRemove = e.currentTarget.getAttribute("data-item");
        const newItems = items.filter((i) => i !== itemToRemove);
        // Determine which input to flash based on the storage key
        const inputId = storageKey === "customCSS" ? "cssInput" : "tagInput";
        saveProfileData(storageKey, newItems, inputId);
        renderList(newItems, container, storageKey);
      });
      container.appendChild(li);
    });
  }

  function setupDropZone(container, storageKey) {
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingLi = container.querySelector(".dragging");
      if (!draggingLi) return;

      const siblings = [...container.querySelectorAll("li:not(.dragging)")];
      let nextSibling = siblings.find((sibling) => {
        const box = sibling.getBoundingClientRect();
        return e.clientY <= box.top + box.height / 2;
      });
      container.insertBefore(draggingLi, nextSibling);
    });

    container.addEventListener("drop", (e) => {
      e.preventDefault();
      const newItems = [...container.querySelectorAll("li")].map(
        (li) => li.dataset.item,
      );
      const inputId = storageKey === "customCSS" ? "cssInput" : "tagInput";
      saveProfileData(storageKey, newItems, inputId);
    });
  }

  document.addEventListener("keydown", (e) => {
    const key = e.key;
    if (e.altKey) {
      if (key === "o") {
        e.preventDefault();
        showOutlineToggle.click();
      }
      if (key === "h") {
        e.preventDefault();
        showHighlightToggle.click();
      }
      if (key === "i") {
        e.preventDefault();
        showTooltipToggle.click();
      }
      if (key === "s") {
        e.preventDefault();
        ignoreHoverToggle.click();
      }
      if (key === "k") {
        e.preventDefault();
        showHotkeyToggle.click();
      }
      if (key === "a") {
        e.preventDefault();
        showAttributesToggle.click();
      }
    }
  });

  function getSoftwareVersion() {
    const manifestData = chrome.runtime.getManifest();
    return `v.${manifestData.version}`;
  }
  document.getElementById("version_number").innerHTML = getSoftwareVersion();
});
