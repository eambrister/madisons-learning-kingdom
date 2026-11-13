export const games=[
{id:'sounds',name:'Sound Safari',subject:'Reading',icon:'🔤',hint:'Listen and find a beginning sound'},
{id:'letters',name:'Letter Twins',subject:'Reading',icon:'🅰️',hint:'Match familiar letters'},
{id:'count',name:'Star Counter',subject:'Math',icon:'⭐',hint:'Count a little collection'},
{id:'more',name:'More Moon Rocks',subject:'Math',icon:'🌙',hint:'Compare two groups'},
{id:'story',name:'Story Castle',subject:'Language',icon:'📖',hint:'Listen and discover what happens'},
{id:'listen',name:'Listen & Find',subject:'Language',icon:'👂',hint:'Follow a spoken clue'},
{id:'memory',name:'Hidden Friends',subject:'Thinking',icon:'🧠',hint:'Remember where a friend is hiding'},
{id:'pattern',name:'Magic Patterns',subject:'Thinking',icon:'💎',hint:'Discover what comes next'},
{id:'habitat',name:'Animal Homes',subject:'Nature',icon:'🐠',hint:'Find a home for an animal'},
{id:'nature',name:'Little Discoveries',subject:'Nature',icon:'🌱',hint:'Explore the natural world'}];
export const subjects=[...new Set(games.map(g=>g.subject))];
export const rewards=['🌼','🦋','🌈','👑','🎀','🏰','🦊','🐢','🪐','🚀','🦄','🌟'];
export function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
export function fresh(){return {version:1,events:{},settings:{minutes:15,enabled:subjects,levels:{},stories:[]},equipped:'🏰'}}
export function summary(events,id){return Object.values(events).filter(e=>e.game===id).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))}
export function levelFor(state,id){const override=state.settings.levels[id];if(override)return Number(override);let level=1;const rows=summary(state.events,id);for(let i=0;i+5<=rows.length;i+=5){const score=rows.slice(i,i+5).filter(e=>e.firstTry).length;if(score>=4)level=Math.min(3,level+1);if(score<=2)level=Math.max(1,level-1)}return level}
export function merge(a,b){return {...a,events:{...a.events,...b.events},settings:b.settings||a.settings,equipped:b.equipped||a.equipped}}
export function question(id,level,stories=[]){const pick=a=>shuffle(a)[0];const make=(prompt,visual,answer,options)=>({prompt,visual,answer,options:shuffle(options)});const letters=['A','B','M','S','T','P'];
if(id==='letters'){let a=pick(letters);return make(`Find the letter ${a}.`,a,a,shuffle(letters.filter(x=>x!==a)).slice(0,level===1?1:2).concat(a))}
if(id==='sounds'){const bank=[['mmm','moon','🌙'],['sss','sun','☀️'],['buh','bear','🐻'],['puh','pig','🐷']];const a=pick(bank);return make(`Listen: ${a[0]}. Which picture starts like ${a[1]}?`,'🔊',a[2],shuffle(bank.filter(x=>x!==a)).slice(0,level===1?1:2).map(x=>x[2]).concat(a[2]))}
if(id==='count'){let n=1+Math.floor(Math.random()*(level+2));return make('Count the stars. How many are there?','⭐'.repeat(n),String(n),[...new Set([String(n),String(n===1?2:n-1),...(level>1?[String(n+1)]:[])])])}
if(id==='more'){let a=level,b=level+1;return make('Which group has more moon rocks?','🌙', '🪨'.repeat(b),['🪨'.repeat(a),'🪨'.repeat(b)])}
if(id==='story'){const bank=[{text:'A little rabbit felt hungry. She found a carrot and ate it. Then she felt full.',prompt:'What did the rabbit eat?',visual:'🐰 🥕',answer:'🥕',options:['🥕','🧦']},{text:'The princess planted a seed. She watered it. A flower grew.',prompt:'What grew from the seed?',visual:'👸 🌱 💧',answer:'🌸',options:['🌸','🚗']},{text:'The astronaut was tired. He climbed into bed and went to sleep.',prompt:'Where did the astronaut go to sleep?',visual:'🧑‍🚀 💤',answer:'🛏️',options:['🛏️','🌳']},...stories];const s=pick(bank);return {...make(s.text+' '+s.prompt,s.visual,s.answer,s.options),story:true}}
if(id==='listen'){const bank=[['the animal that says meow','🐱'],['something you wear on your feet','👟'],['something you eat','🍎'],['something you ride','🚲']];let a=pick(bank);return make('Find '+a[0]+'.','👂',a[1],shuffle(bank.filter(x=>x!==a)).slice(0,level===1?1:2).map(x=>x[1]).concat(a[1]))}
if(id==='memory'){const options=shuffle(['🦊','🐰','🐻','🐸']).slice(0,level===1?2:4);return {prompt:'Look carefully. Remember where each animal is hiding.',visual:'✨',answer:pick(options),options,memory:true}}
if(id==='pattern'){let a=pick(['🌸','⭐','💎']),b=pick(['🍃','🌙','🎀']);return make('What comes next?',level<3?`${a} ${b} ${a} ${b} ${a} …`:`${a} ${a} ${b} ${a} ${a} …`,level<3?b:b,[a,b])}
if(id==='habitat'){const bank=[['fish','🐠','🌊'],['bird','🐦','🪺'],['bee','🐝','🐝🍯']];const a=pick(bank);return make(`Where does the ${a[0]} live?`,a[1],a[2],bank.map(x=>x[2]).slice(0,level===1?2:3).includes(a[2])?bank.map(x=>x[2]).slice(0,level===1?2:3):[a[2],'🌊'])}
const bank=[['What helps a plant grow?','🌱','💧',['💧','🧸']],['What shines in the daytime sky?','🌤️','☀️',['☀️','🧦']],['Which animal has wings?','🪽','🐦',['🐦','🐢']],['What falls from a rain cloud?','🌧️','💧',['💧','👟']]];const a=pick(bank);return make(a[0],a[1],a[2],a[3]);}
