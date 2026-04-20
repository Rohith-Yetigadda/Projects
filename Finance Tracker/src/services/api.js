import axios from 'axios';

// Example API integration for Exchange Rates (public API with no key required)
export const fetchExchangeRates = async (baseCurrency = 'INR') => {
  try {
    const response = await axios.get(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching exchange rates', error);
    return null;
  }
};
