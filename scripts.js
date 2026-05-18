javascript
/**
 * scripts.js
 * Production-grade interactive JavaScript for AIGON landing page.
 * Provides testimonial carousel, smooth anchor scrolling, scroll-triggered fade-in animations,
 * and robust error handling, logging, and performance optimizations.
 *
 * @module scripts
 * @requires IntersectionObserver
 * @version 2.0.0
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants & Configuration
// ---------------------------------------------------------------------------

/** @enum {number} */
const CONFIG = Object.freeze({
  /** Auto-slide interval in milliseconds */
  AUTO_SLIDE_DELAY: 5000,
  /** IntersectionObserver threshold */
  OBSERVER_THRESHOLD: 0.1,
  /** Root margin for IntersectionObserver (px) */
  OBSERVER_ROOT_MARGIN: '0px 0px -50px 0px',
  /** Logging prefix */
  LOG_PREFIX: '[AIGON]',
});

/** @enum {string} */
const SELECTORS = Object.freeze({
  CAROUSEL: '.testimonial-carousel',
  SLIDE: '.testimonial-slide',
  DOTS_CONTAINER: '.testimonial-dots',
  DOT: '.dot',
  WRAPPER: '.testimonial-wrapper',
  FADE_IN: '.fade-in',
  ANCHOR_LINK: 'a[href^="#"]',
});

/** @enum {string} */
const CSS_CLASSES = Object.freeze({
  ACTIVE: 'active',
  VISIBLE: 'visible',
});

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

/**
 * Safely logs messages with ISO timestamp and consistent prefix.
 * @param {'debug'|'info'|'warn'|'error'} level - Log level.
 * @param {string} message - Primary log message.
 * @param {...*} args - Additional arguments to log.
 * @returns {void}
 */
function log(level, message, ...args) {
  if (typeof console === 'undefined' || typeof console[level] !== 'function') {
    return;
  }
  // Only emit debug if explicitly enabled (e.g., via environment flag)
  if (level === 'debug' && process?.env?.NODE_ENV === 'production') {
    return;
  }
  const timestamp = new Date().toISOString();
  const prefix = `${CONFIG.LOG_PREFIX} [${timestamp}]`;
  console[level](`${prefix} ${message}`, ...args);
}

// ---------------------------------------------------------------------------
// Error Handling Utility
// ---------------------------------------------------------------------------

/**
 * Creates a custom, safe error for known failure scenarios.
 * @param {string} code - Machine-readable error code.
 * @param {string} message - Human-readable description.
 * @returns {Error}
 */
function createAppError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

// ---------------------------------------------------------------------------
// DOM Helpers
// ---------------------------------------------------------------------------

/**
 * Queries the document for a single element. Logs a warning if not found.
 * @param {string} selector - CSS selector.
 * @param {Element} [context=document] - Context to query within.
 * @returns {Element|null}
 */
function queryElement(selector, context = document) {
  if (typeof selector !== 'string' || !selector.trim()) {
    log('error', 'Invalid selector provided to queryElement.', selector);
    return null;
  }
  const el = context.querySelector(selector);
  if (!el) {
    log('warn', `Element not found: "${selector}"`);
  }
  return el;
}

/**
 * Queries the document for multiple elements. Logs a warning if none found.
 * @param {string} selector - CSS selector.
 * @param {Element} [context=document] - Context to query within.
 * @returns {NodeListOf<Element>}
 */
function queryElements(selector, context = document) {
  if (typeof selector !== 'string' || !selector.trim()) {
    log('error', 'Invalid selector provided to queryElements.', selector);
    return document.createDocumentFragment().querySelectorAll('*'); // empty NodeList
  }
  const nodes = context.querySelectorAll(selector);
  if (nodes.length === 0) {
    log('warn', `No elements found for selector: "${selector}"`);
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Testimonial Carousel
// ---------------------------------------------------------------------------

/**
 * Initializes the testimonial carousel with auto-slide and dot navigation.
 * Requires a container with class `.testimonial-carousel`, each slide with class
 * `.testimonial-slide`, and a dot container with class `.testimonial-dots`
 * containing dot elements with class `.dot`.
 *
 * @function initTestimonialCarousel
 * @returns {void}
 * @throws {Error} If DOM structure is invalid.
 */
function initTestimonialCarousel() {
  const carousel = queryElement(SELECTORS.CAROUSEL);
  if (!carousel) {
    log('warn', 'Testimonial carousel container not found. Skipping carousel initialization.');
    return;
  }

  const slides = queryElements(SELECTORS.SLIDE, carousel);
  const dotsContainer = queryElement(SELECTORS.DOTS_CONTAINER, carousel);

  if (!slides.length || !dotsContainer) {
    log('warn', 'Carousel missing slides or dots container. Aborting.');
    return;
  }

  const dots = queryElements(SELECTORS.DOT, dotsContainer);

  if (dots.length !== slides.length) {
    log('error', `Dot count (${dots.length}) does not match slide count (${slides.length}).`);
    return;
  }

  /** @type {number} */
  let currentIndex = 0;

  /** @type {number|null} */
  let autoSlideInterval = null;

  // -----------------------------------------------------------------------
  // Internal helper functions
  // -----------------------------------------------------------------------

  /**
   * Validates and shows the slide at the given index.
   * @param {number} index - Zero-based slide index.
   * @returns {void}
   */
  function showSlide(index) {
    if (!Number.isFinite(index) || index < 0 || index >= slides.length) {
      log('warn', `Invalid slide index: ${index}. Must be between 0 and ${slides.length - 1}.`);
      return;
    }

    try {
      // Batch DOM updates to reduce reflow
      slides.forEach((slide, i) => {
        slide.classList.toggle(CSS_CLASSES.ACTIVE, i === index);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle(CSS_CLASSES.ACTIVE, i === index);
      });
      currentIndex = index;
      log('debug', `Slide changed to index ${index}`);
    } catch (err) {
      log('error', 'Error while updating slide visibility.', err);
    }
  }

  /**
   * Advances to the next slide (wraps around).
   * @returns {void}
   */
  function nextSlide() {
    const next = (currentIndex + 1) % slides.length;
    showSlide(next);
  }

  /**
   * Starts the auto-slide timer. Clears any existing timer first.
   * @returns {void}
   */
  function startAutoSlide() {
    stopAutoSlide();
    if (CONFIG.AUTO_SLIDE_DELAY <= 0) {
      log('warn', 'Auto-slide delay is non-positive. Auto-slide disabled.');
      return;
    }
    autoSlideInterval = setInterval(nextSlide, CONFIG.AUTO_SLIDE_DELAY);
    log('debug', 'Auto-slide started.');
  }

  /**
   * Stops the auto-slide timer.
   * @returns {void}
   */
  function stopAutoSlide() {
    if (autoSlideInterval !== null) {
      clearInterval(autoSlideInterval);
      autoSlideInterval = null;
      log('debug', 'Auto-slide stopped.');
    }
  }

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  /**
   * Handles click on a dot. Pauses auto-slide, shows the clicked slide,
   * then restarts auto-slide.
   * @param {Event} event - The click event.
   * @returns {void}
   */
  function onDotClick(event) {
    if (!(event.currentTarget instanceof Element)) {
      log('warn', 'onDotClick received non-element target.');
      return;
    }
    const dot = /** @type {Element} */ (event.currentTarget);
    const index = Array.from(dots).indexOf(dot);
    if (index === -1) {
      log('warn', 'Clicked dot not found among registered dots.');
      return;
    }
    stopAutoSlide();
    showSlide(index);
    startAutoSlide();
  }

  // -----------------------------------------------------------------------
  // Attach dot click handlers (event delegation)
  // -----------------------------------------------------------------------

  try {
    dots.forEach((dot) => {
      dot.addEventListener('click', onDotClick);
    });
  } catch (err) {
    log('error', 'Failed to attach dot click listeners.', err);
    return;
  }

  // Initial state
  showSlide(0);
  startAutoSlide();

  // -----------------------------------------------------------------------
  // Optional: Pause on hover using event delegation on carousel
  // -----------------------------------------------------------------------

  const wrapper = queryElement(SELECTORS.WRAPPER, carousel) || carousel;

  const handleMouseEnter = () => stopAutoSlide();
  const handleMouseLeave = () => startAutoSlide();

  wrapper.addEventListener('mouseenter', handleMouseEnter);
  wrapper.addEventListener('mouseleave', handleMouseLeave);

  log('info', 'Testimonial carousel initialized successfully.');
}

// ---------------------------------------------------------------------------
// Smooth Scrolling
// ---------------------------------------------------------------------------

/**
 * Enables smooth scrolling for all anchor links pointing to same-page IDs.
 * Uses event delegation on the document to avoid attaching individual listeners.
 *
 * @function initSmoothScroll
 * @returns {void}
 */
function initSmoothScroll() {
  try {
    document.addEventListener('click', (event) => {
      const link = event.target.closest(SELECTORS.ANCHOR_LINK);
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      // Validate that href is a simple fragment identifier (no malicious payload)
      if (!/^#[a-zA-Z_][\w\-.:]*$/.test(href)) {
        log('warn', `Potentially unsafe anchor href ignored: ${href}`);
        return;
      }

      const target = document.querySelector(href);
      if (!(target instanceof Element)) {
        log('warn', `Smooth scroll target not found: ${href}`);
        return;
      }

      event.preventDefault();
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (scrollErr) {
        // Fallback for older browsers
        target.scrollIntoView({ block: 'start' });
        log('warn', 'Smooth scroll not supported; used fallback.', scrollErr);
      }
    });
    log('info', 'Smooth scrolling initialized.');
  } catch (err) {
    log('error', 'Smooth scroll initialization failed.', err);
  }
}

// ---------------------------------------------------------------------------
// Fade-In on Scroll (IntersectionObserver)
// ---------------------------------------------------------------------------

/**
 * Observes elements with class `.fade-in` and adds `.visible` class when they
 * enter the viewport. Unobserves the element after animation to free resources.
 *
 * @function initFadeInObserver
 * @returns {void}
 */
function initFadeInObserver() {
  if (!('IntersectionObserver' in window)) {
    log('warn', 'IntersectionObserver not supported. Fade-in effect disabled.');
    return;
  }

  const elements = queryElements(SELECTORS.FADE_IN);
  if (!elements.length) {
    log('info', 'No .fade-in elements found. Nothing to observe.');
    return;
  }

  /** @type {IntersectionObserverCallback} */
  const onIntersection = (entries, observer) => {
    for (const entry of entries) {
      if (!(entry.target instanceof Element)) continue;

      if (entry.isIntersecting) {
        try {
          entry.target.classList.add(CSS_CLASSES.VISIBLE);
          observer.unobserve(entry.target);
          log('debug', `Fade-in triggered for element`, entry.target);
        } catch (err) {
          log('error', 'Error adding visible class to fade-in element.', err);
        }
      }
    }
  };

  try {
    const observer = new IntersectionObserver(onIntersection, {
      threshold: CONFIG.OBSERVER_THRESHOLD,
      rootMargin: CONFIG.OBSERVER_ROOT_MARGIN,
    });

    elements.forEach((el) => observer.observe(el));
    log('info', `IntersectionObserver observing ${elements.length} fade-in elements.`);
  } catch (err) {
    log('error', 'Failed to create IntersectionObserver.', err);
  }
}

// ---------------------------------------------------------------------------
// Application Initialization
// ---------------------------------------------------------------------------

/**
 * Initializes all interactive features when the DOM is ready.
 * Wraps each feature in a try/catch so one failure does not block others.
 *
 * @function initApp
 * @returns {void}
 */
function initApp() {
  log('info', 'Starting initialization...');

  try {
    initTestimonialCarousel();
  } catch (err) {
    log('error', 'Testimonial carousel initialization failed.', err);
  }

  try {
    initSmoothScroll();
  } catch (err) {
    log('error', 'Smooth scroll initialization failed.', err);
  }

  try {
    initFadeInObserver();
  } catch (err) {
    log('error', 'Fade-in observer initialization failed.', err);
  }

  log('info', 'Initialization complete.');
}

// ---------------------------------------------------------------------------
// DOMContentLoaded / Immediate Execution
// ---------------------------------------------------------------------------

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}