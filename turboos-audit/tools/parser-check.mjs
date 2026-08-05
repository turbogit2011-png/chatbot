// Wierny port ObdParser.kt (po poprawkach) w JavaScripcie.
//
// Cel: wykonawcza weryfikacja logiki parsera bez Android SDK. Uruchamia te same
// wektory co android/src/test/.../ObdParserTest.kt.
//
// Sekcja koncowa izoluje wade K2: ten sam potok, jedyna roznica to brak obslugi
// bajtu licznika DTC (zachowanie 0.2.0). Dla wierszy jednoramkowych wynik jest
// dokladnie tym, co zwracala 0.2.0; wiersz multi-frame pokazuje sam efekt K2,
// bo 0.2.0 nie skladalo dodatkowo ramek ISO-TP.
//
//   node turboos-audit/tools/parser-check.mjs
const BYTE_TOKEN=/^[0-9A-Fa-f]{2}$/, CAN11=/^[0-9A-Fa-f]{3}$/, COMPACT=/^[0-9A-Fa-f]+$/;
const FRAME_PREFIX=/^[0-9A-Fa-f]:\s*/, WS=/\s+/;
const VIN_CHARS=new Set("0123456789ABCDEFGHJKLMNPRSTUVWXYZ");
const PREFIX=['P','C','B','U'];
const MARKERS=["NO DATA","SEARCHING","UNABLE","STOPPED","BUS INIT"];

function stripHeader(c){
  if(c.length>=12 && (/^18DA/i.test(c)||/^18DB/i.test(c))) return c.slice(8);
  if(c.length>=7 && c.length%2===1 && CAN11.test(c.slice(0,3))) return c.slice(3);
  return c;
}
function tokenizeLine(raw){
  const line=raw.trim().replace(FRAME_PREFIX,'');
  const spaced=line.split(WS);
  if(spaced.length>1) return spaced.filter(t=>BYTE_TOKEN.test(t)).map(t=>parseInt(t,16));
  const compact=[...line].filter(ch=>/[a-zA-Z0-9]/.test(ch)).join('');
  const payload=stripHeader(compact);
  if(payload.length%2!==0||!COMPACT.test(payload)) return [];
  return payload.match(/../g).map(b=>parseInt(b,16));
}
function hexByteLines(response){
  const messages=[]; let assembling=null;
  for(const rawLine of response.replace(/>/g,' ').split('\n')){
    const upper=rawLine.toUpperCase();
    if(upper.startsWith('ELM')||MARKERS.some(m=>upper.includes(m))) continue;
    const trimmed=rawLine.trim();
    const m=trimmed.match(FRAME_PREFIX);
    const frameIndex=m?parseInt(m[0].replace(/[: ]+$/,''),16):null;
    const bytes=tokenizeLine(trimmed);
    if(bytes.length===0) continue;
    const current=assembling;
    if(frameIndex===0||(frameIndex!==null&&current===null)){
      const msg=[...bytes]; messages.push(msg); assembling=msg;
    } else if(frameIndex!==null&&current!==null){ current.push(...bytes); }
    else { messages.push([...bytes]); assembling=null; }
  }
  return messages;
}
const hexBytes=r=>hexByteLines(r).flat();
const decodeDtc=(h,l)=>(h===0&&l===0)?null:
  (PREFIX[(h>>6)&3]+((h>>4)&3)+(h&15).toString(16)+(l>>4).toString(16)+(l&15).toString(16)).toUpperCase();
function decodeDtcBody(body){
  if(!body.length) return [];
  const count=body[0], remaining=body.length-1;
  const looksLikeCount=count>=0&&count<=0x7F&&remaining>=count*2&&body.slice(1+count*2).every(b=>b===0);
  const payload=looksLikeCount?body.slice(1,1+count*2):body;
  const out=[];
  for(let i=0;i+1<payload.length;i+=2){const c=decodeDtc(payload[i],payload[i+1]); if(c) out.push(c);}
  return out;
}
function parseDtcs(response,svc=0x43){
  const codes=new Set();
  for(const frame of hexByteLines(response)){
    const i=frame.indexOf(svc);
    if(i<0) continue;
    decodeDtcBody(frame.slice(i+1)).forEach(c=>codes.add(c));
  }
  return [...codes];
}
function pidBytes(response,pid,len){
  for(const frame of hexByteLines(response))
    for(let i=0;i<frame.length-1;i++){
      if(frame[i]!==0x41||frame[i+1]!==pid) continue;
      const s=i+2; if(s+len<=frame.length) return frame.slice(s,s+len);
    }
  return null;
}
const inRange=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max?v:null;
const parseRpm=r=>{const b=pidBytes(r,0x0C,2);return b?inRange((b[0]*256+b[1])/4,0,16383.75):null;};
const parseCoolant=r=>{const b=pidBytes(r,0x05,1);return b?inRange(b[0]-40,-40,215):null;};
function parseSupportedPids(response,svc,base,skip=false){
  const out=new Set(); const off=skip?1:0;
  for(const frame of hexByteLines(response))
    for(let i=0;i<frame.length-1;i++){
      if(frame[i]!==svc||frame[i+1]!==base) continue;
      const s=i+2+off; if(s+4>frame.length) continue;
      for(let bi=0;bi<4;bi++){const v=frame[s+bi];
        for(let bit=7;bit>=0;bit--) if(v&(1<<bit)) out.add(base+bi*8+(8-bit));}
    }
  return out;
}
function parseVin(response){
  const bytes=hexBytes(response);
  for(let i=0;i<bytes.length-1;i++){
    if(bytes[i]!==0x49||bytes[i+1]!==0x02) continue;
    let vin='';
    for(let j=i+2;j<bytes.length;j++){
      const ch=String.fromCharCode(bytes[j]).toUpperCase();
      if(VIN_CHARS.has(ch)) vin+=ch;
      if(vin.length===17) break;
    }
    if(vin.length===17) return vin;
  }
  return null;
}

// --- zachowanie wersji 0.2.0: pary bajtów czytane wprost po bajcie usługi -----
function legacyDecodeDtcBody(body) {
  const out = [];
  for (let i = 0; i + 1 < body.length; i += 2) {
    if (body[i] === 0 && body[i + 1] === 0) break;
    out.push(decodeDtc(body[i], body[i + 1]));
  }
  return out;
}
function legacyParseDtcs(response, svc = 0x43) {
  const codes = new Set();
  for (const frame of hexByteLines(response)) {
    const i = frame.indexOf(svc);
    if (i < 0) continue;
    legacyDecodeDtcBody(frame.slice(i + 1)).forEach((c) => codes.add(c));
  }
  return [...codes];
}

const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const T=[];
const t=(n,ok)=>T.push([n,ok]);

t('dekoduje kody CAN pomijajac bajt licznika', eq(parseDtcs("43 02 01 43 01 96"),["P0143","P0196"]));
t('pojedynczy kod CAN z wypelnieniem',         eq(parseDtcs("43 01 02 99 00 00 00 00"),["P0299"]));
t('pusta lista gdy brak kodow',                eq(parseDtcs("43 00 00 00 00 00 00 00"),[]));
t('odpowiedz wieloramkowa z prefiksami',       eq(parseDtcs("009\n0: 43 03 02 99 25 63\n1: 00 AF 00 00 00 00 00"),["P0299","P2563","P00AF"]));
t('protokoly bez bajtu licznika',              eq(parseDtcs("43 01 43 01 96 00 00"),["P0143","P0196"]));
t('naglowek CAN 11-bit w odpowiedzi zbitej',   eq(parseDtcs("7E8430143"),["P0143"]));
t('kody oczekujace Mode 07',                   eq(parseDtcs("47 01 02 99 00 00",0x47),["P0299"]));
t('pomija linie sterujace',                    eq(parseDtcs("SEARCHING...\nNO DATA"),[]));
t('parsuje obroty silnika',                    Math.abs(parseRpm("41 0C 1A F8")-1726)<1e-6);
t('granica zakresu temperatury',               parseCoolant("41 05 FF")===215);
t('odrzuca odpowiedz innego PID-u',            parseCoolant("41 0C 1A F8")===null);
t('nie miesza bajtow z roznych ramek',         parseRpm("7E8 06 41\n7E9 03 0C 1A F8")===null);
const sup=parseSupportedPids("41 00 BE 1F A8 13",0x41,0x00);
t('mapa wspieranych PID-ow',                   sup.has(0x01)&&sup.has(0x0C)&&!sup.has(0x08));
t('VIN z odpowiedzi wieloramkowej',            parseVin("014\n0: 49 02 01 57 56 57\n1: 5A 5A 5A 33 43 5A 44\n2: 45 30 30 30 30 30 31")==="WVWZZZ3CZDE000001");
t('odrzuca VIN o zlej dlugosci',               parseVin("49 02 01 57 56 57")===null);

let fail=0;
for(const [n,ok] of T){ if(!ok) fail++; console.log(`${ok?'PASS':'FAIL'}  ${n}`); }
console.log(`\n${T.length-fail}/${T.length} przeszlo\n`);

console.log('Wada K2 w izolacji — bez obslugi bajtu licznika DTC (zachowanie 0.2.0):');
for (const [label, response] of [
  ['43 02 01 43 01 96',        '43 02 01 43 01 96'],
  ['43 01 02 99 00 00 00 00',  '43 01 02 99 00 00 00 00'],
  ['multi-frame 0:/1:',        '009\n0: 43 03 02 99 25 63\n1: 00 AF 00 00 00 00 00'],
  ['ISO 9141 (bez licznika)',  '43 01 43 01 96 00 00'],
]) {
  console.log(
    `  ${label.padEnd(26)} bez-licznika=${JSON.stringify(legacyParseDtcs(response)).padEnd(40)}` +
    ` poprawione=${JSON.stringify(parseDtcs(response))}`,
  );
}
process.exit(fail);
