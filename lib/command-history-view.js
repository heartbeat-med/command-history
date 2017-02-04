'use babel';
import {
  getElementByString,
  getActiveElement,
  getKeybindingsForElement,
} from './helpers';
import SelectListView from 'atom-select-list';
import { humanizeKeystroke } from 'underscore-plus';
import fuzzaldrin from 'fuzzaldrin';
import fuzzaldrinPlus from 'fuzzaldrin-plus';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import History from './history';
import { CompositeDisposable } from 'atom';
import { Emitter } from 'atom';

export default class CommandHistoryView {
  constructor() {
    this.keyBindingsForActiveElement = [];
    this.emitter = new Emitter();
    this.selectListView = new SelectListView({
      emptyMessage: 'No entries in history',
      items: [],
      filterKeyForItem: item => {
        return item.displayName;
      },
      elementForItem: item => this.getElementForItem(item),
      didConfirmSelection: keyBinding => {
        this.hide();
        this.dispatchEvent(keyBinding);
      },
      didCancelSelection: () => {
        this.hide();
      },
    });

    this.panel = null;
    this.element = getElementByString(`<div></div>`);
    this.element.appendChild(this.selectListView.element);
  }

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

  dispatchEvent(evt) {
    this.emitter.emit('dispatch', evt);
  }

  onHistoryChanged(history) {
    const items = [...history].reverse();
    this.selectListView.update({ items });
  }

  toggle() {
    if (this.panel && this.panel.isVisible()) {
      this.hide();
      return Promise.resolve();
    } else {
      return this.show();
    }
  }

  async show() {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      History.emitter.on(
        History.EVENTS.CHANGED,
        history => this.onHistoryChanged(history),
      ),
    );

    if (!this.panel) {
      this.panel = atom.workspace.addModalPanel({
        item: this.element,
        className: 'command-history',
      });
    }

    this.keyBindingsForActiveElement = getKeybindingsForElement(
      getActiveElement(),
    );
    this.previouslyFocusedElement = document.activeElement;

    this.selectListView.refs.queryEditor.selectAll();
    this.panel.show();
    this.selectListView.focus();
  }

  hide() {
    this.subscriptions.dispose();
    this.panel.hide();
  }

  getElementForItem(item) {
    const keyInfos = this
      .keyBindingsForActiveElement.filter(
        ({ command }) => command === item.name,
      )
      .map(({ keystrokes }) => {
        return `<kbd class="key-binding">${humanizeKeystroke(
          keystrokes,
        )}</kbd>`;
      });

    const li = getElementByString(
      `<li class="event" data-eventName="${item.name}">
      <div class="pull-right">${keyInfos.join('')}</div>
    </li>`,
    );

    const span = getElementByString(`<span title="${item.name}"></span>`);

    const query = this.selectListView.getQuery();
    const matches = this.useAlternateScoring
      ? fuzzaldrinPlus.match(item.displayName, query)
      : fuzzaldrin.match(item.displayName, query);
    let matchedChars = [];
    let lastIndex = 0;

    for (const matchIndex of matches) {
      const unmatched = item.displayName.substring(lastIndex, matchIndex);
      if (unmatched) {
        if (matchedChars.length > 0) {
          const matchSpan = getElementByString(`<span class="character-match">${matchedChars.join(
            '',
          )}</span>`);
          span.appendChild(matchSpan);
          matchedChars = [];
        }

        span.appendChild(document.createTextNode(unmatched));
      }

      matchedChars.push(item.displayName[matchIndex]);
      lastIndex = matchIndex + 1;
    }

    if (matchedChars.length > 0) {
      const matchSpan = getElementByString(`<span class="character-match">${matchedChars.join(
        '',
      )}</span>`);
      span.appendChild(matchSpan);
    }

    const unmatched = item.displayName.substring(lastIndex);
    if (unmatched) {
      span.appendChild(document.createTextNode(unmatched));
    }

    const date = getElementByString(
      `<span class="text-subtle rel-date">${distanceInWordsToNow(item.date, {
        addSuffix: true,
      })}</span>`,
    );
    span.appendChild(date);

    li.appendChild(span);

    return li;
  }
}
