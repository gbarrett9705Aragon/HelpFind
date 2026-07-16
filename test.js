// test.js - Automated integration test for HelpFind curation flow
(function() {
  if (!location.search.includes('run-tests=true')) return;

  window.onerror = function(message, source, lineno, colno, error) {
    logToRunner(`UNCAUGHT EXCEPTION: ${message} at ${source}:${lineno}:${colno}`, true);
  };

  // Mock navigator.onLine to test sync queue
  let mockOnline = false;
  try {
    Object.defineProperty(navigator, 'onLine', {
      get: () => mockOnline,
      configurable: true
    });
  } catch (e) {
    console.warn("Could not redefine navigator.onLine:", e);
  }

  const originalFetch = window.fetch;
  window.fetch = async function(url, options) {
    if (typeof url === 'string') {
      if (url.includes('api.ipify.org')) {
        return new Response(JSON.stringify({ ip: '192.168.1.1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.includes('action=get_terms')) {
        return new Response(JSON.stringify({ status: 'success', terms: 'HelpFind Terms\n\n1. Community Directory\n\nThis is a private directory.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.includes('action=refer_provider') || url.includes('action=report_issue') || url.includes('action=consent')) {
        return new Response(JSON.stringify({ status: 'success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return originalFetch(url, options);
  };
  
  function logToRunner(msg, isError = false) {
    console.log(msg);
    fetch('http://localhost:4500/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, isError })
    }).catch(() => {});
  }
  
  logToRunner("=== RUNNING HELPFIND INTEGRATION TESTS ===");
  
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function run() {
    try {
      // Clear and re-initialize database for a clean test run
      localStorage.clear();
      initDatabase();
      checkConsent();
      
      // A. Verify consent gate is shown
      const consentModal = document.getElementById('consent-modal');
      if (consentModal.classList.contains('hidden')) {
        throw new Error("Consent modal is not visible after database reset");
      }
      logToRunner("SUCCESS: Consent modal visibility verified.");

      // B. Verify "Agree and Enter" button is disabled initially
      const consentCheckbox = document.getElementById('consent-checkbox');
      const consentBtn = document.getElementById('consent-btn');
      if (!consentBtn.disabled) {
        throw new Error("Consent button is not disabled when checkbox is unchecked");
      }
      logToRunner("SUCCESS: Consent button disabled state verified.");

      // C. Toggle checkbox and verify button is enabled
      consentCheckbox.checked = true;
      toggleConsentButton();
      if (consentBtn.disabled) {
        throw new Error("Consent button remained disabled after checking checkbox");
      }
      logToRunner("SUCCESS: Consent button enabled state verified.");

      // D. Accept consent and verify modal closes and UUID is saved
      await acceptConsent();
      await wait(500);

      if (!consentModal.classList.contains('hidden')) {
        throw new Error("Consent modal did not close after agreement");
      }
      if (!localStorage.getItem('helpfind_consent_uuid')) {
        throw new Error("Consent UUID not saved in localStorage");
      }
      logToRunner("SUCCESS: Consent agreement registered and modal closed.");
      
      // 1. Initial State Check
      const viewDir = document.getElementById('view-directory');
      const viewRefer = document.getElementById('view-refer-provider');
      const viewReport = document.getElementById('view-report-issue');
      
      if (viewDir.classList.contains('hidden')) {
        throw new Error("Initial view is not directory");
      }
      if (!viewRefer.classList.contains('hidden')) {
        throw new Error("Refer provider view is visible initially");
      }
      if (!viewReport.classList.contains('hidden')) {
        throw new Error("Report issue view is visible initially");
      }
      
      logToRunner("SUCCESS: Initial view states verified.");
      
      // 2. Select 'Refer Provider' from dropdown
      const navDropdown = document.getElementById('nav-provider-dropdown');
      navDropdown.value = 'refer-provider';
      handleProviderDropdownChange();
      
      await wait(500);
      
      // 3. Verify it routed directly to Refer Provider form view
      if (viewRefer.classList.contains('hidden')) {
        throw new Error("Did not switch to Refer Provider view immediately");
      }
      logToRunner("SUCCESS: Routed directly to Refer Provider view.");
      
      // 4. Fill and submit Refer Provider form
      document.getElementById('refer-resident-name').value = "Gregory Barrett";
      document.getElementById('refer-resident-email').value = "greg@suncity.com";
      document.getElementById('refer-vendor-name').value = "Water Wise Irrigation";
      document.getElementById('refer-vendor-category').value = "Lawn, Landscaping & Outdoors";
      handleReferCategoryChange();
      
      // Select the first service type checkbox
      const srvCheckbox = document.querySelector('input[name="refer-vendor-services-checkbox"]');
      if (!srvCheckbox) {
        throw new Error("Service checkbox was not dynamically generated");
      }
      srvCheckbox.checked = true;
      
      document.getElementById('refer-vendor-phone').value = "(404) 555-9392";
      document.getElementById('refer-vendor-email').value = "waterwise@gmail.com";
      document.getElementById('refer-comment').value = "Fixed my backyard sprinkler system. Prompt and highly professional!";
      
      const referForm = document.getElementById('form-refer-provider');
      referForm.dispatchEvent(new Event('submit', { cancelable: true }));
      
      await wait(500);
      
      // 5. Verify redirection back to directory and sync queue update
      if (!viewRefer.classList.contains('hidden')) {
        throw new Error("Did not redirect back to directory after submitting referral");
      }
      
      let queue = JSON.parse(localStorage.getItem('helpfind_sync_queue') || '[]');
      let lastSyncItem = queue[queue.length - 1];
      if (!lastSyncItem || !lastSyncItem.includes('action=refer_provider')) {
        throw new Error("Referral action was not added to the background sync queue");
      }
      if (!lastSyncItem.includes('name=Water%20Wise%20Irrigation') || !lastSyncItem.includes('residentName=Gregory%20Barrett')) {
        throw new Error("Referral sync URL does not contain correct parameters");
      }
      logToRunner("SUCCESS: Refer Provider submission saved to sync queue and view redirected.");

      // 6. Select 'Report Issue' from dropdown
      navDropdown.value = 'report-issue';
      handleProviderDropdownChange();
      
      await wait(500);
      
      // 7. Verify report issue form populated options
      if (viewReport.classList.contains('hidden')) {
        throw new Error("Did not switch to Report Issue view immediately");
      }
      const vendorSelect = document.getElementById('report-vendor-select');
      if (vendorSelect.options.length <= 1) {
        throw new Error("Report provider select dropdown is empty or not populated");
      }
      logToRunner("SUCCESS: Report Issue view loaded with vendor dropdown list.");

      // 8. Fill and submit Report Issue form
      document.getElementById('report-resident-name').value = "Gregory Barrett";
      document.getElementById('report-resident-email').value = "greg@suncity.com";
      vendorSelect.value = "general"; // select general directory issue
      document.getElementById('report-type').value = "Incorrect contact info";
      document.getElementById('report-description').value = "Dave's Patient Tech Support changed phone number. Update needed.";
      
      const reportForm = document.getElementById('form-report-issue');
      reportForm.dispatchEvent(new Event('submit', { cancelable: true }));
      
      await wait(500);
      
      // 9. Verify redirection back to directory and sync queue update
      if (!viewReport.classList.contains('hidden')) {
        throw new Error("Did not redirect back to directory after submitting report");
      }
      
      queue = JSON.parse(localStorage.getItem('helpfind_sync_queue') || '[]');
      lastSyncItem = queue[queue.length - 1];
      if (!lastSyncItem || !lastSyncItem.includes('action=report_issue')) {
        throw new Error("Report issue action was not added to the background sync queue");
      }
      if (!lastSyncItem.includes('vendorId=general') || !lastSyncItem.includes('issueType=Incorrect%20contact%20info')) {
        throw new Error("Report issue sync URL does not contain correct parameters");
      }
      logToRunner("SUCCESS: Report Issue submission saved to sync queue and view redirected.");
      
      // 10. Verify sync processing occurs when going online
      mockOnline = true;
      await processSyncQueue();
      await wait(500);
      
      queue = JSON.parse(localStorage.getItem('helpfind_sync_queue') || '[]');
      if (queue.length !== 0) {
        throw new Error("Sync queue was not cleared after going online: " + JSON.stringify(queue));
      }
      logToRunner("SUCCESS: Sync queue successfully processed and cleared online.");

      // 11. Verify that rating stars and rating counts are hidden from provider cards
      const testCard = document.querySelector('.vendor-card');
      if (testCard) {
        const text = testCard.innerText;
        if (text.includes('★') || /\(\d+\)/.test(text) || text.includes('Rating')) {
          throw new Error("Rating stars, rating scores, or review counts are visible on provider card: " + text);
        }
      }
      logToRunner("SUCCESS: Star ratings verified hidden from directory card lists.");
      
      // 12. Verify that details modal hides rating info
      // Open modal
      openVendorModal('v1');
      await wait(200);
      const modalBody = document.getElementById('modal-vendor-body');
      if (modalBody.innerText.includes('Ratings') || modalBody.innerText.includes('Punctuality') || modalBody.innerText.includes('Community Ratings History')) {
        throw new Error("Ratings summary, punctuality score, or reviews history found in details modal: " + modalBody.innerHTML);
      }
      closeVendorModal();
      logToRunner("SUCCESS: Details modal verified free of public Yelp-style ratings and reviews.");

      logToRunner("[TEST_RESULT] ALL TESTS PASSED SUCCESSFULLY!");
    } catch (err) {
      logToRunner("[TEST_RESULT] TEST FAILED: " + err.message, true);
    }
  }
  
  window.addEventListener('load', () => {
    // Run after a short delay to ensure everything is initialized
    setTimeout(run, 1000);
  });
})();
