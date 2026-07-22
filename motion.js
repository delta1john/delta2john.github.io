/* Ahazi Kids — motion.js
   GSAP + Lenis choreography layered on top of the static site.
   If GSAP fails to load (or reduced motion is on) this file removes the
   preloader and bails out, leaving the original car.js reveal system active. */
(() => {
  const docEl = document.documentElement;
  const body = document.body;
  const preloader = document.getElementById("preloader");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* Map guard works with or without GSAP */
  const mapGuard = document.getElementById("mapGuard");
  if (mapGuard) mapGuard.addEventListener("click", () => mapGuard.classList.add("is-hidden"), { once: true });

  const killPreloader = () => {
    if (preloader && preloader.parentNode) preloader.parentNode.removeChild(preloader);
    docEl.classList.add("preloader-hidden");
  };
  const failsafe = setTimeout(killPreloader, 3600);

  if (!window.gsap || !window.ScrollTrigger || reducedMotion) {
    clearTimeout(failsafe);
    killPreloader();
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  try {
    init();
  } catch (error) {
    console.warn("Ahazi motion disabled:", error);
    docEl.classList.remove("has-gsap", "has-cursor", "h-scroll");
    try {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      gsap.set(".w-in, .ch, .hero-car-stage, .hero-copy > *, .sequence-meta, .hero-detail-bar, .scroll-cue", { clearProps: "all" });
    } catch (cleanupError) { /* leave the static site as-is */ }
    clearTimeout(failsafe);
    killPreloader();
  }

  function init() {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: "power3.out", duration: 1 });
    docEl.classList.add("has-gsap");

    /* ---------------------------------------------------------------- *
     *  Smooth scroll
     * ---------------------------------------------------------------- */
    let lenis = null;
    if (window.Lenis) {
      lenis = new window.Lenis({
        duration: 1.15,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);

      new MutationObserver(() => {
        if (body.classList.contains("menu-open") || body.classList.contains("lightbox-open")) lenis.stop();
        else lenis.start();
      }).observe(body, { attributes: true, attributeFilter: ["class"] });

      document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", event => {
          const hash = link.getAttribute("href");
          if (!hash || hash.length < 2) return;
          const target = document.querySelector(hash);
          if (!target) return;
          event.preventDefault();
          history.replaceState(null, "", hash);
          lenis.scrollTo(target, { offset: hash === "#top" ? 0 : -84, duration: 1.35, force: true });
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        });
      });
    }

    /* ---------------------------------------------------------------- *
     *  Text splitting helpers
     * ---------------------------------------------------------------- */
    const splitWords = root => {
      if (root.dataset.split) return Array.from(root.querySelectorAll(".w-in"));
      root.dataset.split = "words";
      const wrap = node => {
        Array.from(node.childNodes).forEach(child => {
          if (child.nodeType === 3) {
            const fragment = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach(piece => {
              if (!piece) return;
              if (/^\s+$/.test(piece)) {
                fragment.appendChild(document.createTextNode(" "));
                return;
              }
              const mask = document.createElement("span");
              mask.className = "w";
              const inner = document.createElement("span");
              inner.className = "w-in";
              inner.textContent = piece;
              mask.appendChild(inner);
              fragment.appendChild(mask);
            });
            node.replaceChild(fragment, child);
          } else if (child.nodeType === 1 && child.tagName !== "BR" && !child.classList.contains("w")) {
            wrap(child);
          }
        });
      };
      wrap(root);
      return Array.from(root.querySelectorAll(".w-in"));
    };

    const splitChars = element => {
      const text = element.textContent;
      element.textContent = "";
      return text.split("").map(character => {
        const span = document.createElement("span");
        span.className = "ch";
        span.textContent = character === " " ? " " : character;
        element.appendChild(span);
        return span;
      });
    };

    /* ---------------------------------------------------------------- *
     *  Hero intro timeline (played once the preloader lifts)
     * ---------------------------------------------------------------- */
    const heroTypeLines = Array.from(document.querySelectorAll(".hero-type span"));
    const typeCharsA = heroTypeLines[0] ? splitChars(heroTypeLines[0]) : [];
    const typeCharsB = heroTypeLines[1] ? splitChars(heroTypeLines[1]) : [];
    const h1Words = splitWords(document.querySelector(".hero-copy h1"));

    const heroTl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" }, onComplete: buildHeroScrub });
    heroTl
      .from(typeCharsA, { yPercent: 120, duration: 1.1, stagger: 0.05 }, 0)
      .from(typeCharsB, { yPercent: 120, duration: 1.1, stagger: 0.028 }, 0.1)
      .from(".hero-car-stage", { x: "44vw", duration: 1.6, ease: "power4.out" }, 0.18)
      .from(".hero-car-aura, .hero-car-shadow, .hero-car-glint", { autoAlpha: 0, duration: 1.1, ease: "power2.out" }, 0.85)
      .from(".hero-kicker", { autoAlpha: 0, y: 18, duration: 0.7 }, 0.55)
      .from(h1Words, { yPercent: 125, duration: 1.05, stagger: 0.07 }, 0.6)
      .from(".hero-body, .hero-actions", { autoAlpha: 0, y: 26, duration: 0.8, stagger: 0.12 }, 0.95)
      .from(".sequence-meta, .hero-detail-bar, .scroll-cue", { autoAlpha: 0, y: 14, duration: 0.8, stagger: 0.08 }, 1.1);

    function buildHeroScrub() {
      const scrub = gsap.timeline({
        scrollTrigger: {
          trigger: ".showroom-hero",
          start: "top top",
          end: "bottom 30%",
          scrub: 0.9,
          onUpdate: self => { window.__ahaziHeroProgress = self.progress; },
        },
      });
      scrub
        .to(".hero-car-stage", { x: "36vw", rotation: 2.5, ease: "none" }, 0)
        .to(".hero-type span:first-child", { xPercent: -12, ease: "none" }, 0)
        .to(".hero-type span:last-child", { xPercent: 10, ease: "none" }, 0)
        .to(".hero-copy", { y: 90, autoAlpha: 0, ease: "none" }, 0)
        .to(".sequence-meta, .hero-detail-bar, .scroll-cue", { autoAlpha: 0, ease: "none" }, 0)
        .to("#hero3d", { autoAlpha: 0, ease: "none" }, 0.25);
    }

    /* ---------------------------------------------------------------- *
     *  Preloader
     * ---------------------------------------------------------------- */
    const counterEl = document.getElementById("preloaderCount");
    const barEl = document.getElementById("preloaderBar");
    const loaderCar = document.querySelector(".preloader-car");
    const loaderTrack = document.querySelector(".preloader-track");
    const loaderState = { value: 0 };

    let visited = false;
    try { visited = !!sessionStorage.getItem("ahazi-visited"); } catch (e) { /* private mode */ }

    const renderLoader = () => {
      if (counterEl) counterEl.textContent = String(Math.round(loaderState.value)).padStart(2, "0");
      if (barEl) gsap.set(barEl, { scaleX: loaderState.value / 100 });
      if (loaderCar && loaderTrack) {
        gsap.set(loaderCar, { x: Math.max(0, loaderTrack.clientWidth - loaderCar.clientWidth) * (loaderState.value / 100) });
      }
    };

    const finishPreloader = () => {
      try { sessionStorage.setItem("ahazi-visited", "1"); } catch (e) { /* private mode */ }
      gsap.timeline({ onComplete: () => { clearTimeout(failsafe); killPreloader(); } })
        .to(".preloader-inner", { autoAlpha: 0, y: -26, duration: 0.4, ease: "power2.in" })
        .to("#preloader", { yPercent: -114, duration: 0.85, ease: "power4.inOut" }, "-=0.1")
        .add(() => heroTl.play(), "-=0.62");
    };

    if (!preloader) {
      heroTl.play();
    } else if (visited) {
      gsap.to(loaderState, { value: 100, duration: 0.5, ease: "power2.inOut", onUpdate: renderLoader, onComplete: finishPreloader });
    } else {
      const heroCarImg = document.getElementById("heroCar");
      const carReady = heroCarImg && heroCarImg.decode
        ? Promise.race([heroCarImg.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 1800))])
        : Promise.resolve();
      const countDone = new Promise(resolve => {
        gsap.to(loaderState, { value: 100, duration: 1.55, ease: "power2.inOut", onUpdate: renderLoader, onComplete: resolve });
      });
      Promise.all([carReady, countDone]).then(finishPreloader);
    }

    /* ---------------------------------------------------------------- *
     *  Marquee — reacts to scroll velocity
     * ---------------------------------------------------------------- */
    const marqueeTrack = document.querySelector(".marquee-track");
    if (marqueeTrack) {
      const marqueeTween = gsap.to(marqueeTrack, { xPercent: -50, duration: 24, ease: "none", repeat: -1 });
      const skewTo = gsap.quickTo(marqueeTrack, "skewX", { duration: 0.4, ease: "power2.out" });
      let marqueeReset = null;
      ScrollTrigger.create({
        onUpdate: self => {
          const velocity = self.getVelocity();
          marqueeTween.timeScale(gsap.utils.clamp(-3.5, 3.5, 1 + velocity / 700));
          skewTo(gsap.utils.clamp(-9, 9, velocity / 170));
          if (marqueeReset) marqueeReset.kill();
          marqueeReset = gsap.delayedCall(0.35, () => {
            gsap.to(marqueeTween, { timeScale: 1, duration: 0.7, ease: "power2.out" });
            skewTo(0);
          });
        },
      });
    }

    /* ---------------------------------------------------------------- *
     *  Section headlines — masked word reveals
     * ---------------------------------------------------------------- */
    document.querySelectorAll(
      ".intro-title, .section-head h2, .ride-copy h2, .store-overlay h2, .gift-copy h2, .visit-copy h2, .footer-main h2"
    ).forEach(heading => {
      const words = splitWords(heading);
      if (!words.length) return;
      gsap.from(words, {
        yPercent: 125,
        duration: 1.15,
        ease: "expo.out",
        stagger: 0.055,
        scrollTrigger: { trigger: heading, start: "top 86%", once: true },
      });
    });

    /* ---------------------------------------------------------------- *
     *  Generic risers (kickers, paragraphs, lists, buttons)
     * ---------------------------------------------------------------- */
    gsap.utils.toArray([
      ".intro-mark",
      ".section-kicker:not(.hero-kicker)",
      ".section-head > p",
      ".intro-foot",
      ".ride-copy > p:not(.section-kicker)",
      ".ride-specs",
      ".ride-copy .button",
      ".store-overlay > p:not(.section-kicker)",
      ".store-stats",
      ".gift-copy > p:not(.section-kicker)",
      ".gift-copy ul",
      ".gift-copy .button",
      ".visit-intro",
      ".visit-details",
      ".visit-copy .button",
      ".footer-brand",
      ".footer-links > div",
    ].join(",")).forEach(element => {
      gsap.from(element, {
        autoAlpha: 0,
        y: 30,
        duration: 0.9,
        scrollTrigger: { trigger: element, start: "top 92%", once: true },
      });
    });

    /* ---------------------------------------------------------------- *
     *  Collections — pinned horizontal showcase on desktop
     * ---------------------------------------------------------------- */
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1081px)", () => {
      const section = document.querySelector(".collections");
      const grid = document.querySelector(".collection-grid");
      if (!section || !grid) return;
      docEl.classList.add("h-scroll");
      const cards = gsap.utils.toArray(".collection-card");

      const sizeCards = () => {
        const offset = grid.getBoundingClientRect().top - section.getBoundingClientRect().top;
        const cardHeight = Math.max(420, window.innerHeight - offset - 36);
        cards.forEach(card => { card.style.height = cardHeight + "px"; });
      };
      sizeCards();

      const shift = () => {
        const gutter = parseFloat(getComputedStyle(section).paddingLeft) || 40;
        return Math.max(0, grid.scrollWidth - (window.innerWidth - gutter * 2));
      };

      const horizontal = gsap.to(grid, {
        x: () => -shift(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + (shift() + window.innerHeight * 0.25),
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefreshInit: sizeCards,
        },
      });

      cards.forEach(card => {
        const image = card.querySelector("img");
        if (!image) return;
        image.dataset.baseScale = "1.18";
        gsap.set(image, { scale: 1.18 });
        gsap.fromTo(image, { xPercent: -5 }, {
          xPercent: 5,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            containerAnimation: horizontal,
            start: "left right",
            end: "right left",
            scrub: true,
          },
        });
      });

      return () => {
        docEl.classList.remove("h-scroll");
        cards.forEach(card => {
          card.style.height = "";
          const image = card.querySelector("img");
          if (image) delete image.dataset.baseScale;
        });
      };
    });

    mm.add("(max-width: 1080px)", () => {
      gsap.utils.toArray(".collection-card").forEach(card => {
        gsap.from(card, {
          autoAlpha: 0,
          y: 70,
          duration: 1,
          scrollTrigger: { trigger: card, start: "top 90%", once: true },
        });
      });
    });

    /* ---------------------------------------------------------------- *
     *  Product & gallery — entrances and inner image parallax
     * ---------------------------------------------------------------- */
    ScrollTrigger.batch(".product-card", {
      start: "top 92%",
      once: true,
      onEnter: elements => gsap.from(elements, { autoAlpha: 0, y: 70, duration: 1, stagger: 0.1 }),
    });
    ScrollTrigger.batch(".gallery-item", {
      start: "top 94%",
      once: true,
      onEnter: elements => gsap.from(elements, { autoAlpha: 0, y: 50, scale: 0.96, duration: 0.9, stagger: 0.06 }),
    });

    mm.add("(min-width: 761px)", () => {
      gsap.utils.toArray(".product-image img, .gallery-item img").forEach(image => {
        image.dataset.baseScale = "1.12";
        gsap.set(image, { scale: 1.12 });
        gsap.fromTo(image, { yPercent: -5 }, {
          yPercent: 5,
          ease: "none",
          scrollTrigger: {
            trigger: image.closest(".product-image, .gallery-item"),
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
      return () => {
        gsap.utils.toArray(".product-image img, .gallery-item img").forEach(image => delete image.dataset.baseScale);
      };
    });

    /* Hover zoom via GSAP so it composes with the parallax transforms */
    if (finePointer) {
      gsap.utils.toArray(".collection-card, .product-card, .gallery-item").forEach(card => {
        const image = card.querySelector("img");
        if (!image) return;
        card.addEventListener("mouseenter", () => {
          const base = parseFloat(image.dataset.baseScale || "1");
          gsap.to(image, { scale: base + 0.06, duration: 0.8, ease: "power3.out" });
        });
        card.addEventListener("mouseleave", () => {
          const base = parseFloat(image.dataset.baseScale || "1");
          gsap.to(image, { scale: base, duration: 0.8, ease: "power3.out" });
        });
      });
    }

    /* ---------------------------------------------------------------- *
     *  Ride feature
     * ---------------------------------------------------------------- */
    const rideImage = document.querySelector(".ride-image img");
    if (rideImage) {
      gsap.set(rideImage, { rotation: -2, scale: 1.04 });
      gsap.from(rideImage, {
        x: -170,
        autoAlpha: 0,
        rotation: -9,
        duration: 1.3,
        ease: "power4.out",
        scrollTrigger: { trigger: ".ride-feature", start: "top 72%", once: true },
        onComplete: () => gsap.to(rideImage, { y: -14, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 }),
      });
    }

    /* ---------------------------------------------------------------- *
     *  Store story — cinematic photo scrub
     * ---------------------------------------------------------------- */
    const storeImage = document.querySelector(".store-photo img");
    if (storeImage) {
      gsap.fromTo(storeImage, { yPercent: -8, scale: 1.22 }, {
        yPercent: 4,
        scale: 1.04,
        ease: "none",
        scrollTrigger: { trigger: ".store-story", start: "top bottom", end: "bottom top", scrub: true },
      });
    }

    /* ---------------------------------------------------------------- *
     *  Stat count-ups
     * ---------------------------------------------------------------- */
    gsap.utils.toArray(".ride-specs strong, .store-stats strong").forEach(stat => {
      const match = stat.textContent.trim().match(/^(\d+)([\s\S]*)$/);
      if (!match || Number(match[1]) < 2) return;
      const target = Number(match[1]);
      const suffix = match[2] || "";
      const state = { n: 0 };
      gsap.to(state, {
        n: target,
        duration: 1.6,
        ease: "power3.out",
        onUpdate: () => { stat.textContent = Math.round(state.n) + suffix; },
        scrollTrigger: { trigger: stat, start: "top 90%", once: true },
      });
    });

    /* ---------------------------------------------------------------- *
     *  Gift card — entrance, float and pointer tilt
     * ---------------------------------------------------------------- */
    const giftCard = document.querySelector(".gift-visual img");
    if (giftCard) {
      gsap.set(giftCard, { rotation: 7, transformPerspective: 900 });
      gsap.from(giftCard, {
        autoAlpha: 0,
        y: 80,
        rotation: 13,
        duration: 1.2,
        scrollTrigger: { trigger: ".gift-visual", start: "top 82%", once: true },
        onComplete: () => gsap.to(giftCard, { y: -14, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 }),
      });
      if (finePointer) {
        const giftWrap = document.querySelector(".gift-visual");
        const tiltX = gsap.quickTo(giftCard, "rotationX", { duration: 0.6, ease: "power2.out" });
        const tiltY = gsap.quickTo(giftCard, "rotationY", { duration: 0.6, ease: "power2.out" });
        giftWrap.addEventListener("pointermove", event => {
          const rect = giftWrap.getBoundingClientRect();
          tiltX(-((event.clientY - rect.top) / rect.height - 0.5) * 14);
          tiltY(((event.clientX - rect.left) / rect.width - 0.5) * 14);
        });
        giftWrap.addEventListener("pointerleave", () => { tiltX(0); tiltY(0); });
      }
    }

    /* ---------------------------------------------------------------- *
     *  Visit — map unclips into view
     * ---------------------------------------------------------------- */
    if (document.querySelector(".visit-map")) {
      gsap.fromTo(".visit-map",
        { clipPath: "inset(10% 10% 10% 10% round 22px)", autoAlpha: 0.4 },
        {
          clipPath: "inset(0% 0% 0% 0% round 0px)",
          autoAlpha: 1,
          duration: 1.2,
          ease: "power3.inOut",
          scrollTrigger: { trigger: ".visit", start: "top 70%", once: true },
        });
    }

    /* ---------------------------------------------------------------- *
     *  Footer drive-by
     * ---------------------------------------------------------------- */
    const driveCar = document.querySelector(".footer-drive img");
    if (driveCar) {
      gsap.fromTo(driveCar,
        { x: () => -driveCar.offsetWidth - 80 },
        {
          x: () => driveCar.parentElement.clientWidth - driveCar.offsetWidth,
          ease: "none",
          scrollTrigger: { trigger: "footer", start: "top 95%", end: "bottom bottom", scrub: 1.2, invalidateOnRefresh: true },
        });
    }

    /* ---------------------------------------------------------------- *
     *  Custom cursor + magnetic elements (desktop fine pointer)
     * ---------------------------------------------------------------- */
    if (finePointer && window.matchMedia("(min-width: 1081px)").matches) {
      const dot = document.getElementById("cursorDot");
      const ring = document.getElementById("cursorRing");
      if (dot && ring) {
        docEl.classList.add("has-cursor");
        gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
        const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power2.out" });
        const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power2.out" });
        const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
        const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });
        let cursorShown = false;

        window.addEventListener("pointermove", event => {
          if (!cursorShown) {
            cursorShown = true;
            gsap.set([dot, ring], { x: event.clientX, y: event.clientY });
            gsap.to([dot, ring], { autoAlpha: 1, duration: 0.3 });
          }
          dotX(event.clientX); dotY(event.clientY);
          ringX(event.clientX); ringY(event.clientY);
        }, { passive: true });

        document.addEventListener("mouseover", event => {
          if (!(event.target instanceof Element)) return;
          const view = event.target.closest(".gallery-item");
          const interactive = event.target.closest("a, button");
          ring.classList.toggle("is-view", !!view);
          ring.classList.toggle("is-active", !view && !!interactive);
        });
        document.addEventListener("mouseleave", () => gsap.to([dot, ring], { autoAlpha: 0, duration: 0.25 }));
        document.addEventListener("mouseenter", () => { if (cursorShown) gsap.to([dot, ring], { autoAlpha: 1, duration: 0.25 }); });

        gsap.utils.toArray(".button, .nav-cta, .round-link").forEach(element => {
          const moveX = gsap.quickTo(element, "x", { duration: 0.35, ease: "power3.out" });
          const moveY = gsap.quickTo(element, "y", { duration: 0.35, ease: "power3.out" });
          element.addEventListener("pointermove", event => {
            const rect = element.getBoundingClientRect();
            moveX((event.clientX - (rect.left + rect.width / 2)) * 0.3);
            moveY((event.clientY - (rect.top + rect.height / 2)) * 0.3);
          });
          element.addEventListener("pointerleave", () => { moveX(0); moveY(0); });
        });
      }
    }

    /* ---------------------------------------------------------------- *
     *  Keep trigger positions honest once everything has loaded
     * ---------------------------------------------------------------- */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }
})();
