import 'zone.js';
import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Create Angular application and register as Web Component
(async () => {
  const app = await createApplication(appConfig);

  // Convert Angular component to Web Component
  const webComponent = createCustomElement(App, { injector: app.injector });

  // Register the custom element
  customElements.define('web-audio-sampler', webComponent);
})();
