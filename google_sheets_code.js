/**
 * Google Apps Script for HelpFind Google Sheet Integration
 * 
 * Instructions:
 * 1. Open your Google Sheet "HelpFindHomes".
 * 2. Click "Extensions" > "Apps Script".
 * 3. Delete any default code and paste this script.
 * 4. Save and click "Deploy" > "New deployment".
 * 5. Choose "Web app" as the type.
 * 6. Set "Execute as" to "Me" and "Who has access" to "Anyone".
 * 7. Deploy, authorize permissions, and copy the Web App URL.
 * 8. Paste the Web App URL at the top of your `app.js` under `GOOGLE_SHEETS_API_URL`.
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // CORS configuration
  
  
  try {
    var params = e.parameter;
    if (!params.action) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing action parameter" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    // Find column indexes
    var headersRow = data[0];
    var idCol = headersRow.indexOf("id");
    var timesUsedCol = headersRow.indexOf("Times_Used");
    var ratingCol = headersRow.indexOf("rating");
    var reviewsCol = headersRow.indexOf("reviewCount");
    
    // Fallbacks if columns don't exist yet
    if (idCol === -1) idCol = 0;
    if (timesUsedCol === -1) {
      sheet.insertColumnAfter(headersRow.length);
      sheet.getRange(1, headersRow.length + 1).setValue("Times_Used");
      timesUsedCol = headersRow.length;
      data = sheet.getDataRange().getValues(); // refresh
      headersRow = data[0];
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
      if (rowIdx !== -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Provider ID already exists" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // Append a new provider row
      var newRow = [];
      for (var col = 0; col < headersRow.length; col++) {
        var colName = headersRow[col];
        if (colName === "id") newRow.push(params.id);
        else if (colName === "name") newRow.push(params.name);
        else if (colName === "category") newRow.push(params.category);
        else if (colName === "service" || colName === "Service") newRow.push(params.service || "");
        else if (colName === "phone") newRow.push(params.phone);
        else if (colName === "email") newRow.push(params.email || "");
        else if (colName === "rating") newRow.push(Number(params.rating || 5));
        else if (colName === "reviewCount") newRow.push(1);
        else if (colName === "Times_Used") newRow.push(1);
        else newRow.push("");
      }
      sheet.appendRow(newRow);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Provider registered successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (params.action === "rate") {
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
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", rating: nextRating, reviewCount: nextCount }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
