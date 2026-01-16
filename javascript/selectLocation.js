const TomSelect = require('tom-select').default;
const { ipcRenderer } = require('electron');

async function initSelectLocation() {
  let savedSettings = {};
  try {
    savedSettings = await ipcRenderer.invoke('get-settings') || {};
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }

  const commonConfig = {
    valueField: 'name',
    labelField: 'name',
    searchField: 'name',
    maxOptions: 500,
  };

  // Initialisation Country
  const countrySelect = new TomSelect('#countryInput', {
    ...commonConfig,
    placeholder: 'Select a country',
    preload: true,
    load: async (query, callback) => {
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions');
        const json = await res.json();
        callback(json.data);

        // Valeur par défaut initiale
        if (!countrySelect.getValue()) {
          if (savedSettings.country) {
            countrySelect.setValue(savedSettings.country);
          } else {
            countrySelect.setValue('Tunisia');
          }
        }
      } catch (e) {
        callback();
      }
    }
  });

  // Initialisation City (commence en mode grisé/désactivé)
  const citySelect = new TomSelect('#cityInput', {
    ...commonConfig,
    placeholder: 'Select a city',
  });
  citySelect.disable(); // Grisé par défaut au chargement

  // Fonction de chargement des villes
  async function loadCities(countryName, defaultCity = null) {
    try {
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName })
      });
      const json = await res.json();

      if (json.data) {
        citySelect.addOptions(json.data.map(city => ({ name: city })));
        citySelect.enable(); // Activer le champ une fois les données reçues

        if (defaultCity) {
          citySelect.setValue(defaultCity);
        }
      }
    } catch (e) {
      console.error('Erreur:', e);
    }
  }

  // Logique de changement de pays
  countrySelect.on('change', (value) => {
    // Action systématique : on vide et on grise la ville dès que le pays change
    citySelect.clear();
    citySelect.clearOptions();
    citySelect.disable();

    if (value) {
      // Si un pays est sélectionné, on lance le chargement
      let defaultCity = null;
      if (savedSettings.country && value === savedSettings.country) {
        defaultCity = savedSettings.city;
      } else if (value === 'Tunisia') {
        defaultCity = 'Tunis';
      }
      loadCities(value, defaultCity);
    }
  });
}

module.exports = { initSelectLocation };
