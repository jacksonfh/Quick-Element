chrome.action.onClicked.addListener((tab) => {
    // Send a message to the content script in the active tab
    chrome.tabs.sendMessage(tab.id, { command: "toggle_inspector" });
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-inspector") {
        // Send toggle command to the active tab
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { command: "toggle_inspector" });
            }
        });
    }
});