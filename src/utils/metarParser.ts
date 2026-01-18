
export interface ParsedMetar {
  wind: string;
  visibility: string;
  ceiling: string;
  condition: string;
}

export const parseMetar = (raw: string): ParsedMetar => {
  if (!raw) return { wind: 'N/A', visibility: 'N/A', ceiling: 'N/A', condition: 'N/A' };
  
  const parts = raw.split(' ');
  let wind = 'N/A';
  let visibility = 'N/A';
  let ceiling = 'N/A';
  let condition = 'N/A';

  // Wind
  const windMatch = raw.match(/\b(\d{3}|VRB)(\d{2})(?:G(\d{2}))?KT\b/);
  if (windMatch) {
    wind = `${windMatch[1]}°/${windMatch[2]}kt`;
    if (windMatch[3]) wind += ` G${windMatch[3]}`;
  }

  // Visibility (Brazil uses expected 4 digits for meters or 9999/CAVOK)
  if (raw.includes('CAVOK')) {
    visibility = '10km+';
    ceiling = 'None';
    condition = 'No Wx';
  } else {
    const visMatch = raw.match(/\b(\d{4})\b/);
    if (visMatch) {
        const v = parseInt(visMatch[1]);
        visibility = v === 9999 ? '10km+' : `${v}m`;
    }
  }

  // Ceiling (First BKN or OVC or VV)
  if (ceiling === 'N/A') {
      const cloudMatch = raw.match(/\b(BKN|OVC|VV)(\d{3})\b/);
      if (cloudMatch) {
          ceiling = `${cloudMatch[1]} ${cloudMatch[2]}`;
      } else if (raw.includes('NSC') || raw.includes('SKC')) {
          ceiling = 'None';
      }
  }
  
  // Present Weather (Basic codes)
  // Look for codes like -RA, TS, BR, FG, HZ, etc.
  // We exclude cloud codes and standard headers usually.
  // Simplistic regex for common weather codes
  const wxRegex = /\b(-|\+|VC)?(TS|SH|FZ|BL|DR|MI|BC|PR|RA|DZ|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)\b/g;
  const wxMatches = raw.match(wxRegex);
  if (wxMatches) {
      condition = wxMatches.join(' ');
  } else if (condition === 'N/A' && raw.includes('CAVOK')) {
      condition = 'NSW'; // No Significant Weather
  } else if (condition === 'N/A') {
      condition = 'No Wx';
  }

  return { wind, visibility, ceiling, condition };
};
