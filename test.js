// test.js - Automated integration test for HelpFind review flow
(function() {
  if (!location.search.includes('run-tests=true')) return;
  
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
      const viewAdd = document.getElementById('view-add-review');
      const pinModal = document.getElementById('pin-modal');
      
      if (viewDir.classList.contains('hidden')) {
        throw new Error("Initial view is not directory");
      }
      if (!viewAdd.classList.contains('hidden')) {
        throw new Error("Add review view is visible initially");
      }
      if (!pinModal.classList.contains('hidden')) {
        throw new Error("PIN modal is visible initially");
      }
      
      logToRunner("SUCCESS: Initial view states verified.");
      
      // 2. Select 'Leave Review' from dropdown
      const navDropdown = document.getElementById('nav-provider-dropdown');
      navDropdown.value = 'leave-review';
      handleProviderDropdownChange();
      
      await wait(500);
      
      // 3. Verify PIN modal is visible
      if (pinModal.classList.contains('hidden')) {
        throw new Error("PIN modal did not open after selecting Leave Review");
      }
      logToRunner("SUCCESS: PIN modal opened.");
      
      // 4. Enter incorrect PIN first to test failure
      const pinInput = document.getElementById('community-pin-input');
      pinInput.value = '9999';
      verifyCommunityPIN();
      
      await wait(1000);
      if (pinModal.classList.contains('hidden') || isPinVerified) {
        throw new Error("PIN modal closed or isPinVerified set to true with incorrect PIN");
      }
      logToRunner("SUCCESS: Incorrect PIN rejected.");
      
      // 5. Enter correct PIN
      pinInput.value = 'SCP2';
      verifyCommunityPIN();
      
      await wait(1000);
      
      // 6. Verify PIN modal is closed, and view has switched to add-review
      if (!pinModal.classList.contains('hidden')) {
        throw new Error("PIN modal did not close after correct PIN");
      }
      if (viewAdd.classList.contains('hidden')) {
        throw new Error("View did not switch to Add Review after PIN verification");
      }
      logToRunner("SUCCESS: PIN verified and view switched to Add Review.");
      
      // 7. Verify select contractor dropdown is populated
      const vendorSelect = document.getElementById('rev-vendor-select');
      if (vendorSelect.options.length <= 2) {
        throw new Error("Vendor select dropdown not populated");
      }
      logToRunner(`SUCCESS: Vendor dropdown populated with ${vendorSelect.options.length} options.`);
      
      // 8. Select first contractor, fill out new fields, and rate 4 stars
      vendorSelect.value = 'v1'; // Dave's Patient Tech Support
      setStarRating(4);
      document.getElementById('rev-comment').value = "Great tech helper! Dave resolved my router issues.";
      document.getElementById('rev-cost').value = "150";
      document.getElementById('rev-punctual').checked = true;
      
      // Submit the review
      const form = document.getElementById('form-add-review');
      const submitEvent = new Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);
      
      await wait(500);
      
      // 9. Verify redirection back to directory and rating update
      if (!viewAdd.classList.contains('hidden')) {
        throw new Error("Did not redirect back to directory after review submission");
      }
      logToRunner("SUCCESS: Redirected back to directory after submission.");
      
      // Check if new review was added to localStorage
      const reviews = JSON.parse(localStorage.getItem('helpfind_reviews') || '[]');
      const lastReview = reviews[reviews.length - 1];
      if (!lastReview || lastReview.vendorId !== 'v1' || lastReview.rating !== 4) {
        throw new Error("New review not saved to localStorage correctly");
      }
      if (lastReview.comment !== "Great tech helper! Dave resolved my router issues." || lastReview.cost !== 150 || !lastReview.punctual) {
        throw new Error("New review details (comment, cost, punctual) not saved correctly");
      }
      logToRunner("SUCCESS: New review details saved to localStorage successfully.");

      // Check if vendor scores recalculated correctly
      const vendorsBeforeReg = JSON.parse(localStorage.getItem('helpfind_vendors') || '[]');
      const v1Vendor = vendorsBeforeReg.find(v => v.id === 'v1');
      if (v1Vendor.rating !== 4.5 || v1Vendor.reviewCount !== 2 || v1Vendor.punctualityScore !== 100 || v1Vendor.minJobCost !== 50) {
        throw new Error(`v1 vendor scores not recalculated correctly: rating=${v1Vendor.rating}, reviewCount=${v1Vendor.reviewCount}, punctualityScore=${v1Vendor.punctualityScore}, minJobCost=${v1Vendor.minJobCost}`);
      }
      logToRunner("SUCCESS: Existing vendor scores recalculated correctly (rating, punctuality, minJobCost).");
      
      // 10. Test "Add New" (registering a new contractor)
      navDropdown.value = 'add-new';
      handleProviderDropdownChange();
      
      await wait(500);
      
      if (viewAdd.classList.contains('hidden')) {
        throw new Error("Did not switch to Add Review after selecting Add New");
      }
      
      const newFields = document.getElementById('new-vendor-fields');
      if (newFields.classList.contains('hidden')) {
        throw new Error("New contractor details block is hidden in Add New mode");
      }
      
      document.getElementById('new-vendor-name').value = "Grady";
      document.getElementById('new-vendor-category').value = "General Maintenance";
      handleNewVendorCategoryChange();
      document.getElementById('new-vendor-service').value = "Handymen";
      document.getElementById('new-vendor-phone').value = "(555) 777-8888";
      document.getElementById('new-vendor-email').value = "grady@suncity.com";
      document.getElementById('rev-comment').value = "Grady did an excellent job setting up my smart TV.";
      document.getElementById('rev-cost').value = "50";
      document.getElementById('rev-punctual').checked = false; // test false punctuality
      setStarRating(5);
      
      // Submit the form
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      
      await wait(500);
      
      // Verify redirection and new provider data
      if (!viewAdd.classList.contains('hidden')) {
        throw new Error("Did not redirect back to directory after new vendor submission");
      }
      
      const vendors = JSON.parse(localStorage.getItem('helpfind_vendors') || '[]');
      const addedVendor = [...vendors].reverse().find(v => v.name === "Grady");
      if (!addedVendor) {
        throw new Error("New vendor 'Grady' was not saved to localStorage");
      }

      if (addedVendor.timesUsed !== 1) {
        throw new Error(`New vendor 'timesUsed' is ${addedVendor.timesUsed}, expected 1`);
      }
      if (addedVendor.email !== "grady@suncity.com") {
        throw new Error(`New vendor 'email' is ${addedVendor.email}, expected grady@suncity.com`);
      }
      if (addedVendor.minJobCost !== 50) {
        throw new Error(`New vendor 'minJobCost' is ${addedVendor.minJobCost}, expected 50`);
      }
      if (addedVendor.punctualityScore !== 0) {
        throw new Error(`New vendor 'punctualityScore' is ${addedVendor.punctualityScore}, expected 0`);
      }
      if (addedVendor.category !== "General Maintenance") {
        throw new Error(`New vendor 'category' is ${addedVendor.category}, expected General Maintenance`);
      }
      if (addedVendor.service !== "Handymen") {
        throw new Error(`New vendor 'service' is ${addedVendor.service}, expected Handymen`);
      }
      logToRunner("SUCCESS: New contractor 'Grady' successfully registered with initial timesUsed = 1, actual email, and correct score initialization.");
      
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
