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

      // 2. Test Demo Panel Toggle
      const trigger = document.getElementById('trigger-demo-panel');
      const panel = document.getElementById('demo-auth-panel');
      
      trigger.click();
      await wait(300);
      if (!panel.classList.contains('open')) {
        throw new Error("Demo credentials panel did not open on trigger click");
      }
      logToRunner("SUCCESS: Demo credentials panel toggle verified.");

      // 3. Test Demo Account Selection & Mock Login
      const select = document.getElementById('demo-email-select');
      const loginBtn = document.getElementById('btn-demo-login');
      
      select.value = "transevesa@gmail.com";
      
      // Since Google Apps Script Web App might take time or fail to load in raw offline test environments,
      // we mock the fetch and authenticate locally if we hit a network issue, or let the real API call proceed.
      // To ensure tests pass reliably, we can inject a mock response hook if needed.
      const originalFetch = window.fetch;
      window.fetch = async function(url, options) {
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
              serviceStories: "We offer professional electrician services including panel upgrades and outdoor floodlights."
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
        
        if (url.includes('action=update_service_story_demo')) {
          logToRunner("Intercepted update_service_story_demo fetch for testing...");
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

      loginBtn.click();
      
      let elapsed = 0;
      while (dashboardScreen.classList.contains('hidden') && elapsed < 3000) {
        await wait(100);
        elapsed += 100;
      }
      
      if (dashboardScreen.classList.contains('hidden')) {
        throw new Error("Dashboard screen did not load after clicking demo login");
      }
      logToRunner("SUCCESS: Dashboard successfully loaded with provider data.");

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

      // 5. Test Voice Button Visual State
      const micBtn = document.getElementById('btn-mic');
      const statusText = document.getElementById('recording-status-text');
      
      // Simulate click (this will test SpeechRecognition check or safe fallback)
      micBtn.click();
      await wait(300);
      
      const recordingActive = micBtn.classList.contains('recording') || statusText.textContent.includes("Dictating") || statusText.textContent.includes("unsupported");
      if (!recordingActive) {
        throw new Error("Voice dictation mic button did not activate properly");
      }
      logToRunner("SUCCESS: Voice dictation mic click handled safely.");
      
      // Toggle it back off
      micBtn.click();
      await wait(300);
      
      // 6. Test Polish & Save Story Flow
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
      // Wait for loading mask to clear
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
