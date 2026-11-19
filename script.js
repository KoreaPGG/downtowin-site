const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".navigation");

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
