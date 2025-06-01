// Constants for emotion options
let EMOTIONS = {
  1: { text: "Frustrated to the extent that I'm considering quitting", color: "#e74c3c", name: "Frustrated" },
  2: { text: "Sad for needing to do it", color: "#9b59b6", name: "Sad" },
  3: { text: "Neutral", color: "#3498db", name: "Neutral" },
  4: { text: "Enjoying", color: "#2ecc71", name: "Enjoying" },
  5: { text: "Super thrilled", color: "#27ae60", name: "Thrilled" }
};

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const sections = document.querySelectorAll('.section');
const emotionOptions = document.querySelectorAll('.emotion-option');
const saveLogBtn = document.getElementById('saveLogBtn');
const activityInput = document.getElementById('activityInput');
const logSuccess = document.getElementById('logSuccess');
const logEntries = document.getElementById('logEntries');
const exportBtn = document.getElementById('exportBtn');
const frequencyButtons = document.querySelectorAll('.frequency-btn');
const settingsAlert = document.getElementById('settingsAlert');
const notificationWarning = document.getElementById('notificationWarning');
const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
const nextPromptTimeElement = document.getElementById('nextPromptTime');
const emotionNameInputs = document.querySelectorAll('.emotion-name-field');
const saveEmotionNames = document.getElementById('saveEmotionNames');
const emotionNameElements = document.querySelectorAll('.emotion-name');

// Update emotion names in UI
function updateEmotionNamesUI() {
  emotionNameElements.forEach(element => {
    const emotionId = element.parentElement.dataset.emotion;
    if (emotionId && EMOTIONS[emotionId]) {
      element.textContent = EMOTIONS[emotionId].name;
    }
  });
}

// Tab Navigation
tabButtons.forEach(button => {
  button.addEventListener('click', async () => {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    sections.forEach(section => section.classList.remove('active'));
    
    button.classList.add('active');
    
    const targetId = button.id.replace('Tab', 'Section');
    document.getElementById(targetId).classList.add('active');
    
    if (button.id === 'historyTab') {
      await loadLogEntries();
    } else if (button.id === 'settingsTab') {
      await loadSettings();
    } else if (button.id === 'logTab') {
      // Refresh emotion names when switching to log tab
      const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
      if (response.settings?.emotions) {
        EMOTIONS = response.settings.emotions;
        updateEmotionNamesUI();
      }
    } else if (button.id === 'aboutTab') {
      // No special loading needed for about tab
      document.getElementById('aboutSection').classList.add('active');
    }
  });
});

// Selected Emotion Tracking
let selectedEmotion = null;

emotionOptions.forEach(option => {
  option.addEventListener('click', () => {
    emotionOptions.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    selectedEmotion = option.dataset.emotion;
  });
});

// Save Log Entry
saveLogBtn.addEventListener('click', async () => {
  const activity = activityInput.value.trim();
  
  if (!activity) {
    alert('Please enter what you are doing');
    return;
  }
  
  if (!selectedEmotion) {
    alert('Please select how you are feeling');
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'logEntry',
      data: {
        activity,
        emotion: selectedEmotion
      }
    });
    
    if (response.success) {
      logSuccess.classList.remove('hidden');
      activityInput.value = '';
      emotionOptions.forEach(opt => opt.classList.remove('selected'));
      selectedEmotion = null;
      
      setTimeout(() => {
        logSuccess.classList.add('hidden');
      }, 3000);
    }
  } catch (error) {
    console.error('Error saving log entry:', error);
    alert('Error saving log entry. Please try again.');
  }
});

// Load Log Entries
async function loadLogEntries() {
  try {
    const [logsResponse, settingsResponse] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'getLogs' }),
      chrome.runtime.sendMessage({ type: 'getSettings' })
    ]);
    
    const logs = logsResponse.logs || [];
    if (settingsResponse.settings?.emotions) {
      EMOTIONS = settingsResponse.settings.emotions;
    }
    
    logEntries.innerHTML = '';
    
    if (logs.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = '<p>No entries yet. Start logging your activities!</p>';
      logEntries.appendChild(emptyState);
      return;
    }
    
    // Group logs by date
    const groupedLogs = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString();
      if (!groupedLogs[date]) {
        groupedLogs[date] = [];
      }
      groupedLogs[date].push(log);
    });
    
    // Create date groups
    Object.entries(groupedLogs).forEach(([date, entries]) => {
      const dateGroup = document.createElement('div');
      dateGroup.className = 'date-group';
      
      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header';
      dateHeader.innerHTML = `
        <span class="date-toggle">▼</span>
        <span>${date}</span>
      `;
      
      const dateEntries = document.createElement('div');
      dateEntries.className = 'date-entries';
      
      entries.forEach(log => {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
          <div class="log-entry-header">
            <span class="log-entry-timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
            <span class="log-entry-emotion" style="background-color: ${EMOTIONS[log.emotion].color}">${EMOTIONS[log.emotion].name}</span>
          </div>
          <div class="log-entry-activity">${log.activity}</div>
        `;
        dateEntries.appendChild(entry);
      });
      
      dateHeader.addEventListener('click', () => {
        dateHeader.querySelector('.date-toggle').classList.toggle('collapsed');
        dateEntries.style.display = dateEntries.style.display === 'none' ? 'block' : 'none';
      });
      
      dateGroup.appendChild(dateHeader);
      dateGroup.appendChild(dateEntries);
      logEntries.appendChild(dateGroup);
    });
  } catch (error) {
    console.error('Error loading log entries:', error);
  }
}

// Export logs as CSV
exportBtn.addEventListener('click', async () => {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'getLogs' });
    const logs = response.logs || [];
    
    if (logs.length === 0) {
      alert('No log entries to export');
      return;
    }
    
    const headers = ['Date', 'Time', 'Activity', 'Emotion'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleDateString(),
      new Date(log.timestamp).toLocaleTimeString(),
      `"${log.activity.replace(/"/g, '""')}"`,
      EMOTIONS[log.emotion].text
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Error exporting logs:', error);
    alert('Error exporting logs. Please try again.');
  }
});

// Load and display settings
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
    const settings = response.settings;
    
    // Update frequency buttons
    frequencyButtons.forEach(button => {
      const minutes = parseInt(button.dataset.minutes);
      button.classList.toggle('active', minutes === settings.frequency);
    });
    
    // Update emotion name inputs
    Object.entries(settings.emotions).forEach(([id, emotion]) => {
      const input = document.querySelector(`#emotion${id}`);
      if (input) {
        input.value = emotion.name;
      }
    });
    
    // Check notification permission
    const permission = await chrome.permissions.contains({
      permissions: ['notifications']
    });
    
    notificationWarning.classList.toggle('hidden', permission);
    settingsAlert.classList.toggle('hidden', permission);
    
    // Update next prompt time
    if (settings.nextPromptTime) {
      updateNextPromptTime(settings.nextPromptTime);
    }
    
    EMOTIONS = settings.emotions;
    updateEmotionNamesUI();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Update frequency setting
frequencyButtons.forEach(button => {
  button.addEventListener('click', async () => {
    frequencyButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    const frequency = parseInt(button.dataset.minutes);
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
      const settings = response.settings;
      settings.frequency = frequency;
      await chrome.storage.local.set({ settings });
      await chrome.runtime.sendMessage({ type: 'settingsUpdated' });
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Error updating settings. Please try again.');
    }
  });
});

// Enable notifications
enableNotificationsBtn.addEventListener('click', async () => {
  try {
    const granted = await chrome.permissions.request({
      permissions: ['notifications']
    });
    
    if (granted) {
      notificationWarning.classList.add('hidden');
      settingsAlert.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
});

// Update next prompt time display
function updateNextPromptTime(nextPromptTimeStr) {
  if (!nextPromptTimeStr) return;
  
  const next = new Date(nextPromptTimeStr);
  const now = new Date();
  const diff = Math.max(0, Math.floor((next - now) / 1000 / 60));
  
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  
  nextPromptTimeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Save emotion names
saveEmotionNames.addEventListener('click', async () => {
  const updatedEmotions = { ...EMOTIONS };
  
  emotionNameInputs.forEach(input => {
    const id = input.dataset.emotion;
    if (id && input.value.trim()) {
      updatedEmotions[id].name = input.value.trim();
    }
  });
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'updateEmotions',
      data: updatedEmotions
    });
    
    if (response.success) {
      EMOTIONS = updatedEmotions;
      updateEmotionNamesUI();
      alert('Emotion names updated successfully!');
    }
  } catch (error) {
    console.error('Error updating emotion names:', error);
    alert('Error updating emotion names. Please try again.');
  }
});

// Optimize next prompt time updates
let nextPromptInterval;

function startNextPromptTimer() {
  // Clear existing interval
  if (nextPromptInterval) {
    clearInterval(nextPromptInterval);
  }

  // Initial update
  chrome.runtime.sendMessage({ type: 'getSettings' }, (response) => {
    if (response.settings?.nextPromptTime) {
      updateNextPromptTime(response.settings.nextPromptTime);
    }
  });

  // Update every 30 seconds instead of every minute
  nextPromptInterval = setInterval(() => {
    chrome.runtime.sendMessage({ type: 'getSettings' }, (response) => {
      if (response.settings?.nextPromptTime) {
        updateNextPromptTime(response.settings.nextPromptTime);
      }
    });
  }, 30000);
}

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
  // Load settings first to get emotion names
  const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
  if (response.settings?.emotions) {
    EMOTIONS = response.settings.emotions;
    updateEmotionNamesUI();
  }
  
  // Switch to log tab
  document.getElementById('logTab').click();
  
  // Start the timer
  startNextPromptTimer();
});

// Clean up when popup closes
window.addEventListener('unload', () => {
  if (nextPromptInterval) {
    clearInterval(nextPromptInterval);
  }
});