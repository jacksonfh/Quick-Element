// background.js
chrome.action.onClicked.addListener(() => {
    toggleMasterState();
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-inspector") {
        toggleMasterState();
    }
});

// Directly flip the storage switch instead of messaging tabs
function toggleMasterState() {
    chrome.storage.local.get(['masterActive'], (res) => {
        chrome.storage.local.set({ masterActive: !(res.masterActive !== false) });
    });
}