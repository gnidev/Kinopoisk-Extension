const BUTTON_CONTAINER_SELECTOR = '[class^="styles_buttonsContainer__"]';
const VIP_BUTTON_ATTR = 'data-kinopoisk-vip-button';

let pendingInjectionHandle = null;
let domObserver = null;
let navigationListenersAttached = false;

const scheduleVipInjection = () => {
  if (pendingInjectionHandle !== null) {
    return;
  }

  const raf = window.requestAnimationFrame?.bind(window);

  const callback = () => {
    pendingInjectionHandle = null;
    injectVipButton();
  };

  if (raf) {
    pendingInjectionHandle = raf(callback);
    return;
  }

  pendingInjectionHandle = window.setTimeout(callback, 16);
};

const startDomObserver = () => {
  if (domObserver) {
    return;
  }

  domObserver = new MutationObserver(() => {
    scheduleVipInjection();
  });

  const targetNode = document.documentElement || document.body;

  if (targetNode) {
    domObserver.observe(targetNode, {
      childList: true,
      subtree: true
    });
  }
};

const setupNavigationListeners = () => {
  if (navigationListenersAttached) {
    return;
  }

  navigationListenersAttached = true;

  const triggerInjection = () => {
    scheduleVipInjection();
  };

  const wrapHistoryMethod = (methodName) => {
    const original = history[methodName];

    if (typeof original !== 'function') {
      return;
    }

    history[methodName] = function wrapper(...args) {
      const result = original.apply(this, args);
      triggerInjection();
      return result;
    };
  };

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');

  window.addEventListener('popstate', triggerInjection);
  window.addEventListener('hashchange', triggerInjection);
};

const createVipUrl = () => {
  try {
    const vipUrl = new URL(window.location.href);
    if (!vipUrl.hostname.endsWith('.ru')) {
      return vipUrl.toString();
    }

    vipUrl.hostname = vipUrl.hostname.replace(/\.ru$/, '.vip');
    return vipUrl.toString();
  } catch (error) {
    return window.location.href.replace('.ru', '.vip');
  }
};

const applyVipStyles = (element) => {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  element.style.background = 'linear-gradient(135deg, #00994f 0%, #00d472 100%)';
  element.style.border = 'none';
  element.style.color = '#ffffff';
  element.style.paddingLeft = '16px';
  element.style.paddingRight = '16px';
};

const buildVipButton = (container) => {
  const lastChild = container.lastElementChild;

  if (!lastChild) {
    return null;
  }

  const clonedButton = lastChild.cloneNode(true);

  if (clonedButton.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  clonedButton.setAttribute(VIP_BUTTON_ATTR, 'true');

  const buttonElement =
    clonedButton.matches('a, button') ?
      clonedButton :
      clonedButton.querySelector('a, button');

  if (clonedButton.hasAttribute('id')) {
    clonedButton.removeAttribute('id');
  }

  const vipHref = createVipUrl();

  if (buttonElement) {
    if (buttonElement.hasAttribute('id')) {
      buttonElement.removeAttribute('id');
    }

    if (buttonElement.tagName.toLowerCase() === 'a') {
      buttonElement.setAttribute('href', vipHref);
      buttonElement.setAttribute('target', '_self');
    } else {
      buttonElement.addEventListener('click', () => {
        window.location.href = vipHref;
      });
    }

    buttonElement.textContent = '\u0421\u043c\u043e\u0442\u0440\u0435\u0442\u044c';
    applyVipStyles(buttonElement);
  } else {
    clonedButton.textContent = '\u0421\u043c\u043e\u0442\u0440\u0435\u0442\u044c';
    applyVipStyles(clonedButton);
  }

  return clonedButton;
};

const injectVipButton = () => {
  const container = document.querySelector(BUTTON_CONTAINER_SELECTOR);

  if (!container) {
    return false;
  }

  if (container.querySelector(`[${VIP_BUTTON_ATTR}="true"]`)) {
    return true;
  }

  const vipButton = buildVipButton(container);

  if (!vipButton) {
    return false;
  }

  container.insertBefore(vipButton, container.firstElementChild);
  return true;
};

const init = () => {
  setupNavigationListeners();
  startDomObserver();

  if (!injectVipButton()) {
    scheduleVipInjection();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
