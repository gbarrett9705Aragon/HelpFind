// test_provider_portal.js - Automated integration test for ProviderPortal flow
(function() {
  if (!location.search.includes('run-tests=true')) return;
  
  function logToRunner(msg, isError = false) {
    console.log(msg);
    // Simple UI test logger
    const logDiv = document.getElementById('test-logger') || document.createElement('div');
    if (!logDiv.id) {
      logDiv.id = 'test-logger';
      logDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.85); color: #fff; padding: 15px; border-radius: 8px; z-index: 10000; font-family: monospace; font-size: 11px; max-width: 320px; max-height: 200px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.2); pointer-events: none;';
      document.body.appendChild(logDiv);
    }
    const line = document.createElement('div');
    line.style.color = isError ? '#ef4444' : '#10b981';
    line.textContent = (isError ? '❌ ' : '✅ ') + msg;
    logDiv.appendChild(line);
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  
  logToRunner("=== RUNNING PROVIDERPORTAL INTEGRATION TESTS ===");
  
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function run() {
    try {
      // 1. Initial State Check
      const loginScreen = document.getElementById('screen-login');
      const dashboardScreen = document.getElementById('screen-dashboard');
      
      if (loginScreen.classList.contains('hidden')) {
        throw new Error("Login screen is hidden initially");
      }
      if (!dashboardScreen.classList.contains('hidden')) {
        throw new Error("Dashboard screen is visible initially");
      }
      logToRunner("SUCCESS: Initial login screen visibility verified.");

      // Setup interceptors for offline/mock test execution
      const originalFetch = window.fetch;
      window.fetch = async function(url, options) {
        if (url.includes('action=login_provider')) {
          logToRunner("Intercepted login_provider fetch for testing...");
          return new Response(JSON.stringify({
            status: "success",
            provider: {
              id: "v23",
              name: "Transevesa of Georgia, LLC",
              category: "General Maintenance",
              service: "Electricians",
              phone: "404-668-4065",
              email: "transevesa@gmail.com",
              rating: 5.0,
              reviewCount: 1,
              timesUsed: 12,
              serviceStories: "We offer professional electrician services including panel upgrades and outdoor floodlights.",
              password: "mypassword"
            },
            reviews: [
              {
                id: "r2",
                vendorId: "v23",
                authorName: "Harold Vance",
                authorAddress: "218 Peachtree Drive",
                authorResidentId: "OAK-2026",
                date: "2026-05-30",
                rating: 5,
                cost: 150,
                punctual: true,
                comment: "Mario installed our outdoor floodlights, very professional work."
              }
            ]
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (url.includes('action=get_provider_by_email_demo')) {
          logToRunner("Intercepted get_provider_by_email_demo fetch for testing...");
          return new Response(JSON.stringify({
            status: "success",
            provider: {
              id: "v23",
              name: "Transevesa of Georgia, LLC",
              category: "General Maintenance",
              service: "Electricians",
              phone: "404-668-4065",
              email: "transevesa@gmail.com",
              rating: 5.0,
              reviewCount: 1,
              timesUsed: 12,
              serviceStories: "We offer professional electrician services including panel upgrades and outdoor floodlights.",
              password: "mypassword"
            },
            reviews: [
              {
                id: "r2",
                vendorId: "v23",
                authorName: "Harold Vance",
                authorAddress: "218 Peachtree Drive",
                authorResidentId: "OAK-2026",
                date: "2026-05-30",
                rating: 5,
                cost: 150,
                punctual: true,
                comment: "Mario installed our outdoor floodlights, very professional work."
              }
            ]
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (url.includes('action=change_password')) {
          logToRunner("Intercepted change_password fetch for testing...");
          return new Response(JSON.stringify({
            status: "success",
            message: "Password updated successfully"
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (url.includes('action=update_service_story')) {
          logToRunner("Intercepted update_service_story fetch for testing...");
          return new Response(JSON.stringify({
            status: "success",
            story: "Polished and saved service story description text.",
            polished: true
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return originalFetch(url, options);
      };

      // 2. Test Demo Panel Toggle
      const trigger = document.getElementById('trigger-demo-panel');
      const panel = document.getElementById('demo-auth-panel');
      
      trigger.click();
      await wait(300);
      if (!panel.classList.contains('open')) {
        throw new Error("Demo credentials panel did not open on trigger click");
      }
      logToRunner("SUCCESS: Demo credentials panel toggle verified.");

      // 3. Test Form Login
      const usernameInput = document.getElementById('login-username');
      const passwordInput = document.getElementById('login-password');
      const loginForm = document.getElementById('form-login');
      
      usernameInput.value = "transevesa@gmail.com";
      passwordInput.value = "mypassword";
      
      loginForm.dispatchEvent(new Event('submit'));
      
      let elapsed = 0;
      while (dashboardScreen.classList.contains('hidden') && elapsed < 3000) {
        await wait(100);
        elapsed += 100;
      }
      
      if (dashboardScreen.classList.contains('hidden')) {
        throw new Error("Dashboard screen did not load after form login");
      }
      logToRunner("SUCCESS: Form login successfully loaded provider dashboard.");

      // 4. Verify Dashboard fields are populated correctly
      const name = document.getElementById('profile-name').textContent;
      const email = document.getElementById('profile-email').textContent;
      const clicks = document.getElementById('metric-times-used').textContent;
      const rating = document.getElementById('metric-rating').textContent;
      const reviews = document.getElementById('metric-reviews-count').textContent;
      const textarea = document.getElementById('story-textarea').value;

      if (name !== "Transevesa of Georgia, LLC") throw new Error("Incorrect provider name displayed");
      if (email !== "transevesa@gmail.com") throw new Error("Incorrect provider email displayed");
      if (clicks !== "12") throw new Error("Incorrect 'I'll Use' count displayed");
      if (rating !== "5.0") throw new Error("Incorrect rating score displayed");
      if (reviews !== "1") throw new Error("Incorrect reviews count displayed");
      if (!textarea.includes("professional electrician services")) throw new Error("Incorrect service story displayed");
      
      logToRunner("SUCCESS: Dashboard analytics and profile fields verified.");

      // 5. Test Change Password Flow
      const currentPasswordInput = document.getElementById('chg-current-password');
      const newPasswordInput = document.getElementById('chg-new-password');
      const confirmPasswordInput = document.getElementById('chg-confirm-password');
      const chgForm = document.getElementById('form-change-password');
      
      currentPasswordInput.value = "mypassword";
      newPasswordInput.value = "newpassword123";
      confirmPasswordInput.value = "newpassword123";
      
      chgForm.dispatchEvent(new Event('submit'));
      await wait(300);
      
      if (currentPasswordInput.value !== '' || newPasswordInput.value !== '' || confirmPasswordInput.value !== '') {
        throw new Error("Change password inputs were not cleared on success");
      }
      logToRunner("SUCCESS: Change password API submit and input clear verified.");

      // 6. Test Voice Button Visual State
      const micBtn = document.getElementById('btn-mic');
      const statusText = document.getElementById('recording-status-text');
      
      micBtn.click();
      await wait(300);
      
      const recordingActive = micBtn.classList.contains('recording') || statusText.textContent.includes("Dictating") || statusText.textContent.includes("unsupported");
      if (!recordingActive) {
        throw new Error("Voice dictation mic button did not activate properly");
      }
      logToRunner("SUCCESS: Voice dictation mic click handled safely.");
      
      micBtn.click();
      await wait(300);
      
      // 7. Test Polish & Save Story Flow
      const polishBtn = document.getElementById('btn-polish-story');
      const saveBtn = document.getElementById('btn-save-story');
      
      if (polishBtn.disabled || saveBtn.disabled) {
        throw new Error("Polish or Save button is disabled with text in textarea");
      }
      
      polishBtn.click();
      let elapsedPolish = 0;
      while (document.getElementById('loading-mask').classList.contains('hidden') && elapsedPolish < 1000) {
        await wait(50);
        elapsedPolish += 50;
      }
      while (!document.getElementById('loading-mask').classList.contains('hidden')) {
        await wait(50);
      }
      
      if (!document.getElementById('story-textarea').value.includes("Polished and saved")) {
        throw new Error("Story transcript polishing response did not update textarea");
      }
      logToRunner("SUCCESS: Service story polishing and textarea update verified.");

      // Restore fetch
      window.fetch = originalFetch;
      logToRunner("=== ALL PORTAL TESTS COMPLETED SUCCESSFULLY ===");
    } catch (err) {
      logToRunner("TEST FAILED: " + err.message, true);
    }
  }
  
  window.addEventListener('load', () => {
    setTimeout(run, 1500);
  });
})();
