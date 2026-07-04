// app.js - State Controller and Interaction Logic for HelpFind Sun City Peachtree

// Google Sheets API Web App URL (Connects to HelpFindHomes.gsheet via Apps Script Web App)
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbw_B7bRQ2OEosLncFnf9imFAWwEW_44TCTQT0ixZQoERLIIuPusPAZyhH40jdqWi_7m/exec";

// Global State
let isPinVerified = !!sessionStorage.getItem('helpfind_session_pin'); // Cache PIN verification in current browser session
let actionPending = null; // 'leave-review' or 'add-new'
let currentView = 'directory';
let activeFilters = {
  discount: false,
  under100: false,
  punctual: false
};

// DOM Elements & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Reset database via URL parameter
  if (location.search.includes('reset-db=true')) {
    localStorage.clear();
    initDatabase(true);
    location.href = location.origin + location.pathname;
    return;
  }

  // Initialize mock data database
  initDatabase();
  
  // Set up form submission handler
  document.getElementById('form-add-review').addEventListener('submit', handleSubmitReview);
  
  // Set up click handlers on stars
  setStarRating(1); // Default to 1 star on form init
  
  // Add listener for community PIN keypresses
  document.getElementById('community-pin-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      verifyCommunityPIN();
    }
  });

  // Set up network listeners for sync status
  window.addEventListener('online', () => {
    processSyncQueue();
    syncProvidersFromServer();
  });
  window.addEventListener('offline', () => updateSyncStatus('offline'));

  // Initialize sync status
  if (navigator.onLine) {
    processSyncQueue();
  } else {
    updateSyncStatus('offline');
  }

  // Boot directly to directory view
  switchView('directory');

  // Check mandatory legal consent gate
  checkConsent();

  // Sync contractor list from Google Sheet in background
  syncProvidersFromServer();
});

// Toast notification helper
function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast-notification ${isError ? 'error' : ''}`;
  
  const icon = isError ? '❌' : '✅';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  
  container.appendChild(toast);
  
  // Remove after 3.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Router & View Management
function switchView(viewName) {
  currentView = viewName;
  
  // Update nav menu active states
  document.querySelectorAll('nav a').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${viewName}`);
  if (activeNav) activeNav.classList.add('active');

  // Hide all views
  document.getElementById('view-directory').classList.add('hidden');
  document.getElementById('view-add-review').classList.add('hidden');

  // Show active view
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.remove('hidden');

  // Post-view-switch actions
  if (viewName === 'directory') {
    filterDirectory();
  } else if (viewName === 'add-review') {
    populateVendorDropdown();
  }
}

// Provider Dropdown Router
function handleProviderDropdownChange() {
  const selectNav = document.getElementById('nav-provider-dropdown');
  const val = selectNav.value;
  
  if (val === 'choose') return;
  
  actionPending = val;
  
  if (isPinVerified) {
    executeGatedAction();
  } else {
    openPinGate();
  }
  
  // Reset select menu back to "Provider" title
  selectNav.value = 'choose';
}

// Community PIN Gate Modals
function openPinGate() {
  document.getElementById('community-pin-input').value = '';
  document.getElementById('pin-modal').classList.remove('hidden');
  document.getElementById('community-pin-input').focus();
}

function closePinModal() {
  document.getElementById('pin-modal').classList.add('hidden');
  actionPending = null;
}

async function verifyCommunityPIN() {
  const pinInput = document.getElementById('community-pin-input');
  const pin = pinInput.value.trim();
  const verifyBtn = document.querySelector('#pin-modal .btn-primary');

  if (!pin) return;

  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Verifying...';

  try {
    const response = await fetch(`${GOOGLE_SHEETS_API_URL}?action=verify_pin&pin=${encodeURIComponent(pin)}`);
    if (!response.ok) throw new Error('Network error during verification');
    
    const data = await response.json();
    if (data.status === 'success') {
      isPinVerified = true;
      sessionStorage.setItem('helpfind_session_pin', pin);
      document.getElementById('pin-modal').classList.add('hidden');
      executeGatedAction();
      showToast('PIN verified. Access granted.');
    } else {
      throw new Error(data.message || 'Invalid PIN');
    }
  } catch (err) {
    // Add visual error shake
    pinInput.style.animation = 'none';
    setTimeout(() => {
      pinInput.style.animation = 'scaleIn 0.2s ease-out';
    }, 10);
    showToast(err.message || 'Invalid Community PIN. Please try again.', true);
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Verify PIN';
  }
}

// Execute Action after PIN check
function executeGatedAction() {
  if (actionPending === 'leave-review') {
    switchView('add-review');
    
    // Show existing selector dropdown, hide register inputs
    document.getElementById('rev-select-wrapper').classList.remove('hidden');
    document.getElementById('new-vendor-fields').classList.add('hidden');
    
    // Default select to first valid contractor, set stars
    populateVendorDropdown();
    document.getElementById('rev-vendor-select').value = "";
    setStarRating(1);
  } 
  
  else if (actionPending === 'add-new') {
    switchView('add-review');
    
    // Hide selector dropdown, force select value to new-vendor, reveal register inputs
    document.getElementById('rev-select-wrapper').classList.add('hidden');
    document.getElementById('new-vendor-fields').classList.remove('hidden');
    
    populateVendorDropdown();
    document.getElementById('rev-vendor-select').value = "new-vendor";
    
    // Reset new contractor input values
    document.getElementById('new-vendor-name').value = '';
    document.getElementById('new-vendor-phone').value = '';
    document.getElementById('new-vendor-name').required = true;
    document.getElementById('new-vendor-phone').required = true;
    setStarRating(1);
  }
  
  actionPending = null;
}

function cancelRecommendation() {
  switchView('directory');
}

// Interactive Star Selection (Tap-Based Ratings)
function setStarRating(ratingVal) {
  document.getElementById('rev-rating').value = ratingVal;
  
  const stars = document.querySelectorAll('#star-rating-container .star-tap');
  stars.forEach((star, idx) => {
    if (idx < ratingVal) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
}

// Directory Searching and Filtering
function toggleFilter(filterName) {
  activeFilters[filterName] = !activeFilters[filterName];
  
  const pill = document.getElementById(`pill-${filterName}`);
  if (activeFilters[filterName]) {
    pill.classList.add('active');
  } else {
    pill.classList.remove('active');
  }
  
  filterDirectory();
}

function filterDirectory() {
  const categoryVal = document.getElementById('dir-category').value;
  const serviceVal = document.getElementById('dir-service').value;
  const searchVal = document.getElementById('dir-search').value.toLowerCase().trim();
  const list = document.getElementById('vendors-list');

  // If no category is selected AND the search bar is empty, show the initial gate prompt
  if (categoryVal === 'all' && searchVal === '') {
    list.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;">
        <p class="text-muted" style="font-size: 0.9rem; font-weight: 500; line-height: 1.4;">Please select a category above or type in the search bar to find service providers.</p>
      </div>
    `;
    return;
  }

  const vendors = getVendors();
  const filtered = vendors.filter(v => {
    // Search Query
    const matchesSearch = v.name.toLowerCase().includes(searchVal) ||
                          v.category.toLowerCase().includes(searchVal) ||
                          (v.service && v.service.toLowerCase().includes(searchVal)) ||
                          v.description.toLowerCase().includes(searchVal);
    
    // Category Dropdown
    const matchesCategory = categoryVal === 'all' || v.category === categoryVal;

    // Service (Subcategory) Dropdown
    const matchesService = serviceVal === 'all' || v.service === serviceVal;
    
    // Senior Discount Pill
    const matchesDiscount = !activeFilters.discount || v.offersSeniorDiscount;
    
    // Under $100 Pill
    const matchesUnder100 = !activeFilters.under100 || v.minJobCost <= 100;
    
    // Always On-Time Pill
    const matchesPunctual = !activeFilters.punctual || v.punctualityScore === 100;

    return matchesSearch && matchesCategory && matchesService && matchesDiscount && matchesUnder100 && matchesPunctual;
  });

  // Sort: by rating desc
  filtered.sort((a, b) => {
    return b.rating - a.rating;
  });

  renderVendorsList(filtered);
}

function renderVendorsList(vendors) {
  const list = document.getElementById('vendors-list');
  list.innerHTML = '';

  if (vendors.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;">
        <p class="text-muted">No providers match your search parameters. Try expanding your filters.</p>
      </div>
    `;
    return;
  }

  vendors.forEach(v => {
    const card = document.createElement('div');
    card.className = 'vendor-card';

    card.innerHTML = `
      <div class="vendor-header">
        <div class="vendor-meta">
          <span class="vendor-category">${v.category} &bull; ${v.service}</span>
          <span class="vendor-rating">★ ${v.rating.toFixed(1)} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:400;">(${v.reviewCount})</span></span>
        </div>
        <h3 class="vendor-name">${v.name}</h3>
        <div class="card-metric-badge">🟢 Used ${v.timesUsed || 0} times by neighbors</div>
      </div>
      
      <div class="vendor-footer">
        <button class="btn btn-secondary view-details-btn" onclick="openVendorModal('${v.id}')">
          Details
        </button>
        <button class="btn btn-use-service" onclick="incrementTimesUsed(event, '${v.id}')">
          🤝 I'll Use
        </button>
      </div>
    `;
    
    list.appendChild(card);
  });
}

function incrementTimesUsed(e, providerId) {
  e.stopPropagation();
  
  const vendors = getVendors();
  const index = vendors.findIndex(v => v.id === providerId);
  
  if (index !== -1) {
    const v = vendors[index];
    v.timesUsed = (v.timesUsed || 0) + 1;
    saveVendors(vendors);
    
    // Refresh directory UI instantly
    filterDirectory();
    showToast('Your choice to use this Provider has been recorded and updated!');
    
    // Background fetch to Google Sheet API Web App
    const syncUrl = `${GOOGLE_SHEETS_API_URL}?action=increment&id=${v.id}`;
    addToSyncQueue(syncUrl);

    // Open dialer automatically
    if (v.phone) {
      const cleanPhone = v.phone.replace(/[^\d-+]/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }
  }
}

// Star Rating Submission & Sync
function populateVendorDropdown() {
  const select = document.getElementById('rev-vendor-select');
  select.innerHTML = '<option value="" disabled selected>-- Select a Contractor --</option>';
  
  // Option to register a new contractor
  const addOpt = document.createElement('option');
  addOpt.value = 'new-vendor';
  addOpt.innerText = '➕ + Register a new contractor...';
  select.appendChild(addOpt);

  const vendors = getVendors();
  const sorted = [...vendors].sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.innerText = `${v.name} (${v.category} - ${v.service})`;
    select.appendChild(opt);
  });
}

function toggleNewVendorFields() {
  const select = document.getElementById('rev-vendor-select');
  const fields = document.getElementById('new-vendor-fields');
  const nameInput = document.getElementById('new-vendor-name');
  const phoneInput = document.getElementById('new-vendor-phone');
  const serviceInput = document.getElementById('new-vendor-service');

  if (select.value === 'new-vendor') {
    fields.classList.remove('hidden');
    nameInput.required = true;
    phoneInput.required = true;
    serviceInput.required = true;
  } else {
    fields.classList.add('hidden');
    nameInput.required = false;
    phoneInput.required = false;
    serviceInput.required = false;
  }
}

function handleSubmitReview(e) {
  e.preventDefault();
  
  let vendorId = document.getElementById('rev-vendor-select').value;
  const rating = parseInt(document.getElementById('rev-rating').value);

  if (!vendorId) {
    showToast('Please select a contractor.', true);
    return;
  }

  // Extract new review values
  const comment = document.getElementById('rev-comment').value.trim() || `Recommended this provider with a ${rating}-star rating.`;
  const cost = parseInt(document.getElementById('rev-cost').value) || 50;
  const punctual = document.getElementById('rev-punctual').checked;

  const vendors = getVendors();
  let isNew = false;
  let newName = '';
  let newCategory = '';
  let newService = '';
  let newPhone = '';
  let newEmail = '';

  // If registering a new contractor
  if (vendorId === 'new-vendor') {
    newName = document.getElementById('new-vendor-name').value.trim();
    newCategory = document.getElementById('new-vendor-category').value;
    newService = document.getElementById('new-vendor-service').value;
    newPhone = document.getElementById('new-vendor-phone').value.trim();
    const emailInput = document.getElementById('new-vendor-email').value.trim();
    newEmail = emailInput || `contact@${newName.toLowerCase().replace(/\s+/g, '')}.com`;

    if (!newName || !newCategory || !newService || !newPhone) {
      showToast('Please fill out all contractor details including service type.', true);
      return;
    }

    isNew = true;
    vendorId = 'v_' + Date.now();

    const newVendorObj = {
      id: vendorId,
      name: newName,
      category: newCategory,
      service: newService,
      phone: newPhone,
      email: newEmail,
      isPremium: false,
      hasLeadsPlan: false,
      rating: rating,
      reviewCount: 1,
      minJobCost: cost,
      offersSeniorDiscount: true,
      punctualityScore: punctual ? 100 : 0,
      timesUsed: 1,
      description: `Trusted provider for ${newService}.`
    };

    vendors.push(newVendorObj);
    saveVendors(vendors);
  }

  // Create review object in Local Storage for Details rendering
  const reviews = getReviews();
  const newReview = {
    id: 'r_' + Date.now(),
    vendorId,
    authorName: "Verified Resident",
    authorAddress: "Sun City Peachtree",
    authorResidentId: "PIN-Verified",
    date: new Date().toISOString().split('T')[0],
    rating,
    cost,
    punctual,
    honoredQuote: true,
    proofOfService: "N/A",
    aiProofText: "Recommendation verified via community PIN entry.",
    comment
  };
  reviews.push(newReview);
  saveReviews(reviews);

  // Recalculate vendor scores locally
  const freshVendors = getVendors();
  const vendorIndex = freshVendors.findIndex(v => v.id === vendorId);
  if (vendorIndex !== -1 && !isNew) {
    const v = freshVendors[vendorIndex];
    const vendorReviews = reviews.filter(r => r.vendorId === vendorId);
    
    // Average rating
    const avgRating = vendorReviews.reduce((sum, r) => sum + r.rating, 0) / vendorReviews.length;
    v.rating = Math.round(avgRating * 10) / 10;
    v.reviewCount = vendorReviews.length;

    // Recalculate punctualityScore
    const onTimeCount = vendorReviews.filter(r => r.punctual).length;
    v.punctualityScore = Math.round((onTimeCount / vendorReviews.length) * 100);

    // Recalculate minJobCost (minimum of all submitted costs)
    const costsList = vendorReviews.map(r => r.cost).filter(c => c !== undefined && c !== null);
    if (costsList.length > 0) {
      v.minJobCost = Math.min(...costsList);
    }
    
    saveVendors(freshVendors);
  }

  // Sync to Google Sheet Database in background
  const sessionPin = sessionStorage.getItem('helpfind_session_pin') || '';
  if (isNew) {
    const addUrl = `${GOOGLE_SHEETS_API_URL}?action=add_provider&id=${vendorId}&name=${encodeURIComponent(newName)}&category=${encodeURIComponent(newCategory)}&service=${encodeURIComponent(newService)}&phone=${encodeURIComponent(newPhone)}&email=${encodeURIComponent(newEmail)}&rating=${rating}&pin=${encodeURIComponent(sessionPin)}`;
    addToSyncQueue(addUrl);
  } else {
    const rateUrl = `${GOOGLE_SHEETS_API_URL}?action=rate&id=${vendorId}&rating=${rating}&pin=${encodeURIComponent(sessionPin)}`;
    addToSyncQueue(rateUrl);
  }

  // Clear form
  document.getElementById('form-add-review').reset();
  setStarRating(1); // Reset to 1 star
  
  // Reset new vendor fields state
  document.getElementById('new-vendor-fields').classList.add('hidden');
  document.getElementById('new-vendor-name').required = false;
  document.getElementById('new-vendor-phone').required = false;
  document.getElementById('new-vendor-service').required = false;
  document.getElementById('new-vendor-service').disabled = true;

  showToast('Your Review Rating for this Provider has been Successfully Entered');
  switchView('directory');
}

// Vendor Details Modal (Bottom-Sheet content injector)
function openVendorModal(vendorId) {
  const vendors = getVendors();
  const v = vendors.find(item => item.id === vendorId);
  if (!v) return;

  const reviews = getReviews().filter(r => r.vendorId === vendorId);
  const modal = document.getElementById('vendor-modal');
  const body = document.getElementById('modal-vendor-body');

  let reviewsHtml = '';
  if (reviews.length === 0) {
    reviewsHtml = '<p class="text-muted">No ratings yet for this provider.</p>';
  } else {
    reviews.forEach(r => {
      reviewsHtml += `
        <div class="review-card">
          <div class="review-meta">
            <span class="review-author">Verified Neighbor Recommendation</span>
            <span>Date: ${r.date}</span>
            <span class="review-rating">${'★'.repeat(r.rating)}</span>
          </div>
          <p class="review-comment" style="font-size:0.85rem; font-style:italic; margin-top:0.25rem;">"${r.comment}"</p>
        </div>
      `;
    });
  }

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem;">
      <div>
        <span class="vendor-category" style="font-size:0.7rem;">${v.category} &bull; ${v.service}</span>
        <h2 style="font-size:1.5rem; margin-top:0.25rem;">${v.name}</h2>
      </div>
      <div class="text-center" style="background:rgba(15,23,42,0.03); border:1px solid var(--border-color); padding:0.4rem 0.75rem; border-radius:10px;">
        <div style="font-size:1.5rem; font-weight:800; color:var(--warning);">${v.rating.toFixed(1)}</div>
        <div style="font-size:0.6rem; color:var(--text-muted); text-transform:uppercase;">${v.reviewCount} Ratings</div>
      </div>
    </div>

    <div style="margin-bottom:1rem;">
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem; line-height:1.4;">${v.description}</p>
      <h4 class="mb-2" style="font-size:0.9rem;">Contact Profile</h4>
      <p style="font-size:0.85rem; margin-bottom:0.25rem;">📞 Phone: <strong><a href="tel:${v.phone.replace(/[^\d-+]/g, '')}" style="color: var(--primary); text-decoration: underline;">${v.phone}</a></strong></p>
      <p style="font-size:0.85rem; margin-bottom:0.25rem;">✉️ Email: <strong>${v.email}</strong></p>
      <p style="font-size:0.85rem; margin-bottom:0.25rem;">💵 Min Job Value: <strong>$${v.minJobCost}</strong></p>
      <p style="font-size:0.85rem; margin-bottom:0.25rem;">🏷️ Senior Discount: <strong>${v.offersSeniorDiscount ? 'Yes' : 'No'}</strong></p>
      <p style="font-size:0.85rem; margin-bottom:0.25rem;">⏱️ Punctuality: <strong>${v.punctualityScore}% On-Time</strong></p>
      <p style="font-size:0.85rem; margin-bottom:0.25rem;">🟢 Times Used: <strong>${v.timesUsed || 0} Hires</strong></p>
    </div>

    <h3 class="reviews-section-title">Community Ratings History</h3>
    <div class="reviews-scroll-container" style="max-height:220px; overflow-y:auto; padding-right:0.25rem;">
      ${reviewsHtml}
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeVendorModal() {
  document.getElementById('vendor-modal').classList.add('hidden');
}

// Sync Status and Queue System
let isProcessingQueue = false;

function updateSyncStatus(status) {
  const el = document.getElementById('sync-status');
  if (!el) return;

  el.className = `sync-status-indicator ${status}`;
  
  if (status === 'synced') {
    el.title = 'Synced with Sheets';
  } else if (status === 'syncing') {
    el.title = 'Syncing updates...';
  } else if (status === 'offline') {
    el.title = 'Offline - updates queued';
  }
}

function addToSyncQueue(url) {
  const queue = JSON.parse(localStorage.getItem('helpfind_sync_queue') || '[]');
  queue.push(url);
  localStorage.setItem('helpfind_sync_queue', JSON.stringify(queue));
  console.log(`Added request to sync queue. Queue size: ${queue.length}`);
  processSyncQueue();
}

async function processSyncQueue() {
  if (isProcessingQueue) return;
  
  const queue = JSON.parse(localStorage.getItem('helpfind_sync_queue') || '[]');
  if (queue.length === 0) {
    updateSyncStatus('synced');
    return;
  }

  if (!navigator.onLine) {
    updateSyncStatus('offline');
    return;
  }

  isProcessingQueue = true;
  updateSyncStatus('syncing');
  console.log(`Processing sync queue containing ${queue.length} items...`);

  while (queue.length > 0) {
    const url = queue[0];
    try {
      // Perform background fetch
      await fetch(url, { mode: 'no-cors' });
      
      // Successfully processed, remove from queue
      queue.shift();
      localStorage.setItem('helpfind_sync_queue', JSON.stringify(queue));
      console.log('Successfully synced item from queue.');
    } catch (err) {
      console.error('Failed to sync item from queue, pausing:', err);
      updateSyncStatus('offline');
      isProcessingQueue = false;
      return;
    }
  }

  isProcessingQueue = false;
  updateSyncStatus('synced');
  console.log('Sync queue completely processed and empty.');

  // Sync latest providers list after processing queue
  syncProvidersFromServer();
}

// Dropdown Cascade Helpers
function handleCategoryFilterChange() {
  const categoryVal = document.getElementById('dir-category').value;
  const serviceSelect = document.getElementById('dir-service');
  
  // Clear existing options
  serviceSelect.innerHTML = '<option value="all">Service (All)</option>';
  
  if (categoryVal === 'all') {
    serviceSelect.value = 'all';
    serviceSelect.disabled = true;
  } else {
    serviceSelect.disabled = false;
    const catServices = getCategoryServices()[categoryVal] || [];
    catServices.forEach(srv => {
      const opt = document.createElement('option');
      opt.value = srv;
      opt.textContent = srv;
      serviceSelect.appendChild(opt);
    });
  }
  
  filterDirectory();
}

function handleNewVendorCategoryChange() {
  const categoryVal = document.getElementById('new-vendor-category').value;
  const serviceSelect = document.getElementById('new-vendor-service');
  
  // Clear existing options
  serviceSelect.innerHTML = '<option value="" disabled selected>-- Select Service --</option>';
  
  if (!categoryVal) {
    serviceSelect.disabled = true;
  } else {
    serviceSelect.disabled = false;
    const catServices = getCategoryServices()[categoryVal] || [];
    catServices.forEach(srv => {
      const opt = document.createElement('option');
      opt.value = srv;
      opt.textContent = srv;
      serviceSelect.appendChild(opt);
    });
  }
}

// === MANDATORY LEGAL CONSENT AND AUDIT FLOW ===

const TERMS_VERSION = '1.0';
let termsTextCache = '';

const FALLBACK_TERMS_TEXT = `
  <h3>HelpFind - Terms of Service</h3>
  <p><strong>Effective Date: July 4, 2026</strong></p>
  <p>Welcome to HelpFind, a hyper-local service provider directory built for the Sun City Peachtree retirement community. Please read these Terms of Service carefully before using our application.</p>

  <h3>1. Agreement to Terms</h3>
  <p>By accessing or using HelpFind, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, you may not use the application.</p>

  <h3>2. Private Community Directory</h3>
  <p>HelpFind is a private community tool. You must be a resident of Sun City Peachtree to use the directory. Sharing directory contents, contact details, or community PINs with non-residents or commercial entities is strictly prohibited.</p>

  <h3>3. Recommendations and Community Integrity</h3>
  <p>Any rating, review, or contractor recommendation you submit must represent your own honest, first-hand service experience. Submitting false, malicious, or commercial self-promotional reviews is prohibited. Form submissions are verified and protected via the community PIN gate.</p>

  <h3>4. Contractor Engagement & Disclaimers</h3>
  <p>HelpFind does not perform background checks, verify licenses, verify insurance, or guarantee the quality of any contractor listed. Residents are solely responsible for conducting their own due diligence before hiring any provider. HelpFind is not liable for disputes, property damage, financial loss, or personal injuries arising from transactions between residents and contractors.</p>

  <h3>5. Auditing & Consent Flow</h3>
  <p>To prevent spam, preserve community integrity, and ensure compliance, a device signature (UUID), agreement timestamp, and hashed IP address will be collected and logged to our secure backend ledger upon your consent. No direct personal identity information (such as name or email) is automatically linked to your device ID in this audit log.</p>

  <h3>6. Reaffirmation of Terms</h3>
  <p>Each time you submit a review or register a contractor, you reaffirm your agreement to these Terms of Service in their entirety.</p>
`;

// UUID Version 4 Generator
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Fetch Terms of Service dynamically from Google Sheets/Drive with fallback
async function fetchTermsOfService() {
  const container = document.getElementById('terms-text-container');
  const loading = document.getElementById('terms-loading-indicator');
  
  try {
    const response = await fetch(`${GOOGLE_SHEETS_API_URL}?action=get_terms`);
    if (!response.ok) throw new Error('Network error fetching terms');
    const data = await response.json();
    
    if (data.status === 'success' && data.terms) {
      // Split by double newlines, clean empty segments and map to paragraph / header tags
      const formattedTerms = data.terms
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => {
          if (p.startsWith('#') || p.startsWith('1.') || p.startsWith('2.') || p.startsWith('3.') || p.startsWith('4.') || p.startsWith('5.') || p.startsWith('6.')) {
            return `<h3>${p.replace(/^#+\s*/, '')}</h3>`;
          }
          return `<p>${p}</p>`;
        })
        .join('');
      
      termsTextCache = formattedTerms || FALLBACK_TERMS_TEXT;
    } else {
      console.warn('Apps Script returned error or empty terms, using fallback:', data.message);
      termsTextCache = FALLBACK_TERMS_TEXT;
    }
  } catch (err) {
    console.warn('Failed to load terms from backend, using fallback:', err);
    termsTextCache = FALLBACK_TERMS_TEXT;
  }
  
  // Render terms in overlay container
  container.innerHTML = termsTextCache;
  loading.classList.add('hidden');
  container.classList.remove('hidden');
}

// Verify Consent status in local storage and toggle modal overlay
function checkConsent() {
  const uuid = localStorage.getItem('helpfind_consent_uuid');
  const termsVersion = localStorage.getItem('helpfind_consent_terms_version');
  const modal = document.getElementById('consent-modal');
  
  if (!uuid || termsVersion !== TERMS_VERSION) {
    // Show consent modal in interactive mode
    document.getElementById('consent-checkbox-wrapper').classList.remove('hidden');
    document.getElementById('consent-checkbox').checked = false;
    
    const consentBtn = document.getElementById('consent-btn');
    consentBtn.classList.remove('hidden');
    consentBtn.disabled = true;
    consentBtn.textContent = 'Agree and Enter';
    
    const closeBtn = document.getElementById('consent-close-btn');
    if (closeBtn) closeBtn.classList.add('hidden');
    
    modal.classList.remove('hidden');
    
    // Fetch terms
    fetchTermsOfService();
  } else {
    modal.classList.add('hidden');
  }
}

// Toggle consent submit button
function toggleConsentButton() {
  const checkbox = document.getElementById('consent-checkbox');
  const btn = document.getElementById('consent-btn');
  btn.disabled = !checkbox.checked;
}

// Retrieve public IP and hash with SHA-256
async function getHashedIP() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout
    
    const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('IP service error');
    const data = await response.json();
    const ip = data.ip;
    
    // Hash IP address with SHA-256 using Crypto Web API
    const msgBuffer = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('Failed to retrieve or hash IP, using local fallback:', err);
    return "fallback_hashed_ip_" + Math.random().toString(36).substring(2, 10);
  }
}

// Handle consent submission action
async function acceptConsent() {
  const checkbox = document.getElementById('consent-checkbox');
  if (!checkbox.checked) return;

  const btn = document.getElementById('consent-btn');
  btn.disabled = true;
  btn.textContent = 'Registering Consent...';

  // Generate UUID & timestamp
  const uuid = generateUUID();
  const timestamp = new Date().toISOString();
  
  // Retrieve hashed IP address
  const hashedIP = await getHashedIP();

  // Save to localStorage
  localStorage.setItem('helpfind_consent_uuid', uuid);
  localStorage.setItem('helpfind_consent_timestamp', timestamp);
  localStorage.setItem('helpfind_consent_terms_version', TERMS_VERSION);

  // Sync to backend ledger
  const consentUrl = `${GOOGLE_SHEETS_API_URL}?action=consent&uuid=${uuid}&timestamp=${encodeURIComponent(timestamp)}&hashed_ip=${hashedIP}&terms_version=${encodeURIComponent(TERMS_VERSION)}`;
  addToSyncQueue(consentUrl);

  // Close overlay modal
  document.getElementById('consent-modal').classList.add('hidden');
  showToast('Consent registered. Welcome to HelpFind!');
}

// Trigger view-only Terms of Service from review submission component
function showTermsModalFromForm(e) {
  if (e) e.preventDefault();
  
  const modal = document.getElementById('consent-modal');
  const container = document.getElementById('terms-text-container');
  const loading = document.getElementById('terms-loading-indicator');
  
  // Hide interactive consent checkbox and buttons
  document.getElementById('consent-checkbox-wrapper').classList.add('hidden');
  document.getElementById('consent-btn').classList.add('hidden');
  
  // Create close button dynamically if missing
  let closeBtn = document.getElementById('consent-close-btn');
  if (!closeBtn) {
    closeBtn = document.createElement('button');
    closeBtn.id = 'consent-close-btn';
    closeBtn.className = 'close-sheet-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = closeTermsModal;
    modal.querySelector('.consent-content').appendChild(closeBtn);
  }
  closeBtn.classList.remove('hidden');
  
  modal.classList.remove('hidden');
  
  // Render terms
  if (termsTextCache) {
    container.innerHTML = termsTextCache;
    loading.classList.add('hidden');
    container.classList.remove('hidden');
  } else {
    fetchTermsOfService();
  }
}

function closeTermsModal() {
  document.getElementById('consent-modal').classList.add('hidden');
}

// Recalculate client-side scores (punctuality, cost, rating) using local reviews database
function recalculateAllVendorScores(vendors) {
  const reviews = getReviews() || [];
  vendors.forEach(v => {
    const vendorReviews = reviews.filter(r => r.vendorId === v.id);
    if (vendorReviews.length > 0) {
      // Average rating
      const avgRating = vendorReviews.reduce((sum, r) => sum + r.rating, 0) / vendorReviews.length;
      v.rating = Math.round(avgRating * 10) / 10;
      v.reviewCount = vendorReviews.length;
      
      // Punctuality Score
      const onTimeCount = vendorReviews.filter(r => r.punctual).length;
      v.punctualityScore = Math.round((onTimeCount / vendorReviews.length) * 100);
      
      // Min Job Cost
      const costsList = vendorReviews.map(r => r.cost).filter(c => c !== undefined && c !== null);
      if (costsList.length > 0) {
        v.minJobCost = Math.min(...costsList);
      }
    } else {
      v.punctualityScore = v.punctualityScore !== undefined ? v.punctualityScore : 100;
      v.minJobCost = v.minJobCost !== undefined ? v.minJobCost : 50;
    }
  });
  return vendors;
}

// Merge local vendors and server vendors to preserve unsynced local additions
function mergeVendors(localVendors, serverVendors) {
  const serverMap = new Map(serverVendors.map(v => [v.id, v]));
  const merged = [];
  
  // Add all server vendors, merging with local details if they exist
  serverVendors.forEach(sv => {
    const lv = localVendors.find(v => v.id === sv.id);
    if (lv) {
      merged.push({
        ...lv,
        ...sv
      });
    } else {
      merged.push(sv);
    }
  });
  
  // Add any local vendors that do not exist on the server yet (pending sync)
  localVendors.forEach(lv => {
    if (!serverMap.has(lv.id)) {
      merged.push(lv);
    }
  });
  
  return merged;
}

// Sync latest provider directory from Google Sheets
async function syncProvidersFromServer() {
  if (!navigator.onLine) return;
  
  try {
    const response = await fetch(`${GOOGLE_SHEETS_API_URL}?action=get_providers`);
    if (!response.ok) throw new Error("Sync network response was not ok");
    
    const data = await response.json();
    if (data.status === "success" && Array.isArray(data.providers)) {
      if (data.providers.length > 0) {
        // Get current local vendors before overwriting
        const localVendors = getVendors() || [];
        
        // Merge server list with local list to preserve unsynced additions
        const mergedList = mergeVendors(localVendors, data.providers);
        
        // Recalculate client-side fields using local reviews before saving
        const updatedProviders = recalculateAllVendorScores(mergedList);
        
        // Save fresh Google Sheets records merged with local review calculations
        localStorage.setItem("helpfind_vendors", JSON.stringify(updatedProviders));
        console.log(`Successfully synced ${updatedProviders.length} providers from Google Sheets.`);
        
        // Refresh UI dynamically if currently viewing the directory
        if (currentView === 'directory') {
          filterDirectory();
        }
      }
    } else {
      console.warn("Apps Script returned error or empty providers list:", data.message);
    }
  } catch (err) {
    console.warn("Could not sync providers from Google Sheets:", err);
  }
}
