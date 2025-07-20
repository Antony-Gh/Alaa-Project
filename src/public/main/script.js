// Language switcher implementation
const translations = {
  en: {},
  ar: {},
};

async function loadTranslations(lang) {
  const res = await fetch(`/main/${lang}.json`);
  translations[lang] = await res.json();
}

function setLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  // Update all UI text
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = translations[lang][key] || key;
  });
  localStorage.setItem('lang', lang);
  // If logged in, update user profile language
  if (window.currentUser) {
    fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${window.currentUser.token}`,
      },
      body: JSON.stringify({ language: lang }),
    });
  }
}

// Add language switcher dropdown
const langSwitcher = document.createElement('select');
langSwitcher.id = 'lang-switch';
langSwitcher.innerHTML =
  '<option value="en">English</option><option value="ar">العربية</option>';
document.body.prepend(langSwitcher);
langSwitcher.addEventListener('change', e => setLanguage(e.target.value));

// On load, set language
(async () => {
  await loadTranslations('en');
  await loadTranslations('ar');
  const lang = localStorage.getItem('lang') || 'ar';
  langSwitcher.value = lang;
  setLanguage(lang);
})();
