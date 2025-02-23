// content.js
class PageTranslator {
    constructor() {
        this.isTranslating = false;
        this.targetLanguage = 'en';
        this.alwaysTranslateImages = false;
        this.originalTexts = new Map();
        this.translationCache = new Map();
        this.isProcessingTranslation = false;
        this.lastTranslationTime = 0;
        this.minimumTranslationInterval = 0;
        
        // Request throttling
        this.requestCount = 0;
        this.maxRequestsPerMinute = 2000;
        this.requestResetTime = Date.now();
        this.backoffDelay = 50;
        this.maxBackoffDelay = 200;
        this.isInCooldown = false;
        this.cooldownTimer = null;
        this.lastResetTime = Date.now();
        
        // Load initial state
        chrome.storage.local.get(['isTranslating', 'selectedLanguage', 'alwaysTranslateImages'], (result) => {
          if (result.isTranslating) {
            this.isTranslating = result.isTranslating;
            this.targetLanguage = result.selectedLanguage || 'en';
            this.alwaysTranslateImages = result.alwaysTranslateImages || false;
            this.translatePage();
          }
        });
      
        this.setupMessageListener();
        this.setupMutationObserver();

        // Regular cleanup of request count
        setInterval(() => {
          const now = Date.now();
          if (now - this.lastResetTime >= 15000) { // More frequent reset
            this.requestCount = Math.max(0, this.requestCount - 50); // More gradual reduction
            this.lastResetTime = now;
            if (this.requestCount < this.maxRequestsPerMinute / 2) {
              this.isInCooldown = false;
              this.backoffDelay = 250; // Reset to initial backoff
            }
          }
        }, 2500); // Check more frequently
    }
  
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          switch(message.type) {
            case 'TOGGLE_TRANSLATION':
              if (this.isTranslating && message.state) {
                this.restoreOriginalContent();
              }
              
              this.isTranslating = message.state;
              this.targetLanguage = message.languages[0];
              this.alwaysTranslateImages = message.alwaysTranslateImages || false;
              
              if (this.isTranslating) {
                this.translatePage();
              } else {
                this.restoreOriginalContent();
              }
              break;
              
            case 'UPDATE_LANGUAGES':
              if (this.isTranslating) {
                this.restoreOriginalContent();
                this.targetLanguage = message.languages[0];
                this.translatePage();
              }
              break;
              
            case 'UPDATE_SETTINGS':
              this.alwaysTranslateImages = message.alwaysTranslateImages;
              if (this.isTranslating) {
                this.translatePage();
              }
              break;
          }
        });
    }
  
    setupMutationObserver() {
      let pendingNodes = new Set();
      let debounceTimer = null;
      const debounceDelay = 2000;
      const maxBatchSize = 100;

      const processNode = (node) => {
        if (node.classList?.contains('translation-overlay') ||
            node.closest('.translation-overlay') ||
            node.hasAttribute('data-has-translation') ||
            node.querySelector('[data-has-translation]') ||
            node.hasAttribute('data-original-text') ||
            node.closest('[data-original-text]')) {
          return false;
        }

        if (node.nodeName === 'SCRIPT' || 
            node.nodeName === 'STYLE' || 
            node.nodeName === 'NOSCRIPT' ||
            node.nodeName === 'META' ||
            node.nodeName === 'LINK' ||
            node.classList?.contains('translation-ignore')) {
          return false;
        }

        if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
          return false;
        }

        return true;
      };

      const observer = new MutationObserver((mutations) => {
        if (!this.isTranslating) return;

        let hasNewContent = false;

        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && processNode(node)) {
              pendingNodes.add(node);
              hasNewContent = true;
            }
          });

          if (mutation.type === 'characterData' && 
              mutation.target.parentElement && 
              processNode(mutation.target.parentElement)) {
            pendingNodes.add(mutation.target.parentElement);
            hasNewContent = true;
          }
        });

        if (hasNewContent) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            if (pendingNodes.size > 0) {
              this.translatePage();
              pendingNodes.clear();
            }
          }, debounceDelay);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  
    getTextNodes(root) {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent || 
                parent.closest('script, style, noscript') ||
                parent.hasAttribute('data-original-text') ||
                !node.textContent.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
  
      const nodes = [];
      let node;
      while (node = walker.nextNode()) {
        nodes.push(node);
      }
      return nodes;
    }
  
    getPageLanguage() {
      const htmlLang = document.documentElement.lang;
      if (htmlLang) {
        return htmlLang.split('-')[0];
      }

      const metaLang = document.querySelector('meta[http-equiv="content-language"]');
      if (metaLang) {
        return metaLang.content.split('-')[0];
      }

      const textNodes = this.getTextNodes(document.body);
      const textSample = textNodes
        .map(node => node.textContent.trim())
        .filter(text => text.length > 20)
        .slice(0, 10)
        .join(' ');

      if (textSample.length > 100) {
        return navigator.language.split('-')[0];
      }

      return null;
    }

    async translatePage() {
      if (this.isProcessingTranslation) return;

      const now = Date.now();

      // More frequent reset of request count
      if (now - this.requestResetTime >= 30000) {
        this.requestCount = Math.max(0, this.requestCount - 75);
        this.requestResetTime = now;
        if (this.requestCount < this.maxRequestsPerMinute / 2) {
          this.isInCooldown = false;
          this.backoffDelay = 500;
        }
      }

      // Only block if we're really hitting limits
      if (this.isInCooldown && this.requestCount >= this.maxRequestsPerMinute) {
        return;
      }

      if (now - this.lastTranslationTime < this.minimumTranslationInterval) return;

      const sourceLanguage = this.getPageLanguage();
      if (sourceLanguage === null) return;
      
      const shouldTranslateText = sourceLanguage !== this.targetLanguage;
      const shouldTranslateImages = this.alwaysTranslateImages || sourceLanguage !== this.targetLanguage;

      if (!shouldTranslateText && !shouldTranslateImages) return;

      try {
        this.isProcessingTranslation = true;
        
        if (shouldTranslateText) {
          const textNodes = this.getTextNodes(document.body);
          const uniqueTexts = new Set();
          textNodes.forEach(node => {
            const text = node.textContent.trim();
            if (text) uniqueTexts.add(text);
          });

          // Process in smaller chunks
          const texts = Array.from(uniqueTexts);
          const chunkSize = 20;
          const translationMap = new Map();

          for (let i = 0; i < texts.length; i += chunkSize) {
            const chunk = texts.slice(i, i + chunkSize);
            const translations = await Promise.all(
              chunk.map(async text => {
                const cacheKey = `text:${text}:${this.targetLanguage}`;
                if (this.translationCache.has(cacheKey)) {
                  return [text, this.translationCache.get(cacheKey)];
                }
                try {
                  const translated = await this.requestTranslation(text, this.targetLanguage);
                  this.translationCache.set(cacheKey, translated);
                  return [text, translated];
                } catch (error) {
                  return [text, null];
                }
              })
            );
            
            translations.forEach(([text, translated]) => {
              if (translated) translationMap.set(text, translated);
            });

            if (i + chunkSize < texts.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
      
          textNodes.forEach(node => {
            const originalText = node.textContent.trim();
            if (!originalText) return;
      
            const translatedText = translationMap.get(originalText);
            if (!translatedText) return;

            const parent = node.parentElement;
            parent.setAttribute('data-original-text', originalText);
            this.originalTexts.set(parent, originalText);
            node.textContent = translatedText;
          });
        }

        if (shouldTranslateImages) {
          await this.translateImageText();
        }
        
        this.lastTranslationTime = Date.now();
      } catch (error) {
        console.error('Translation error:', error);
      } finally {
        this.isProcessingTranslation = false;
      }
    }
  
    async requestTranslation(text, targetLang) {
      return new Promise((resolve, reject) => {
        const cacheKey = `text:${text}:${targetLang}`;
        if (this.translationCache.has(cacheKey)) {
          return resolve(this.translationCache.get(cacheKey));
        }

        if (this.requestCount >= this.maxRequestsPerMinute) {
          reject(new Error('Rate limit exceeded'));
          return;
        }

        this.requestCount++;

        chrome.runtime.sendMessage({
          type: 'TRANSLATE_CHUNK',
          text: text,
          targetLang: targetLang
        }, response => {
          if (chrome.runtime.lastError) {
            this.requestCount--;
            reject(chrome.runtime.lastError);
            return;
          }
          if (response?.error) {
            this.requestCount--;
            if (response.error.includes('403')) {
              this.enterCooldown();
            }
            reject(response.error);
          } else if (response?.translatedText) {
            this.translationCache.set(cacheKey, response.translatedText);
            resolve(response.translatedText);
          } else {
            this.requestCount--;
            reject(new Error('Invalid response'));
          }
        });
      });
    }

    async translateImageText() {
        const sourceLanguage = this.getPageLanguage();
        
        if (sourceLanguage === this.targetLanguage && !this.alwaysTranslateImages) {
            return;
        }

        const images = Array.from(document.querySelectorAll('img'))
          .filter(img => 
            img.width >= 100 && 
            img.height >= 30 && 
            img.complete && 
            !img.hasAttribute('data-has-translation') &&
            !img.closest('.translation-overlay'));

        const batchSize = 10;
        for (let i = 0; i < images.length; i += batchSize) {
          const batch = images.slice(i, i + batchSize);
          await Promise.all(batch.map(img => this.processImage(img)));
        }
        
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.processImage(entry.target);
              observer.unobserve(entry.target);
            }
          });
        }, {
          rootMargin: '50px'
        });

        images.forEach(img => {
          if (img.width >= 100 && img.height >= 30 && img.complete) {
            observer.observe(img);
          }
        });
    }

    async processImage(img) {
        try {
            const imageData = await this.getImageData(img);
            const result = await this.requestImageTextTranslation(imageData, this.targetLanguage);
      
            if (result?.translatedText?.trim()) {
                const translationKey = `${img.src}:${this.targetLanguage}`;
                if (img.hasAttribute('data-has-translation') || 
                    this.translationCache.has(translationKey)) {
                  return;
                }
                img.setAttribute('data-has-translation', 'true');
                this.translationCache.set(translationKey, result.translatedText);

                const computedStyle = window.getComputedStyle(img);
                const originalDisplay = computedStyle.display;
                const originalPosition = computedStyle.position;
                const originalWidth = img.offsetWidth + 'px';
                const originalHeight = img.offsetHeight + 'px';

                const wrapper = document.createElement('div');
                wrapper.style.cssText = `
                  position: relative;
                  display: ${originalDisplay};
                  width: ${originalWidth};
                  height: ${originalHeight};
                  line-height: 0;
                `;
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);

                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';

                const visibilityObserver = new MutationObserver(() => {
                  if (!img.offsetParent || img.offsetWidth === 0 || img.offsetHeight === 0) {
                    visibilityObserver.disconnect();
                    if (wrapper.parentNode) {
                      wrapper.parentNode.insertBefore(img, wrapper);
                      wrapper.remove();
                    }
                    img.style.width = originalWidth;
                    img.style.height = originalHeight;
                    img.style.objectFit = '';
                    img.removeAttribute('data-has-translation');
                  }
                });

                visibilityObserver.observe(img, {
                  attributes: true,
                  attributeFilter: ['style', 'class']
                });

                const overlay = document.createElement('div');
                overlay.className = 'translation-overlay';
                overlay.style.cssText = `
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  display: flex;
                  align-items: flex-end;
                  pointer-events: none;
                  z-index: 1000;
                `;

                const content = document.createElement('div');
                content.style.cssText = `
                  width: 100%;
                  padding: 8px;
                  background: rgba(0, 0, 0, 0.7);
                  color: white;
                  white-space: pre-line;
                  pointer-events: none;
                  font-size: ${Math.max(14, Math.min(img.width / 40, img.height / 15, 24))}px;
                  line-height: 1.4;
                  text-align: left;
                `;
                content.textContent = result.translatedText;
                overlay.appendChild(content);
                wrapper.appendChild(overlay);
                this.originalTexts.set(overlay, '');
            }
        } catch (error) {
            console.error('Image processing error:', error);
            console.error('Failed image:', img.src);
        }
    }

    async requestImageTextTranslation(imageData, targetLang) {
      return new Promise((resolve, reject) => {
        const hashKey = `img:${this.hashCode(imageData)}:${targetLang}`;
        if (this.translationCache.has(hashKey)) {
          return resolve(this.translationCache.get(hashKey));
        }

        if (this.requestCount >= this.maxRequestsPerMinute) {
          reject(new Error('Rate limit exceeded'));
          return;
        }

        this.requestCount++;

        chrome.runtime.sendMessage({
          type: 'TRANSLATE_IMAGE_TEXT',
          imageData: imageData,
          targetLang: targetLang
        }, response => {
          if (chrome.runtime.lastError) {
            this.requestCount--;
            reject(chrome.runtime.lastError);
            return;
          }
          if (response?.error) {
            this.requestCount--;
            if (response.error.includes('403')) {
              this.enterCooldown();
            }
            reject(response.error);
          } else {
            this.translationCache.set(hashKey, response);
            resolve(response);
          }
        });
      });
    }

    enterCooldown() {
      if (this.cooldownTimer) {
        clearTimeout(this.cooldownTimer);
      }

      this.isInCooldown = true;
      
      // Simple cooldown: just wait a short time and reset
      this.cooldownTimer = setTimeout(() => {
        this.isInCooldown = false;
        this.requestCount = Math.floor(this.maxRequestsPerMinute * 0.2); // Reset to 20% of max
        this.backoffDelay = 50; // Reset to initial backoff
      }, 1000); // Very short cooldown
    }

    hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    }

    async getImageData(img) {
      // For blob URLs, we need to convert to base64
      if (img.src.startsWith('blob:')) {
        try {
          const response = await fetch(img.src);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to process blob image'));
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Failed to process blob URL:', error);
          throw error;
        }
      }
      
      // For regular URLs, just return the URL directly
      return img.src;
    }
  
    restoreOriginalContent() {
      this.originalTexts.forEach((originalText, element) => {
        const textNode = Array.from(element.childNodes)
          .find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) {
          textNode.textContent = originalText;
        }
        element.removeAttribute('data-original-text');
      });
      this.originalTexts.clear();
    }
}

const translator = new PageTranslator();
