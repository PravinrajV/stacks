/**
 * Stacks app entry point.
 */

import './dom/styles.css'
import { initApp } from './dom/app'

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp()
  })
} else {
  initApp()
}

