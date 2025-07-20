// Internationalization utility
class I18n {
    constructor() {
        this.currentLanguage = CONFIG.I18N.DEFAULT_LANGUAGE;
        this.translations = {};
        this.fallbackLanguage = CONFIG.I18N.FALLBACK_LANGUAGE;
    }

    // Load translations for a specific language
    async loadTranslations(lang) {
        try {
            const response = await fetch(`${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load translations for ${lang}`);
            }
            
            const translations = await response.json();
            this.translations[lang] = translations;
            
            if (lang === this.currentLanguage) {
                this.updateAllTranslatableElements();
            }
            
            return translations;
        } catch (error) {
            console.error(`Error loading translations for ${lang}:`, error);
            
            // Fallback to default language
            if (lang !== this.fallbackLanguage) {
                return this.loadTranslations(this.fallbackLanguage);
            }
            
            return {};
        }
    }

    // Set the current language
    async setLanguage(lang, showNotification = false) {
        if (!CONFIG.I18N.SUPPORTED_LANGUAGES.includes(lang)) {
            console.warn(`Language ${lang} is not supported`);
            return;
        }

        // Load translations if not already loaded
        if (!this.translations[lang]) {
            await this.loadTranslations(lang);
        }

        this.currentLanguage = lang;
        
        // Update document direction
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        // Update all translatable elements
        this.updateAllTranslatableElements();
        
        // Update language switcher
        this.updateLangSwitcherActive();
        
        // Save language preference
        localStorage.setItem('preferredLanguage', lang);
        
        if (showNotification) {
            showMessage(t('language_changed'), 'success');
        }
    }

    // Get translation for a key
    t(key, params = {}) {
        const translation = this.getTranslation(key);
        
        if (!translation) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }
        
        // Replace parameters in translation
        let result = translation;
        for (const [param, value] of Object.entries(params)) {
            result = result.replace(new RegExp(`{{${param}}}`, 'g'), value);
        }
        
        return result;
    }

    // Get translation for a key (internal method)
    getTranslation(key) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLanguage];
        
        // Try current language
        for (const k of keys) {
            if (translation && translation[k]) {
                translation = translation[k];
            } else {
                translation = null;
                break;
            }
        }
        
        // Fallback to fallback language
        if (!translation && this.currentLanguage !== this.fallbackLanguage) {
            translation = this.translations[this.fallbackLanguage];
            for (const k of keys) {
                if (translation && translation[k]) {
                    translation = translation[k];
                } else {
                    translation = null;
                    break;
                }
            }
        }
        
        return translation;
    }

    // Update all translatable elements on the page
    updateAllTranslatableElements() {
        // Update elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (translation) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        // Update elements with data-i18n-placeholder attribute
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            
            if (translation) {
                element.placeholder = translation;
            }
        });

        // Update title attributes
        const titleElements = document.querySelectorAll('[title]');
        titleElements.forEach(element => {
            const titleKey = element.getAttribute('title');
            const translation = this.t(titleKey);
            
            if (translation && translation !== titleKey) {
                element.title = translation;
            }
        });
    }

    // Create modern language switcher
    createModernLangSwitcher() {
        const container = document.getElementById('languageSwitcher');
        if (!container) return;

        container.innerHTML = '';
        
        CONFIG.I18N.SUPPORTED_LANGUAGES.forEach(lang => {
            const langBtn = document.createElement('button');
            langBtn.className = `lang-btn ${lang === this.currentLanguage ? 'active' : ''}`;
            langBtn.setAttribute('data-lang', lang);
            langBtn.setAttribute('title', this.getLanguageName(lang));
            
            const flagIcon = document.createElement('img');
            flagIcon.src = `icons/${lang === 'ar' ? 'egypt' : 'usa'}.svg`;
            flagIcon.alt = this.getLanguageName(lang);
            flagIcon.className = 'lang-flag';
            
            const langText = document.createElement('span');
            langText.className = 'lang-text';
            langText.textContent = this.getLanguageCode(lang);
            
            langBtn.appendChild(flagIcon);
            langBtn.appendChild(langText);
            
            langBtn.addEventListener('click', () => {
                this.setLanguage(lang, true);
            });
            
            container.appendChild(langBtn);
        });
    }

    // Update language switcher active state
    updateLangSwitcherActive() {
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            const lang = btn.getAttribute('data-lang');
            if (lang === this.currentLanguage) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Get language name
    getLanguageName(lang) {
        const names = {
            'ar': 'العربية',
            'en': 'English'
        };
        return names[lang] || lang;
    }

    // Get language code
    getLanguageCode(lang) {
        const codes = {
            'ar': 'AR',
            'en': 'EN'
        };
        return codes[lang] || lang.toUpperCase();
    }

    // Initialize i18n
    async initialize() {
        // Load preferred language from localStorage
        const preferredLanguage = localStorage.getItem('preferredLanguage');
        const initialLanguage = preferredLanguage || this.currentLanguage;
        
        // Load translations for current language
        await this.loadTranslations(initialLanguage);
        
        // Set language
        await this.setLanguage(initialLanguage);
        
        // Create language switcher
        this.createModernLangSwitcher();
    }

    // Get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Get supported languages
    getSupportedLanguages() {
        return CONFIG.I18N.SUPPORTED_LANGUAGES;
    }
}

// Create singleton instance
const i18n = new I18n();

// Global translation function
function t(key, params = {}) {
    return i18n.t(key, params);
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18n, t };
} else {
    // Make available globally for browser
    window.i18n = i18n;
    window.t = t;
} 