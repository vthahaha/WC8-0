export const countryToFlagCode = {
  'Argentina': 'ar', 'Brazil': 'br', 'Germany': 'de', 'West Germany': 'de', 'East Germany': 'de',
  'Italy': 'it', 'France': 'fr', 'Spain': 'es', 'England': 'gb-eng', 'Uruguay': 'uy',
  'Netherlands': 'nl', 'Croatia': 'hr', 'Belgium': 'be', 'Portugal': 'pt', 'Sweden': 'se',
  'Czechoslovakia': 'cz', 'Czech Republic': 'cz', 'Czechia': 'cz', 'Hungary': 'hu', 'Chile': 'cl',
  'Switzerland': 'ch', 'USA': 'us', 'United States': 'us', 'Mexico': 'mx', 'Japan': 'jp',
  'Senegal': 'sn', 'Colombia': 'co', 'Denmark': 'dk', 'Morocco': 'ma', 'Korea Republic': 'kr',
  'South Korea': 'kr', 'North Korea': 'kp', 'Cameroon': 'cm', 'Nigeria': 'ng', 'Poland': 'pl',
  'Soviet Union': 'ru', 'Russia': 'ru', 'Yugoslavia': 'rs', 'Serbia': 'rs', 'Serbia and Montenegro': 'rs',
  'Austria': 'at', 'Peru': 'pe', 'Romania': 'ro', 'Bulgaria': 'bg', 'Turkey': 'tr', 'Türkiye': 'tr',
  'Ecuador': 'ec', 'Ghana': 'gh', 'Costa Rica': 'cr', 'Paraguay': 'py', 'Algeria': 'dz',
  'Ivory Coast': 'ci', 'Côte D\'Ivoire': 'ci', 'Australia': 'au', 'Saudi Arabia': 'sa', 'Iran': 'ir', 'IR Iran': 'ir',
  'Tunisia': 'tn', 'Egypt': 'eg', 'Wales': 'gb-wls', 'Scotland': 'gb-sct', 'Northern Ireland': 'gb-nir',
  'DR Congo': 'cd', 'Congo DR': 'cd', 'Zaire': 'cd', 'Cuba': 'cu', 'Dutch East Indies': 'id', 'Indonesia': 'id',
  'Bolivia': 'bo', 'Norway': 'no', 'El Salvador': 'sv', 'Israel': 'il', 'Haiti': 'ht',
  'New Zealand': 'nz', 'Honduras': 'hn', 'Kuwait': 'kw', 'Canada': 'ca', 'Iraq': 'iq',
  'Republic of Ireland': 'ie', 'United Arab Emirates': 'ae', 'Greece': 'gr', 'Jamaica': 'jm',
  'South Africa': 'za', 'China': 'cn', 'Slovenia': 'si', 'Angola': 'ao', 'Togo': 'tg',
  'Trinidad and Tobago': 'tt', 'Ukraine': 'ua', 'Slovakia': 'sk', 'Bosnia and Herzegovina': 'ba',
  'Bosnia And Herzegovina': 'ba', 'Iceland': 'is', 'Panama': 'pa', 'Qatar': 'qa', 'Cabo Verde': 'cv',
  'Curaçao': 'cw', 'Jordan': 'jo', 'Uzbekistan': 'uz'
};

export const getFlagUrl = (teamNameString) => {
  if (!teamNameString) return null;
  // teamNameString might be "Brazil 2002"
  const parts = teamNameString.split(' ');
  parts.pop(); // Remove year
  const nation = parts.join(' ').trim();
  
  const code = countryToFlagCode[nation];
  if (!code) return null;
  
  return `https://flagcdn.com/24x18/${code}.png`;
};
