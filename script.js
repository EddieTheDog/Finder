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
    const res = await fetch(`http://numbersapi.com/${month}/${day}/date`);
    const fact = await res.text();
    return fact;
  } catch (e) {
    return 'Could not fetch date fact.';
  }
}

// ===== Personalization Algorithm =====
const userMetrics = JSON.parse(localStorage.getItem('finderMetrics')) || {
  clicks: 0,
  lastQuery: '',
  preferredType: 'definition', // default
};

function updateMetrics(type, query) {
  userMetrics.clicks += 1;
  userMetrics.lastQuery = query;
  userMetrics.preferredType = type;
  localStorage.setItem('finderMetrics', JSON.stringify(userMetrics));
}

// Simple scoring algorithm: weight content types based on user preference
function getContentOrder() {
  if (userMetrics.preferredType === 'definition') return ['definition', 'funFact', 'dateFact'];
  if (userMetrics.preferredType === 'funFact') return ['funFact', 'definition', 'dateFact'];
  return ['dateFact', 'definition', 'funFact'];
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

    updateMetrics(type, query); // update personalization metrics
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
