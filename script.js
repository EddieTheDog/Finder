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
    const res = await fetch(`https://numbersapi.com/${month}/${day}/date?json`);
    const data = await res.json();
    return data.text;
  } catch (e) {
    return 'Could not fetch date fact.';
  }
}

// ===== Personalization Algorithm =====
const userMetrics = JSON.parse(localStorage.getItem('finderMetrics')) || {
  clicks: 0,
  lastQuery: '',
  preferredType: 'definition', // default
  typeEngagement: { definition: 0, funFact: 0, dateFact: 0 },
  feedback: [] // stores user's like/dislike feedback
};

function updateMetrics(type, query, timeSpent = 0) {
  userMetrics.clicks += 1;
  userMetrics.lastQuery = query;
  userMetrics.typeEngagement[type] = (userMetrics.typeEngagement[type] || 0) + 1 + timeSpent/10;
  // Update preferred type dynamically
  const maxType = Object.entries(userMetrics.typeEngagement).sort((a,b)=>b[1]-a[1])[0][0];
  userMetrics.preferredType = maxType;
  localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
}

// Simple ordering based on engagement & feedback
function getContentOrder() {
  const typeScores = { ...userMetrics.typeEngagement };

  // If feedback exists, boost liked types
  userMetrics.feedback.forEach(f => {
    if(f.like) typeScores[f.type] += 5; // boost score
  });

  return Object.entries(typeScores)
    .sort((a,b)=>b[1]-a[1])
    .map(entry => entry[0]);
}

// ===== Feedback Prompt =====
function maybeAskFeedback(type) {
  // Ask every 3 interactions
  if(userMetrics.clicks % 3 === 0) {
    setTimeout(() => {
      const like = confirm(`Did you enjoy the ${type}? Click OK for Yes, Cancel for No.`);
      userMetrics.feedback.push({ type, like, timestamp: Date.now() });
      localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
    }, 500); // slight delay so user sees result first
  }
}

// ===== UI Functions =====
async function displayContent(query) {
  const feed = document.getElementById('feed');
  feed.innerHTML = ''; // clear feed

  const order = getContentOrder();
  for (let type of order) {
    let content = '';
    if (type === 'definition') content = await fetchDefinition(query);
    if (type === 'funFact') content = await fetchFunFact();
    if (type === 'dateFact') content = await fetchDateFact();

    const card = document.createElement('div');
    card.className = 'card';
    card.innerText = `${type.toUpperCase()}:\n${content}`;
    feed.appendChild(card);

    // Track time spent (simple example: start timer)
    const startTime = Date.now();
    card.addEventListener('mouseenter', () => startTime);
    card.addEventListener('mouseleave', () => {
      const elapsed = (Date.now() - startTime)/1000; // seconds
      updateMetrics(type, query, elapsed);
    });

    updateMetrics(type, query);
    maybeAskFeedback(type); // ask feedback occasionally
  }
}

// ===== Event Listeners =====
document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('queryInput').value.trim();
  if (!query) return;
  displayContent(query);
});

// Optional: press Enter to search
document.getElementById('queryInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('searchBtn').click();
});

// ===== On Load: Show Today's Date Fact =====
window.onload = async () => {
  const feed = document.getElementById('feed');
  const fact = await fetchDateFact();
  const card = document.createElement('div');
  card.className = 'card';
  card.innerText = `TODAY'S DATE FACT:\n${fact}`;
  feed.appendChild(card);
};
