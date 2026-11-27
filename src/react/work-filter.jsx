// Work page industry filter (US-07). React is loaded on this page only.
// The case studies are plain HTML in the page, so without JavaScript every
// case study shows. On load this reads those cards, then renders the filter
// and the filtered list in their place. No animation: the list just changes.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

function readCards(list) {
  return [...list.querySelectorAll('[data-case]')].map((el) => ({
    id: el.dataset.case,
    industry: el.dataset.industry,
    html: el.innerHTML, // our own static markup from the build, not user input
  }));
}

function WorkFilter({ cards, industries }) {
  const [active, setActive] = useState('All');
  const shown = active === 'All' ? cards : cards.filter((c) => c.industry === active);
  return (
    <>
      <div className="filter" role="group" aria-label="Filter case studies by industry">
        {['All', ...industries].map((name) => (
          <button
            key={name}
            type="button"
            className="filter-button"
            aria-pressed={active === name}
            onClick={() => setActive(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <p className="filter-status" role="status">
        {active === 'All'
          ? `Showing all ${cards.length} case studies`
          : `Showing ${shown.length} of ${cards.length} case studies: ${active}`}
      </p>
      <ul className="grid-3 case-grid">
        {shown.map((c) => (
          <li key={c.id} className="panel case" data-case={c.id} dangerouslySetInnerHTML={{ __html: c.html }} />
        ))}
      </ul>
    </>
  );
}

const mount = document.getElementById('work-filter');
const list = mount && mount.querySelector('.case-grid');
if (mount && list) {
  const cards = readCards(list);
  const industries = [...new Set(cards.map((c) => c.industry))];
  createRoot(mount).render(<WorkFilter cards={cards} industries={industries} />);
}
