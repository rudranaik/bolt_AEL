// Constants for emotion options
const DEFAULT_EMOTIONS = {
  1: { id: 1, text: "Engaged / Energized - Peak productivity, alignment with goals", color: "#FFD700", name: "🌟 Engaged", emoji: "🌟" },
  2: { id: 2, text: "Neutral / Numb - Going through the motions", color: "#808080", name: "😐 Neutral", emoji: "😐" },
  3: { id: 3, text: "Frustrated / Angry - Resistance or tension", color: "#FF4500", name: "😖 Frustrated", emoji: "😖" },
  4: { id: 4, text: "Sad / Resigned - Emotional drain or disappointment", color: "#4682B4", name: "😔 Sad", emoji: "😔" },
  5: { id: 5, text: "Anxious / Insecure - Uncertainty or worry", color: "#9370DB", name: "😕 Anxious", emoji: "😕" }
};

// Default settings
const DEFAULT_SETTINGS = {
  frequency: 30, // minutes
  notifications: true,
  emotions: DEFAULT_EMOTIONS,
  nextPromptTime: null
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Activity & Emotion Logger installed');
  
  // Initialize settings
  const storage = await chrome.storage.local.get('settings');
  if (!storage.settings) {
    const settings = { ...DEFAULT_SETTINGS };
    settings.nextPromptTime = new Date(Date.now() + settings.frequency * 60000).toISOString();
    await chrome.storage.local.set({ 
      settings,
      logs: [] 
    });
  }
  
  // Schedule first alarm
  await setupAlarm();
});

// Setup notification alarm based on current settings
async function setupAlarm() {
  try {
    const storage = await chrome.storage.local.get('settings');
    const settings = storage.settings || DEFAULT_SETTINGS;
    
    // Clear any existing alarms
    await chrome.alarms.clearAll();
    
    // Create new alarm with current frequency
    await chrome.alarms.create('logReminder', { 
      periodInMinutes: settings.frequency,
      when: Date.now() + 1000 // Start first alarm in 1 second
    });

    // Update next prompt time
    settings.nextPromptTime = new Date(Date.now() + settings.frequency * 60000).toISOString();
    await chrome.storage.local.set({ settings });
    
    console.log(`Alarm set to trigger every ${settings.frequency} minutes`);
    return true;
  } catch (error) {
    console.error('Error setting up alarm:', error);
    return false;
  }
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'logReminder') {
    showNotification();
    updateNextPromptTime();
  }
});

// Update next prompt time
async function updateNextPromptTime() {
  try {
    const storage = await chrome.storage.local.get('settings');
    const settings = storage.settings || DEFAULT_SETTINGS;
    settings.nextPromptTime = new Date(Date.now() + settings.frequency * 60000).toISOString();
    await chrome.storage.local.set({ settings });
  } catch (error) {
    console.error('Error updating next prompt time:', error);
  }
}

// Display notification
function showNotification() {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon128.png',
      title: 'Activity & Emotion Check-in',
      message: 'What are you working on right now? How are you feeling?',
      buttons: [
        { title: 'Log Now' }
      ],
      priority: 2,
      requireInteraction: true,
      silent: false
    });
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// Handle notification button click and notification click
chrome.notifications.onButtonClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
  openPopup();
});

chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
  openPopup();
});

// Function to open popup
function openPopup() {
  try {
    chrome.windows.getCurrent(async (window) => {
      const width = 360;
      const height = 600;
      const left = (window.width - width) / 2;
      const top = (window.height - height) / 2;

      await chrome.windows.create({
        url: 'popup/popup.html',
        type: 'popup',
        width: width,
        height: height,
        left: Math.round(left),
        top: Math.round(top)
      });
    });
  } catch (error) {
    console.error('Error opening popup:', error);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'settingsUpdated') {
    setupAlarm()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'logEntry') {
    logActivity(message.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'getSettings') {
    chrome.storage.local.get('settings', (data) => {
      sendResponse({ settings: data.settings || DEFAULT_SETTINGS });
    });
    return true;
  }
  
  if (message.type === 'getLogs') {
    chrome.storage.local.get('logs', (data) => {
      sendResponse({ logs: data.logs || [] });
    });
    return true;
  }

  if (message.type === 'updateEmotions') {
    updateEmotions(message.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Save activity log to storage
async function logActivity(logData) {
  try {
    const timestamp = new Date().toISOString();
    const date = new Date().toLocaleDateString();
    const newEntry = {
      id: Date.now(),
      timestamp,
      date,
      activity: logData.activity,
      emotion: logData.emotion,
      formattedDate: new Date().toLocaleString()
    };
    
    const data = await chrome.storage.local.get('logs');
    const logs = data.logs || [];
    logs.unshift(newEntry);
    
    await chrome.storage.local.set({ logs });
    console.log('Activity logged:', newEntry);
    return newEntry;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
}

// Update emotion names
async function updateEmotions(emotions) {
  try {
    const storage = await chrome.storage.local.get('settings');
    const settings = storage.settings || DEFAULT_SETTINGS;
    settings.emotions = emotions;
    await chrome.storage.local.set({ settings });
    return settings;
  } catch (error) {
    console.error('Error updating emotions:', error);
    throw error;
  }
}

// Ensure service worker stays active
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension starting up');
  await setupAlarm();
});

// Handle extension update
chrome.runtime.onUpdateAvailable.addListener(async (details) => {
  console.log('Update available:', details);
  await setupAlarm();
});

// Keep service worker alive
setInterval(() => {
  console.log('Service worker heartbeat');
}, 20000);