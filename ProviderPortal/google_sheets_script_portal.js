/**
 * Google Apps Script DEDICATED Backend for ProviderPortal
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
var SPREADSHEET_ID = "1peKUmlWMQcaeM3amktkLspFRoWb_pK-AcDSw4hV_M8k";

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

    if (!ss) {
      return createJSONResponse({ 
        status: "error", 
        message: "Failed to open Spreadsheet. Please verify that SPREADSHEET_ID is correct and that the script has permission to access it." 
      });
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

    // Find phone column
    var phoneCol = headersRow.indexOf("phone");
    if (phoneCol === -1) phoneCol = headersRow.indexOf("telephone");

    // Dynamic column insertion for password if missing
    var passwordCol = headersRow.indexOf("password");
    if (passwordCol === -1) {
      sheet.insertColumnAfter(rawHeaders.length);
      sheet.getRange(1, rawHeaders.length + 1).setValue("Password");
      // Re-fetch data
      data = sheet.getDataRange().getValues();
      rawHeaders = data[0];
      headersRow = rawHeaders.map(function(h) { return String(h).trim().toLowerCase(); });
      passwordCol = headersRow.indexOf("password");
    }

    // Dynamic column insertion for status if missing
    var statusCol = headersRow.indexOf("status");
    if (statusCol === -1) {
      sheet.insertColumnAfter(rawHeaders.length);
      sheet.getRange(1, rawHeaders.length + 1).setValue("Status");
      // Re-fetch data
      data = sheet.getDataRange().getValues();
      rawHeaders = data[0];
      headersRow = rawHeaders.map(function(h) { return String(h).trim().toLowerCase(); });
      statusCol = headersRow.indexOf("status");
    }

    // Dynamic column insertion for service stories if missing
    var serviceStoriesCol = headersRow.indexOf("service stories");
    if (serviceStoriesCol === -1) serviceStoriesCol = headersRow.indexOf("service_stories");
    if (serviceStoriesCol === -1) serviceStoriesCol = headersRow.indexOf("servicestories");
    if (serviceStoriesCol === -1) {
      sheet.insertColumnAfter(rawHeaders.length);
      sheet.getRange(1, rawHeaders.length + 1).setValue("Service Stories");
      // Re-fetch data
      data = sheet.getDataRange().getValues();
      rawHeaders = data[0];
      headersRow = rawHeaders.map(function(h) { return String(h).trim().toLowerCase(); });
      serviceStoriesCol = headersRow.indexOf("service stories");
    }

    if (idCol === -1) idCol = 0;

    // Auto-populate passwords and status for rows that are blank
    var initializedAny = false;
    for (var r = 1; r < data.length; r++) {
      var rowVal = data[r];
      var currentPassword = String(rowVal[passwordCol] || "").trim();
      if (!currentPassword) {
        var defaultPassword = "";
        var phoneVal = phoneCol !== -1 ? String(rowVal[phoneCol] || "") : "";
        var cleanPhone = phoneVal.replace(/\D/g, "");
        if (cleanPhone.length >= 7) {
          defaultPassword = cleanPhone;
        } else {
          defaultPassword = "SCP" + (r + 1);
        }
        sheet.getRange(r + 1, passwordCol + 1).setValue(defaultPassword);
        initializedAny = true;
      }

      var currentStatus = statusCol !== -1 ? String(rowVal[statusCol] || "").trim() : "";
      if (!currentStatus && statusCol !== -1) {
        sheet.getRange(r + 1, statusCol + 1).setValue("Verified");
        initializedAny = true;
      }
    }
    if (initializedAny) {
      data = sheet.getDataRange().getValues();
    }

    // --- ProviderPortal Actions ---

    // Action 1: Login Provider (Takes username and password)
    if (params.action === "login_provider" || params.action === "get_provider_by_email_demo") {
      var username = "";
      var password = "";
      
      if (params.action === "get_provider_by_email_demo") {
        username = params.email;
        // Demo bypass password bypass - retrieve password from sheet directly
      } else {
        username = params.username;
        password = params.password;
      }

      if (!username) {
        return createJSONResponse({ status: "error", message: "Username parameter is required" });
      }

      username = username.trim().toLowerCase();
      var providerRowIdx = findProviderRowByUsername(data, emailCol, phoneCol, username);

      if (providerRowIdx === -1) {
        return createJSONResponse({ 
          status: "error", 
          code: "provider_not_found", 
          message: "No registered provider found matching: " + username
        });
      }

      // If not demo mode, verify password
      if (params.action !== "get_provider_by_email_demo") {
        var row = data[providerRowIdx - 1];
        var storedPassword = String(row[passwordCol] || "").trim();
        if (storedPassword !== password) {
          return createJSONResponse({ status: "error", message: "Incorrect password" });
        }
      }

      var providerData = getProviderDataFromRow(sheet, data, providerRowIdx, headersRow, idCol, emailCol, timesUsedCol, ratingCol, reviewsCol, serviceStoriesCol, passwordCol);
      var reviews = getProviderReviews(ss, providerData.id);

      return createJSONResponse({ 
        status: "success", 
        provider: providerData, 
        reviews: reviews 
      });
    }

    // Action 2: Change Password
    if (params.action === "change_password") {
      var username = (params.username || "").trim().toLowerCase();
      var currentPassword = (params.current_password || "").trim();
      var newPassword = (params.new_password || "").trim();

      if (!username || !currentPassword || !newPassword) {
        return createJSONResponse({ status: "error", message: "Missing required parameters for changing password" });
      }

      var providerRowIdx = findProviderRowByUsername(data, emailCol, phoneCol, username);
      if (providerRowIdx === -1) {
        return createJSONResponse({ status: "error", message: "Provider not found" });
      }

      var row = data[providerRowIdx - 1];
      var storedPassword = String(row[passwordCol] || "").trim();
      if (storedPassword !== currentPassword) {
        return createJSONResponse({ status: "error", message: "Incorrect current password" });
      }

      // Write new password
      sheet.getRange(providerRowIdx, passwordCol + 1).setValue(newPassword);

      // Update status to Verified
      if (statusCol !== -1) {
        sheet.getRange(providerRowIdx, statusCol + 1).setValue("Verified");
      }

      return createJSONResponse({ 
        status: "success", 
        message: "Password updated successfully" 
      });
    }

    // Action 3: Update Service Story
    if (params.action === "update_service_story" || params.action === "update_service_story_demo") {
      var username = "";
      var password = "";
      var storyText = params.story;

      if (storyText === undefined || storyText === null) {
        return createJSONResponse({ status: "error", message: "Missing story parameter" });
      }

      if (params.action === "update_service_story_demo") {
        username = params.email;
      } else {
        username = params.username;
        password = params.password;
      }

      if (!username) {
        return createJSONResponse({ status: "error", message: "Username parameter is required" });
      }

      username = username.trim().toLowerCase();
      var providerRowIdx = findProviderRowByUsername(data, emailCol, phoneCol, username);

      if (providerRowIdx === -1) {
        return createJSONResponse({ status: "error", message: "Provider not found" });
      }

      // Verify password if not demo
      if (params.action !== "update_service_story_demo") {
        var row = data[providerRowIdx - 1];
        var storedPassword = String(row[passwordCol] || "").trim();
        if (storedPassword !== password) {
          return createJSONResponse({ status: "error", message: "Incorrect password credentials" });
        }
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

// Find matching row index by username (Email or Phone number)
function findProviderRowByUsername(data, emailCol, phoneCol, username) {
  var cleanUsername = username.trim().toLowerCase();
  
  // 1. Try matching by email
  if (emailCol !== -1) {
    for (var i = 1; i < data.length; i++) {
      var emailCell = String(data[i][emailCol]).toLowerCase().trim();
      if (emailCell === cleanUsername) {
        return i + 1; // 1-indexed row number
      }
    }
  }
  
  // 2. Try matching by phone (digits only or exact match)
  if (phoneCol !== -1) {
    var digitsUsername = cleanUsername.replace(/\D/g, "");
    for (var i = 1; i < data.length; i++) {
      var phoneCell = String(data[i][phoneCol]);
      var cleanPhone = phoneCell.replace(/\D/g, "");
      if (cleanPhone === digitsUsername && digitsUsername.length > 0) {
        return i + 1;
      }
      if (phoneCell.trim().toLowerCase() === cleanUsername) {
        return i + 1;
      }
    }
  }
  
  return -1;
}

// Read provider details from row
function getProviderDataFromRow(sheet, data, rowIdx, headersRow, idCol, emailCol, timesUsedCol, ratingCol, reviewsCol, serviceStoriesCol, passwordCol) {
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
    else if (colName === "password") provider.password = String(val).trim();
    else if (colName === "status") provider.status = String(val).trim();
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
