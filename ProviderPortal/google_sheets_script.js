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
  // CORS is handled natively by Google Apps Script web app redirects
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

    // Dynamic column insertion for times_used if missing
    if (timesUsedCol === -1) {
      sheet.insertColumnAfter(rawHeaders.length);
      sheet.getRange(1, rawHeaders.length + 1).setValue("Times_Used");
      data = sheet.getDataRange().getValues();
      rawHeaders = data[0];
      headersRow = rawHeaders.map(function(h) { return String(h).trim().toLowerCase(); });
      timesUsedCol = headersRow.indexOf("times_used");
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

    // Fallbacks if columns don't exist yet
    if (idCol === -1) idCol = 0;

    // --- ProviderPortal Actions ---

    // 1. Get Provider details securely using Google OAuth ID Token
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
        // Demo mode: simply take the email parameter directly without token verification
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
      var reviews = getProviderReviews(providerData.id);

      return createJSONResponse({ 
        status: "success", 
        provider: providerData, 
        reviews: reviews 
      });
    }

    // 2. Update Service Story securely using Google OAuth ID Token
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
        // Demo mode bypass
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

      // Check if we need to polish the story using Gemini API
      var polishedStory = storyText.trim();
      var shouldPolish = params.polish === "true";
      if (shouldPolish && polishedStory.length > 0) {
        var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
        if (apiKey) {
          try {
            polishedStory = polishStoryWithGemini(polishedStory, apiKey);
          } catch (geminiError) {
            // Log error and proceed with original text
            console.error("Gemini polishing error: " + geminiError.toString());
          }
        }
      }

      // Update the Service Stories cell
      // providerRowIdx is 1-indexed row number
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
      logReviewToSheet(params, vendorId);
      
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

// Verify Google Sign-In ID Token by calling tokeninfo endpoint
function verifyGoogleToken(idToken) {
  try {
    var tokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken);
    var response = UrlFetchApp.fetch(tokenInfoUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var json = JSON.parse(response.getContentText());
      // Check that the token was generated for a valid account and verification is successful
      if (json.email && json.email_verified === "true") {
        return json.email;
      }
    }
  } catch (err) {
    console.error("Token verification error: " + err.toString());
  }
  return null;
}

// Find a provider row where the email column contains the target verified email
function findProviderRowByEmail(data, emailCol, verifiedEmail) {
  if (emailCol === -1) return -1;
  
  for (var i = 1; i < data.length; i++) {
    var cellValue = String(data[i][emailCol]).toLowerCase();
    // Handles case where email column is combined "Email/Website/Address" e.g. "contact@company.com, 120 S Point Blvd"
    if (cellValue.indexOf(verifiedEmail) !== -1) {
      return i + 1; // 1-indexed row number in sheet
    }
  }
  return -1;
}

// Read provider details from a specific row
function getProviderDataFromRow(sheet, data, rowIdx, headersRow, idCol, emailCol, timesUsedCol, ratingCol, reviewsCol, serviceStoriesCol) {
  var row = data[rowIdx - 1]; // 0-indexed row index
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
  
  // Guarantee an ID exists. If the cell is empty, write a new one back to the sheet.
  if (!provider.id) {
    provider.id = "v_" + Date.now();
    sheet.getRange(rowIdx, idCol + 1).setValue(provider.id);
  }
  
  return provider;
}

// Fetch only the reviews that belong to a specific vendor ID
function getProviderReviews(vendorId) {
  var allReviews = parseAllReviews();
  return allReviews.filter(function(r) {
    return r.vendorId === vendorId;
  });
}

// Parse all reviews from the Reviews sheet
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

// Log an individual review to the Reviews sheet tab
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

// Call Google Gemini model to rewrite spoken transcription into professional summary
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
