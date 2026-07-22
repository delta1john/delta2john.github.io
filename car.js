(() => {
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const header = document.getElementById("siteHeader");
  const menuToggle = document.getElementById("menuToggle");
  const menuClose = document.getElementById("menuClose");
  const mobileMenu = document.getElementById("mobileMenu");

  const setMenu = open => {
    mobileMenu.classList.toggle("open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
  };
  menuToggle.addEventListener("click", () => setMenu(!mobileMenu.classList.contains("open")));
  menuClose.addEventListener("click", () => setMenu(false));
  mobileMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  document.querySelectorAll(".reveal").forEach(element => revealObserver.observe(element));

  const hero = document.querySelector(".showroom-hero");
  const heroCar = document.getElementById("heroCar");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  let heroProgress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let transformDirty = true;

  const updateHeroState = () => {
    const bounds = hero.getBoundingClientRect();
    const gsapDriven = document.documentElement.classList.contains("has-gsap");
    heroProgress = (reducedMotion || gsapDriven) ? 0 : clamp(-bounds.top / Math.max(1, bounds.height));
    const heroIsBehindHeader = bounds.bottom > header.offsetHeight;
    header.classList.toggle("scrolled", !heroIsBehindHeader);
    transformDirty = true;
  };

  const updateHeroTransform = () => {
    pointerX += (pointerTargetX - pointerX) * .065;
    pointerY += (pointerTargetY - pointerY) * .065;
    const mobile = window.innerWidth < 760;
    const driftX = heroProgress * (mobile ? .4 : 1.4) + pointerX * (mobile ? 0 : .65);
    const driftY = heroProgress * (mobile ? -1.2 : -2.4) + pointerY * (mobile ? 0 : .45);
    const scale = 1 + heroProgress * (mobile ? .012 : .025);
    const rotate = pointerX * (mobile ? 0 : .4) - heroProgress * .35;
    heroCar.style.transform = `translate3d(${driftX}vw, ${driftY}vh, 0) scale(${scale}) rotate(${rotate}deg)`;
    transformDirty = false;
  };

  const animationLoop = () => {
    if (
      transformDirty ||
      Math.abs(pointerX - pointerTargetX) > .002 ||
      Math.abs(pointerY - pointerTargetY) > .002
    ) updateHeroTransform();
    requestAnimationFrame(animationLoop);
  };

  window.addEventListener("scroll", updateHeroState, { passive: true });
  window.addEventListener("resize", updateHeroState, { passive: true });
  window.addEventListener("pointermove", event => {
    if (!finePointer || reducedMotion) return;
    pointerTargetX = (event.clientX / window.innerWidth - .5) * 2;
    pointerTargetY = (event.clientY / window.innerHeight - .5) * 2;
    transformDirty = true;
  }, { passive: true });
  updateHeroState();
  animationLoop();

  const galleryItems = [...document.querySelectorAll(".gallery-item")];
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCount = document.getElementById("lightboxCount");
  const closeButton = lightbox.querySelector(".lightbox-close");
  let galleryIndex = 0;
  let returnFocus = null;

  const showGalleryImage = index => {
    galleryIndex = (index + galleryItems.length) % galleryItems.length;
    const sourceImage = galleryItems[galleryIndex].querySelector("img");
    lightboxImage.src = galleryItems[galleryIndex].dataset.src;
    lightboxImage.alt = sourceImage.alt;
    lightboxCount.textContent = `${String(galleryIndex + 1).padStart(2, "0")} / ${galleryItems.length}`;
  };

  const openLightbox = index => {
    returnFocus = document.activeElement;
    showGalleryImage(index);
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    closeButton.focus();
  };

  const closeLightbox = () => {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    if (returnFocus) returnFocus.focus();
  };

  galleryItems.forEach((item, index) => item.addEventListener("click", () => openLightbox(index)));
  closeButton.addEventListener("click", closeLightbox);
  lightbox.querySelector(".lightbox-prev").addEventListener("click", () => showGalleryImage(galleryIndex - 1));
  lightbox.querySelector(".lightbox-next").addEventListener("click", () => showGalleryImage(galleryIndex + 1));
  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", event => {
    if (!lightbox.classList.contains("open")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showGalleryImage(galleryIndex - 1);
    if (event.key === "ArrowRight") showGalleryImage(galleryIndex + 1);
    if (event.key === "Tab") {
      const controls = [...lightbox.querySelectorAll("button")];
      const current = controls.indexOf(document.activeElement);
      const next = event.shiftKey
        ? (current - 1 + controls.length) % controls.length
        : (current + 1) % controls.length;
      event.preventDefault();
      controls[next].focus();
    }
  });
})();
