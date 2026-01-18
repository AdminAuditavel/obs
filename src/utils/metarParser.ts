
export interface ParsedMetar {
  wind: string;
  visibility: string;
  vis_meters: number;
  ceiling: string;
  ceiling_ft: number;
  ceiling_str: string;
  condition: string;
  tooltips: {
    wind: string;
    visibility: string;
    ceiling: string;
    condition: string;
  };
}

export const parseMetar = (raw: string): ParsedMetar => {
  if (!raw) return { 
    wind: 'N/A', visibility: 'N/A', vis_meters: 9999, ceiling: 'N/A', ceiling_ft: 10000, ceiling_str: 'N/A', condition: 'N/A',
    tooltips: { wind: '', visibility: '', ceiling: '', condition: '' }
  };
  
  const parts = raw.split(' ');
  let wind = 'N/A';
  let visibility = 'N/A';
  let vis_meters = 10000;
  let ceiling = 'N/A';
  let ceiling_ft = 10000;
  let ceiling_str = 'N/A';
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
    vis_meters = 10000;
    ceiling = 'None';
    ceiling_ft = 10000;
    ceiling_str = 'Sem Teto';
    condition = 'No Wx';
  } else {
    const visMatch = raw.match(/\b(\d{4})\b/);
    if (visMatch) {
        const v = parseInt(visMatch[1]);
        vis_meters = v;
        visibility = v === 9999 ? '10km+' : `${v}m`;
    }
  }

  // Ceiling (First BKN or OVC or VV)
  // Logic: Find lowest BKN/OVC
  if (ceiling === 'N/A') {
      const cloudMatch = raw.match(/\b(BKN|OVC|VV)(\d{3})\b/);
      if (cloudMatch) {
          const type = cloudMatch[1];
          const heightRaw = parseInt(cloudMatch[2]);
          ceiling_ft = heightRaw * 100;
          ceiling = `${type}${cloudMatch[2]}`;
          ceiling_str = `${ceiling_ft}'`;
      } else if (raw.includes('NSC') || raw.includes('SKC')) {
          ceiling = 'None';
          ceiling_ft = 10000;
          ceiling_str = 'Sem Teto';
      }
  }
  
  // Present Weather (Basic codes)
  // Look for codes like -RA, TS, BR, FG, HZ, etc.
  // Expanded regex to capture combined codes (e.g., -TSRA, +SHRA)
  // Format: (Intensity)?(Descriptor)?(Phenomena)+
  const intensity = '(-|\\+|VC)';
  const descriptor = '(MI|BC|DR|BL|SH|TS|FZ|PR)';
  const phenomena = '(DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)';
  
  // Construct regex to match one or more of these valid sequences
  // We match full tokens that contain only these characters (roughly)
  // Ideally we iterate tokens.
  const wxTokens = [];
  const validWxPattern = new RegExp(`^${intensity}?${descriptor}?${phenomena}+$`);
  
  for (const part of parts) {
      if (validWxPattern.test(part)) {
          wxTokens.push(part);
      }
  }

  if (wxTokens.length > 0) {
      condition = wxTokens.join(' ');
  } else if (condition === 'N/A' && raw.includes('CAVOK')) {
      condition = 'NSW'; // No Significant Weather
  } else if (condition === 'N/A') {
      condition = 'No Wx';
  }

  // Helpers for decoding
  const getCloudDescription = (code: string) => {
      const map: Record<string, string> = { 'FEW': 'Poucas Nuvens', 'SCT': 'Nuvens Esparsas', 'BKN': 'Nublado', 'OVC': 'Encoberto', 'VV': 'Céu Obscurecido' };
      return map[code] || code;
  };

  const decodeCondition = (cond: string) => {
     if (!cond || cond === 'N/A') return 'Sem condições significativas';
     if (cond === 'NSW') return 'Nenhum tempo significativo';
     if (cond === 'No Wx') return 'Sem condições significativas';

     // Simple replacement map for common codes
     let text = cond;
     const replacements: [RegExp, string][] = [
         [/-TSRA/g, 'Trovoada com chuva leve'],
         [/\+TSRA/g, 'Trovoada com chuva forte'],
         [/TSRA/g, 'Trovoada com chuva moderada'],
         [/-RA/g, 'Chuva leve'],
         [/\+RA/g, 'Chuva forte'],
         [/RA/g, 'Chuva moderada'],
         [/TS/g, 'Trovoada'],
         [/SH/g, 'Pancadas'],
         [/DZ/g, 'Chuvisco'],
         [/BR/g, 'Névoa Úmida'],
         [/FG/g, 'Nevoeiro'],
         [/HZ/g, 'Névoa Seca'],
         [/FU/g, 'Fumaça'],
         [/VC/g, 'Nas vizinhanças'],
     ];

     replacements.forEach(([regex, replacement]) => {
         text = text.replace(regex, replacement);
     });
     
     return text;
  };

  const tooltips = {
      wind: wind !== 'N/A' ? `Vento de ${wind.split('/')[0]} com ${wind.split('/')[1]}`.replace('kt', ' nós') : 'Sem dados de vento',
      visibility: visibility !== 'N/A' ? `Visibilidade de ${visibility}` : 'Sem dados de visibilidade',
      ceiling: ceiling_str !== 'N/A' && ceiling !== 'N/A' ? `${getCloudDescription(ceiling.substring(0,3))} a ${ceiling_str.replace("'", " pés")}` : (ceiling_str === 'Sem Teto' ? 'Céu claro / Sem teto' : 'Sem dados de teto'),
      condition: decodeCondition(condition)
  };

  return { wind, visibility, vis_meters, ceiling, ceiling_ft, ceiling_str, condition, tooltips };
};
