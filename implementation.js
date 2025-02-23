// manifest.json
{
  "manifest_version": 3,
  "name": "AI Web Assistant",
  "version": "1.0",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "action": {
    "default_title": "AI Web Assistant"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["sidebar.css"]
  }]
}

// background.js
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: toggleSidebar
  });
});

// content.js
class WebAssistant {
  constructor() {
    this.apiClient = new APIClient();
    this.visionProcessor = new VisionProcessor();
    this.domManager = new DOMManager();
  }

  async analyzeWebPage() {
    // Get visible content and structure
    const pageContent = this.domManager.getVisibleContent();
    const pageStructure = this.domManager.getPageStructure();
    
    // Process with vision model
    const visualElements = await this.visionProcessor.processPage();
    
    return {
      content: pageContent,
      structure: pageStructure,
      visualElements: visualElements
    };
  }

  async handleUserRequest(request) {
    // Sanitize and validate input
    const sanitizedRequest = this.sanitizeInput(request);
    
    // Check for sensitive information patterns
    if (this.containsSensitiveInfo(sanitizedRequest)) {
      return {
        error: "Cannot process requests with sensitive information"
      };
    }

    // Process request based on type
    switch(request.type) {
      case 'translate':
        return await this.handleTranslation(request);
      case 'form_fill':
        return await this.handleFormFill(request);
      case 'search':
        return await this.handleSiteSearch(request);
      case 'advice':
        return await this.handleAdvice(request);
      default:
        return await this.handleGeneralQuery(request);
    }
  }

  async handleTranslation(request) {
    const content = this.domManager.getSelectedText();
    return await this.apiClient.translate(content, request.targetLanguage);
  }

  async handleFormFill(request) {
    const formElements = this.domManager.getFormElements();
    const suggestions = await this.apiClient.getFormSuggestions(
      formElements,
      request.context
    );
    return this.domManager.fillFormFields(suggestions);
  }

  async handleSiteSearch(request) {
    const pageContent = await this.analyzeWebPage();
    return await this.apiClient.searchContent(
      pageContent,
      request.query
    );
  }

  containsSensitiveInfo(request) {
    const patterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{16}\b/,            // Credit Card
      /password/i,             // Passwords
      // Add more patterns as needed
    ];
    
    return patterns.some(pattern => pattern.test(request));
  }
}

class APIClient {
  constructor() {
    this.baseUrl = 'https://your-backend-api.com';
    this.endpoints = {
      chat: '/chat',
      vision: '/vision',
      translate: '/translate'
    };
  }

  async makeRequest(endpoint, payload) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }
}

class VisionProcessor {
  async processPage() {
    // Capture visible viewport
    const screenshot = await this.captureViewport();
    
    // Process with vision model
    const elements = await this.detectElements(screenshot);
    
    return elements;
  }

  async captureViewport() {
    // Implementation for capturing viewport
  }

  async detectElements(screenshot) {
    // Implementation for element detection
  }
}

class DOMManager {
  getVisibleContent() {
    // Extract visible text content
    return document.body.innerText;
  }

  getPageStructure() {
    // Get relevant DOM structure
    return this.serializeDOM(document.body);
  }

  getFormElements() {
    // Get all form elements
    return document.querySelectorAll('input, select, textarea');
  }

  serializeDOM(element) {
    // Serialize DOM structure while excluding sensitive elements
    const sensitiveSelectors = [
      'input[type="password"]',
      'input[name*="card"]',
      'input[name*="ssn"]'
    ];
    
    // Implementation for DOM serialization
  }

  fillFormFields(suggestions) {
    // Safely fill form fields with suggestions
  }
}