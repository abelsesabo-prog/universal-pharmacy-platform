(() => {
  if (window.__uppGuidedFlow) return;
  window.__uppGuidedFlow = true;

  const css = `
    #uppGuidedFlow{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:10px;max-width:min(720px,calc(100vw - 24px));padding:10px 14px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,.16);font:700 13px Arial,Helvetica,sans-serif;color:#172033;pointer-events:none}
    #uppGuidedFlow[hidden]{display:none}
    #uppGuidedFlow .guide-dot{width:8px;height:8px;border-radius:50%;background:#2563eb;flex:none}
    #uppGuidedFlow .guide-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #uppGuidedFlow .guide-key{font-weight:600;color:#64748b;font-size:11px}
    @media(max-width:620px){#uppGuidedFlow{bottom:8px;font-size:12px}.guide-key{display:none}}
  `;
  document.head.insertAdjacentHTML('beforeend', `<style data-upp-guided-flow>${css}</style>`);
  document.body.insertAdjacentHTML('beforeend', `<div id="uppGuidedFlow" hidden aria-live="polite"><span class="guide-dot"></span><span class="guide-text"></span><span class="guide-key">Enter = continue</span></div>`);

  const bar = document.getElementById('uppGuidedFlow');
  const text = bar.querySelector('.guide-text');
  let advanceTimer = null;
  let lastAdvanced = null;

  const isVisible = el => {
    if (!el || el.disabled || el.type === 'hidden') return false;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };

  const labelFor = el => {
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) return label.textContent.replace(/\s+/g,' ').trim().replace(/\s*optional.*$/i,'');
    }
    return el.getAttribute('aria-label') || el.placeholder || 'next field';
  };

  const fieldCandidates = root => [...root.querySelectorAll('input,select,textarea')].filter(el => {
    if (!isVisible(el)) return false;
    if (['button','submit','reset','file'].includes((el.type || '').toLowerCase())) return false;
    if (['username','password','filter','invoiceUsername','invoicePassword'].includes(el.id)) return false;
    return true;
  });

  const activeRoot = () => {
    const activeStep = document.querySelector('.step.active');
    if (activeStep) return activeStep;
    const workspace = document.getElementById('workspace');
    if (workspace && !workspace.classList.contains('hidden')) return workspace;
    return document.querySelector('main') || document.body;
  };

  const rootFor = current => current?.closest('.card,.invoice-step,.wizard') || activeRoot();
  const nextButton = () => document.getElementById('nextButton');
  const actionButton = root => [...root.querySelectorAll('button')].find(b => isVisible(b) && !b.disabled && /^(receive stock|post adjustment|create item|save|submit|confirm)/i.test(b.textContent.trim()));

  function announce(el) {
    if (!el || !isVisible(el)) { bar.hidden = true; return; }
    text.textContent = `Next: ${labelFor(el)}`;
    bar.hidden = false;
  }

  function focusField(el) {
    if (!el) return false;
    el.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(() => { el.focus({preventScroll:true}); announce(el); }, 90);
    return true;
  }

  function advance(current) {
    const root = rootFor(current);
    const fields = fieldCandidates(root);
    const index = fields.indexOf(current);
    if (index >= 0 && fields[index + 1]) {
      lastAdvanced = fields[index + 1];
      return focusField(fields[index + 1]);
    }

    const next = nextButton();
    if (next && isVisible(next) && !next.disabled) {
      next.click();
      setTimeout(() => {
        const first = fieldCandidates(activeRoot())[0];
        if (first) { lastAdvanced = first; focusField(first); }
        else {
          const action = actionButton(activeRoot());
          if (action) { lastAdvanced = action; focusField(action); }
          else bar.hidden = true;
        }
      }, 120);
      return true;
    }

    const action = actionButton(root);
    if (action) { lastAdvanced = action; return focusField(action); }
    bar.hidden = true;
    return false;
  }

  function scheduleAutoAdvance(target) {
    clearTimeout(advanceTimer);
    if (!isVisible(target) || target.type === 'password' || target.type === 'file' || target.id === 'filter') return;

    const value = String(target.value ?? '').trim();
    if (!value) return;

    advanceTimer = setTimeout(() => {
      if (document.activeElement !== target) return;
      if (!String(target.value ?? '').trim()) return;
      advance(target);
    }, target.tagName === 'SELECT' ? 180 : 850);
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
    if (target.type === 'password' || target.type === 'file' || target.id === 'filter') return;
    if (!isVisible(target)) return;
    clearTimeout(advanceTimer);
    event.preventDefault();
    event.stopImmediatePropagation();
    advance(target);
  }, true);

  document.addEventListener('input', event => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) scheduleAutoAdvance(target);
  });

  document.addEventListener('change', event => {
    const target = event.target;
    if (target instanceof HTMLSelectElement) scheduleAutoAdvance(target);
  });

  document.addEventListener('focusin', event => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
      if (isVisible(target) && target.type !== 'password' && target.id !== 'filter') announce(target);
    }
  });

  document.addEventListener('click', event => {
    const target = event.target.closest?.('.category-card');
    if (target) setTimeout(() => { const first = fieldCandidates(activeRoot())[0]; if (first) focusField(first); }, 150);
  });

  setTimeout(() => {
    const first = fieldCandidates(activeRoot())[0];
    if (first) announce(first);
  }, 250);
})();
