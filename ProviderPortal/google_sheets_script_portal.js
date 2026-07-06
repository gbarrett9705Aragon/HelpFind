/**
 * Google Apps Script DEDICATED Backend for ProviderPortal
 * 
 * This is a completely separate script dedicated exclusively to the ProviderPortal PWA.
 * Using a separate script ensures that editing the ProviderPortal features (OAuth, Speech-to-Text, Gemini AI)
 * will never disrupt or risk corrupting the core HelpFind database read/write logic.
 * 
 * Instructions:
 * 1. Open your Google Sheet "ProviderList".
 * 2. Click "Extensions" > "Apps Script".
 * 3. Instead of editing your existing project, click the "Google Apps Script" logo in the top-left to go to your projects list.
 * 4. Click "New project" in the top-left.
 * 5. Name it "HelpFind_ProviderPortal_Backend".
 * 6. Replace the default code with this script.
 * 7. Replace "YOUR_SPREADSHEET_ID_HERE" below with the ID of your Google Sheet.
 *    (The ID is the long string in the Sheet's URL: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit)
 * 8. (Optional) To enable AI-based polishing of service stories:
 *    - Click "Project Settings" (gear icon) on the left menu.
 *    - Under "Script Properties", click "Add script property".
 *    - Name: "GEMINI_API_KEY", Value: [Your Google Gemini API Key].
 * 9. Click "Save", then click "Deploy" > "New deployment".
 * 10. Select type: "Web app".
 * 11. Execute as: "Me", Access: "Anyone".
 * 12. Deploy, authorize permissions, copy the Web App URL, and paste it into `app.js` as `GOOGLE_SHEETS_API_URL`.
 */

// SPREADSHEET CONFIGURATION
// Paste your Google Sheet ID here so this standalone script knows which sheet to update.
var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var params = e.parameter;
    if (!params.action) {
      return createJSONResponse({ status: "error", message: "Missing action parameter" });
    }

    // Open target spreadsheet using the configured ID (or URL)
    var ss;
    if (SPREADSHEET_ID === "YOUR_SPREADSHEET_ID_HERE") {
      // Fallback: If deployed as container-bound, try to grab active sheet
      try {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      } catch (err) {
        return createJSONResponse({ 
          status: "error", 
          message: "Spreadsheet ID not configured. Please open Project Settings and set SPREADSHEET_ID." 
        });
      }
    } else {
      var cleanId = SPREADSHEET_ID;
      // Robustly extract ID if they pasted a full URL or a partial URL fragment
      if (SPREADSHEET_ID.indexOf("/") !== -1) {
        var matches = SPREADSHEET_ID.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
          cleanId = matches[1];
        } else {
          // If no /d/, look for any segment that resembles a Google Spreadsheet ID length (usually 44 characters)
          var parts = SPREADSHEET_ID.split("/");
          for (var p = 0; p < parts.length; p++) {
            var segment = parts[p].trim();
            if (segment.length >= 25) { // Spreadsheet IDs are always long
              cleanId = segment;
              break;
            }
          }
        }
      }
      ss = SpreadsheetApp.openById(cleanId);
    }

    var sheet = ss.getSheetByName("ProviderList");
    if (!sheet) {
      return createJSONResponse({ status: "error", message: "ProviderList sheet not found in spreadsheet" });
    }
    
    var data = sheet.getDataRange().getValues();
    var rawHeaders = data[0];
    var headersRow = rawHeaders.map(function(h) { 
      return String(h).trim().toLowerCase(); 
    });

    var idCol = headersRow.indexOf("id");
    var timesUsedCol = headersRow.indexOf("times_used");
    if (timesUsedCol === -1) timesUsedCol = headersRow.indexOf("timesused");
    var ratingCol = headersRow.indexOf("rating");
    var reviewsCol = headersRow.indexOf("reviewcount");
    
    // Find email column
    var emailCol = -1;
    for (var c = 0; c < headersRow.length; c++) {
      if (headersRow[c] === "email" || headersRow[c].indexOf("email") !== -1) {
        emailCol = c;
        break;
      }
    }

    // Dynamic column insertion for service stories if missing
    var serviceStoriesCol = headersRow.indexOf("service stories");
    if (serviceStoriesCol === -1) serviceStoriesCol = headersRow.indexOf("service_stories");
    if (serviceStoriesCol === -1) serviceStoriesCol = headersRow.indexOf("servicestories");
    if (serviceStoriesCol === -1) {
      sheet.insertColumnAfter(rawHeaders.length);
      sheet.getRange(1, rawHeaders.length + 1).setValue("Service Stories");
      data = sheet.getDataRange().getValues();
      rawHeaders = data[0];
      headersRow = rawHeaders.map(function(h) { return String(h).trim().toLowerCase(); });
      serviceStoriesCol = headersRow.indexOf("service stories");
      if (serviceStoriesCol === -1) serviceStoriesCol = headersRow.indexOf("service_stories");
      if (serviceStoriesCol === -1) serviceStoriesCol = headersRow.indexOf("servicestories");
    }

    if (idCol === -1) idCol = 0;

    // --- ProviderPortal Actions ---

    // Action 1: Get Provider Profile by Google ID Token or Demo Email (Read Isolation)
    if (params.action === "get_provider_by_token" || params.action === "get_provider_by_email_demo") {
      var verifiedEmail = "";

      if (params.action === "get_provider_by_token") {
        var idToken = params.id_token;
        if (!idToken) {
          return createJSONResponse({ status: "error", message: "Missing id_token" });
        }
        verifiedEmail = verifyGoogleToken(idToken);
        if (!verifiedEmail) {
          return createJSONResponse({ status: "error", message: "Invalid or expired Google OAuth token" });
        }
      } else {
        verifiedEmail = params.email;
        if (!verifiedEmail) {
          return createJSONResponse({ status: "error", message: "Missing email parameter for demo login" });
        }
      }

      verifiedEmail = verifiedEmail.trim().toLowerCase();
      var providerRowIdx = findProviderRowByEmail(data, emailCol, verifiedEmail);

      if (providerRowIdx === -1) {
        return createJSONResponse({ 
          status: "error", 
          code: "provider_not_found", 
          message: "No registered provider found matching email: " + verifiedEmail,
          email: verifiedEmail
        });
      }

      var providerData = getProviderDataFromRow(sheet, data, providerRowIdx, headersRow, idCol, emailCol, timesUsedCol, ratingCol, reviewsCol, serviceStoriesCol);
      var reviews = getProviderReviews(ss, providerData.id);

      return createJSONResponse({ 
        status: "success", 
        provider: providerData, 
        reviews: reviews 
      });
    }

    // Action 2: Update Service Story with Voice Dictation & AI Polish (Write Isolation)
    if (params.action === "update_service_story" || params.action === "update_service_story_demo") {
      var verifiedEmail = "";
      var storyText = params.story;

      if (storyText === undefined || storyText === null) {
        return createJSONResponse({ status: "error", message: "Missing story parameter" });
      }

      if (params.action === "update_service_story") {
        var idToken = params.id_token;
        if (!idToken) {
          return createJSONResponse({ status: "error", message: "Missing id_token" });
        }
        verifiedEmail = verifyGoogleToken(idToken);
        if (!verifiedEmail) {
          return createJSONResponse({ status: "error", message: "Invalid or expired Google OAuth token" });
        }
      } else {
        verifiedEmail = params.email;
        if (!verifiedEmail) {
          return createJSONResponse({ status: "error", message: "Missing email parameter for demo update" });
        }
      }

      verifiedEmail = verifiedEmail.trim().toLowerCase();
      var providerRowIdx = findProviderRowByEmail(data, emailCol, verifiedEmail);

      if (providerRowIdx === -1) {
        return createJSONResponse({ status: "error", message: "Provider not found for email: " + verifiedEmail });
      }

      var polishedStory = storyText.trim();
      var shouldPolish = params.polish === "true";
      if (shouldPolish && polishedStory.length > 0) {
        var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
        if (apiKey) {
          try {
            polishedStory = polishStoryWithGemini(polishedStory, apiKey);
          } catch (geminiError) {
            console.error("Gemini polishing error: " + geminiError.toString());
          }
        }
      }

      // Write story back to matching row
      sheet.getRange(providerRowIdx, serviceStoriesCol + 1).setValue(polishedStory);

      return createJSONResponse({ 
        status: "success", 
        message: "Service story updated successfully",
        story: polishedStory,
        polished: shouldPolish && !!PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY")
      });
    }

    return createJSONResponse({ status: "error", message: "Unknown action for ProviderPortal Backend" });

  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  }
}

// --- HELPER FUNCTIONS ---

function createJSONResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Verify Google Sign-In ID Token via tokeninfo endpoint
function verifyGoogleToken(idToken) {
  try {
    var tokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken);
    var response = UrlFetchApp.fetch(tokenInfoUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var json = JSON.parse(response.getContentText());
      if (json.email && json.email_verified === "true") {
        return json.email;
      }
    }
  } catch (err) {
    console.error("Token verification error: " + err.toString());
  }
  return null;
}

// Find matching row index by looking at the email column
function findProviderRowByEmail(data, emailCol, verifiedEmail) {
  if (emailCol === -1) return -1;
  
  for (var i = 1; i < data.length; i++) {
    var cellValue = String(data[i][emailCol]).toLowerCase();
    if (cellValue.indexOf(verifiedEmail) !== -1) {
      return i + 1; // 1-indexed row number
    }
  }
  return -1;
}

// Read provider details from row
function getProviderDataFromRow(sheet, data, rowIdx, headersRow, idCol, emailCol, timesUsedCol, ratingCol, reviewsCol, serviceStoriesCol) {
  var row = data[rowIdx - 1];
  var provider = {};
  
  for (var col = 0; col < headersRow.length; col++) {
    var colName = headersRow[col];
    var val = row[col];
    
    if (colName === "id") provider.id = String(val).trim();
    else if (colName === "name" || colName === "provider") provider.name = String(val).trim();
    else if (colName === "category") provider.category = String(val).trim();
    else if (colName === "service") provider.service = String(val).trim();
    else if (colName === "phone") provider.phone = String(val).trim();
    else if (colName === "email" || colName.indexOf("email") !== -1) provider.email = String(val).trim();
    else if (colName === "rating") provider.rating = Number(val) || 5;
    else if (colName === "reviewcount") provider.reviewCount = Number(val) || 1;
    else if (colName === "times_used" || colName === "timesused") provider.timesUsed = Number(val) || 0;
    else if (colName === "service stories" || colName === "service_stories" || colName === "servicestories") provider.serviceStories = String(val).trim();
  }
  
  // Dynamic ID generation
  if (!provider.id) {
    provider.id = "v_" + Date.now();
    sheet.getRange(rowIdx, idCol + 1).setValue(provider.id);
  }
  
  return provider;
}

// Fetch reviews for specific provider ID
function getProviderReviews(ss, vendorId) {
  var reviewsSheet = ss.getSheetByName("Reviews");
  var reviews = [];
  if (reviewsSheet) {
    var rData = reviewsSheet.getDataRange().getValues();
    var rHeaders = rData[0].map(function(h) { return String(h).trim(); });
    
    for (var r = 1; r < rData.length; r++) {
      var row = rData[r];
      var review = {};
      var hasData = false;
      
      for (var col = 0; col < rHeaders.length; col++) {
        var colName = rHeaders[col];
        var val = row[col];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          hasData = true;
        }
        
        if (colName === "id") review.id = String(val).trim();
        else if (colName === "vendorId") review.vendorId = String(val).trim();
        else if (colName === "authorName") review.authorName = String(val).trim();
        else if (colName === "authorAddress") review.authorAddress = String(val).trim();
        else if (colName === "authorResidentId") review.authorResidentId = String(val).trim();
        else if (colName === "date") {
          if (val instanceof Date) {
            review.date = val.toISOString().split('T')[0];
          } else {
            review.date = String(val).trim();
          }
        }
        else if (colName === "rating") review.rating = Number(val) || 5;
        else if (colName === "cost") review.cost = Number(val) || 50;
        else if (colName === "punctual") review.punctual = (val === true || String(val).toLowerCase() === "true");
        else if (colName === "honoredQuote") review.honoredQuote = (val === true || String(val).toLowerCase() === "true");
        else if (colName === "proofOfService") review.proofOfService = String(val).trim();
        else if (colName === "aiProofText") review.aiProofText = String(val).trim();
        else if (colName === "comment") review.comment = String(val).trim();
      }
      if (hasData && review.id && review.vendorId === vendorId) {
        reviews.push(review);
      }
    }
  }
  return reviews;
}

// Gemini AI Call
function polishStoryWithGemini(story, apiKey) {
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
  var payload = {
    contents: [{
      parts: [{
        text: "You are an expert editor. Polish the following spoken transcript of a local service provider describing their business, qualifications, and services. Make it professional, cohesive, engaging, and grammatically correct. Keep it written in the first person (e.g. 'I provide...', 'We offer...'). Remove verbal fillers (like 'uh', 'um', 'like'), stuttering, and conversational noise. Output ONLY the polished summary text, with no preamble, comments, or quotes. Spoken transcript:\n\n\"" + story + "\""
      }]
    }]
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() === 200) {
    var json = JSON.parse(response.getContentText());
    if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts[0]) {
      return json.candidates[0].content.parts[0].text.trim();
    }
  } else {
    throw new Error("Gemini API returned status " + response.getResponseCode() + ": " + response.getContentText());
  }
  return story;
}
