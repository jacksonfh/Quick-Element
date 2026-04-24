Chrome Store Download: https://chromewebstore.google.com/detail/quick-element/kodnlnipihmbbhoahhpaainafljdhkkf

# Quick Element - Chrome Extension

Quick Element is a lightweight, zero-friction Chrome extension designed for QA Automation Engineers, Manual Testers, and Front-End Developers. It allows you to instantly inspect CSS properties, accessibility data, and generate smart automation locators without ever opening Chrome DevTools.

## Key Features

* **Smart Automation Locators:** Instantly generate and copy locators for Playwright, Cypress, Selenium, WebDriverIO, and Robot Framework.
* **Anti-Hover "Glass Shield":** Inspect base CSS properties without triggering intrusive `:hover` states or animations.
* **Boundary Testing:** Automatically detect `maxlength` limits on input fields and auto-fill them past the maximum to test overflow handling.
* **Accessibility (a11y) Insights:** Quickly view Aria-Labels, Roles, Keyboard Focusability, and Contrast Ratios.
* **Fully Customizable:** Use drag-and-drop to choose exactly which HTML tags and CSS properties you want to track.
* **Site Config:** Whitelist or blocklist specific domains to keep the tool out of your way when you aren't testing.

## Installation Instructions (Developer Mode)

To install this extension directly from this repository:

1. **Download the code:** Clone this repository or download the source code as a ZIP file and extract it to a folder on your computer.
2. **Open Chrome Extensions:** Open Google Chrome and navigate to `chrome://extensions/` in your address bar.
3. **Enable Developer Mode:** Toggle the **Developer mode** switch in the top right corner of the page.
4. **Load the Extension:** Click the **Load unpacked** button in the top left corner.
5. **Select the Folder:** Browse to the folder where you extracted the repository and select it.

The Quick Element icon should now appear in your Chrome toolbar!

## Hotkeys & Usage

* `Alt + Shift + Q` (Mac: `Cmd + Shift + Q`): Toggle the extension On/Off.
* `L` (or `Shift + Click`): Lock the tooltip onto the current element to interact with the menu.
* `F`: Toggle the tooltip to dynamically follow your mouse or tether to the element.
* `P`: Flip the tooltip position above or below the element.

icon credit to: hanna gelwix (https://github.com/hangelwix)
