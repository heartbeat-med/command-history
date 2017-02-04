'use babel';

import CommandHistoryView from './command-history-view';
import { CompositeDisposable } from 'atom';
import History from './history';
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
    this.view = new CommandHistoryView();

    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'command-history:toggle': () => this.toggleHistoryView(),
        'command-history:clear': () => this.clearHistory(),
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
      this.view.emitter.on('dispatch', evt => this.onHistoryDispatch(evt)),
    );

    this.subscriptions.add(
      atom.config.onDidChange('command-history', ({ newValue }) => {
        History.setConfig(newValue);
      }),
    );

    History.setConfig(atom.config.get('command-history'));
    History.setHistory(history);
  },
  deactivate() {
    this.view.destroy();
    this.subscriptions.dispose();
  },
  serialize() {
    return {
      history: History.getRawHistory(),
    };
  },
  toggleHistoryView() {
    this.view.toggle();
  },
  clearHistory() {
    History.clearHistory();
  },
  blacklistCommand() {
    const selectedItem = this.view.selectListView.getSelectedItem();
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
  },
  onHistoryDispatch({ name }) {
    dispatchEvent(name, getActiveElement());
  },
};
