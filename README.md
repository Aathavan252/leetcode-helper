# LeetCode Question Extractor Chrome Extension

A modern, beautiful Chrome extension that extracts the current LeetCode problem's title, description, and your selected programming language, then fetches a complete solution, explanation, and complexity analysis from DeepSeek AI (via OpenRouter API) — all in a sleek popup UI with tabs.

![screenshot](screenshot.png)

## Features

- 🟠 **Modern UI**: Gradient header, tabs for Solution/Explanation/Problem, and a clean card layout.
- 📝 **Auto-extracts** the LeetCode question title, description, and your selected language.
- 🤖 **AI-powered answers**: Fetches code, explanation, and time/space complexity from DeepSeek AI (OpenRouter API).
- 🧑‍💻 **Code block with copy button** for easy copying.
- 🟢 **Tabs** for Solution, Explanation, and Problem statement.
- 🟡 **Show Raw AI Response** for debugging or transparency.
- 🟩 **Works with your current LeetCode language selection**.

## Installation

1. **Clone or Download** this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this project folder.
5. (Optional) Add your own OpenRouter API key in `popup.js` for production use.

## Usage

1. Go to any LeetCode problem page (e.g. `https://leetcode.com/problems/next-greater-element-i/`).
2. Click the extension icon in your Chrome toolbar.
3. The popup will show the question title and auto-fetch an answer.
4. Use the **Find Answer** button to re-fetch or update the answer.
5. Switch between **Solution**, **Explanation**, and **Problem** tabs.
6. Use the **Copy** button to copy the code.
7. Click **Show Raw AI Response** to see the full AI output for debugging.

## Configuration

- **API Key**: Replace the placeholder API key in `popup.js` with your own OpenRouter API key for production use.
- **AI Model**: Uses `deepseek/deepseek-r1-zero:free` by default. You can change the model in `popup.js` if desired.

## Development

- All logic is in `popup.js` and UI in `popup.html`.
- No build step required — just edit and reload in Chrome.
- Uses only HTML, CSS, and vanilla JS for maximum compatibility.

## License

MIT

---
