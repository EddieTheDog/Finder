// ===== Elements =====
const homePage = document.getElementById('homePage');
const searchPage = document.getElementById('searchPage');
const homeBtn = document.getElementById('homeBtn');
const goSearchBtn = document.getElementById('goSearchBtn');
const queryInput = document.getElementById('queryInput');
const searchFeed = document.getElementById('searchFeed');
const homeFeed = document.getElementById('homeFeed');

const feedbackModal = document.getElementById('feedbackModal');
const feedbackText = document.getElementById('feedbackText');
const thumbUp = document.getElementById('thumbUp');
const thumbDown = document.getElementById('thumbDown');

// ===== User Metrics =====
const userMetrics = JSON.parse(localStorage.getItem('finderMetrics')) || {
  clicks: 0,
  lastQuery: '',
  preferredType: 'definition',
  typeEngagement: { definition: 0, funFact: 0, dateFact: 0 },
  feedback: [],
  recentSearches: [],
  relatedWords: {},
  seenCards: new Set() // track unique cards to avoid repetition
};

// ===== Fetch Functions =====
async function fetchDefinition(word){
  try{
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await res.json();
    if(data[0]) return data[0].meanings.map(m=>`${m.partOfSpeech}: ${m.definitions[0].definition}`).join(' | ');
    return 'No definition found.';
  }catch{return 'Error fetching definition.';}
}

async function fetchFunFact(){
  try{
    const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
    const data = await res.json();
    return data.text;
  }catch{return 'Could not fetch fun fact.';}
}

async function fetchDateFact(){
  const today = new Date();
  const key = `${today.getMonth()+1}-${today.getDate()}`;
  if(userMetrics.seenCards.has(`date-${key}`)) return null; // only one per day
  try{
    const res = await fetch(`https://numbersapi.com/${today.getMonth()+1}/${today.getDate()}/date?json`);
    const data = await res.json();
    userMetrics.seenCards.add(`date-${key}`);
    return data.text;
  }catch{return "Today in history something amazing happened!";}
}

// ===== Metrics & Personalization =====
function updateMetrics(type, query, timeSpent=0, definitionText=''){
  userMetrics.clicks+=1;
  userMetrics.lastQuery=query;
  userMetrics.typeEngagement[type] = (userMetrics.typeEngagement[type]||0) + 1 + timeSpent/10;

  if(!userMetrics.recentSearches.includes(query)){
    userMetrics.recentSearches.push(query);
    if(userMetrics.recentSearches.length>10) userMetrics.recentSearches.shift();
  }

  if(definitionText){
    const words = definitionText.split(/\W+/);
    words.forEach(w=>{
      const word = w.toLowerCase();
      if(!userMetrics.relatedWords[word]) userMetrics.relatedWords[word]=0;
      userMetrics.relatedWords[word]+=1;
    });
  }

  const maxType = Object.entries(userMetrics.typeEngagement).sort((a,b)=>b[1]-a[1])[0][0];
  userMetrics.preferredType=maxType;
  localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
}

// ===== Content Order =====
function getContentOrder(){
  const typeScores = {...userMetrics.typeEngagement};
  userMetrics.feedback.forEach(f=>{if(f.like) typeScores[f.type]+=5;});
  return Object.entries(typeScores).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
}

// ===== Feedback Modal =====
let currentCard=null;
function showFeedbackModal(card){
  feedbackModal.classList.remove('hidden');
  currentCard=card;
}

thumbUp.onclick=()=>{
  if(!currentCard) return;
  const type=currentCard.dataset.type;
  userMetrics.feedback.push({type, like:true, timestamp:Date.now()});
  currentCard.style.border='2px solid green';
  feedbackModal.classList.add('hidden');
  currentCard=null;
  localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
};

thumbDown.onclick=()=>{
  if(!currentCard) return;
  const type=currentCard.dataset.type;
  userMetrics.feedback.push({type, like:false, timestamp:Date.now()});
  currentCard.style.border='2px solid red';
  feedbackModal.classList.add('hidden');
  currentCard=null;
  localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
};

// ===== Page Navigation =====
homeBtn.addEventListener('click',()=>{
  homePage.style.display='block';
  searchPage.style.display='none';
  displayHomeFeed();
});

goSearchBtn.addEventListener('click',()=>{
  homePage.style.display='none';
  searchPage.style.display='block';
  queryInput.focus();
});

// ===== Display Functions =====
async function displaySearchResults(query){
  searchFeed.innerHTML='';
  const definition = await fetchDefinition(query);
  const funFact = await fetchFunFact();

  const results = [
    {type:'definition', content:definition},
    {type:'funFact', content:funFact}
  ];

  for(let res of results){
    const card=document.createElement('div');
    card.className='card';
    card.dataset.type=res.type;
    card.innerHTML=`<p><strong>${res.type.toUpperCase()}:</strong> ${res.content}</p>`;
    const thumbs = document.createElement('div');
    thumbs.className='thumbs';
    const up=document.createElement('button'); up.innerText='👍';
    const down=document.createElement('button'); down.innerText='👎';
    up.onclick=()=>showFeedbackModal(card);
    down.onclick=()=>showFeedbackModal(card);
    thumbs.appendChild(up); thumbs.appendChild(down);
    card.appendChild(thumbs);
    searchFeed.appendChild(card);

    const startTime=Date.now();
    card.addEventListener('mouseenter',()=>startTime);
    card.addEventListener('mouseleave',()=>updateMetrics(res.type, query, (Date.now()-startTime)/1000, res.content));
    updateMetrics(res.type, query, 0, res.content);
  }

  // Related Recommendations
  const related=Object.entries(userMetrics.relatedWords).sort((a,b)=>b[1]-a[1]).map(e=>e[0]).filter(w=>w!==query.toLowerCase()).slice(0,3);
  if(related.length>0){
    const recCard=document.createElement('div');
    recCard.className='card';
    recCard.innerHTML=`<strong>Recommended Related Words:</strong><br>${related.join(', ')}`;
    searchFeed.appendChild(recCard);
  }
}

async function displayHomeFeed(){
  homeFeed.innerHTML='';
  const order=getContentOrder();

  // Show one date fact
  const dateFact=await fetchDateFact();
  if(dateFact){
    const card=document.createElement('div');
    card.className='card';
    card.dataset.type='dateFact';
    card.innerHTML=`<p><strong>DATE FACT:</strong> ${dateFact}</p>`;
    homeFeed.appendChild(card);
  }

  // Show some definitions/fun facts based on engagement
  const cardsToShow=5;
  for(let i=0;i<cardsToShow;i++){
    const type=order[i%order.length];
    if(type==='dateFact') continue;
    let content='';
    if(type==='definition' && userMetrics.recentSearches.length>0){
      const recent=userMetrics.recentSearches[Math.floor(Math.random()*userMetrics.recentSearches.length)];
      content=await fetchDefinition(recent);
    }
    if(type==='funFact') content=await fetchFunFact();

    const card=document.createElement('div');
    card.className='card';
    card.dataset.type=type;
    card.innerHTML=`<p><strong>${type.toUpperCase()}:</strong> ${content}</p>`;
    const thumbs=document.createElement('div');
    thumbs.className='thumbs';
    const up=document.createElement('button'); up.innerText='👍';
    const down=document.createElement('button'); down.innerText='👎';
    up.onclick=()=>showFeedbackModal(card);
    down.onclick=()=>showFeedbackModal(card);
    thumbs.appendChild(up); thumbs.appendChild(down);
    card.appendChild(thumbs);
    homeFeed.appendChild(card);
    const startTime=Date.now();
    card.addEventListener('mouseenter',()=>startTime);
    card.addEventListener('mouseleave',()=>updateMetrics(type,'home', (Date.now()-startTime)/1000, content));
    updateMetrics(type,'home',0,content);
  }
}

// ===== Event Listeners =====
document.getElementById('searchBtn').addEventListener('click',()=>{
  const query=queryInput.value.trim();
  if(!query) return;
  displaySearchResults(query);
});
queryInput.addEventListener('keypress',(e)=>{
  if(e.key==='Enter') document.getElementById('searchBtn').click();
});

// ===== On Load =====
window.onload = ()=>{
  displayHomeFeed();
};
