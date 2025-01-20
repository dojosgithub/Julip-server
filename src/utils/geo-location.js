const axios = require('axios')

export const getGeolocation = async (ip) => {
  try {
    const { data } = await axios.get(`http://ip-api.com/json/${ip}`)
    return {
      country: data.country,
      city: data.city,
    }
  } catch (error) {
    console.error('Error fetching geolocation:', error)
    return { country: 'Unknown', city: 'Unknown' }
  }
}
