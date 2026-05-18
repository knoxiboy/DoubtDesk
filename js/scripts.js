/**
 * @fileoverview Provides a testimonial carousel and smooth scrolling for anchor links.
 * The carousel supports optional slide/fade transitions with auto-advance and manual controls.
 * Smooth scrolling is applied to all internal links on the page.
 */

/**
 * Logs messages with a consistent prefix and optional level.
 * @param {string} message - The message to log.
 * @param {'info'|'warn'|'error'} [level='info'] - Log level.
 */
const log = (message, level = 'info') => {
  const prefix = '[AIGON Testimonials]';
  if (level === 'warn') {
    console.warn(`${prefix} ${message}`);
  } else if (level === 'error') {
    console.error(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
};

/**
 * Initialises the testimonial carousel.
 * Requires a `.testimonials` element with child `.testimonial` items.
 * Creates navigation dots and auto-advances every 5 seconds.
 * Supports optional fade transition via CSS class `testimonial-active`.
 */
const initCarousel = () => {
  const container = document.querySelector('.testimonials');
  if (!container) {
    log('No .testimonials container found. Carousel not initialised.', 'warn');
    return;
  }

  const slides = Array.from(container.querySelectorAll('.testimonial'));
  if (slides.length === 0) {
    log('No .testimonial slides found. Carousel not initialised.', 'warn');
    return;
  }

  let currentIndex = 0;
  let autoTimer = null;
  const INTERVAL = 5000;

  // Clear any pre-existing active state
  slides.forEach((slide, i) => {
    slide.classList.remove('testimonial-active');
    slide.style.display = i === 0 ? 'block' : 'none';
  });
  slides[0].classList.add('testimonial-active');

  // Create navigation dots container
  const navContainer = document.createElement('div');
  navContainer.className = 'testimonial-nav';
  navContainer.setAttribute('role', 'tablist');
  navContainer.setAttribute('aria-label', 'Testimonial navigation');

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'testimonial-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
    dot.dataset.index = i;
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    navContainer.appendChild(dot);
  });
  container.appendChild(navContainer);

  /**
   * Shows the slide at the given index and updates navigation dots.
   * @param {number} index - The zero-based index of the slide to display.
   */
  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;

    // Update slides visibility and active class
    slides.forEach((slide, i) => {
      slide.style.display = i === index ? 'block' : 'none';
      slide.classList.toggle('testimonial-active', i === index);
    });

    // Update dots active state
    const dots = navContainer.querySelectorAll('.testimonial-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    currentIndex = index;
    log(`Carousel moved to slide ${index + 1}`);
  };

  /**
   * Advances to the next slide (wraps around).
   */
  const nextSlide = () => {
    const next = (currentIndex + 1) % slides.length;
    goToSlide(next);
  };

  /**
   * Starts the auto-play timer.
   */
  const startAutoPlay = () => {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(nextSlide, INTERVAL);
  };

  /**
   * Stops the auto-play timer.
   */
  const stopAutoPlay = () => {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  };

  // Pause auto-play on user interaction, restart on leave
  container.addEventListener('mouseenter', stopAutoPlay);
  container.addEventListener('mouseleave', startAutoPlay);
  container.addEventListener('touchstart', stopAutoPlay, { passive: true });
  container.addEventListener('touchend', startAutoPlay, { passive: true });

  // Start auto-play
  startAutoPlay();
  log('Testimonial carousel initialised');
};

/**
 * Enables smooth scrolling for all anchor links pointing to an element on the same page.
 * Uses event delegation on the document to handle dynamically added links.
 */
const enableSmoothScroll = () => {
  /**
   * Smoothly scrolls to the target element identified by the hash.
   * @param {string} hash - The hash string (e.g., "#section").
   */
  const scrollToHash = (hash) => {
    const target = document.querySelector(hash);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      log(`Scrolled to ${hash}`);
    } else {
      log(`Element not found for hash: ${hash}`, 'warn');
    }
  };

  // Intercept clicks on all anchor elements
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#') || href === '#' || href === '#!') return;

    // Prevent default only if the hash exists on the page
    const hash = href.slice(1);
    if (document.getElementById(hash)) {
      event.preventDefault();
      scrollToHash(href);
    }
  });

  log('Smooth scroll enabled for anchor links');
};

// Initialise when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCarousel();
    enableSmoothScroll();
  });
} else {
  // DOM already loaded (e.g., script loaded with defer or at end of body)
  initCarousel();
  enableSmoothScroll();
}