// mockData.js - Actual data for HelpFind retirement community (imported from ProviderList)

const DEFAULT_RESIDENTS = [
  { id: "OAK-1948", name: "Mable Jenkins", address: "104 Clover Lane", hasContributedReview: true },
  { id: "OAK-2026", name: "Harold Vance", address: "218 Peachtree Drive", hasContributedReview: true },
  { id: "OAK-7788", name: "Arthur Pendelton", address: "312 Pine Court", hasContributedReview: false },
  { id: "OAK-5511", name: "Evelyn Rose", address: "105 Clover Lane", hasContributedReview: false },
  { id: "OAK-1234", name: "Frank Miller", address: "401 Maple Way", hasContributedReview: false }
];

const DEFAULT_VENDORS = [
  {
    "id": "v1",
    "name": "Mr. Fixit",
    "category": "Lifestyle & Convenience",
    "service": "Apple/PC Repair",
    "phone": "770-478-6590",
    "email": "contact@mrfixit.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Apple/PC Repair. Location/Note: 120 S Point Blvd, McDonough."
  },
  {
    "id": "v2",
    "name": "Classic Carpet Cleaning",
    "category": "Lifestyle & Convenience",
    "service": "Carpet/Rug Shampoo",
    "phone": "770-233-1774",
    "email": "contact@classiccarpetcleaning.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Carpet/Rug Shampoo."
  },
  {
    "id": "v3",
    "name": "CleanCo",
    "category": "Lifestyle & Convenience",
    "service": "Carpet/Rug Shampoo",
    "phone": "770-228-1068 or 678-357-1394",
    "email": "contact@cleanco.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Carpet/Rug Shampoo. Contact: Charles."
  },
  {
    "id": "v4",
    "name": "Terence Britain, Sr.",
    "category": "Lifestyle & Convenience",
    "service": "Detailing/Pressure Washing",
    "phone": "678-361-7709",
    "email": "terencebrittain@att.net",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Detailing/Pressure Washing."
  },
  {
    "id": "v5",
    "name": "Lillie Mae's Southern Food",
    "category": "Lifestyle & Convenience",
    "service": "Food Vendors",
    "phone": "470-623-3712",
    "email": "contact@lilliemaessouthernfood.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Food Vendors. Contact: Mark."
  },
  {
    "id": "v6",
    "name": "Silvana Milessi",
    "category": "Lifestyle & Convenience",
    "service": "Housekeeping/Maid Service",
    "phone": "404-246-6931",
    "email": "contact@silvanamilessi.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Housekeeping/Maid Service."
  },
  {
    "id": "v7",
    "name": "Cricket Holt",
    "category": "Lifestyle & Convenience",
    "service": "Housekeeping/Maid Service",
    "phone": "678-458-0069",
    "email": "contact@cricketholt.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Housekeeping/Maid Service."
  },
  {
    "id": "v8",
    "name": "Kat Vallish",
    "category": "Lifestyle & Convenience",
    "service": "House/Pet Sitting",
    "phone": "678-468-7561",
    "email": "contact@katvallish.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for House/Pet Sitting."
  },
  {
    "id": "v9",
    "name": "Antonio Acevedo Santiago",
    "category": "Property & Grounds Care",
    "service": "Hill Cutting",
    "phone": "678-614-5136",
    "email": "contact@antonioacevedosantiago.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Hill Cutting."
  },
  {
    "id": "v10",
    "name": "Green Scapes Landscapes",
    "category": "Property & Grounds Care",
    "service": "Landscaping",
    "phone": "678-329-8214",
    "email": "contact@greenscapeslandscapes.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Landscaping."
  },
  {
    "id": "v11",
    "name": "Pedro Martinez",
    "category": "Property & Grounds Care",
    "service": "Landscaping",
    "phone": "678-437-4060",
    "email": "contact@pedromartinez.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Landscaping."
  },
  {
    "id": "v12",
    "name": "Active Pest Control",
    "category": "Property & Grounds Care",
    "service": "Pest Control",
    "phone": "770-339-4500",
    "email": "contact@activepestcontrol.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Pest Control."
  },
  {
    "id": "v13",
    "name": "Blasingame Pest Management, Inc.",
    "category": "Property & Grounds Care",
    "service": "Pest Control",
    "phone": "770-914-1036",
    "email": "contact@blasingamepestmanagementinc.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Pest Control. Contact: Billy Blassingame."
  },
  {
    "id": "v14",
    "name": "Northwest Exterminating",
    "category": "Property & Grounds Care",
    "service": "Pest Control",
    "phone": "770-507-2121",
    "email": "contact@northwestexterminating.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Pest Control."
  },
  {
    "id": "v15",
    "name": "Cleveland Carpets",
    "category": "Home Improvement",
    "service": "Flooring",
    "phone": "770-228-6110",
    "email": "contact@clevelandcarpets.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Flooring."
  },
  {
    "id": "v16",
    "name": "Zebulon Floor and Design Center",
    "category": "Home Improvement",
    "service": "Flooring",
    "phone": "770-567-3365",
    "email": "contact@zebulonflooranddesigncenter.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Flooring. Contact: Michael Griffith."
  },
  {
    "id": "v17",
    "name": "Architectural Glazing Systems",
    "category": "Home Improvement",
    "service": "Glass/Windows",
    "phone": "678-688-1108",
    "email": "contact@architecturalglazingsystems.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Glass/Windows."
  },
  {
    "id": "v18",
    "name": "Aureliano Diaz Painting, LLC",
    "category": "Home Improvement",
    "service": "Painters",
    "phone": "678-488-7887",
    "email": "contact@aurelianodiazpaintingllc.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Painters."
  },
  {
    "id": "v19",
    "name": "The Window Shop",
    "category": "Home Improvement",
    "service": "Window Treatments",
    "phone": "770-228-3799",
    "email": "contact@thewindowshop.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Window Treatments. Location/Note: 15 Pine Street, Williamson, GA 30292."
  },
  {
    "id": "v20",
    "name": "Panam Son Towing & Recovery",
    "category": "General Maintenance",
    "service": "Auto (Tow/Tire)",
    "phone": "404-573-3611",
    "email": "contact@panamsontowingandrecovery.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Auto (Tow/Tire). Contact: Kevin."
  },
  {
    "id": "v21",
    "name": "Greg's Golf Carts",
    "category": "General Maintenance",
    "service": "Golf Cart Repair",
    "phone": "404-932-4020",
    "email": "contact@gregsgolfcarts.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Golf Cart Repair. Contact: Jimmy Greg."
  },
  {
    "id": "v22",
    "name": "Kerry Davis",
    "category": "General Maintenance",
    "service": "Electricians",
    "phone": "770-364-0369",
    "email": "contact@kerrydavis.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Electricians."
  },
  {
    "id": "v23",
    "name": "Transevesa of Georgia, LLC",
    "category": "General Maintenance",
    "service": "Electricians",
    "phone": "404-668-4065",
    "email": "transevesa@gmail.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Electricians. Contact: Mario Rivera."
  },
  {
    "id": "v24",
    "name": "Eric's Maintenance",
    "category": "General Maintenance",
    "service": "Handymen",
    "phone": "404-375-9090",
    "email": "contact@ericsmaintenance.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Handymen. Contact: Eric Kimbrell."
  },
  {
    "id": "v25",
    "name": "Jim Welsch",
    "category": "General Maintenance",
    "service": "Handymen",
    "phone": "770-710-3553",
    "email": "contact@jimwelsch.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Handymen."
  },
  {
    "id": "v26",
    "name": "TLC Handyman",
    "category": "General Maintenance",
    "service": "Handymen",
    "phone": "404-337-8727",
    "email": "contact@tlchandyman.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Handymen. Contact: James Reynolds."
  },
  {
    "id": "v27",
    "name": "Addresses of Distinction",
    "category": "General Maintenance",
    "service": "Mailbox Repair",
    "phone": "770-436-6198",
    "email": "support@aodmailboxes.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Mailbox Repair."
  },
  {
    "id": "v28",
    "name": "A Christian Plumber",
    "category": "General Maintenance",
    "service": "Plumbers",
    "phone": "770-468-3173",
    "email": "contact@achristianplumber.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Plumbers."
  },
  {
    "id": "v29",
    "name": "Plumbing MD Service & Drain",
    "category": "General Maintenance",
    "service": "Plumbers",
    "phone": "470-497-0233",
    "email": "contact@plumbingmdserviceanddrain.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Plumbers. Contact: Matt Dobbs. Location/Note: [link removed]."
  },
  {
    "id": "v30",
    "name": "Roof Pros",
    "category": "General Maintenance",
    "service": "Roofers",
    "phone": "678-231-1112",
    "email": "contact@roofpros.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Roofers. Contact: Mike Fry."
  },
  {
    "id": "v31",
    "name": "Toland Restoration",
    "category": "General Maintenance",
    "service": "Roofers",
    "phone": "404-606-8989",
    "email": "contact@tolandrestoration.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Roofers. Contact: Shane or Josh Toland."
  },
  {
    "id": "v32",
    "name": "Doug Gardner",
    "category": "General Maintenance",
    "service": "Sprinkler Repair",
    "phone": "609-929-9975",
    "email": "isbd@comcast.net",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Sprinkler Repair."
  },
  {
    "id": "v33",
    "name": "Jose Lopez",
    "category": "General Maintenance",
    "service": "Sprinkler Repair",
    "phone": "678-751-9674",
    "email": "contact@joselopez.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for Sprinkler Repair."
  },
  {
    "id": "v34",
    "name": "JMI",
    "category": "General Maintenance",
    "service": "HVAC",
    "phone": "770-389-5073",
    "email": "contact@jmi.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for HVAC."
  },
  {
    "id": "v35",
    "name": "Nail Heating & Air",
    "category": "General Maintenance",
    "service": "HVAC",
    "phone": "770-946-8088",
    "email": "contact@nailheatingandair.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for HVAC."
  },
  {
    "id": "v36",
    "name": "Pillar Heating and Air",
    "category": "General Maintenance",
    "service": "HVAC",
    "phone": "470-777-4353",
    "email": "contact@pillarheatingandair.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for HVAC."
  },
  {
    "id": "v37",
    "name": "Snowflow Heating & Cooling LLC",
    "category": "General Maintenance",
    "service": "HVAC",
    "phone": "678-538-5008",
    "email": "snowflowhvac@gmail.com",
    "isPremium": false,
    "hasLeadsPlan": false,
    "rating": 5.0,
    "reviewCount": 1,
    "minJobCost": 50,
    "offersSeniorDiscount": true,
    "punctualityScore": 100,
    "timesUsed": 1,
    "description": "Trusted provider for HVAC. Contact: Shane Snow."
  }
];

const DEFAULT_REVIEWS = [
  {
    "id": "r1",
    "vendorId": "v1",
    "authorName": "Mable Jenkins",
    "authorAddress": "104 Clover Lane",
    "authorResidentId": "OAK-1948",
    "date": "2026-06-12",
    "rating": 5,
    "cost": 50,
    "punctual": true,
    "honoredQuote": true,
    "proofOfService": "INV-99281",
    "aiProofText": "Recommendation verified via community PIN entry.",
    "comment": "Mr. Fixit resolved my computer wifi issue quickly. Very polite."
  },
  {
    "id": "r2",
    "vendorId": "v23",
    "authorName": "Harold Vance",
    "authorAddress": "218 Peachtree Drive",
    "authorResidentId": "OAK-2026",
    "date": "2026-05-30",
    "rating": 5,
    "cost": 150,
    "punctual": true,
    "honoredQuote": true,
    "proofOfService": "INV-5512",
    "aiProofText": "Recommendation verified via community PIN entry.",
    "comment": "Mario installed our outdoor floodlights, very professional work."
  },
  {
    "id": "r3",
    "vendorId": "v28",
    "authorName": "Mable Jenkins",
    "authorAddress": "104 Clover Lane",
    "authorResidentId": "OAK-1948",
    "date": "2026-06-20",
    "rating": 5,
    "cost": 50,
    "punctual": true,
    "honoredQuote": true,
    "proofOfService": "INV-2029",
    "aiProofText": "Recommendation verified via community PIN entry.",
    "comment": "Excellent service repairing our kitchen sink leak. Highly recommend!"
  }
];

const DEFAULT_LEADS = [
  {
    "id": "l1",
    "vendorId": "v1",
    "residentName": "Evelyn Rose",
    "residentAddress": "105 Clover Lane",
    "residentPhone": "(555) 012-3456",
    "serviceNeeded": "Need help setting up my new email account on my laptop.",
    "dateCreated": "2026-07-01",
    "status": "Pending"
  }
];

const CATEGORY_SERVICES = {
  "Lifestyle & Convenience": [
    "Apple/PC Repair",
    "Carpet/Rug Shampoo",
    "Detailing/Pressure Washing",
    "Food Vendors",
    "Housekeeping/Maid Service",
    "House/Pet Sitting"
  ],
  "Property & Grounds Care": [
    "Hill Cutting",
    "Landscaping",
    "Pest Control"
  ],
  "Home Improvement": [
    "Flooring",
    "Glass/Windows",
    "Painters",
    "Window Treatments"
  ],
  "General Maintenance": [
    "Auto (Tow/Tire)",
    "Golf Cart Repair",
    "Electricians",
    "Handymen",
    "Mailbox Repair",
    "Plumbers",
    "Roofers",
    "Sprinkler Repair",
    "HVAC"
  ],
  "ZZZ Other Category": [
    "Other Service"
  ]
};

// Initialize localStorage with default data if empty or outdated
function initDatabase(forceReset = false) {
  // Force reset if legacy mock database (containing Dave) is detected in local storage
  const cached = localStorage.getItem("helpfind_vendors");
  if (cached) {
    try {
      const list = JSON.parse(cached);
      const isOld = list.some(v => v.id === "v1" && v.name.includes("Dave"));
      if (isOld) {
        console.log("Old mock data detected. Resetting localStorage to load actual ProviderList...");
        forceReset = true;
      }
    } catch (e) {
      console.error("Failed to parse cached vendors for reset check:", e);
    }
  }

  if (forceReset) {
    localStorage.removeItem("helpfind_residents");
    localStorage.removeItem("helpfind_vendors");
    localStorage.removeItem("helpfind_reviews");
    localStorage.removeItem("helpfind_leads");
  }

  if (!localStorage.getItem("helpfind_residents")) {
    localStorage.setItem("helpfind_residents", JSON.stringify(DEFAULT_RESIDENTS));
  }
  if (!localStorage.getItem("helpfind_vendors")) {
    localStorage.setItem("helpfind_vendors", JSON.stringify(DEFAULT_VENDORS));
  } else {
    // Migration: Ensure timesUsed, service, and synced properties exist on all cached vendors
    try {
      const cached = JSON.parse(localStorage.getItem("helpfind_vendors"));
      let updated = false;
      cached.forEach(v => {
        if (v.timesUsed === undefined) {
          const def = DEFAULT_VENDORS.find(d => d.id === v.id);
          v.timesUsed = def ? def.timesUsed : 1;
          updated = true;
        }
        if (v.service === undefined) {
          const def = DEFAULT_VENDORS.find(d => d.id === v.id);
          v.service = def ? def.service : "";
          updated = true;
        }
        if (v.synced === undefined) {
          v.synced = true;
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem("helpfind_vendors", JSON.stringify(cached));
      }
    } catch (e) {
      console.error("Failed to migrate vendors database:", e);
    }
  }
  if (!localStorage.getItem("helpfind_reviews")) {
    localStorage.setItem("helpfind_reviews", JSON.stringify(DEFAULT_REVIEWS));
  }
  if (!localStorage.getItem("helpfind_leads")) {
    localStorage.setItem("helpfind_leads", JSON.stringify(DEFAULT_LEADS));
  }
}

// Getters and Setters
function getResidents() {
  return JSON.parse(localStorage.getItem("helpfind_residents"));
}

function getVendors() {
  return JSON.parse(localStorage.getItem("helpfind_vendors"));
}

function getReviews() {
  return JSON.parse(localStorage.getItem("helpfind_reviews"));
}

function getLeads() {
  return JSON.parse(localStorage.getItem("helpfind_leads"));
}

function getCategoryServices() {
  return CATEGORY_SERVICES;
}

function saveResidents(residents) {
  localStorage.setItem("helpfind_residents", JSON.stringify(residents));
}

function saveVendors(vendors) {
  localStorage.setItem("helpfind_vendors", JSON.stringify(vendors));
}

function saveReviews(reviews) {
  localStorage.setItem("helpfind_reviews", JSON.stringify(reviews));
}

function saveLeads(leads) {
  localStorage.setItem("helpfind_leads", JSON.stringify(leads));
}
