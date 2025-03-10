chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message in background:', message);
    
    if (message.type === 'TRANSLATE_CHUNK') {
      handleTranslation(message.text, message.targetLang)
        .then(translatedText => {
          console.log('Translation successful');
          sendResponse({ translatedText });
        })
        .catch(error => {
          console.error('Translation failed:', error);
          sendResponse({ error: error.message });
        });
      return true; // Required for async response
    }
    
    if (message.type === 'TRANSLATE_IMAGE_TEXT') {
      requestImageTextTranslation(message.imageData, message.targetLang)
        .then(result => {
          console.log('Image translation successful');
          sendResponse(result);
        })
        .catch(error => {
          console.error('Image translation failed:', error);
          sendResponse({ error: error.message });
        });
      return true; // Required for async response
    }
  });

  const DEFAULT_TEXT_MODEL = 'google/gemini-2.0-flash-001';
  const DEFAULT_IMAGE_MODEL = 'google/gemini-flash-1.5-8b';

  // Cache for API settings
  let apiSettings = null;

  // Pre-fetch API settings on startup
  function initializeApiSettings() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'textModel', 'imageModel'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to load API settings:', chrome.runtime.lastError);
          return;
        }

        if (!result.apiKey || !result.apiEndpoint) {
          console.error('API settings not configured');
          return;
        }

        apiSettings = {
          apiKey: result.apiKey,
          apiEndpoint: result.apiEndpoint,
          textModel: result.textModel || DEFAULT_TEXT_MODEL,
          imageModel: result.imageModel || DEFAULT_IMAGE_MODEL
        };
        resolve(apiSettings);
      });
    });
  }

  // Initialize settings on startup
  initializeApiSettings();

  // Watch for settings changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      if (changes.apiKey || changes.apiEndpoint || changes.textModel || changes.imageModel) {
        initializeApiSettings();
      }
    }
  });

  // Function to get API settings
  async function getApiSettings() {
    if (apiSettings) {
      return apiSettings;
    }
    return initializeApiSettings();
  }

  async function handleTranslation(text, targetLang) {
    console.log('Making OpenRouter request');
    
    try {
      const settings = await getApiSettings();
      
      const response = await fetch(settings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
          'HTTP-Referer': 'https://airith.com',
          'X-Title': 'AI Web Assistant'
        },
        body: JSON.stringify({
          model: settings.textModel,
          messages: [
            {
              role: 'system',
              content: `You are a translation assistant. Translate the following text to ${targetLang}. 
                       Preserve the original formatting and structure as much as possible. 
                       Only respond with the translation, no additional text.`
            },
            {
              role: 'user',
              content: text
            }
          ]
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('OpenRouter response:', data);
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw error;
    }
  }

  async function requestImageTextTranslation(imageData, targetLang) {
    try {
      const settings = await getApiSettings();
      
      const response = await fetch(settings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
          'HTTP-Referer': 'https://airith.com',
          'X-Title': 'AI Web Assistant'
        },
        body: JSON.stringify({
          model: settings.imageModel,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract any text from this image and translate it to ${targetLang}.
                        If the image text is same as target language return empty string.
                        If there is no text in the image return empty string. 
                        Return only the translated text if available without any explanation.`
                },
                {
                  type: 'image_url',
                  image_url: imageData
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    
      const data = await response.json();
      return { translatedText: data.choices[0].message.content };
    } catch (error) {
      console.error('Image translation API error:', error);
      throw error;
    }
  }
