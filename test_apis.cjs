const http = require('http');
const https = require('https');

const API_KEY = '1548575931';
const API_PASS = 'f29620b8-f6fe-11f0-a4e0-0050569ac2e1';

console.log("Testing AISWEB API...");
// Testing the 'rotaer' area since it requires the key and pass
const url = `http://www.aisweb.aer.mil.br/api/?apiKey=${API_KEY}&apiPass=${API_PASS}&area=rotaer&row=1`;
http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('AISWEB Response:', data.substring(0, 500) + '...'));
}).on('error', err => console.log('AISWEB Error:', err));

const REDEMET_KEY = 'tHCf0AEfhXGc6lYTbfNHVMRHCHH4Ys3TLMDuGMvH';
console.log("Testing REDEMET API...");
const redemetUrl = `https://api-redemet.decea.mil.br/mensagens/metar/SBGR?api_key=${REDEMET_KEY}`;
https.get(redemetUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('REDEMET Response:', data.substring(0, 500) + '...'));
}).on('error', err => console.log('REDEMET Error:', err));
