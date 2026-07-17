// app.js - State Controller and Interaction Logic for HelpFind Sun City Peachtree

// Google Sheets API Web App URL (Connects to HelpFindHomes.gsheet via Apps Script Web App)
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbzcknWnyO5imXP3rL-Mek72UzfM7ton3oq4r1LiAWaLDFOtmYQIphmtBbpQncAwqF_J/exec";

// Global State
let actionPending = null;
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
  
  // Set up form submission handlers
  const referForm = document.getElementById('form-refer-provider');
  if (referForm) {
    referForm.addEventListener('submit', handleSubmitReferral);
  }
  const reportForm = document.getElementById('form-report-issue');
  if (reportForm) {
    reportForm.addEventListener('submit', handleSubmitIssue);
  }

  // Auto-format phone input dynamically as user types digits
  const phoneInput = document.getElementById('refer-vendor-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', handlePhoneInput);
  }

  // Set up network listeners for sync status
  window.addEventListener('online', () => {
    processSyncQueue();
    syncProvidersFromServer();
    syncReviewsFromServer();
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



  // Sync contractor list and reviews from Google Sheet in background
  syncProvidersFromServer();
  syncReviewsFromServer();
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

  // Hide all views dynamically
  document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));

  // Show active view
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.remove('hidden');

  // Post-view-switch actions
  if (viewName === 'directory') {
    filterDirectory();
  } else if (viewName === 'report-issue') {
    populateReportVendorDropdown();
  }
}

// Provider Dropdown Router
function handleProviderDropdownChange() {
  const selectNav = document.getElementById('nav-provider-dropdown');
  const val = selectNav.value;
  
  if (val === 'choose') return;
  
  if (val === 'report-issue') {
    switchView('report-issue');
    // Clear form
    document.getElementById('form-report-issue').reset();
    populateReportVendorDropdown();
  } else if (val === 'refer-provider') {
    switchView('refer-provider');
    // Clear form
    document.getElementById('form-refer-provider').reset();
    document.getElementById('refer-vendor-services-container').innerHTML = '<p class="text-muted" style="font-size: 0.8rem; margin: 0; padding: 0.25rem;">Please select a category first.</p>';
  }
  
  // Reset select menu back to "Referral" title
  selectNav.value = 'choose';
}

function cancelReferral() {
  switchView('directory');
}

function cancelReport() {
  switchView('directory');
}

function populateReportVendorDropdown() {
  const select = document.getElementById('report-vendor-select');
  if (!select) return;
  
  select.innerHTML = '<option value="" disabled selected>-- Select Contractor --</option>';
  
  // Add option for general issue
  const generalOption = document.createElement('option');
  generalOption.value = 'general';
  generalOption.textContent = '⚠️ General Directory Issue (Not specific to a provider)';
  select.appendChild(generalOption);
  
  const vendors = getVendors();
  const sortedVendors = [...vendors].sort((a, b) => a.name.localeCompare(b.name));
  
  sortedVendors.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.name} (${v.category})`;
    select.appendChild(opt);
  });
}

function handleReferCategoryChange() {
  const categoryVal = document.getElementById('refer-vendor-category').value;
  const container = document.getElementById('refer-vendor-services-container');
  
  container.innerHTML = '';
  
  if (!categoryVal) {
    container.innerHTML = '<p class="text-muted" style="font-size: 0.8rem; margin: 0; padding: 0.25rem;">Please select a category first.</p>';
  } else {
    const catServices = getCategoryServices()[categoryVal] || [];
    catServices.forEach(srv => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '0.5rem';
      label.style.fontSize = '0.85rem';
      label.style.cursor = 'pointer';
      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = 'refer-vendor-services-checkbox';
      cb.value = srv;
      cb.style.width = 'auto';
      cb.style.cursor = 'pointer';
      
      label.appendChild(cb);
      label.appendChild(document.createTextNode(srv));
      container.appendChild(label);
    });
  }
}

function handleSubmitReferral(e) {
  e.preventDefault();
  
  const residentName = document.getElementById('refer-resident-name').value.trim();
  const residentEmail = document.getElementById('refer-resident-email').value.trim();
  const name = document.getElementById('refer-vendor-name').value.trim();
  const category = document.getElementById('refer-vendor-category').value;
  const phone = document.getElementById('refer-vendor-phone').value.trim();
  const email = document.getElementById('refer-vendor-email').value.trim();
  const comment = document.getElementById('refer-comment').value.trim();
  
  // Gather service checkboxes
  const checkboxes = document.querySelectorAll('input[name="refer-vendor-services-checkbox"]:checked');
  const services = Array.from(checkboxes).map(cb => cb.value).join(', ');
  
  if (!services) {
    showToast('Please select at least one service type.', true);
    return;
  }
  
  const referralId = 'ref_' + Date.now();
  
  // Construct sync URL
  const referUrl = `${GOOGLE_SHEETS_API_URL}?action=refer_provider&id=${referralId}&residentName=${encodeURIComponent(residentName)}&residentEmail=${encodeURIComponent(residentEmail)}&name=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}&service=${encodeURIComponent(services)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}&comment=${encodeURIComponent(comment)}`;
  
  // Add to background sync queue
  addToSyncQueue(referUrl);
  
  // Reset form
  document.getElementById('form-refer-provider').reset();
  document.getElementById('refer-vendor-services-container').innerHTML = '<p class="text-muted" style="font-size: 0.8rem; margin: 0; padding: 0.25rem;">Please select a category first.</p>';
  
  showToast('Thank you! Your provider referral has been submitted privately for vetting.');
  switchView('directory');
}

function handleSubmitIssue(e) {
  e.preventDefault();
  
  const residentName = document.getElementById('report-resident-name').value.trim();
  const residentEmail = document.getElementById('report-resident-email').value.trim();
  const vendorId = document.getElementById('report-vendor-select').value;
  const issueType = document.getElementById('report-type').value;
  const description = document.getElementById('report-description').value.trim();
  
  if (!vendorId) {
    showToast('Please select a contractor.', true);
    return;
  }
  
  // Find vendor name
  let vendorName = 'General Directory Issue';
  if (vendorId !== 'general') {
    const vendors = getVendors();
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      vendorName = vendor.name;
    }
  }
  
  const reportId = 'rep_' + Date.now();
  
  // Construct sync URL
  const reportUrl = `${GOOGLE_SHEETS_API_URL}?action=report_issue&id=${reportId}&residentName=${encodeURIComponent(residentName)}&residentEmail=${encodeURIComponent(residentEmail)}&vendorId=${encodeURIComponent(vendorId)}&vendorName=${encodeURIComponent(vendorName)}&issueType=${encodeURIComponent(issueType)}&description=${encodeURIComponent(description)}`;
  
  // Add to background sync queue
  addToSyncQueue(reportUrl);
  
  // Reset form
  document.getElementById('form-report-issue').reset();
  
  showToast('Your issue report has been submitted privately. The admin will look into it.');
  switchView('directory');
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
      <div class="home-illustration-container" style="text-align: center; margin-top: 1.5rem; padding: 0.5rem; display: flex; justify-content: center; align-items: center;">
        <img src="assets/home-illustration.png" alt="HelpFind Neighborhood" style="width: 100%; max-width: 320px; height: auto; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid var(--border-color);">
      </div>
    `;
    return;
  }

  const vendors = getVendors();
  const filtered = vendors.filter(v => {
    const vendorServices = v.service ? v.service.split(',').map(s => s.trim()) : [];
    const vendorCategories = getCategoriesForServices(v.service);

    // Search Query
    const nameStr = v.name || '';
    const catStr = v.category || '';
    const srvStr = v.service || '';
    const descStr = v.description || '';
    const storyStr = v.serviceStories || '';

    const matchesSearch = nameStr.toLowerCase().includes(searchVal) ||
                          catStr.toLowerCase().includes(searchVal) ||
                          srvStr.toLowerCase().includes(searchVal) ||
                          descStr.toLowerCase().includes(searchVal) ||
                          storyStr.toLowerCase().includes(searchVal);
    
    // Category Dropdown
    const matchesCategory = categoryVal === 'all' || 
                            v.category === categoryVal || 
                            v.category.includes(categoryVal) ||
                            vendorCategories.includes(categoryVal);

    // Service (Subcategory) Dropdown
    const matchesService = serviceVal === 'all' || vendorServices.includes(serviceVal);
    
    // Senior Discount Pill
    const matchesDiscount = !activeFilters.discount || v.offersSeniorDiscount;
    
    // Under $100 Pill
    const matchesUnder100 = !activeFilters.under100 || v.minJobCost <= 100;
    
    // Always On-Time Pill
    const matchesPunctual = !activeFilters.punctual || v.punctualityScore === 100;

    return matchesSearch && matchesCategory && matchesService && matchesDiscount && matchesUnder100 && matchesPunctual;
  });

  // Sort: alphabetically by provider name (A-Z)
  filtered.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  renderVendorsList(filtered);
}

function getCategoryClass(category) {
  if (!category) return 'cat-other';
  const cat = category.toLowerCase();
  if (cat.includes('repair') || cat.includes('trade')) return 'cat-repairs';
  if (cat.includes('lawn') || cat.includes('landscap') || cat.includes('outdoor')) return 'cat-lawn';
  if (cat.includes('lifestyle') || cat.includes('caregiving')) return 'cat-lifestyle';
  if (cat.includes('tech') || cat.includes('electron')) return 'cat-tech';
  if (cat.includes('auto') || cat.includes('golf')) return 'cat-automotive';
  if (cat.includes('renovat') || cat.includes('design')) return 'cat-renovation';
  return 'cat-other';
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
    const displayCategory = v.category && !v.category.includes(',') ? v.category : (getCategoriesForServices(v.service)[0] || v.category);
    card.className = `vendor-card ${getCategoryClass(displayCategory)}`;

    const vendorServices = v.service ? v.service.split(',').map(s => s.trim()) : [];
    const serviceBadges = vendorServices.map(s => `<span class="service-badge" style="background: rgba(15, 23, 42, 0.04); border: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.8rem; padding: 0.15rem 0.4rem; border-radius: 6px; font-weight: 500;">${s}</span>`).join(' ');

    card.innerHTML = `
      <div class="vendor-header">
        <div class="vendor-meta">
          <span class="vendor-category ${getCategoryClass(displayCategory)}">${displayCategory}</span>
        </div>
        <h3 class="vendor-name" style="margin-top: 0.25rem; margin-bottom: 0.25rem;">${v.name}</h3>
        <div class="vendor-services-list" style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.35rem; margin-bottom: 0.5rem;">
          ${serviceBadges}
        </div>
        <div class="card-metric-badge">🟢 Called ${v.timesUsed || 0} times by neighbors</div>
      </div>
      
      <div class="vendor-footer">
        <button class="btn btn-secondary view-details-btn" onclick="openVendorModal('${v.id}')">
          Details
        </button>
        <button class="btn btn-use-service" onclick="incrementTimesUsed(event, '${v.id}')">
          📞 Call Now
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

// Auto-formats raw digits input into standard US phone format: (XXX) XXX-XXXX
function handlePhoneInput(e) {
  const input = e.target;
  let clean = input.value.replace(/\D/g, '');
  if (clean.length > 10) {
    clean = clean.substring(0, 10);
  }
  
  let formatted = '';
  if (clean.length > 0) {
    if (clean.length <= 3) {
      formatted = '(' + clean;
    } else if (clean.length <= 6) {
      formatted = '(' + clean.substring(0, 3) + ') ' + clean.substring(3);
    } else {
      formatted = '(' + clean.substring(0, 3) + ') ' + clean.substring(3, 6) + '-' + clean.substring(6);
    }
  }
  input.value = formatted;
}

// Vendor Details Modal (Bottom-Sheet content injector)
function openVendorModal(vendorId) {
  const vendors = getVendors();
  const v = vendors.find(item => item.id === vendorId);
  if (!v) return;

  const modal = document.getElementById('vendor-modal');
  const body = document.getElementById('modal-vendor-body');

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem;">
      <div>
        <span class="vendor-category ${getCategoryClass(v.category)}" style="font-size:0.85rem; font-weight:700;">${v.category} &bull; ${v.service}</span>
        <h2 style="font-size:1.5rem; margin-top:0.25rem;">${v.name}</h2>
      </div>
    </div>

    <div style="margin-bottom:1rem;">
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem; line-height:1.4;">${v.serviceStories || v.description}</p>
      <h4 class="mb-2" style="font-size:0.9rem;">Contact Profile</h4>
      <p style="font-size:0.85rem; margin-bottom:0.25rem;">📞 Phone: <strong><a href="tel:${v.phone.replace(/[^\d-+]/g, '')}" style="color: var(--primary); text-decoration: underline;">${v.phone}</a></strong></p>
      <p style="font-size:0.85rem; margin-bottom:0.25rem;">✉️ Email: <strong>${v.email}</strong></p>
      <p style="font-size:0.85rem; margin-bottom:0.25rem;">🟢 Times Called: <strong>${v.timesUsed || 0} Calls</strong></p>
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
      
      // Parse the ID of the synced vendor
      try {
        const urlObj = new URL(url);
        const action = urlObj.searchParams.get('action');
        const syncedId = urlObj.searchParams.get('id');
        
        if (action === 'add_provider' && syncedId) {
          const vendors = JSON.parse(localStorage.getItem('helpfind_vendors') || '[]');
          const vIdx = vendors.findIndex(v => v.id === syncedId);
          if (vIdx !== -1) {
            vendors[vIdx].synced = true;
            localStorage.setItem('helpfind_vendors', JSON.stringify(vendors));
          }
        }
      } catch (urlErr) {
        console.warn("Failed to parse sync queue URL:", urlErr);
      }
      
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
 
  // Sync latest providers and reviews list after processing queue
  syncProvidersFromServer();
  syncReviewsFromServer();
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
  const container = document.getElementById('new-vendor-services-container');
  
  container.innerHTML = '';
  
  if (!categoryVal) {
    container.innerHTML = '<p class="text-muted" style="font-size: 0.8rem; margin: 0; padding: 0.25rem;">Please select a category first.</p>';
  } else {
    const catServices = getCategoryServices()[categoryVal] || [];
    catServices.forEach(srv => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '0.5rem';
      label.style.fontSize = '0.85rem';
      label.style.cursor = 'pointer';
      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = 'new-vendor-services-checkbox';
      cb.value = srv;
      cb.style.width = 'auto';
      cb.style.cursor = 'pointer';
      
      label.appendChild(cb);
      label.appendChild(document.createTextNode(srv));
      container.appendChild(label);
    });
  }
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
        ...sv,
        synced: true // Confirmed on server
      });
    } else {
      merged.push({
        ...sv,
        synced: true // Confirmed on server
      });
    }
  });
  
  // Add any local vendors that do not exist on the server yet (pending sync)
  localVendors.forEach(lv => {
    if (!serverMap.has(lv.id)) {
      // Keep it ONLY if it has never been synced to the server (e.g. freshly created local draft)
      // If it has synced: true but is missing on the server, it was deleted by an admin
      if (lv.synced !== true) {
        merged.push(lv);
      }
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

// Merge local reviews and server reviews to preserve unsynced local additions and handle deletions
function mergeReviews(localReviews, serverReviews) {
  const serverMap = new Map(serverReviews.map(r => [r.id, r]));
  const merged = [];
  
  // Add all server reviews, setting synced = true
  serverReviews.forEach(sr => {
    const lr = localReviews.find(r => r.id === sr.id);
    if (lr) {
      merged.push({
        ...lr,
        ...sr,
        synced: true
      });
    } else {
      merged.push({
        ...sr,
        synced: true
      });
    }
  });
  
  // Add local reviews not yet on server
  localReviews.forEach(lr => {
    if (!serverMap.has(lr.id)) {
      if (lr.synced !== true) {
        merged.push(lr);
      }
    }
  });
  
  return merged;
}

// Sync latest reviews from Google Sheets
async function syncReviewsFromServer() {
  if (!navigator.onLine) return;
  
  try {
    const response = await fetch(`${GOOGLE_SHEETS_API_URL}?action=get_reviews`);
    if (!response.ok) throw new Error("Sync reviews response was not ok");
    
    const data = await response.json();
    if (data.status === "success" && Array.isArray(data.reviews)) {
      if (data.reviews.length > 0) {
        const localReviews = getReviews() || [];
        
        // Merge server reviews with local reviews to preserve unsynced additions
        const mergedList = mergeReviews(localReviews, data.reviews);
        
        // Save to localStorage
        localStorage.setItem("helpfind_reviews", JSON.stringify(mergedList));
        console.log(`Successfully synced ${mergedList.length} reviews from Google Sheets.`);
      }
    }
  } catch (err) {
    console.warn("Could not sync reviews from Google Sheets:", err);
  }
}
