/**
 * Google Apps Script for HelpFind Google Sheet Integration
 * 
 * Instructions:
 * 1. Open your Google Sheet "ProviderList".
 * 2. Click "Extensions" > "Apps Script".
 * 3. Delete any default code and paste this script.
 * 4. Save and click "Deploy" > "New deployment".
 * 5. Choose "Web app" as the type.
 * 6. Set "Execute as" to "Me" and "Who has access" to "Anyone".
 * 7. Deploy, authorize permissions, and copy the Web App URL.
 * 8. Paste the Web App URL at the top of your `app.js` under `GOOGLE_SHEETS_API_URL`.
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
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing action parameter" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ProviderList");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    }
    var data = sheet.getDataRange().getValues();
    
    // Find column indexes (case-insensitive and trimmed)
    var rawHeaders = data[0];
    var headersRow = rawHeaders.map(function(h) { 
      return String(h).trim().toLowerCase(); 
    });
    
    var idCol = headersRow.indexOf("id");
    var timesUsedCol = headersRow.indexOf("times_used");
    if (timesUsedCol === -1) timesUsedCol = headersRow.indexOf("timesused");
    var ratingCol = headersRow.indexOf("rating");
    var reviewsCol = headersRow.indexOf("reviewcount");
    
    // Fallbacks if columns don't exist yet
    if (idCol === -1) idCol = 0;
    if (timesUsedCol === -1) {
      sheet.insertColumnAfter(rawHeaders.length);
      sheet.getRange(1, rawHeaders.length + 1).setValue("Times_Used");
      // Refresh headers
      data = sheet.getDataRange().getValues();
      rawHeaders = data[0];
      headersRow = rawHeaders.map(function(h) { return String(h).trim().toLowerCase(); });
      timesUsedCol = headersRow.indexOf("times_used");
    }
    
    var providerId = params.id;
    var rowIdx = -1;
    
    // Find matching provider row (skip header)
    for (var i = 1; i < data.length; i++) {
      if (data[i][idCol] == providerId) {
        rowIdx = i + 1; // 1-indexed row number
        break;
      }
    }
    
    if (params.action === "increment") {
      if (rowIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Provider ID not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var currentVal = sheet.getRange(rowIdx, timesUsedCol + 1).getValue() || 0;
      var newVal = Number(currentVal) + 1;
      sheet.getRange(rowIdx, timesUsedCol + 1).setValue(newVal);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", new_times_used: newVal }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (params.action === "add_provider") {
      if (params.pin !== CORRECT_PIN) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unauthorized: Invalid Community PIN" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      if (rowIdx !== -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Provider ID already exists" }))
          .setMimeType(ContentService.MimeType.JSON);
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
        else newRow.push("");
      }
      sheet.appendRow(newRow);
      
      // Log individual review to Reviews sheet tab
      var reviewsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reviews");
      if (!reviewsSheet) {
        reviewsSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Reviews");
        reviewsSheet.appendRow(["id", "vendorId", "authorName", "authorAddress", "authorResidentId", "date", "rating", "cost", "punctual", "honoredQuote", "proofOfService", "aiProofText", "comment"]);
        reviewsSheet.getRange("A1:M1").setFontWeight("bold");
        reviewsSheet.setFrozenRows(1);
      }
      
      reviewsSheet.appendRow([
        params.review_id || ("r_" + Date.now()),
        params.id, // vendorId
        params.authorName || "Verified Resident",
        params.authorAddress || "Sun City Peachtree",
        params.authorResidentId || "PIN-Verified",
        params.date || new Date().toISOString().split('T')[0],
        Number(params.rating || 5),
        Number(params.cost || 50),
        params.punctual === "true",
        true, // honoredQuote
        "N/A", // proofOfService
        "Recommendation verified via community PIN entry.", // aiProofText
        params.comment || ""
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Provider registered successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (params.action === "rate") {
      if (params.pin !== CORRECT_PIN) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unauthorized: Invalid Community PIN" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      if (rowIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Provider ID not found" }))
          .setMimeType(ContentService.MimeType.JSON);
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
      var reviewsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reviews");
      if (!reviewsSheet) {
        reviewsSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Reviews");
        reviewsSheet.appendRow(["id", "vendorId", "authorName", "authorAddress", "authorResidentId", "date", "rating", "cost", "punctual", "honoredQuote", "proofOfService", "aiProofText", "comment"]);
        reviewsSheet.getRange("A1:M1").setFontWeight("bold");
        reviewsSheet.setFrozenRows(1);
      }
      
      reviewsSheet.appendRow([
        params.review_id || ("r_" + Date.now()),
        params.id, // vendorId
        params.authorName || "Verified Resident",
        params.authorAddress || "Sun City Peachtree",
        params.authorResidentId || "PIN-Verified",
        params.date || new Date().toISOString().split('T')[0],
        newRating,
        Number(params.cost || 50),
        params.punctual === "true",
        true, // honoredQuote
        "N/A", // proofOfService
        "Recommendation verified via community PIN entry.", // aiProofText
        params.comment || ""
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", rating: nextRating, reviewCount: nextCount }))
        .setMimeType(ContentService.MimeType.JSON);
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
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Consent audit logged successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === "get_terms") {
      try {
        var files = DriveApp.getFilesByName("Terms of Service for HelpFind");
        if (files.hasNext()) {
          var file = files.next();
          var doc = DocumentApp.openById(file.getId());
          var text = doc.getBody().getText();
          return ContentService.createTextOutput(JSON.stringify({ status: "success", terms: text }))
            .setMimeType(ContentService.MimeType.JSON);
        } else {
          return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Terms document not found on Google Drive" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (params.action === "get_providers") {
      try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ProviderList");
        if (!sheet) {
          sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        }
        var data = sheet.getDataRange().getValues();
        if (data.length <= 1) {
          return ContentService.createTextOutput(JSON.stringify({ status: "success", providers: [] }))
            .setMimeType(ContentService.MimeType.JSON);
        }
        
        var rawHeaders = data[0];
        var headersRow = rawHeaders.map(function(h) { 
          return String(h).trim().toLowerCase(); 
        });
        
        var providers = [];
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
            
            if (colName === "id") {
              provider.id = String(val).trim();
            } else if (colName === "name" || colName === "provider") {
              provider.name = String(val).trim();
            } else if (colName === "category") {
              provider.category = String(val).trim();
            } else if (colName === "service") {
              provider.service = String(val).trim();
            } else if (colName === "phone") {
              provider.phone = String(val).trim();
            } else if (colName === "email" || colName.indexOf("email") !== -1) {
              provider.email = String(val).trim();
            } else if (colName === "rating") {
              provider.rating = Number(val) || 5;
            } else if (colName === "reviewcount") {
              provider.reviewCount = Number(val) || 1;
            } else if (colName === "times_used" || colName === "timesused") {
              provider.timesUsed = Number(val) || 0;
            }
          }
          
          if (!hasData || !provider.id) continue;
          
          // Defaults for visual elements not in GSheet columns
          provider.isPremium = false;
          provider.hasLeadsPlan = false;
          provider.minJobCost = 50;
          provider.offersSeniorDiscount = true;
          provider.punctualityScore = 100;
          provider.description = "Trusted provider for " + (provider.service || provider.category) + ".";
          
          providers.push(provider);
        }
        
        return ContentService.createTextOutput(JSON.stringify({ status: "success", providers: providers }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    if (params.action === "get_reviews") {
      try {
        var reviewsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reviews");
        var reviews = [];
        if (reviewsSheet) {
          var rData = reviewsSheet.getDataRange().getValues();
          var rHeaders = rData[0];
          
          for (var r = 1; r < rData.length; r++) {
            var row = rData[r];
            var review = {};
            var hasData = false;
            
            for (var col = 0; col < rHeaders.length; col++) {
              var colName = String(rHeaders[col]).trim();
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
        return ContentService.createTextOutput(JSON.stringify({ status: "success", reviews: reviews }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (params.action === "verify_pin") {
      if (params.pin === CORRECT_PIN) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "PIN verified successfully" }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid Community PIN" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
