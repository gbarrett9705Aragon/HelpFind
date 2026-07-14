// app.js - State Controller and Interaction Logic for ProviderPortal PWA

// Google Sheets API Web App URL (Dedicated ProviderPortal backend Apps Script)
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwUDg5GkL6Dd9zbgG2KjnvBMvecrjQ8s3v_VMq2_7RK6EnfZt7WUn391EDpEU7M0xnZ/exec";

const CATEGORY_SERVICES = {
  "Home Repairs & Trades": [
    "Appliance Repair",
    "Chimney Sweeping",
    "Deck/Patio Repair",
    "Electricians",
    "Garage Door Repair",
    "Gutters & Siding",
    "Handymen",
    "HVAC",
    "Locksmiths",
    "Mailbox Repair",
    "Plumbers",
    "Roofers"
  ],
  "Lawn, Landscaping & Outdoors": [
    "Hill Cutting",
    "Landscaping Design",
    "Lawn Mowing & Edging",
    "Pest Control",
    "Pressure Washing",
    "Sprinkler & Irrigation Repair",
    "Tree & Trimming",
    "Weed Control & Fertilization"
  ],
  "Lifestyle & Caregiving": [
    "Carpet/Rug Cleaning",
    "Companion Care/In-Home Caregivers",
    "Errands & Grocery Shopping",
    "Food Vendors/Meal Prep",
    "Housekeeping/Maid Service",
    "House/Pet Sitting",
    "In-Home Hair & Nail Grooming",
    "Non-Emergency Medical Transport"
  ],
  "Technology & Electronics": [
    "Apple/PC/Tablet Repair",
    "Artificial Intelligence Consulting",
    "Digital Photo Backup",
    "Newsletters",
    "Smart Home Devices",
    "Smart TV & Soundbar Setup",
    "Web and Mobile App Development",
    "Wi-Fi & Internet Troubleshooting"
  ],
  "Automotive & Golf Carts": [
    "Auto Mechanics",
    "Detailing/Car Wash",
    "Golf Cart Maintenance & Customization",
    "Towing & Tire Services"
  ],
  "Home Renovation & Design": [
    "Bathroom Accessibility Remodeling",
    "Flooring & Tiling",
    "Painters (Interior/Exterior)",
    "Window & Glass Replacement",
    "Window Treatments"
  ],
  "ZZZ Other Category": [
    "Other Service"
  ]
};

// Global App State
let currentUser = null; // Stores authenticated provider object
let currentReviews = []; // Reviews for this specific provider
let isRecording = false;
let recognition = null;

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

  // Set up login form submit listener
  document.getElementById('form-login').addEventListener('submit', handlePasswordLogin);
  
  // Set up change password form submit listener
  document.getElementById('form-change-password').addEventListener('submit', handleChangePassword);

  // Set up verification form submit listener
  document.getElementById('form-verify-listing').addEventListener('submit', handleVerifyListing);

  // Set up save services button listener
  document.getElementById('btn-save-services').addEventListener('click', savePortalServices);
  
  // Render services grid
  renderPortalServicesGrid();

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
  
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      migrateVendorTaxonomy(currentUser);
      currentReviews = savedReviews ? JSON.parse(savedReviews) : [];
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
  
  sessionStorage.removeItem('provider_user');
  sessionStorage.removeItem('provider_reviews');
  sessionStorage.removeItem('provider_password');
  
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

// --- AUTHENTICATION FLOWS ---

// 1. Password Authentication Login Form
async function handlePasswordLogin(e) {
  if (e) e.preventDefault();
  
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username || !password) {
    showToast("Please enter both username and password.", true);
    return;
  }
  
  showLoading("Logging in...");
  
  const url = `${GOOGLE_SHEETS_API_URL}?action=login_provider&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not connect to database backend");
    
    const data = await response.json();
    if (data.status === "success" && data.provider) {
      currentUser = data.provider;
      migrateVendorTaxonomy(currentUser);
      currentReviews = data.reviews || [];
      
      // Cache session in browser tab
      sessionStorage.setItem('provider_user', JSON.stringify(currentUser));
      sessionStorage.setItem('provider_reviews', JSON.stringify(currentReviews));
      sessionStorage.setItem('provider_password', password); // Cache plain password for operations
      
      // Clear login inputs
      usernameInput.value = '';
      passwordInput.value = '';
      
      renderDashboard();
      showToast(`Welcome back, ${currentUser.name}!`);
    } else {
      throw new Error(data.message || "Invalid username or password");
    }
  } catch (error) {
    console.error("Login error:", error);
    showToast(error.message || "Login failed. Please try again.", true);
  } finally {
    hideLoading();
  }
}

// 2. Developer Demo Bypass Login
async function handleDemoLogin() {
  const selectedEmail = demoEmailSelect.value;
  if (!selectedEmail) {
    showToast("Please choose an account from the dropdown list.", true);
    return;
  }
  
  showLoading("Fetching provider profile...");
  const url = `${GOOGLE_SHEETS_API_URL}?action=get_provider_by_email_demo&email=${encodeURIComponent(selectedEmail)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not connect to Google Apps Script backend");
    
    const data = await response.json();
    if (data.status === "success" && data.provider) {
      currentUser = data.provider;
      migrateVendorTaxonomy(currentUser);
      currentReviews = data.reviews || [];
      const password = currentUser.password || ""; // Grab actual password

      // Cache session in browser tab
      sessionStorage.setItem('provider_user', JSON.stringify(currentUser));
      sessionStorage.setItem('provider_reviews', JSON.stringify(currentReviews));
      sessionStorage.setItem('provider_password', password);

      renderDashboard();
      showToast(`Welcome back, ${currentUser.name}! (Demo Mode)`);
    } else {
      throw new Error(data.message || "Failed to retrieve provider record");
    }
  } catch (error) {
    console.error("Demo login error:", error);
    showToast(error.message || "Demo login failed. Verify connection.", true);
  } finally {
    hideLoading();
  }
}

// 3. Change Password Form Submission
async function handleChangePassword(e) {
  if (e) e.preventDefault();
  
  const currentPasswordInput = document.getElementById('chg-current-password');
  const newPasswordInput = document.getElementById('chg-new-password');
  const confirmPasswordInput = document.getElementById('chg-confirm-password');
  
  const currentPassword = currentPasswordInput.value.trim();
  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  
  if (newPassword !== confirmPassword) {
    showToast("New passwords do not match.", true);
    return;
  }
  
  // Use email or phone as the unique username
  const username = currentUser.email || currentUser.phone;
  if (!username) {
    showToast("Session expired. Please log in again.", true);
    handleLogout();
    return;
  }
  
  showLoading("Updating password...");
  
  const url = `${GOOGLE_SHEETS_API_URL}?action=change_password` +
    `&username=${encodeURIComponent(username)}` +
    `&current_password=${encodeURIComponent(currentPassword)}` +
    `&new_password=${encodeURIComponent(newPassword)}`;
    
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not connect to database backend");
    
    const data = await response.json();
    if (data.status === "success") {
      // Update cached password
      sessionStorage.setItem('provider_password', newPassword);
      
      // Clear input fields
      currentPasswordInput.value = '';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      
      showToast("Password updated successfully!");
    } else {
      throw new Error(data.message || "Failed to update password");
    }
  } catch (error) {
    console.error("Change password error:", error);
    showToast(error.message || "Error updating password. Try again.", true);
  } finally {
    hideLoading();
  }
}

// Verification Form Submission
async function handleVerifyListing(e) {
  if (e) e.preventDefault();
  
  const newPasswordInput = document.getElementById('verify-new-password');
  const confirmPasswordInput = document.getElementById('verify-confirm-password');
  
  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  
  if (newPassword !== confirmPassword) {
    showToast("New passwords do not match.", true);
    return;
  }
  
  const currentPassword = sessionStorage.getItem('provider_password') || '';
  const username = currentUser.email || currentUser.phone;
  
  if (!username) {
    showToast("Session expired. Please log in again.", true);
    handleLogout();
    return;
  }
  
  showLoading("Activating listing...");
  
  const url = `${GOOGLE_SHEETS_API_URL}?action=change_password` +
    `&username=${encodeURIComponent(username)}` +
    `&current_password=${encodeURIComponent(currentPassword)}` +
    `&new_password=${encodeURIComponent(newPassword)}`;
    
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not connect to database backend");
    
    const data = await response.json();
    if (data.status === "success") {
      // Update cached password
      sessionStorage.setItem('provider_password', newPassword);
      
      // Update user state to Verified
      currentUser.status = "Verified";
      sessionStorage.setItem('provider_user', JSON.stringify(currentUser));
      
      // Clear inputs
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      
      // Hide verification overlay and refresh UI
      document.getElementById('verification-overlay').classList.add('hidden');
      renderDashboard();
      
      showToast("Verification successful! Your listing is now active and visible to residents.");
    } else {
      throw new Error(data.message || "Failed to verify listing");
    }
  } catch (error) {
    console.error("Verification error:", error);
    showToast(error.message || "Error verifying listing. Try again.", true);
  } finally {
    hideLoading();
  }
}

// --- DASHBOARD RENDERING ---

function renderDashboard() {
  // Check if provider is pending verification
  const isPending = currentUser.status && currentUser.status.trim().toLowerCase() === 'pending';
  const verificationOverlay = document.getElementById('verification-overlay');
  
  if (isPending) {
    verificationOverlay.classList.remove('hidden');
  } else {
    verificationOverlay.classList.add('hidden');
  }

  // Switch view screen toggles
  screenLogin.classList.add('hidden');
  screenDashboard.classList.remove('hidden');
  
  // User info header details (handles case when email is not present)
  const displayIdentifier = currentUser.email || currentUser.phone || currentUser.name;
  userEmailText.textContent = displayIdentifier;
  userEmailText.title = displayIdentifier;
  userProfile.classList.remove('hidden');

  // Business profile card info
  profileName.textContent = currentUser.name;
  profileCategory.textContent = `${currentUser.category} • ${currentUser.service || "General"}`;
  profilePhone.textContent = currentUser.phone || "No phone listed";
  profileEmail.textContent = currentUser.email || "No email listed";

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

  // Update checkbox states in Manage Services card
  if (currentUser) {
    const userServices = currentUser.service ? currentUser.service.split(',').map(s => s.trim()) : [];
    const cbs = document.querySelectorAll('input[name="portal-services-checkbox"]');
    cbs.forEach(cb => {
      cb.checked = userServices.includes(cb.value);
    });
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

  const password = sessionStorage.getItem('provider_password') || '';
  const username = currentUser.email || currentUser.phone;

  let action = 'update_service_story';
  let params = `story=${encodeURIComponent(storyText)}&polish=${shouldPolish}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

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

function renderPortalServicesGrid() {
  const container = document.getElementById('portal-services-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  for (const category in CATEGORY_SERVICES) {
    const catDiv = document.createElement('div');
    catDiv.style.marginBottom = '0.5rem';
    
    const catTitle = document.createElement('h4');
    catTitle.textContent = category;
    catTitle.style.fontSize = '0.9rem';
    catTitle.style.borderBottom = '1px solid var(--border-color)';
    catTitle.style.paddingBottom = '0.25rem';
    catTitle.style.marginBottom = '0.35rem';
    catDiv.appendChild(catTitle);
    
    const gridDiv = document.createElement('div');
    gridDiv.style.display = 'grid';
    gridDiv.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
    gridDiv.style.gap = '0.5rem';
    
    const services = CATEGORY_SERVICES[category];
    services.forEach(srv => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '0.5rem';
      label.style.fontSize = '0.8rem';
      label.style.cursor = 'pointer';
      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = 'portal-services-checkbox';
      cb.value = srv;
      cb.style.width = 'auto';
      cb.style.cursor = 'pointer';
      
      label.appendChild(cb);
      label.appendChild(document.createTextNode(srv));
      gridDiv.appendChild(label);
    });
    
    catDiv.appendChild(gridDiv);
    container.appendChild(catDiv);
  }
}

async function savePortalServices() {
  if (!currentUser) return;
  
  const checkedCbs = Array.from(document.querySelectorAll('input[name="portal-services-checkbox"]:checked'));
  const selectedServices = checkedCbs.map(cb => cb.value).join(', ');
  
  if (selectedServices.length === 0) {
    showToast("Please check at least one service.", true);
    return;
  }
  
  const password = sessionStorage.getItem('provider_password') || '';
  const username = currentUser.email || currentUser.phone;
  const isDemo = !password;
  
  let action = isDemo ? 'update_provider_services_demo' : 'update_provider_services';
  let params = `services=${encodeURIComponent(selectedServices)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  if (isDemo) {
    params = `services=${encodeURIComponent(selectedServices)}&email=${encodeURIComponent(username)}`;
  }
  
  showLoading("Saving services to Google Sheet...");
  
  const url = `${GOOGLE_SHEETS_API_URL}?action=${action}&${params}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not sync with Google Sheets backend");
    
    const data = await response.json();
    if (data.status === "success") {
      currentUser.service = data.services;
      currentUser.category = data.category;
      sessionStorage.setItem('provider_user', JSON.stringify(currentUser));
      
      profileCategory.textContent = `${currentUser.category} • ${currentUser.service || "General"}`;
      
      showToast("Services updated successfully!");
    } else {
      throw new Error(data.message || "Failed to update services.");
    }
  } catch (error) {
    console.error("Services update error:", error);
    showToast(error.message || "Error updating services. Try again.", true);
  } finally {
    hideLoading();
  }
}

const LEGACY_SERVICE_MAP = {
  "Apple/PC Repair": "Apple/PC/Tablet Repair",
  "Carpet/Rug Shampoo": "Carpet/Rug Cleaning",
  "Detailing/Pressure Washing": "Pressure Washing",
  "Food Vendors": "Food Vendors/Meal Prep",
  "Auto (Tow/Tire)": "Towing & Tire Services",
  "Golf Cart Repair": "Golf Cart Maintenance & Customization",
  "Sprinkler Repair": "Sprinkler & Irrigation Repair",
  "Tree & Shrub Trimming": "Tree & Trimming"
};

const LEGACY_CATEGORY_MAP = {
  "Lifestyle & Convenience": "Lifestyle & Caregiving",
  "Property & Grounds Care": "Lawn, Landscaping & Outdoors",
  "Home Improvement": "Home Renovation & Design",
  "General Maintenance": "Home Repairs & Trades"
};

function migrateVendorTaxonomy(v) {
  if (v.service) {
    const services = v.service.split(',').map(s => s.trim());
    const mappedServices = services.map(s => LEGACY_SERVICE_MAP[s] || s);
    v.service = mappedServices.join(', ');
  }
  if (LEGACY_CATEGORY_MAP[v.category]) {
    v.category = LEGACY_CATEGORY_MAP[v.category];
  }
}
