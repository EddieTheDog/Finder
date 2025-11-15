// ===== Elements =====
const homePage = document.getElementById('homePage');
const searchPage = document.getElementById('searchPage');
const homeBtn = document.getElementById('homeBtn');
const goSearchBtn = document.getElementById('goSearchBtn');
const queryInput = document.getElementById('queryInput');
const searchFeed = document.getElementById('searchFeed');
const homeFeed = document.getElementById('homeFeed');

// Feedback modal
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
  relatedWords: {}
};

// ===== Helper Functions =====
async function fetchDefinition(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await res.json();
    if (data[0]) return data[0].meanings.map(m => `${m.partOfSpeech}: ${m.definitions[0].definition}`).join(' | ');
    return 'No definition found.';
  } catch { return 'Error fetching definition.'; }
}

async function fetchFunFact() {
  try {
    const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
    const data = await res.json();
    return data.text;
  } catch { return 'Could not fetch fun fact.'; }
}

async function fetchDateFact() {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const res = await fetch(`https://numbersapi.com/${month}/${day}/date?json`);
    const data = await res.json();
    return data.text;
  } catch {
    const fallbackFacts = [
      "On this day, something amazing happened in history!",
      "Did you know? Today has a fun fact waiting for you.",
      "This day in history was pretty cool!"
    ];
    return fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
  }
}

// ===== Personalization & Metrics =====
function updateMetrics(type, query, timeSpent=0, definitionText=''){
  userMetrics.clicks +=1;
  userMetrics.lastQuery = query;
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
  userMetrics.preferredType = maxType;
  localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
}

function getContentOrder(){
  const typeScores = {...userMetrics.typeEngagement};
  userMetrics.feedback.forEach(f=>{ if(f.like) typeScores[f.type]+=5; });
  return Object.entries(typeScores).sort((a,b)=>b[1]-a[1]).map(entry=>entry[0]);
}

// ===== Feedback Modal =====
function showFeedbackModal(type, card){
  feedbackText.innerText = `Did you like this ${type}?`;
  feedbackModal.classList.remove('hidden');

  thumbUp.onclick = ()=>{
    userMetrics.feedback.push({type, like:true, timestamp:Date.now()});
    feedbackModal.classList.add('hidden');
    card.style.border='2px solid green';
    localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
  };

  thumbDown.onclick = ()=>{
    userMetrics.feedback.push({type, like:false, timestamp:Date.now()});
    feedbackModal.classList.add('hidden');
    card.style.border='2px solid red';
    localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
  };
}

// ===== Page Navigation =====
homeBtn.addEventListener('click',()=>{
  homePage.style.display='block';
  searchPage.style.display='none';
  displayFeed();
});

goSearchBtn.addEventListener('click',()=>{
  homePage.style.display='none';
  searchPage.style.display='block';
  queryInput.focus();
});

// ===== Display Functions =====
async function displayFeed(query=''){
  const feed = (searchPage.style.display==='block') ? searchFeed : homeFeed;
  feed.innerHTML='';

  const order = getContentOrder();
  const cardsToShow = 5;

  for(let i=0;i<cardsToShow;i++){
    const type = order[i%order.length];
    let content='';
    if(type==='definition') content = query ? await fetchDefinition(query) : await fetchDefinition('example');
    if(type==='funFact') content = await fetchFunFact();
    if(type==='dateFact') content = await fetchDateFact();

    const card = document.createElement('div');
    card.className='card';
    card.innerHTML = `<p><strong>${type.toUpperCase()}:</strong> ${content}</p>`;
    
    // Add thumbs buttons to card
    const thumbs = document.createElement('div');
    thumbs.className='thumbs';
    const up = document.createElement('button');
    up.innerText='👍';
    up.onclick = ()=>showFeedbackModal(type, card);
    const down = document.createElement('button');
    down.innerText='👎';
    down.onclick = ()=>showFeedbackModal(type, card);
    thumbs.appendChild(up);
    thumbs.appendChild(down);
    card.appendChild(thumbs);

    feed.appendChild(card);

    const startTime = Date.now();
    card.addEventListener('mouseenter',()=>startTime);
    card.addEventListener('mouseleave',()=>{
      const elapsed=(Date.now()-startTime)/1000;
      updateMetrics(type, query||'example', elapsed, content);
    });

    updateMetrics(type, query||'example',0, content);
  }

  if(query) recommendRelated(query, feed);
}

// ===== Related Recommendations =====
function recommendRelated(query, feed){
  const sortedRelated = Object.entries(userMetrics.relatedWords)
    .sort((a,b)=>b[1]-a[1])
    .map(e=>e[0])
    .filter(w=>w!==query.toLowerCase())
    .slice(0,3);

  if(sortedRelated.length>0){
    const recCard = document.createElement('div');
    recCard.className='card';
    recCard.innerHTML=`<strong>Recommended Related Words:</strong> <br>${sortedRelated.join(', ')}`;
    feed.appendChild(recCard);
  }
}

// ===== Event Listeners =====
document.getElementById('searchBtn').addEventListener('click',()=>{
  const query=queryInput.value.trim();
  if(!query) return;
  displayFeed(query);
});
queryInput.addEventListener('keypress',(e)=>{
  if(e.key==='Enter') document.getElementById('searchBtn').click();
});

// ===== On Load =====
window.onload = ()=>{
  displayFeed();
};
