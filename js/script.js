/**
 * AIGON Landing Page Interactivity
 * Provides testimonial carousel, scroll animations, mobile menu toggle, and sticky header.
 * @module js/script
 */

(function () {
  'use strict';

  /** @constant {string} CSS class for sticky state */
  const STICKY_CLASS = 'sticky';

  /** @constant {string} CSS class for active mobile menu */
  const MENU_ACTIVE_CLASS = 'active';

  /** @constant {string} CSS class for animation trigger */
  const ANIMATE_CLASS = 'animate-on-scroll';

  /** @constant {string} CSS class for element in view */
  const IN_VIEW_CLASS = 'in-view';

  /** @constant {number} Scroll threshold in px for sticky header */
  const STICKY_THRESHOLD = 50;

  /** @constant {number} Carousel interval in ms */
  const CAROUSEL_INTERVAL = 4000;

  /** @constant {string} Selector for header element */
  const HEADER_SELECTOR = '.site-header';

  /** @constant {string} Selector for mobile menu toggle button */
  const MENU_TOGGLE_SELECTOR = '.mobile-menu-toggle';

  /** @constant {string} Selector for navigation menu container */
  const NAV_SELECTOR = '.main-nav';

  /** @constant {string} Selector for carousel container */
  const CAROUSEL_SELECTOR = '.testimonial-carousel';

  /** @constant {string} Selector for individual carousel slides */
  const SLIDE_SELECTOR = '.testimonial-slide';

  /** @constant {string} Selector for elements to animate on scroll */
  const ANIMATE_ELEMENTS_SELECTOR = `.${ANIMATE_CLASS}`;

  /**
   * Initializes sticky header behavior.
   * Adds/removes sticky class based on scroll position.
   */
  function initStickyHeader() {
    const header = document.querySelector(HEADER_SELECTOR);
    if (!header) {
      console.warn('Sticky header: header element not found.');
      return;
    }

    const handleScroll = () => {
      try {
        if (window.scrollY > STICKY_THRESHOLD) {
          header.classList.add(STICKY_CLASS);
          console.log('Header became sticky');
        } else {
          header.classList.remove(STICKY_CLASS);
        }
      } catch (error) {
        console.error('Error in sticky header handler:', error);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check in case page is already scrolled
    handleScroll();
    console.log('Sticky header initialized');
  }

  /**
   * Initializes mobile menu toggle.
   * Toggles active class on navigation and toggle button.
   */
  function initMobileMenu() {
    const toggleButton = document.querySelector(MENU_TOGGLE_SELECTOR);
    const nav = document.querySelector(NAV_SELECTOR);

    if (!toggleButton || !nav) {
      console.warn('Mobile menu: toggle button or nav not found.');
      return;
    }

    const handleToggle = () => {
      try {
        const isActive = nav.classList.toggle(MENU_ACTIVE_CLASS);
        toggleButton.classList.toggle(MENU_ACTIVE_CLASS);
        toggleButton.setAttribute('aria-expanded', String(isActive));
        console.log(`Mobile menu toggled: ${isActive ? 'open' : 'closed'}`);
      } catch (error) {
        console.error('Error toggling mobile menu:', error);
      }
    };

    toggleButton.addEventListener('click', handleToggle);
    console.log('Mobile menu toggle initialized');
  }

  /**
   * Initializes testimonial carousel with auto-play.
   * Rotates through slides at a given interval.
   * Pauses auto-play on mouseenter, resumes on mouseleave.
   */
  function initTestimonialCarousel() {
    const carousel = document.querySelector(CAROUSEL_SELECTOR);
    if (!carousel) {
      console.warn('Testimonial carousel: container not found.');
      return;
    }

    const slides = carousel.querySelectorAll(SLIDE_SELECTOR);
    if (slides.length === 0) {
      console.warn('Testimonial carousel: no slides found.');
      return;
    }

    let currentIndex = 0;
    let intervalId = null;

    /**
     * Shows the slide at the given index, updates active class.
     * @param {number} index - Slide index to show.
     */
    const goToSlide = (index) => {
      try {
        slides.forEach((slide, i) => {
          slide.classList.toggle('active', i === index);
        });
        currentIndex = index;
      } catch (error) {
        console.error('Error navigating carousel slide:', error);
      }
    };

    /**
     * Moves to the next slide (wrapping around).
     */
    const nextSlide = () => {
      const nextIndex = (currentIndex + 1) % slides.length;
      goToSlide(nextIndex);
    };

    /**
     * Starts the auto-play interval.
     */
    const startAutoPlay = () => {
      if (intervalId) return;
      intervalId = setInterval(nextSlide, CAROUSEL_INTERVAL);
      console.log('Carousel auto-play started');
    };

    /**
     * Stops the auto-play interval.
     */
    const stopAutoPlay = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('Carousel auto-play stopped');
      }
    };

    // Initialize: show first slide
    goToSlide(0);

    // Start auto-play
    startAutoPlay();

    // Pause/resume on hover
    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', startAutoPlay);

    console.log('Testimonial carousel initialized');
  }

  /**
   * Initializes scroll animations using Intersection Observer.
   * Adds 'in-view' class to elements with 'animate-on-scroll' class when they enter the viewport.
   */
  function initScrollAnimations() {
    const elements = document.querySelectorAll(ANIMATE_ELEMENTS_SELECTOR);
    if (elements.length === 0) {
      console.warn('Scroll animations: no elements found.');
      return;
    }

    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported. Applying all animations immediately.');
      elements.forEach((el) => el.classList.add(IN_VIEW_CLASS));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            try {
              entry.target.classList.add(IN_VIEW_CLASS);
              console.log(`Element animated: ${entry.target.className || 'unknown'}`);
              // Stop observing once animated
              observer.unobserve(entry.target);
            } catch (error) {
              console.error('Error in IntersectionObserver callback:', error);
            }
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    elements.forEach((el) => observer.observe(el));
    console.log('Scroll animations initialized');
  }

  /**
   * Main initialization function, called on DOMContentLoaded.
   */
  function init() {
    console.log('AIGON Script Initializing...');
    try {
      initStickyHeader();
      initMobileMenu();
      initTestimonialCarousel();
      initScrollAnimations();
      console.log('AIGON Script initialization complete.');
    } catch (error) {
      console.error('Fatal error during initialization:', error);
    }
  }

  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();