// app.js - State Controller and Interaction Logic for ProviderPortal PWA

// Google Sheets API Web App URL (Shared with HelpFind core application)
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwUDg5GkL6Dd9zbgG2KjnvBMvecrjQ8s3v_VMq2_7RK6EnfZt7WUn391EDpEU7M0xnZ/exec";

// Global App State
let currentUser = null; // Stores authenticated provider object
let currentReviews = []; // Reviews for this specific provider
let isRecording = false;
let recognition = null;
let idTokenSession = null; // Stores Google OAuth token if logged in via Google

// DOM Elements
const screenLogin = document.getElementById('screen-login');
const screenDashboard = document.getElementById('screen-dashboard');
const userProfile = document.getElementById('user-profile');
const userEmailText = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');
const loadingMask = document.getElementById('loading-mask');
const loadingText = document.getElementById('loading-text');

// Demo Auth Elements
const triggerDemoPanel = document.getElementById('trigger-demo-panel');
const demoAuthPanel = document.getElementById('demo-auth-panel');
const demoEmailSelect = document.getElementById('demo-email-select');
const btnDemoLogin = document.getElementById('btn-demo-login');

// Dashboard Info Elements
const profileName = document.getElementById('profile-name');
const profileCategory = document.getElementById('profile-category');
const profilePhone = document.getElementById('profile-phone');
const profileEmail = document.getElementById('profile-email');

// Analytics Elements
const metricTimesUsed = document.getElementById('metric-times-used');
const metricRating = document.getElementById('metric-rating');
const metricReviewsCount = document.getElementById('metric-reviews-count');

// Service Story Speech Elements
const storyTextarea = document.getElementById('story-textarea');
const btnMic = document.getElementById('btn-mic');
const recordingStatusText = document.getElementById('recording-status-text');
const audioVisualizer = document.getElementById('audio-visualizer');
const btnPolishStory = document.getElementById('btn-polish-story');
const btnSaveStory = document.getElementById('btn-save-story');
const reviewsListContainer = document.getElementById('reviews-list-container');

// Offline Banner Element
const offlineNotification = document.getElementById('offline-notification');

// Page Boot Initialization
document.addEventListener('DOMContentLoaded', () => {
  // 1. PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered successfully with scope:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  }

  // 2. Connectivity Listeners
  window.addEventListener('online', toggleOfflineStatus);
  window.addEventListener('offline', toggleOfflineStatus);
  toggleOfflineStatus();

  // 3. Setup Button Event Listeners
  triggerDemoPanel.addEventListener('click', toggleDemoPanel);
  btnDemoLogin.addEventListener('click', handleDemoLogin);
  btnLogout.addEventListener('click', handleLogout);
  btnMic.addEventListener('click', toggleVoiceDictation);
  btnPolishStory.addEventListener('click', () => saveOrPolishStory(true));
  btnSaveStory.addEventListener('click', () => saveOrPolishStory(false));

  storyTextarea.addEventListener('input', () => {
    const hasText = storyTextarea.value.trim().length > 0;
    btnPolishStory.disabled = !hasText;
    btnSaveStory.disabled = !hasText;
  });

  // 4. Initialize Speech Recognition
  initSpeechRecognition();

  // 5. Restore Cached Session if present
  restoreCachedSession();
});

// Toast notification helper
function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast-notification ${isError ? 'error' : ''}`;
  
  const icon = isError ? '❌' : '✅';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  
  container.appendChild(toast);
  
  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// Show loading mask overlay
function showLoading(text = "Communicating with sheet...") {
  loadingText.textContent = text;
  loadingMask.classList.remove('hidden');
}

// Hide loading mask overlay
function hideLoading() {
  loadingMask.classList.add('hidden');
}

// Connectivity change banner toggler
function toggleOfflineStatus() {
  if (navigator.onLine) {
    offlineNotification.style.display = 'none';
  } else {
    offlineNotification.style.display = 'block';
  }
}

// Toggle Demo credentials login box
function toggleDemoPanel() {
  demoAuthPanel.classList.toggle('open');
  triggerDemoPanel.textContent = demoAuthPanel.classList.contains('open') 
    ? 'Hide Developer Demo Credentials' 
    : 'Show Developer Demo Credentials';
}

// --- SESSION MANAGEMENT ---

// Restores provider state from sessionStorage
function restoreCachedSession() {
  const savedUser = sessionStorage.getItem('provider_user');
  const savedReviews = sessionStorage.getItem('provider_reviews');
  const savedToken = sessionStorage.getItem('provider_oauth_token');
  
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      currentReviews = savedReviews ? JSON.parse(savedReviews) : [];
      idTokenSession = savedToken || null;
      renderDashboard();
    } catch (e) {
      console.error('Failed to parse cached session:', e);
      handleLogout();
    }
  }
}

// Clears user authentication state and logs out
function handleLogout() {
  currentUser = null;
  currentReviews = [];
  idTokenSession = null;
  
  sessionStorage.removeItem('provider_user');
  sessionStorage.removeItem('provider_reviews');
  sessionStorage.removeItem('provider_oauth_token');
  
  // Clear layout fields
  storyTextarea.value = '';
  btnPolishStory.disabled = true;
  btnSaveStory.disabled = true;
  
  // Reset screen toggle
  userProfile.classList.add('hidden');
  screenDashboard.classList.add('hidden');
  screenLogin.classList.remove('hidden');
  
  showToast('Logged out successfully.');
}

// Authenticates backend API request using Google OAuth Token or Demo Email
async function fetchProviderProfile(email, idToken = null) {
  let url = '';
  if (idToken) {
    url = `${GOOGLE_SHEETS_API_URL}?action=get_provider_by_token&id_token=${encodeURIComponent(idToken)}`;
  } else {
    url = `${GOOGLE_SHEETS_API_URL}?action=get_provider_by_email_demo&email=${encodeURIComponent(email)}`;
  }

  showLoading("Fetching provider profile...");

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not connect to Google Apps Script backend");
    
    const data = await response.json();
    if (data.status === "success" && data.provider) {
      currentUser = data.provider;
      currentReviews = data.reviews || [];
      idTokenSession = idToken;

      // Cache session in browser tab
      sessionStorage.setItem('provider_user', JSON.stringify(currentUser));
      sessionStorage.setItem('provider_reviews', JSON.stringify(currentReviews));
      if (idToken) {
        sessionStorage.setItem('provider_oauth_token', idToken);
      }

      renderDashboard();
      showToast(`Welcome back, ${currentUser.name}!`);
    } else {
      throw new Error(data.message || "Failed to retrieve provider record");
    }
  } catch (error) {
    console.error("Login fetch error:", error);
    showToast(error.message || "Login failed. Verify email and connection.", true);
  } finally {
    hideLoading();
  }
}

// --- AUTHENTICATION FLOWS ---

// 1. Google OAuth Token Callback
window.handleCredentialResponse = (response) => {
  // The credential returned is the Google ID Token (JWT)
  const token = response.credential;
  if (!token) {
    showToast("Google sign in failed", true);
    return;
  }
  
  // Parse JWT locally to display loading email before backend verification
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const parsedToken = JSON.parse(jsonPayload);
    
    console.log("Authenticated OAuth Email:", parsedToken.email);
    fetchProviderProfile(parsedToken.email, token);
  } catch (e) {
    console.error("JWT decoding failed locally:", e);
    fetchProviderProfile("", token);
  }
};

// 2. Developer Demo Bypass Login
function handleDemoLogin() {
  const selectedEmail = demoEmailSelect.value;
  if (!selectedEmail) {
    showToast("Please choose an account from the dropdown list.", true);
    return;
  }
  fetchProviderProfile(selectedEmail, null);
}

// --- DASHBOARD RENDERING ---

function renderDashboard() {
  // Switch view screen toggles
  screenLogin.classList.add('hidden');
  screenDashboard.classList.remove('hidden');
  
  // User info header details
  userEmailText.textContent = currentUser.email;
  userEmailText.title = currentUser.email;
  userProfile.classList.remove('hidden');

  // Business profile card info
  profileName.textContent = currentUser.name;
  profileCategory.textContent = `${currentUser.category} • ${currentUser.service || "General"}`;
  profilePhone.textContent = currentUser.phone || "No phone listed";
  profileEmail.textContent = currentUser.email;

  // Analytics Metrics values
  metricTimesUsed.textContent = currentUser.timesUsed || "0";
  metricRating.textContent = Number(currentUser.rating || 5.0).toFixed(1);
  metricReviewsCount.textContent = currentUser.reviewCount || "0";

  // Pre-fill Knowledge Catalog
  if (currentUser.serviceStories) {
    storyTextarea.value = currentUser.serviceStories;
    btnPolishStory.disabled = false;
    btnSaveStory.disabled = false;
  } else {
    storyTextarea.value = '';
    btnPolishStory.disabled = true;
    btnSaveStory.disabled = true;
  }

  // Render review history elements
  renderReviewsList();
}

// Render review history
function renderReviewsList() {
  reviewsListContainer.innerHTML = '';
  
  if (!currentReviews || currentReviews.length === 0) {
    reviewsListContainer.innerHTML = `
      <div class="no-reviews">
        No neighborhood reviews submitted yet. When neighbors rate you, they will appear here.
      </div>
    `;
    return;
  }

  // Sort reviews by date descending
  const sortedReviews = [...currentReviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sortedReviews.forEach(r => {
    const item = document.createElement('div');
    item.className = 'review-item';
    
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const dateFormatted = r.date || 'Recent';
    
    item.innerHTML = `
      <div class="review-top-row">
        <span class="review-author">Verified Neighbor Recommendation</span>
        <span class="review-rating-stars">${stars}</span>
      </div>
      <div class="review-date-cost">
        <span>Date: ${dateFormatted}</span>
        <span>Est. Cost: $${r.cost || 50}</span>
      </div>
      <p class="review-text">"${r.comment || 'No comment provided.'}"</p>
      <div class="review-badges-row">
        <span class="review-badge ontime">${r.punctual ? '⏱️ On Time' : '⏱️ Delayed'}</span>
        <span class="review-badge cost-info">Quote Honored</span>
      </div>
    `;
    
    reviewsListContainer.appendChild(item);
  });
}

// --- VOICE DICTATION (SPEECH-TO-TEXT) ---

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn("Web Speech API is not supported in this browser. Hiding microphone button.");
    btnMic.style.display = 'none';
    recordingStatusText.textContent = "Voice input unsupported in browser. Please type your story.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  // Result event callback
  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        const text = event.results[i][0].transcript;
        // Append transcribed result directly to story text area
        const currentText = storyTextarea.value.trim();
        storyTextarea.value = currentText ? `${currentText} ${text}` : text;
        
        // Trigger textarea input event to enable polish/save buttons
        storyTextarea.dispatchEvent(new Event('input'));
      }
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    showToast(`Speech error: ${event.error}`, true);
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) {
      // Loop recording if continuous ends unexpectedly
      recognition.start();
    } else {
      stopRecording();
    }
  };
}

// Toggle recording state
function toggleVoiceDictation() {
  if (!recognition) return;

  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
}

function startRecording() {
  if (!recognition) return;
  isRecording = true;
  recognition.start();

  btnMic.classList.add('recording');
  btnMic.textContent = '⏹️';
  recordingStatusText.textContent = "Dictating... Tap square to pause";
  recordingStatusText.classList.add('active');
  audioVisualizer.classList.add('active');
  showToast("Listening... Speak your story.");
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    recognition.stop();
  }

  btnMic.classList.remove('recording');
  btnMic.textContent = '🎤';
  recordingStatusText.textContent = "Voice paused. Tap microphone to record.";
  recordingStatusText.classList.remove('active');
  audioVisualizer.classList.remove('active');
}

// --- SAVE & POLISH SERVICE STORY ---

async function saveOrPolishStory(shouldPolish = false) {
  const storyText = storyTextarea.value.trim();
  if (!storyText) {
    showToast("Story text box is empty.", true);
    return;
  }

  if (isRecording) {
    stopRecording();
  }

  let action = '';
  let params = `story=${encodeURIComponent(storyText)}&polish=${shouldPolish}`;

  if (idTokenSession) {
    // Authenticated via Google
    action = 'update_service_story';
    params += `&id_token=${encodeURIComponent(idTokenSession)}`;
  } else {
    // Authenticated via Demo Mode
    action = 'update_service_story_demo';
    params += `&email=${encodeURIComponent(currentUser.email)}`;
  }

  showLoading(shouldPolish ? "Polishing story with AI..." : "Saving story to Google Sheet...");

  const url = `${GOOGLE_SHEETS_API_URL}?action=${action}&${params}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not sync with Google Sheets backend");
    
    const data = await response.json();
    if (data.status === "success") {
      // Update story text field with response (which may be polished by AI)
      if (data.story) {
        storyTextarea.value = data.story;
      }
      
      // Update local state and sessionStorage cache
      currentUser.serviceStories = storyTextarea.value;
      sessionStorage.setItem('provider_user', JSON.stringify(currentUser));

      if (shouldPolish) {
        if (data.polished) {
          showToast("Speech story polished successfully using Gemini AI!");
        } else {
          showToast("Transcript polished locally (backend AI not configured).");
        }
      } else {
        showToast("Service story saved directly to Google Sheets!");
      }
    } else {
      throw new Error(data.message || "Failed to save service story.");
    }
  } catch (error) {
    console.error("Story update error:", error);
    showToast(error.message || "Error saving story. Try again.", true);
  } finally {
    hideLoading();
  }
}
