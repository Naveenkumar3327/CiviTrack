const { GoogleGenerativeAI } = require('@google/generative-ai');

let geminiEnabled = false;
let aiClient = null;

if (process.env.GEMINI_API_KEY) {
  // The SDK uses GEMINI_API_KEY or we can initialize it with the key
  aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("❇️  Gemini AI client initialized successfully.");
  geminiEnabled = true;
} else {
  console.warn("⚠️  GEMINI_API_KEY missing. Local rule-based issue classifier fallback active.");
}

// Allowed categories
const CATEGORIES = [
  'Road Damage', 
  'Garbage', 
  'Street Light', 
  'Water Leakage', 
  'Drainage', 
  'Public Property Damage', 
  'Tourist Place Issue', 
  'Traffic Problem', 
  'Safety Issue', 
  'Other'
];

/**
 * Fallback AI Classifier using keyword scanning
 */
const fallbackAnalyze = (description = '') => {
  const text = description.toLowerCase();
  let category = 'Other';
  let priority = 'Low';
  
  if (text.includes('pothole') || text.includes('road') || text.includes('asphalt') || text.includes('cracks')) {
    category = 'Road Damage';
    priority = 'Medium';
    if (text.includes('accident') || text.includes('severe')) priority = 'High';
  } else if (text.includes('garbage') || text.includes('trash') || text.includes('waste') || text.includes('dumping') || text.includes('litter')) {
    category = 'Garbage';
    priority = 'Low';
    if (text.includes('smell') || text.includes('toxic') || text.includes('rot')) priority = 'Medium';
  } else if (text.includes('light') || text.includes('bulb') || text.includes('darkness') || text.includes('street light')) {
    category = 'Street Light';
    priority = 'Medium';
  } else if (text.includes('leak') || text.includes('water') || text.includes('pipe') || text.includes('burst')) {
    category = 'Water Leakage';
    priority = 'Medium';
    if (text.includes('flood') || text.includes('wasting')) priority = 'High';
  } else if (text.includes('drain') || text.includes('sewer') || text.includes('manhole') || text.includes('clog')) {
    category = 'Drainage';
    priority = 'High';
  } else if (text.includes('vandalism') || text.includes('park') || text.includes('bench') || text.includes('wall') || text.includes('property')) {
    category = 'Public Property Damage';
    priority = 'Low';
  } else if (text.includes('tourist') || text.includes('monument') || text.includes('statue') || text.includes('museum')) {
    category = 'Tourist Place Issue';
    priority = 'Low';
  } else if (text.includes('traffic') || text.includes('signal') || text.includes('jam') || text.includes('intersection')) {
    category = 'Traffic Problem';
    priority = 'Medium';
  } else if (text.includes('safety') || text.includes('crime') || text.includes('hazard') || text.includes('danger') || text.includes('wire')) {
    category = 'Safety Issue';
    priority = 'High';
  }

  // Create a structured summary
  const summary = description.length > 80 
    ? description.substring(0, 77) + '...'
    : description || 'Civic complaint submitted by citizen.';

  return {
    category,
    summary,
    suggestedPriority: priority
  };
};

/**
 * Multimodal Analysis using Gemini 1.5 Flash
 */
const analyzeIssue = async (imageBuffer, mimeType, description = '') => {
  if (!geminiEnabled || !aiClient || !imageBuffer) {
    return fallbackAnalyze(description);
  }

  try {
    const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Format the image buffer for Gemini inlineData
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType || 'image/jpeg'
      }
    };

    const prompt = `
      You are CiviTrack's AI coordinator helper. Analyze this uploaded picture of a public civic issue and description: "${description}".
      
      Respond STRICTLY in JSON format with the following keys. Do not return markdown, code fencing or extra words.
      - "category": Must be exactly one of the following: "Road Damage", "Garbage", "Street Light", "Water Leakage", "Drainage", "Public Property Damage", "Tourist Place Issue", "Traffic Problem", "Safety Issue", "Other"
      - "summary": A concise one-sentence description summarizing the exact issue observed.
      - "suggestedPriority": Must be "Low", "Medium", or "High" depending on safety hazard levels (e.g. electrical hazards, open manholes, active water bursts are High; small potholes are Medium; litter, graffiti, or broken benches are Low).

      JSON Output:
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text().trim();
    
    // Clean any accidental markdown backticks out of the response
    const jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(jsonStr);

    // Validate category
    if (!CATEGORIES.includes(analysis.category)) {
      analysis.category = 'Other';
    }
    // Validate priority
    if (!['Low', 'Medium', 'High'].includes(analysis.suggestedPriority)) {
      analysis.suggestedPriority = 'Medium';
    }

    return {
      category: analysis.category,
      summary: analysis.summary || 'Uploaded issue.',
      suggestedPriority: analysis.suggestedPriority
    };
  } catch (error) {
    console.error("❌ Gemini API analysis error, executing fallback:", error.message);
    return fallbackAnalyze(description);
  }
};

module.exports = {
  analyzeIssue,
  geminiEnabled
};
