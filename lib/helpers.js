'use babel';

export const getElementByString = html => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstChild;
};

export const getActiveElement = () => {
  return document.activeElement === document.body
    ? atom.views.getView(atom.workspace)
    : document.activeElement;
};

export const getKeybindingsForElement = target => {
  return atom.keymaps.findKeyBindings({ target });
};

export const getCommandsForElement = target => {
  return atom.commands.findCommands({ target });
};

export const dispatchEvent = (name, target) => {
  const event = new CustomEvent(name, {
    bubbles: true,
    cancelable: true,
    silentHistory: true,
  });
  target.dispatchEvent(event);
};
