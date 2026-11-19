const typeSpecimens = document.querySelectorAll(".type-specimen");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const storyViewport = window.matchMedia("(min-height: 600px)");
const scrollStory = document.querySelector(".work-card-story");
const scrollStoryStage = scrollStory?.querySelector(".work-story-stage");

if (scrollStory instanceof HTMLElement && scrollStoryStage instanceof HTMLElement) {
  let storyFrame = 0;
  let lastStoryProgress = -1;
  const updateStory = () => {
    storyFrame = 0;
    const enabled = !prefersReducedMotion.matches && storyViewport.matches;
    scrollStory.classList.toggle("is-scroll-story", enabled);
    if (!enabled) {
      lastStoryProgress = -1;
      return;
    }

    const bounds = scrollStory.getBoundingClientRect();
    const distance = bounds.height - scrollStoryStage.offsetHeight;
    const progress = distance > 0 ? Math.max(0, Math.min(1, -bounds.top / distance)) : 0;
    if (progress === lastStoryProgress) {
      return;
    }
    lastStoryProgress = progress;
    scrollStoryStage.style.setProperty("--story-word-x", `${-18 + progress * 36}px`);
    scrollStoryStage.style.setProperty("--story-word-y", `${24 - progress * 24}px`);
    scrollStoryStage.style.setProperty("--story-word-scale", String(0.82 + progress * 0.38));
    scrollStoryStage.style.setProperty("--story-line-angle", `${-30 + progress * 45}deg`);
    scrollStoryStage.style.setProperty("--story-line-scale", String(0.8 + progress * 0.45));
    scrollStoryStage.style.setProperty("--story-number-opacity", String(0.4 + progress * 0.6));
    scrollStoryStage.style.setProperty("--story-number-y", `${36 - progress * 36}px`);
    scrollStoryStage.style.setProperty("--story-details-y", `${20 - progress * 20}px`);
  };
  const scheduleStoryUpdate = () => {
    if (!storyFrame) {
      storyFrame = window.requestAnimationFrame(updateStory);
    }
  };
  window.addEventListener("scroll", scheduleStoryUpdate, { passive: true });
  window.addEventListener("resize", scheduleStoryUpdate);
  prefersReducedMotion.addEventListener("change", scheduleStoryUpdate);
  storyViewport.addEventListener("change", scheduleStoryUpdate);
  updateStory();
}

const techTextStates = new Map();
const techTextVisibility = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const state = techTextStates.get(entry.target);
      if (state) {
        state.visible = entry.isIntersecting;
        if (!state.visible && !state.drag) {
          clearTechLetter(state);
        }
      }
    }
  }, { threshold: 0.1 })
  : null;

function clearTechLetter(state) {
  if (!state.active) {
    return;
  }
  state.active.classList.remove("tech-letter-active");
  state.active.removeAttribute("data-tech-label");
  state.active.querySelectorAll(".tech-outline, .tech-speck").forEach((decoration) => decoration.remove());
  state.active = null;
}

function selectTechLetter(state, letter) {
  if (state.active === letter || prefersReducedMotion.matches) {
    return;
  }
  clearTechLetter(state);

  const bounds = letter.getBoundingClientRect();
  if (!bounds.width || !bounds.height) {
    return;
  }
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    console.warn("텍스트 효과에 필요한 캔버스를 사용할 수 없습니다.");
    return;
  }

  const padding = 6;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  canvas.className = "tech-outline";
  canvas.setAttribute("aria-hidden", "true");

  const style = getComputedStyle(letter);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.textBaseline = "middle";
  context.strokeStyle = getComputedStyle(state.element).color;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 3;
  context.lineJoin = "round";
  context.setLineDash([4, 2]);
  const x = (width - context.measureText(letter.textContent).width) / 2;
  context.strokeText(letter.textContent, x, height / 2);
  context.setLineDash([]);
  context.globalCompositeOperation = "destination-out";
  context.fillText(letter.textContent, x, height / 2);

  const decorations = document.createDocumentFragment();
  decorations.append(canvas);
  for (let index = 0; index < 15; index += 1) {
    const speck = document.createElement("i");
    const angle = index * Math.PI * 2 / 15;
    const distance = 10 + (index % 3) * 5;
    speck.className = "tech-speck";
    speck.style.left = `calc(50% + ${Math.cos(angle) * (bounds.width / 2 + distance)}px)`;
    speck.style.top = `calc(50% + ${Math.sin(angle) * (bounds.height / 2 + distance)}px)`;
    speck.style.animationDelay = `${index * -0.13}s`;
    decorations.append(speck);
  }
  letter.append(decorations);
  letter.dataset.techLabel = `${letter.textContent} ${Math.round(bounds.width)} × ${Math.round(bounds.height)}`;
  letter.classList.add("tech-letter-active");
  state.active = letter;
}

function kickTechLetters(state, letter) {
  const letters = [...state.element.querySelectorAll(state.selector)];
  const index = letters.indexOf(letter);
  letters.forEach((neighbor, position) => {
    const distance = Math.abs(position - index);
    if (distance > 3) {
      return;
    }
    window.setTimeout(() => {
      if (prefersReducedMotion.matches) {
        return;
      }
      const height = 0.3 * Math.pow(0.62, distance);
      neighbor.animate([
        { translate: "0 0" },
        { translate: `0 -${height}em`, offset: 0.35 },
        { translate: `0 ${height * 0.2}em`, offset: 0.7 },
        { translate: "0 0" },
      ], { duration: 600, easing: "ease-out" });
    }, distance * 55);
  });
}

function enableTechText(element, selector) {
  if (prefersReducedMotion.matches) {
    return;
  }
  const state = { element, selector, active: null, drag: null, hovering: false, visible: false, sweepIndex: 0 };
  techTextStates.set(element, state);
  techTextVisibility?.observe(element);

  element.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || prefersReducedMotion.matches) {
      return;
    }
    state.hovering = true;
    if (state.drag && state.drag.pointerId === event.pointerId) {
      const x = Math.max(-120, Math.min(120, event.clientX - state.drag.x));
      const y = Math.max(-120, Math.min(120, event.clientY - state.drag.y));
      state.drag.letter.style.translate = `${x}px ${y}px`;
      state.drag.letter.dataset.techLabel = `${Math.round(x)}, ${Math.round(-y)}`;
      return;
    }
    const letter = event.target.closest(selector);
    if (letter && element.contains(letter)) {
      selectTechLetter(state, letter);
    }
  });

  element.addEventListener("pointerleave", () => {
    state.hovering = false;
    if (!state.drag) {
      clearTechLetter(state);
    }
  });

  element.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || prefersReducedMotion.matches) {
      return;
    }
    const letter = event.target.closest(selector);
    if (!letter || !element.contains(letter)) {
      return;
    }
    event.preventDefault();
    selectTechLetter(state, letter);
    state.drag = { letter, pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
    letter.classList.add("tech-letter-dragging");
    element.setPointerCapture(event.pointerId);
  });

  const finishDrag = (event) => {
    const drag = state.drag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    state.drag = null;
    drag.letter.classList.remove("tech-letter-dragging");
    drag.letter.style.translate = "";
    const letterBounds = drag.letter.getBoundingClientRect();
    drag.letter.dataset.techLabel = `${drag.letter.textContent} ${Math.round(letterBounds.width)} × ${Math.round(letterBounds.height)}`;
    if (event.type === "pointerup" && performance.now() - drag.time < 450
      && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) {
      kickTechLetters(state, drag.letter);
    }
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    const bounds = element.getBoundingClientRect();
    state.hovering = event.clientX >= bounds.left && event.clientX <= bounds.right
      && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    if (!state.hovering || event.type === "pointercancel") {
      clearTechLetter(state);
    }
  };
  element.addEventListener("pointerup", finishDrag);
  element.addEventListener("pointercancel", finishDrag);
}

if (techTextVisibility && !prefersReducedMotion.matches) {
  prefersReducedMotion.addEventListener("change", (event) => {
    if (!event.matches) {
      return;
    }
    for (const state of techTextStates.values()) {
      if (state.drag) {
        state.drag.letter.classList.remove("tech-letter-dragging");
        state.drag.letter.style.translate = "";
        if (state.element.hasPointerCapture(state.drag.pointerId)) {
          state.element.releasePointerCapture(state.drag.pointerId);
        }
        state.drag = null;
      }
      clearTechLetter(state);
    }
  });

  window.setInterval(() => {
    for (const state of techTextStates.values()) {
      if (document.hidden || prefersReducedMotion.matches || !state.visible || state.hovering || state.drag) {
        continue;
      }
      const letters = state.element.querySelectorAll(state.selector);
      if (letters.length) {
        selectTechLetter(state, letters[state.sweepIndex % letters.length]);
        state.sweepIndex += 1;
      }
    }
  }, 800);
}

if ("IntersectionObserver" in window && !prefersReducedMotion.matches) {
  const colorObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle("section-color-active", entry.isIntersecting);
    }
  }, { rootMargin: "-30% 0px -30% 0px" });

  document.querySelectorAll(
    ".intro-band, .services > .section-heading, .service-card, .work-heading, .work-card, .recognition, .history-section, .contact-section",
  ).forEach((section) => {
    section.classList.add("section-color-transition");
    colorObserver.observe(section);
  });

  const sectionObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("section-entered");
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: "0px 0px -12% 0px" });

  document.querySelectorAll(
    "main > section:not(.hero):not(.services):not(.work-section), .services > .section-heading, .service-card, .work-heading, .work-card",
  ).forEach((section) => {
    sectionObserver.observe(section);
  });

  const textObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }

      const element = entry.target;
      if (element.matches("h2, h3")) {
        if (!element.hasAttribute("aria-label")) {
          element.setAttribute("aria-label", element.innerText.replace(/\s+/gu, " ").trim());
        }
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) {
          textNodes.push(walker.currentNode);
        }

        const segmenter = typeof Intl.Segmenter === "function"
          ? new Intl.Segmenter(document.documentElement.lang, { granularity: "grapheme" })
          : null;
        const characters = textNodes.map((node) => segmenter
          ? Array.from(segmenter.segment(node.textContent), (part) => part.segment)
          : Array.from(node.textContent));
        const count = characters.flat().filter((character) => !/\s/u.test(character)).length;
        const delay = Math.min(0.035, 0.8 / Math.max(1, count - 1));
        let index = 0;

        textNodes.forEach((node, nodeIndex) => {
          const fragment = document.createDocumentFragment();
          for (const character of characters[nodeIndex]) {
            if (/\s/u.test(character)) {
              fragment.append(document.createTextNode(character));
            } else {
              const letter = document.createElement("span");
              letter.className = "scroll-tech-letter";
              letter.setAttribute("aria-hidden", "true");
              letter.style.setProperty("--letter-delay", `${index * delay + nodeIndex * 0.16}s`);
              letter.textContent = character;
              fragment.append(letter);
              index += 1;
            }
          }
          node.replaceWith(fragment);
        });
        if (element.closest(".service-type-design")) {
          enableTechText(element, ".scroll-tech-letter");
        }
      }

      element.classList.add("text-entered");
      observer.unobserve(element);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.15 });

  document.querySelectorAll("main h2, main h3, main p, main li, .work-details > span, .timeline-row > span").forEach((text) => {
    textObserver.observe(text);
  });
}

for (const specimen of typeSpecimens) {
  if (!(specimen instanceof HTMLButtonElement)) {
    continue;
  }

  const text = specimen.dataset.techText?.trim();
  const word = specimen.querySelector(".type-specimen-word");

  if (!text || !(word instanceof HTMLElement)) {
    continue;
  }

  const getNumber = (name, fallback) => {
    const value = Number.parseFloat(specimen.dataset[name] ?? "");
    return Number.isFinite(value) ? value : fallback;
  };
  const characters = Array.from(text);
  const revealDuration = Math.max(0, getNumber("introDuration", 2)) * 1000;
  const letterDuration = revealDuration / characters.length;
  const fontWeight = Math.min(900, Math.max(100, getNumber("fontWeight", 600)));
  const fontSize = Math.max(24, getNumber("fontSize", 150));
  const dashLength = Math.max(1, getNumber("dashLength", 4));
  const dashGap = Math.max(0, getNumber("dashGap", 2));
  const speckCount = Math.min(60, Math.max(0, Math.floor(getNumber("specks", 15))));

  specimen.style.setProperty("--tech-font-weight", String(fontWeight));
  specimen.style.setProperty("--tech-font-size", `${fontSize}px`);
  specimen.style.setProperty("--dash-length", `${dashLength}px`);
  specimen.style.setProperty("--dash-gap", `${dashGap}px`);

  word.replaceChildren();
  characters.forEach((character, index) => {
    const letter = document.createElement("span");
    letter.className = "type-specimen-letter";
    letter.textContent = character;
    letter.style.setProperty("--letter-delay", `${(revealDuration * index) / characters.length}ms`);
    letter.style.setProperty("--letter-duration", `${letterDuration}ms`);
    word.append(letter);
  });
  enableTechText(word, ".type-specimen-letter");

  for (let index = 0; index < speckCount; index += 1) {
    const angle = (index / speckCount) * Math.PI * 2;
    const speck = document.createElement("span");
    const radiusX = 22 + (index % 3) * 7;
    const radiusY = 24 + (index % 4) * 6;

    speck.className = "type-specimen-speck";
    speck.setAttribute("aria-hidden", "true");
    speck.style.left = `${50 + Math.cos(angle) * radiusX}%`;
    speck.style.top = `${50 + Math.sin(angle) * radiusY}%`;
    speck.style.setProperty("--kick-x", `${Math.round(Math.cos(angle) * 22)}px`);
    speck.style.setProperty("--kick-y", `${Math.round(Math.sin(angle) * 22)}px`);
    speck.style.setProperty("--speck-delay", `${(index % 5) * 18}ms`);
    specimen.append(speck);
  }

  const reveal = () => {
    specimen.classList.add("is-ready");

    if (!prefersReducedMotion.matches && specimen.dataset.reveal === "letter" && revealDuration > 0) {
      specimen.classList.add("is-revealing");
    }
  };

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    reveal();
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(specimen);
  }

  if (specimen.hasAttribute("data-click-kick")) {
    let kickTimeout = 0;

    specimen.addEventListener("click", () => {
      window.clearTimeout(kickTimeout);
      specimen.classList.remove("is-kicking");
      void specimen.offsetWidth;
      specimen.classList.add("is-kicking");
      kickTimeout = window.setTimeout(() => specimen.classList.remove("is-kicking"), 700);

      if (!prefersReducedMotion.matches && specimen.dataset.reveal === "letter" && revealDuration > 0) {
        specimen.classList.remove("is-revealing");
        void specimen.offsetWidth;
        specimen.classList.add("is-ready", "is-revealing");
      }
    });
  }
}
