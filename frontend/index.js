import { registerRootComponent } from 'expo';
import App from './App';

// Ensure web document body is dark themed immediately to prevent any blank white flashes
if (typeof document !== 'undefined') {
  if (document.documentElement) document.documentElement.style.backgroundColor = '#0B0F19';
  if (document.body) document.body.style.backgroundColor = '#0B0F19';
}

registerRootComponent(App);

