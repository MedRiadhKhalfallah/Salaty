// src/renderer/js/dateUtils.js
// Utilitaires pour la gestion des dates grégorienne et hijri

/**
 * Récupère la date grégorienne à partir de prayerData
 * @param {object} prayerData
 * @returns {string} date grégorienne formatée
 */
function getGregorianDate(prayerData) {
  if (!prayerData?.date?.readable) return '';
  return prayerData.date.readable;
}

/**
 * Récupère la date hijri formatée selon la langue
 * @param {object} prayerData
 * @param {string} lang
 * @param {function} t - fonction de traduction
 * @returns {string} date hijri formatée
 */
function getHijriDate(prayerData, lang, t) {
  if (!prayerData?.date?.hijri) return '';
  const hijri = prayerData.date.hijri;
  const hijriMonth = lang === 'ar' ? hijri.month.ar : hijri.month.en;
  return `${hijri.day} ${hijriMonth} ${hijri.year} ${t('ah')}`;
}

/**
 * Calcule les secondes depuis minuit pour une heure donnée (format HH:mm)
 */
function getSecondsFromTime(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60;
}

/**
 * Formate un nombre de secondes en HH:mm:ss
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

module.exports = {
  getGregorianDate,
  getHijriDate,
  getSecondsFromTime,
  formatTime,
};
