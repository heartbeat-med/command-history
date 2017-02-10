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
import Favorites from './favorites';
import { CompositeDisposable } from 'atom';
import { Emitter } from 'atom';

export default class CommandFavoritesView {
  constructor() {
    this.keyBindingsForActiveElement = [];
    this.emitter = new Emitter();
    this.selectListView = new SelectListView({
      emptyMessage: 'No entries in favorites',
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
    this.element = getElementByString(`<div><span class="headline text-smaller"><span class="icon icon-star">Session favorites</span></span></div>`);
    this.element.appendChild(this.selectListView.element);
    this.element.appendChild(getElementByString(`<div class="text-subtle info">Add an active command to the blacklist by hitting <kbd>cmd x</kbd></div>`));
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

  onFavoritesChanged(favorites) {
    const items = [...favorites].reverse();
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
      Favorites.emitter.on(
        Favorites.EVENTS.CHANGED,
        favorites => this.onFavoritesChanged(favorites),
      ),
    );

    if (!this.panel) {
      this.panel = atom.workspace.addModalPanel({
        item: this.element,
        className: 'command-favorites',
      });
    }

    this.keyBindingsForActiveElement = getKeybindingsForElement(
      getActiveElement(),
    );
    this.previouslyFocusedElement = document.activeElement;

    this.selectListView.refs.queryEditor.selectAll();
    this.panel.show();
    this.selectListView.focus();
    this.selectListView.selectFirst();
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

    const counter = getElementByString(
      `<span class='badge badge-info badge-small counter'>${item.counter}</span>`,
    );
    span.appendChild(counter);

    li.appendChild(span);

    return li;
  }
}
