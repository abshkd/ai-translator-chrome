import React from 'react';
import { createRoot } from 'react-dom/client';

const PopupUI = () => {
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [selectedLanguage, setSelectedLanguage] = React.useState('en');
  const [alwaysTranslateImages, setAlwaysTranslateImages] = React.useState(false);
  
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'zh', name: 'Chinese' }
  ];

  // Rest of the code stays exactly the same...
  React.useEffect(() => {
    chrome.storage.local.get(['isTranslating', 'selectedLanguage', 'alwaysTranslateImages'], (result) => {
      if (result.selectedLanguage) {
        setSelectedLanguage(result.selectedLanguage);
      }
      if (result.isTranslating !== undefined) {
        setIsTranslating(result.isTranslating);
      }
      if (result.alwaysTranslateImages !== undefined) {
        setAlwaysTranslateImages(result.alwaysTranslateImages);
      }
    });
  }, []);

  const handleLanguageChange = (event) => {
    const lang = event.target.value;
    setSelectedLanguage(lang);
    chrome.storage.local.set({ selectedLanguage: lang });
    
    // Update translation if active
    if (isTranslating) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'TOGGLE_TRANSLATION',
          state: true,
          languages: [lang]
        });
      });
    }
  };

  const toggleTranslation = () => {
    const newState = !isTranslating;
    setIsTranslating(newState);
    chrome.storage.local.set({ isTranslating: newState });
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'TOGGLE_TRANSLATION',
        state: newState,
        languages: [selectedLanguage],
        alwaysTranslateImages: alwaysTranslateImages
      });
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Page Translator</h2>
      
      <div className="mb-4">
        <select
          value={selectedLanguage}
          onChange={handleLanguageChange}
          className="w-full p-2 border rounded-lg mb-2"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={alwaysTranslateImages}
            onChange={(e) => {
              const newState = e.target.checked;
              setAlwaysTranslateImages(newState);
              chrome.storage.local.set({ alwaysTranslateImages: newState });
              
              // Update content script if translation is active
              if (isTranslating) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  chrome.tabs.sendMessage(tabs[0].id, { 
                    type: 'UPDATE_SETTINGS',
                    alwaysTranslateImages: newState
                  });
                });
              }
            }}
            className="mr-2 h-4 w-4"
          />
          <span className="text-sm">Always translate images</span>
        </label>
      </div>

      <button 
        onClick={toggleTranslation}
        className={`w-full px-4 py-2 rounded-lg ${
          isTranslating 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-200 text-gray-700'
        }`}
      >
        {isTranslating ? 'Translating...' : 'Start Translation'}
      </button>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<PopupUI />);
