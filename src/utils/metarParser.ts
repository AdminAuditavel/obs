
export interface ParsedMetar {
  type: string;
  wind: string;
  visibility: string;
  vis_meters: number;
  ceiling: string;
  ceiling_ft: number;
  ceiling_str: string;
  condition: string;
  temperature?: string;
  pressure?: string;
  redemetColor: 'green' | 'yellow' | 'red';
  tooltips: {
    wind: string;
    visibility: string;
    ceiling: string;
    condition: string;
    temp?: string;
    pressure?: string;
  };
}

export const parseMetar = (raw: string): ParsedMetar => {
  if (!raw) return { 
    type: 'METAR', wind: 'N/A', visibility: 'N/A', vis_meters: 9999, ceiling: 'N/A', ceiling_ft: 10000, ceiling_str: 'N/A', condition: 'N/A',
    redemetColor: 'green',
    tooltips: { wind: '', visibility: '', ceiling: '', condition: '' }
  };
  
  const parts = raw.split(' ');
  // Default to METAR, check if first part is SPECI or METAR
  let type = 'METAR';
  if (raw.includes('SPECI')) type = 'SPECI';

  // Heuristic: If time != 00 minutes, likely SPECI (for Brazil/International)
  const timeMatch = raw.match(/\b\d{2}\d{2}(\d{2})Z\b/);
  if (timeMatch) {
      const minutes = parseInt(timeMatch[1], 10);
      if (minutes !== 0) type = 'SPECI';
  }

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

  // Ceiling Logic
  // 1. Sig Cloud (CB/TCU)
  const sigCloudMatch = raw.match(/\b(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)\b/);
  // 2. Standard Ceiling (BKN/OVC)
  const ceilingMatch = raw.match(/\b(BKN|OVC|VV)(\d{3})\b/);
  // 3. Lowest Layer (FEW/SCT) - Fallback if user wants to see *any* cloud info?
  //    User said "aparecer no card do teto a nuvem mais significativa". 
  //    If no ceiling but there is FEW, user might want to see FEW? 
  //    Standard "Ceiling" is BKN/OVC. But let's show significant > ceiling > lowest.
  const anyCloudMatch = raw.match(/\b(FEW|SCT|BKN|OVC|VV)(\d{3})\b/);

  if (sigCloudMatch) {
      // Prioritize TCU/CB
      const type = sigCloudMatch[1];
      const heightRaw = parseInt(sigCloudMatch[2]);
      const mod = sigCloudMatch[3]; // CB or TCU
      ceiling_ft = heightRaw * 100;
      ceiling = `${type}${sigCloudMatch[2]}${mod}`;
      ceiling_str = `${ceiling_ft}' ${mod}`; // e.g. 2300' TCU
  } else if (ceilingMatch) {
      // Standard Ceiling
      const type = ceilingMatch[1];
      const heightRaw = parseInt(ceilingMatch[2]);
      ceiling_ft = heightRaw * 100;
      ceiling = `${type}${ceilingMatch[2]}`;
      ceiling_str = `${ceiling_ft}'`;
  } else if (anyCloudMatch && !raw.includes('CAVOK') && !raw.includes('NSC') && !raw.includes('SKC')) {
      // Fallback: Lowest layer (even if not technically a ceiling, useful info)
      const type = anyCloudMatch[1];
      const heightRaw = parseInt(anyCloudMatch[2]);
      ceiling_ft = heightRaw * 100;
      ceiling = `${type}${anyCloudMatch[2]}`;
      ceiling_str = `${ceiling_ft}'`; 
  } else if (raw.includes('NSC') || raw.includes('SKC')) {
      ceiling = 'None';
      ceiling_ft = 10000;
      ceiling_str = 'Sem Teto';
  }
  
  // Present Weather
  // Format: (Intensity)?(Descriptor)?(Phenomena)+
  // VCSH case: VC (Intensity) + SH (Descriptor). No Phenomena.
  // We allow optional phenomena IF descriptor is present.
  const intensity = '(-|\\+|VC)';
  const descriptor = '(MI|BC|DR|BL|SH|TS|FZ|PR)';
  const phenomena = '(DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)';
  
  // Regex to match:
  // 1. Full: Int? Desc? Phen+
  // 2. Desc Only logic: Int? Desc (e.g. VCSH, SHRA? no SHRA matches 1)
  // Let's just create a combined regex that covers valid cases.
  // Note: VCSH is valid. TS is valid (Desc only? No, TS is desc, but can be phen in regex context?).
  // Actually TS is descriptor "Thunderstorm", usually with RA. But "TS" alone is valid.
  // So we allow (Int)? (Desc) (Phen)? roughly.
  
  const validWxPattern = new RegExp(`^(${intensity})?(${descriptor})?(${phenomena})+$|^(${intensity})?(${descriptor})+$`);
  
  const wxTokens = [];
  for (const part of parts) {
      if (validWxPattern.test(part)) {
          wxTokens.push(part);
      }
  }

  if (wxTokens.length > 0) {
      condition = wxTokens.join(' ');
  } else if (condition === 'N/A' && raw.includes('CAVOK')) {
      condition = 'NSW'; // No Significant Weather
  }
  

  // Pressure (QNH)
  let pressure = 'N/A';
  const qnhMatch = raw.match(/\bQ(\d{4})\b/);
  if (qnhMatch) {
      pressure = `${qnhMatch[1]} hPa`;
  }

  // Temperature / Dewpoint
  // Format: 22/18 or M02/M05 or 22/M01
  let temperature = 'N/A';
  const tempMatch = raw.match(/\b(M?\d{2})\/(M?\d{2})\b/);
  if (tempMatch) {
      const t = tempMatch[1].replace('M', '-');
      const td = tempMatch[2].replace('M', '-');
      temperature = `${t}° / ${td}°C`;
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
         [/VCSH/g, 'Pancadas de chuva na vizinhança'],
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
    ceiling: ceiling_str !== 'N/A' && ceiling !== 'N/A' ? `${getCloudDescription(ceiling.substring(0, 3))} a ${ceiling_str.replace("'", " pés")}` : (ceiling_str === 'Sem Teto' ? 'Céu claro / Sem teto' : 'Sem dados de teto'),
    condition: decodeCondition(condition),
    temp: temperature !== 'N/A' ? `Temperatura: ${temperature.split(' / ')[0]}, Ponto de Orvalho: ${temperature.split(' / ')[1]}` : 'Sem dados de temperatura',
    pressure: pressure !== 'N/A' ? `Pressão QNH: ${pressure}` : 'Sem dados de pressão'
  };

  // REDEMET Color Logic
  // RED: Vis < 1500m OR Ceiling < 600ft
  // YELLOW: Vis < 5000m OR Ceiling < 1500ft
  // GREEN: Else
  let redemetColor: 'green' | 'yellow' | 'red' = 'green';
  if (vis_meters < 1500 || (ceiling_ft < 600 && ceiling !== 'None')) {
    redemetColor = 'red';
  } else if (vis_meters < 5000 || (ceiling_ft < 1500 && ceiling !== 'None')) {
    redemetColor = 'yellow';
  }

  return { type, wind, visibility, vis_meters, ceiling, ceiling_ft, ceiling_str, condition, temperature, pressure, redemetColor, tooltips };
};

