/**
 * Task 9.4: Animation utilities for card transitions and mode switches.
 * 
 * Handles:
 * - Card flip/fade animations (320ms)
 * - Mode switch fade/scale animations (250ms)
 * - prefers-reduced-motion support (animations disabled)
 * - Animation interruption and completion
 */

/**
 * Check if user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Animate card transition: fade out old, fade in new.
 * Uses CSS animations via classes instead of modifying transforms
 * (to avoid conflicting with computeFit scaling).
 */
export async function animateCardTransition(
  cardElement: HTMLElement,
  duration: number = 320
): Promise<void> {
  if (prefersReducedMotion()) {
    return
  }

  return new Promise((resolve) => {
    // Create a wrapper to handle animation
    const wrapper = document.createElement('div')
    wrapper.style.position = 'absolute'
    wrapper.style.perspective = '1200px'
    wrapper.style.width = cardElement.style.width || '512px'
    wrapper.style.height = cardElement.style.height || '342px'

    cardElement.parentElement?.insertBefore(wrapper, cardElement)
    wrapper.appendChild(cardElement)

    cardElement.classList.add('card-flip-in')

    const onAnimationEnd = () => {
      cardElement.removeEventListener('animationend', onAnimationEnd)
      cardElement.classList.remove('card-flip-in')
      resolve()
    }

    cardElement.addEventListener('animationend', onAnimationEnd)

    // Fallback timeout in case animationend doesn't fire
    setTimeout(() => {
      cardElement.removeEventListener('animationend', onAnimationEnd)
      cardElement.classList.remove('card-flip-in')
      resolve()
    }, duration + 50)
  })
}

/**
 * Animate mode switch: fade + scale transition.
 * Used when switching between Edit and Run mode.
 */
export async function animateModeSwitchIn(
  element: HTMLElement,
  duration: number = 250
): Promise<void> {
  if (prefersReducedMotion()) {
    return
  }

  return new Promise((resolve) => {
    element.classList.add('mode-switch-in')

    const onAnimationEnd = () => {
      element.removeEventListener('animationend', onAnimationEnd)
      element.classList.remove('mode-switch-in')
      resolve()
    }

    element.addEventListener('animationend', onAnimationEnd)

    setTimeout(() => {
      element.removeEventListener('animationend', onAnimationEnd)
      element.classList.remove('mode-switch-in')
      resolve()
    }, duration + 50)
  })
}

export async function animateModeSwitchOut(
  element: HTMLElement,
  duration: number = 250
): Promise<void> {
  if (prefersReducedMotion()) {
    return
  }

  return new Promise((resolve) => {
    element.classList.add('mode-switch-out')

    const onAnimationEnd = () => {
      element.removeEventListener('animationend', onAnimationEnd)
      element.classList.remove('mode-switch-out')
      resolve()
    }

    element.addEventListener('animationend', onAnimationEnd)

    setTimeout(() => {
      element.removeEventListener('animationend', onAnimationEnd)
      element.classList.remove('mode-switch-out')
      resolve()
    }, duration + 50)
  })
}

/**
 * Animate modal fade in/out.
 */
export async function animateModalIn(modal: HTMLElement, duration: number = 150): Promise<void> {
  if (prefersReducedMotion()) {
    return
  }

  return new Promise((resolve) => {
    modal.classList.add('modal-fade-in')

    const onAnimationEnd = () => {
      modal.removeEventListener('animationend', onAnimationEnd)
      modal.classList.remove('modal-fade-in')
      resolve()
    }

    modal.addEventListener('animationend', onAnimationEnd)

    setTimeout(() => {
      modal.removeEventListener('animationend', onAnimationEnd)
      modal.classList.remove('modal-fade-in')
      resolve()
    }, duration + 50)
  })
}

export async function animateModalOut(modal: HTMLElement, duration: number = 150): Promise<void> {
  if (prefersReducedMotion()) {
    return
  }

  return new Promise((resolve) => {
    modal.classList.add('modal-fade-out')

    const onAnimationEnd = () => {
      modal.removeEventListener('animationend', onAnimationEnd)
      modal.classList.remove('modal-fade-out')
      resolve()
    }

    modal.addEventListener('animationend', onAnimationEnd)

    setTimeout(() => {
      modal.removeEventListener('animationend', onAnimationEnd)
      modal.classList.remove('modal-fade-out')
      resolve()
    }, duration + 50)
  })
}
