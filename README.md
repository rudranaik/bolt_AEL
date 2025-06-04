# Activity & Emotion Logger - Chrome Extension

A Chrome extension that helps you track what you're doing and how you're feeling throughout your day. Get regular check-ins, maintain a log of your activities and emotions, and export data for further analysis.

## Features

- Periodic notifications to remind you to log what you're doing and how you're feeling
- Customizable notification frequency (15, 30, 45, or 60 minutes)
- Log viewer to review all past entries 
- Data export functionality (CSV format)
- Clean, intuitive user interface
- Notification permission warnings
- Customizable emotion labels

## Installation Instructions

### For Development:

1. Clone this repository
2. Run `npm install` to install dependencies
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" using the toggle in the top right
5. Click "Load unpacked" and select the extension folder
6. The extension should now appear in your Chrome toolbar

## Usage

1. Click the extension icon in your toolbar to open the popup
2. Enable notifications when prompted to receive check-in reminders
3. Use the "Log" tab to record what you're doing and how you're feeling
4. View your past entries in the "History" tab
5. Configure notification frequency and customize emotion labels in the "Settings" tab
6. Export your data as CSV from the "History" tab

## Data Privacy

All your activity and emotion data is stored locally in your browser using Chrome's storage API. No data is sent to any external servers.

## License

This project is licensed under the MIT License.