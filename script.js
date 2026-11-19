const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".navigation");

const updateHeaderVisibility = () => {
  document.body.classList.toggle("has-scrolled", window.scrollY > 24);
};

window.addEventListener("scroll", updateHeaderVisibility, { passive: true });
updateHeaderVisibility();

if (menuToggle instanceof HTMLButtonElement && navigation instanceof HTMLElement) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "메뉴 열기" : "메뉴 닫기");
    navigation.classList.toggle("is-open", !isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "메뉴 열기");
      navigation.classList.remove("is-open");
    }
  });
}

const typeSpecimens = document.querySelectorAll(".type-specimen");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if ("IntersectionObserver" in window && !prefersReducedMotion.matches) {
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
              letter.style.setProperty("--letter-delay", `${index * delay}s`);
              letter.textContent = character;
              fragment.append(letter);
              index += 1;
            }
          }
          node.replaceWith(fragment);
        });
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
