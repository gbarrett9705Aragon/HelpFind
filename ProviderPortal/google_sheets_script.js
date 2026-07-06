/**
 * Google Apps Script for HelpFind & ProviderPortal Google Sheet Integration
 * 
 * Instructions:
 * 1. Open your Google Sheet "ProviderList".
 * 2. Click "Extensions" > "Apps Script".
 * 3. Replace the entire code with this script.
 * 4. (Optional) To enable AI-based polishing of service stories:
 *    - Click "Project Settings" (gear icon) on the left of Apps Script.
 *    - Scroll to "Script Properties" and click "Add script property".
 *    - Name it "GEMINI_API_KEY" and paste your Google AI/Gemini API key.
 * 5. Save and click "Deploy" > "New deployment".
 * 6. Choose "Web app" as the type.
 * 7. Set "Execute as" to "Me" and "Who has access" to "Anyone".
 * 8. Deploy, authorize permissions, copy the Web App URL, and paste it into `app.js`.
 */

var CORRECT_PIN = "SCP2";

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

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ProviderList");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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

    // Dynamic column insertion for times_used if missing
    if (timesUsedCol === -1) {
      sheet.insertColumnAfter(rawHeaders.length);
      sheet.getRange(1, rawHeaders.length + 1).setValue("Times_Used");
      data = sheet.getDataRange().getValues();
      rawHeaders = data[0];
      headersRow = rawHeaders.map(function(h) { return String(h).trim().toLowerCase(); });
      timesUsedCol = headersRow.indexOf("times_used");
    }

    // Dynamic column insertion for password if missing
    var passwordCol = headersRow.indexOf("password");
    if (passwordCol === -1) {
      sheet.insertColumnAfter(rawHeaders.length);
      sheet.getRange(1, rawHeaders.length + 1).setValue("Password");
      data = sheet.getDataRange().getValues();
      rawHeaders = data[0];
      headersRow = rawHeaders.map(function(h) { return String(h).trim().toLowerCase(); });
      passwordCol = headersRow.indexOf("password");
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
    }

    if (idCol === -1) idCol = 0;

    // Auto-populate passwords for rows that are blank
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
    }
    if (initializedAny) {
      data = sheet.getDataRange().getValues();
    }

    // --- ProviderPortal Actions ---

    // 1. Login Provider (Takes username and password)
    if (params.action === "login_provider" || params.action === "get_provider_by_email_demo") {
      var username = "";
      var password = "";
      
      if (params.action === "get_provider_by_email_demo") {
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
        return createJSONResponse({ 
          status: "error", 
          code: "provider_not_found", 
          message: "No registered provider found matching: " + username
        });
      }

      if (params.action !== "get_provider_by_email_demo") {
        var row = data[providerRowIdx - 1];
        var storedPassword = String(row[passwordCol] || "").trim();
        if (storedPassword !== password) {
          return createJSONResponse({ status: "error", message: "Incorrect password" });
        }
      }

      var providerData = getProviderDataFromRow(sheet, data, providerRowIdx, headersRow, idCol, emailCol, timesUsedCol, ratingCol, reviewsCol, serviceStoriesCol, passwordCol);
      var reviews = getProviderReviews(providerData.id);

      return createJSONResponse({ 
        status: "success", 
        provider: providerData, 
        reviews: reviews 
      });
    }

    // 2. Change Password
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

      return createJSONResponse({ 
        status: "success", 
        message: "Password updated successfully" 
      });
    }

    // 3. Update Service Story
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

    // --- Original HelpFind Actions (Preserved for compatibility) ---
    var providerId = params.id;
    var rowIdx = -1;
    
    // Find matching provider row (skip header)
    if (providerId) {
      for (var i = 1; i < data.length; i++) {
        if (data[i][idCol] == providerId) {
          rowIdx = i + 1; // 1-indexed row number
          break;
        }
      }
    }

    if (params.action === "increment") {
      if (rowIdx === -1) {
        return createJSONResponse({ status: "error", message: "Provider ID not found" });
      }
      var currentVal = sheet.getRange(rowIdx, timesUsedCol + 1).getValue() || 0;
      var newVal = Number(currentVal) + 1;
      sheet.getRange(rowIdx, timesUsedCol + 1).setValue(newVal);
      
      return createJSONResponse({ status: "success", new_times_used: newVal });
    }
    
    if (params.action === "add_provider") {
      if (params.pin !== CORRECT_PIN) {
        return createJSONResponse({ status: "error", message: "Unauthorized: Invalid Community PIN" });
      }
      if (rowIdx !== -1) {
        return createJSONResponse({ status: "error", message: "Provider ID already exists" });
      }
      
      // Append a new provider row matching columns dynamically
      var newRow = [];
      for (var col = 0; col < headersRow.length; col++) {
        var colName = headersRow[col];
        if (colName === "id") newRow.push(params.id);
        else if (colName === "name" || colName === "provider") newRow.push(params.name);
        else if (colName === "category") newRow.push(params.category);
        else if (colName === "service") newRow.push(params.service || "");
        else if (colName === "phone") newRow.push(params.phone);
        else if (colName === "email" || colName.indexOf("email") !== -1) newRow.push(params.email || "");
        else if (colName === "rating") newRow.push(Number(params.rating || 5));
        else if (colName === "reviewcount") newRow.push(1);
        else if (colName === "times_used" || colName === "timesused") newRow.push(1);
        else if (colName === "service stories" || colName === "service_stories" || colName === "servicestories") newRow.push("");
        else newRow.push("");
      }
      sheet.appendRow(newRow);
      
      // Log individual review to Reviews sheet tab
      logReviewToSheet(params, providerId);
      
      return createJSONResponse({ status: "success", message: "Provider registered successfully" });
    }
    
    if (params.action === "rate") {
      if (params.pin !== CORRECT_PIN) {
        return createJSONResponse({ status: "error", message: "Unauthorized: Invalid Community PIN" });
      }
      if (rowIdx === -1) {
        return createJSONResponse({ status: "error", message: "Provider ID not found" });
      }
      
      var newRating = Number(params.rating);
      var currentRating = Number(sheet.getRange(rowIdx, ratingCol + 1).getValue()) || 5;
      var currentCount = Number(sheet.getRange(rowIdx, reviewsCol + 1).getValue()) || 1;
      
      var nextCount = currentCount + 1;
      var nextRating = ((currentRating * currentCount) + newRating) / nextCount;
      nextRating = Math.round(nextRating * 10) / 10;
      
      sheet.getRange(rowIdx, ratingCol + 1).setValue(nextRating);
      sheet.getRange(rowIdx, reviewsCol + 1).setValue(nextCount);
      
      // Log individual review to Reviews sheet tab
      logReviewToSheet(params, providerId);
      
      return createJSONResponse({ status: "success", rating: nextRating, reviewCount: nextCount });
    }

    if (params.action === "consent") {
      var auditSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("AuditLedger");
      if (!auditSheet) {
        auditSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("AuditLedger");
        auditSheet.appendRow(["UUID", "Timestamp", "Hashed_IP", "Terms_Version"]);
        auditSheet.getRange("A1:D1").setFontWeight("bold");
        auditSheet.setFrozenRows(1);
      }
      auditSheet.appendRow([
        params.uuid || "",
        params.timestamp || "",
        params.hashed_ip || "",
        params.terms_version || ""
      ]);
      return createJSONResponse({ status: "success", message: "Consent audit logged successfully" });
    }

    if (params.action === "get_terms") {
      var files = DriveApp.getFilesByName("Terms of Service for HelpFind");
      if (files.hasNext()) {
        var file = files.next();
        var doc = DocumentApp.openById(file.getId());
        var text = doc.getBody().getText();
        return createJSONResponse({ status: "success", terms: text });
      } else {
        return createJSONResponse({ status: "error", message: "Terms document not found on Google Drive" });
      }
    }

    if (params.action === "get_providers") {
      var providers = [];
      if (data.length > 1) {
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          var provider = {};
          var hasData = false;
          
          for (var col = 0; col < headersRow.length; col++) {
            var colName = headersRow[col];
            var val = row[col];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              hasData = true;
            }
            
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
          
          if (!hasData || !provider.id) continue;
          
          provider.isPremium = false;
          provider.hasLeadsPlan = false;
          provider.minJobCost = 50;
          provider.offersSeniorDiscount = true;
          provider.punctualityScore = 100;
          provider.description = "Trusted provider for " + (provider.service || provider.category) + ".";
          
          providers.push(provider);
        }
      }
      return createJSONResponse({ status: "success", providers: providers });
    }
    
    if (params.action === "get_reviews") {
      var reviews = parseAllReviews();
      return createJSONResponse({ status: "success", reviews: reviews });
    }

    if (params.action === "verify_pin") {
      if (params.pin === CORRECT_PIN) {
        return createJSONResponse({ status: "success", message: "PIN verified successfully" });
      } else {
        return createJSONResponse({ status: "error", message: "Invalid Community PIN" });
      }
    }
    
    return createJSONResponse({ status: "error", message: "Unknown action" });
      
  } catch (err) {
    return createJSONResponse({ status: "error", message: err.toString() });
  }
}

// --- Helper Functions ---

function createJSONResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function findProviderRowByUsername(data, emailCol, phoneCol, username) {
  var cleanUsername = username.trim().toLowerCase();
  
  if (emailCol !== -1) {
    for (var i = 1; i < data.length; i++) {
      var emailCell = String(data[i][emailCol]).toLowerCase().trim();
      if (emailCell === cleanUsername) {
        return i + 1;
      }
    }
  }
  
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
  }
  
  if (!provider.id) {
    provider.id = "v_" + Date.now();
    sheet.getRange(rowIdx, idCol + 1).setValue(provider.id);
  }
  
  return provider;
}

function getProviderReviews(vendorId) {
  var reviewsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reviews");
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

function parseAllReviews() {
  var reviewsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reviews");
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
      if (hasData && review.id) {
        reviews.push(review);
      }
    }
  }
  return reviews;
}

function logReviewToSheet(params, vendorId) {
  var reviewsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reviews");
  if (!reviewsSheet) {
    reviewsSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Reviews");
    reviewsSheet.appendRow(["id", "vendorId", "authorName", "authorAddress", "authorResidentId", "date", "rating", "cost", "punctual", "honoredQuote", "proofOfService", "aiProofText", "comment"]);
    reviewsSheet.getRange("A1:M1").setFontWeight("bold");
    reviewsSheet.setFrozenRows(1);
  }
  
  reviewsSheet.appendRow([
    params.review_id || ("r_" + Date.now()),
    vendorId,
    params.authorName || "Verified Resident",
    params.authorAddress || "Sun City Peachtree",
    params.authorResidentId || "PIN-Verified",
    params.date || new Date().toISOString().split('T')[0],
    Number(params.rating || 5),
    Number(params.cost || 50),
    params.punctual === "true",
    true, // honoredQuote
    "N/A", // proofOfService
    "Recommendation verified via community PIN entry.",
    params.comment || ""
  ]);
}

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
