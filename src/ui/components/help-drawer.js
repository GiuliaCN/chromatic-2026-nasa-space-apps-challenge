// One reusable modal <dialog> for "Why does this matter?", Glossary, How to Play and confirmations.
// <dialog>.showModal() gives focus trapping, Esc to close and focus restore for free.

import { h, clear } from '../dom.js';

export function createDialogs({ t }) {
  const body = h('div', { class: 'dialog__body' });
  const title = h('h2', { class: 'dialog__title', id: 'dialog-title' });
  const closeBtn = h('button', { type: 'button', class: 'btn btn--ghost dialog__close', 'aria-label': t('nav.close'), text: '✕' });
  const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'dialog-title' }, h('div', { class: 'dialog__head' }, title, closeBtn), body);
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close(); // click on the backdrop
  });
  document.body.append(dialog);

  function open(heading, ...content) {
    title.textContent = heading;
    clear(body).append(...content);
    if (!dialog.open) dialog.showModal();
    closeBtn.focus();
  }

  return {
    close: () => dialog.close(),
    open,
    help(screen) {
      open(t(`help.${screen}.title`), h('p', { text: t(`help.${screen}.body`) }), h('p', { class: 'dialog__note', text: t('app.disclaimer') }));
    },
    glossary() {
      const entries = t.raw('glossary.entries') ?? [];
      open(t('glossary.title'), h('dl', { class: 'glossary' }, entries.flatMap((e) => [h('dt', { text: e.term }), h('dd', { text: e.definition })])));
    },
    howTo() {
      open(t('screen.menu.howTitle'), h('ol', { class: 'howto' }, t.list('screen.menu.how').map((line) => h('li', { text: line }))), h('p', { class: 'dialog__note', text: t('app.disclaimer') }));
    },
    confirm({ heading, text, yes, no, onYes }) {
      const yesBtn = h('button', { type: 'button', class: 'btn btn--danger', text: yes, onClick: () => { dialog.close(); onYes(); } });
      const noBtn = h('button', { type: 'button', class: 'btn', text: no, onClick: () => dialog.close() });
      open(heading, h('p', { text }), h('div', { class: 'dialog__actions' }, noBtn, yesBtn));
      noBtn.focus();
    },
  };

}
