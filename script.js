// ===== Helper functions =====
async function fetchDefinition(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await res.json();
    if (data[0]) {
      return data[0].meanings.map(m => `${m.partOfSpeech}: ${m.definitions[0].definition}`).join('\n');
    }
    return 'No definition found.';
  } catch (e) {
    return 'Error fetching definition.';
  }
}

async function fetchFunFact() {
  try {
    const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
    const data = await res.json();
    return data.text;
  } catch (e) {
    return 'Could not fetch fun fact.';
  }
}

async function fetchDateFact() {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    // CORS-safe fetch
    const res = await fetch(`https://numbersapi.p.rapidapi.com/${month}/${day}/date?json=true`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Host': 'numbersapi.p.rapidapi.com',
        'X-RapidAPI-Key': 'YOUR_FREE_KEY_IF_NEEDED'
      }
    });
    const data = await res.json();
    return data.text;
  } catch (e) {
    // fallback
    const fallbackFacts = [
      "On this day, something amazing happened in history!",
      "Did you know? Today has a fun fact waiting for you.",
      "This day in history was pretty cool!"
    ];
    return fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
  }
}

// ===== User Metrics =====
const userMetrics = JSON.parse(localStorage.getItem('finderMetrics')) || {
  clicks: 0,
  lastQuery: '',
  preferredType: 'definition',
  typeEngagement: { definition: 0, funFact: 0, dateFact: 0 },
  feedback: []
};

// ===== Personalization Functions =====
function updateMetrics(type, query, timeSpent = 0) {
  userMetrics.clicks += 1;
  userMetrics.lastQuery = query;
  userMetrics.typeEngagement[type] = (userMetrics.typeEngagement[type] || 0) + 1 + timeSpent/10;
  const maxType = Object.entries(userMetrics.typeEngagement).sort((a,b)=>b[1]-a[1])[0][0];
  userMetrics.preferredType = maxType;
  localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
}

function getContentOrder() {
  const typeScores = { ...userMetrics.typeEngagement };
  userMetrics.feedback.forEach(f => {
    if(f.like) typeScores[f.type] += 5;
  });
  return Object.entries(typeScores).sort((a,b)=>b[1]-a[1]).map(entry => entry[0]);
}

function maybeAskFeedback(type) {
  if(userMetrics.clicks % 3 === 0) {
    setTimeout(() => {
      const like = confirm(`Did you enjoy the ${type}? Click OK for Yes, Cancel for No.`);
      userMetrics.feedback.push({ type, like, timestamp: Date.now() });
      localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
    }, 500);
  }
}

// ===== Page Navigation =====
const homePage = document.getElementById('homePage');
const searchPage = document.getElementById('searchPage');
document.getElementById('homeBtn').addEventListener('click', () => {
  homePage.style.display = 'block';
  searchPage.style.display = 'none';
  displayHomeFeed();
});

// ===== Display Functions =====
async function displayContent(query) {
  searchPage.style.display = 'block';
  homePage.style.display = 'none';
  const feed = document.getElementById('searchFeed');
  feed.innerHTML = '';
  const order = getContentOrder();
  for (let type of order) {
    let content = '';
    if(type==='definition') content = await fetchDefinition(query);
    if(type==='funFact') content = await fetchFunFact();
    if(type==='dateFact') content = await fetchDateFact();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerText = `${type.toUpperCase()}:\n${content}`;
    feed.appendChild(card);

    const startTime = Date.now();
    card.addEventListener('mouseenter', () => startTime);
    card.addEventListener('mouseleave', () => {
      const elapsed = (Date.now()-startTime)/1000;
      updateMetrics(type, query, elapsed);
    });

    updateMetrics(type, query);
    maybeAskFeedback(type);
  }
}

async function displayHomeFeed() {
  const feed = document.getElementById('homeFeed');
  feed.innerHTML = '';
  const types = getContentOrder();
  for(let i=0;i<5;i++){ // 5 cards
    const type = types[i % types.length];
    let content = '';
    if(type==='funFact') content = await fetchFunFact();
    if(type==='definition') content = await fetchDefinition('example');
    if(type==='dateFact') content = await fetchDateFact();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerText = `${type.toUpperCase()}:\n${content}`;
    feed.appendChild(card);
  }
}

// ===== Event Listeners =====
document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('queryInput').value.trim();
  if(!query) return;
  displayContent(query);
});
document.getElementById('queryInput').addEventListener('keypress',(e)=>{
  if(e.key==='Enter') document.getElementById('searchBtn').click();
});

// ===== On Load =====
window.onload = () => {
  displayHomeFeed();
};
