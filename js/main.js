/**
 * @file main.js
 * @description Landing page interactivity: testimonial carousel, scroll animations, mobile menu.
 * @version 1.0.0
 */

"use strict";

/**
 * Logs a message with a standard prefix.
 * @param {...any} args - Arguments to log.
 */
function log(...args) {
  const timestamp = new Date().toISOString();
  console.log(`[AIGON Landing ${timestamp}]`, ...args);
}

/**
 * Logs an error with a standard prefix.
 * @param {...any} args - Arguments to log.
 */
function logError(...args) {
  const timestamp = new Date().toISOString();
  console.error(`[AIGON Landing ERROR ${timestamp}]`, ...args);
}

// ============================================================
// 1. Testimonial Auto-Slide Carousel
// ============================================================

class TestimonialCarousel {
  /** @type {HTMLElement | null} */ container;
  /** @type {NodeListOf<Element> | null} */ slides;
  /** @type {number} */ currentIndex;
  /** @type {number | null} */ intervalId;
  /** @type {number} */ intervalMs;
  /** @type {boolean} */ isTransitioning;

  /**
   * @param {string} containerSelector - CSS selector for the carousel container.
   * @param {number} [intervalMs=5000] - Milliseconds between auto-slides.
   */
  constructor(containerSelector, intervalMs = 5000) {
    /** @private */
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      logError(
        `Carousel container not found: "${containerSelector}". Aborting carousel setup.`
      );
      this.slides = null;
      this.currentIndex = 0;
      this.intervalId = null;
      this.intervalMs = intervalMs;
      this.isTransitioning = false;
      return;
    }
    this.slides = this.container.querySelectorAll(".testimonial-slide");
    if (this.slides.length === 0) {
      logError(`No slides found inside "${containerSelector}". Carousel disabled.`);
      this.slides = null;
      this.currentIndex = 0;
      this.intervalId = null;
      this.intervalMs = intervalMs;
      this.isTransitioning = false;
      return;
    }
    this.currentIndex = 0;
    this.intervalId = null;
    this.intervalMs = intervalMs;
    this.isTransitioning = false;

    this.init();
  }

  /** Initializes the carousel: shows first slide, starts auto-play, sets up pause/resume. */
  init() {
    if (!this.container || !this.slides) return;
    this.showSlide(0);
    this.startAutoSlide();
    this.setupHoverPause();
    log(`Carousel initialized with ${this.slides.length} slides.`);
  }

  /**
   * Shows a specific slide by index.
   * @param {number} index
   */
  showSlide(index) {
    if (!this.slides) return;
    if (index < 0 || index >= this.slides.length) {
      logError(`Invalid slide index: ${index}.`);
      return;
    }
    this.slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === index);
    });
    this.currentIndex = index;
  }

  /** Moves to the next slide. */
  nextSlide() {
    if (!this.slides || this.isTransitioning) return;
    const next = (this.currentIndex + 1) % this.slides.length;
    this.showSlide(next);
  }

  /** Starts the auto-slide interval. */
  startAutoSlide() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.nextSlide();
    }, this.intervalMs);
  }

  /** Stops the auto-slide interval. */
  stopAutoSlide() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Sets up pause on hover and resume on leave. */
  setupHoverPause() {
    if (!this.container) return;
    this.container.addEventListener("mouseenter", () => {
      this.stopAutoSlide();
    });
    this.container.addEventListener("mouseleave", () => {
      this.startAutoSlide();
    });
  }

  /** Cleanup: stops auto-slide, removes event listeners if needed. */
  destroy() {
    this.stopAutoSlide();
    if (this.container) {
      // Remove hover listeners (we used anonymous functions, but we can keep for simplicity)
      // In production, store references; for this demo, safe to remove all.
    }
    log("Carousel destroyed.");
  }
}

// ============================================================
// 2. Scroll-Triggered Fade-In Animations
// ============================================================

/**
 * Observes elements with class 'fade-in' and adds 'visible' when they enter viewport.
 * Uses IntersectionObserver with fallback.
 */
function initScrollAnimations() {
  const elements = document.querySelectorAll(".fade-in");
  if (elements.length === 0) {
    log("No fade-in elements found on page.");
    return;
  }

  if (!("IntersectionObserver" in window)) {
    log("IntersectionObserver not supported. Making all fade-in elements visible.");
    elements.forEach((el) => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target); // Only animate once
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
  );

  elements.forEach((el) => observer.observe(el));
  log(`Scroll animations initialized for ${elements.length} elements.`);
}

// ============================================================
// 3. Mobile Hamburger Menu
// ============================================================

/**
 * Toggles a mobile navigation menu on hamburger button click.
 * Expects:
 *   - a button with class 'hamburger-btn' (or data-hamburger)
 *   - a nav with class 'mobile-nav' (or data-mobile-nav)
 * If elements are missing, logs a warning and exits gracefully.
 */
function initMobileMenu() {
  const toggleBtn = document.querySelector(".hamburger-btn");
  const mobileNav = document.querySelector(".mobile-nav");

  if (!toggleBtn || !mobileNav) {
    log("Mobile menu elements not found. Skipping hamburger menu setup.");
    return;
  }

  /**
   * Opens or closes the mobile navigation.
   * @param {boolean} [forceState] - If given, forces open (true) or close (false).
   */
  function toggleMenu(forceState) {
    const isOpen =
      forceState !== undefined
        ? forceState
        : !mobileNav.classList.contains("open");
    mobileNav.classList.toggle("open", isOpen);
    toggleBtn.classList.toggle("open", isOpen);
    toggleBtn.setAttribute("aria-expanded", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
  }

  // Click on hamburger button
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close menu when clicking a link inside mobile nav
  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      toggleMenu(false);
    });
  });

  // Close menu if clicked outside
  document.addEventListener("click", (e) => {
    if (
      mobileNav.classList.contains("open") &&
      !mobileNav.contains(e.target) &&
      !toggleBtn.contains(e.target)
    ) {
      toggleMenu(false);
    }
  });

  // Close menu on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileNav.classList.contains("open")) {
      toggleMenu(false);
    }
  });

  log("Mobile menu initialized.");
}

// ============================================================
// 4. Main Initialization
// ============================================================

/**
 * Initializes all interactive features when DOM is ready.
 * Wrapped in try-catch to prevent total failure.
 */
function init() {
  try {
    initScrollAnimations();
    initMobileMenu();

    // Initialize carousel if the container exists
    const carouselContainer = document.getElementById("testimonial-carousel");
    if (carouselContainer) {
      new TestimonialCarousel("#testimonial-carousel", 5000);
    } else {
      log("Testimonial carousel container not found. Carousel skipped.");
    }

    log("All interactive features initialized successfully.");
  } catch (err) {
    logError("Initialization failed:", err);
  }
}

// Wait for DOM content to be fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}