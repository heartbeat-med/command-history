'use babel';

import CommandHistoryView from './command-history-view';
import CommandFavoritesView from './command-favorites-view';
import { CompositeDisposable } from 'atom';
import History from './history';
import Favorites from './favorites';
import { dispatchEvent, getActiveElement } from './helpers';

export default {
  view: null,
  modalPanel: null,
  subscriptions: null,
  config: {
    maxItems: { type: 'integer', default: 30, minimum: 1 },
    blacklist: {
      type: 'array',
      default: [
        'core:*',
        'command-palette:*',
        'tree-view:*',
        'editor:*',
        'command-history:*',
      ],
      items: { type: 'string' },
    },
  },
  activate({ history }) {
    this.historyView = new CommandHistoryView();
    this.favoritesView = new CommandFavoritesView();

    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'command-history:toggle': () => this.toggleHistoryView(),
        'command-history:clear': () => this.clearHistory(),
        'command-history:toggle-favorites': () => this.toggleFavoritesView(),
        'command-history:clear-favorites': () => this.clearFavorites(),
      }),
    );
    this.subscriptions.add(
      atom.commands.add('.command-history', {
        'command-history:blacklist-command': () => this.blacklistCommand(),
      }),
    );

    // Register global command listener
    this.subscriptions.add(
      atom.commands.onDidDispatch(evt => this.onDispatch(evt)),
    );

    this.subscriptions.add(
      this.historyView.emitter.on('dispatch', evt => this.onHistoryDispatch(evt)),
      this.favoritesView.emitter.on('dispatch', evt => this.onHistoryDispatch(evt)),
    );

    this.subscriptions.add(
      atom.config.onDidChange('command-history', ({ newValue }) => {
        History.setConfig(newValue);
        Favorites.setConfig(newValue);
      }),
    );

    History.setConfig(atom.config.get('command-history'));
    Favorites.setConfig(atom.config.get('command-history'));
    History.setHistory(history);
  },
  deactivate() {
    this.historyView.destroy();
    this.favoritesView.destroy();
    this.subscriptions.dispose();
  },
  serialize() {
    return {
      history: History.getRawHistory(),
    };
  },
  toggleHistoryView() {
    this.historyView.toggle();
  },
  clearHistory() {
    History.clearHistory();
  },
  toggleFavoritesView() {
    this.favoritesView.toggle();
  },
  clearFavoritesHistory() {
    Favorites.clearFavorites();
  },
  blacklistCommand() {
    const selectedItem = this.historyView.selectListView.getSelectedItem() || this.favoritesView.selectListView.getSelectedItem();
    if (selectedItem != null) {
      const blacklist = atom.config.get('command-history.blacklist');
      atom.config.set('command-history.blacklist', [
        ...blacklist,
        selectedItem.name,
      ]);
    }
  },
  onDispatch(evt) {
    History.addCommandEvent(evt);
    Favorites.addCommandEvent(evt);
  },
  onHistoryDispatch({ name }) {
    dispatchEvent(name, getActiveElement());
  },
};
