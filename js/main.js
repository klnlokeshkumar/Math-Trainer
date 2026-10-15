(() => {
  const search = document.getElementById('trainerSearch');
  const cards = [...document.querySelectorAll('.trainer-card')];
  const empty = document.getElementById('emptyState');
  const future = document.querySelector('.future-card');
  if (!search) return;
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const content = `${card.dataset.search || ''} ${card.innerText}`.toLowerCase();
      const match = content.includes(query);
      card.hidden = !match;
      if (match) visible++;
    });
    if (future) future.hidden = query.length > 0;
    empty.hidden = visible !== 0;
  });
})();
