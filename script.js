const typeSpecimens = document.querySelectorAll(".type-specimen");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const storyViewport = window.matchMedia("(min-height: 600px)");
const wideStoryViewport = window.matchMedia("(min-width: 1440px) and (min-aspect-ratio: 16/9)");
const siteHeader = document.querySelector(".site-header");
const menuToggle = siteHeader?.querySelector(".menu-toggle");
const siteMenu = document.querySelector("#site-menu");
const siteBrand = siteHeader?.querySelector(".site-header-brand");
const mainContent = document.querySelector("main");
const siteFooter = document.querySelector(".site-footer");

if (siteHeader && menuToggle instanceof HTMLButtonElement && siteMenu instanceof HTMLElement) {
  const menuWheel = siteMenu.querySelector("[data-option-wheel]");
  const menuWheelAnchors = menuWheel instanceof HTMLOListElement
    ? [...menuWheel.querySelectorAll("a[href^='#']")]
    : [];
  const menuWheelRows = menuWheel instanceof HTMLOListElement
    ? [...menuWheel.querySelectorAll(":scope > li")]
    : [];
  const menuWheelConfig = { curve: 1, tilt: 6, blur: 2, fade: 0.25, soundVolume: 0.5 };
  let menuWheelIndex = Math.min(2, menuWheelAnchors.length - 1);
  let wheelAudioContext = null;
  let wheelDelta = 0;
  let pointerStartY = null;
  let activePointerId = null;
  let pointerStartIndex = menuWheelIndex;
  let pointerDragged = false;
  let suppressClickUntil = 0;

  const menuWheelRowHeight = () => {
    const row = menuWheelRows[0];
    const rowHeight = row instanceof HTMLElement
      ? Number.parseFloat(getComputedStyle(row).height)
      : Number.NaN;
    return Number.isFinite(rowHeight) ? rowHeight : 68;
  };

  const playMenuWheelSound = () => {
    if (typeof window.AudioContext !== "function") {
      return;
    }

    wheelAudioContext ??= new window.AudioContext();
    const context = wheelAudioContext;
    const play = () => {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1150, now);
      oscillator.frequency.exponentialRampToValueAtTime(680, now + 0.05);
      gain.gain.setValueAtTime(0.018 * menuWheelConfig.soundVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.06);
    };

    if (context.state === "suspended") {
      void context.resume().then(play).catch((error) => {
        console.warn("메뉴 휠 효과음을 재생할 수 없습니다.", error);
      });
    } else {
      play();
    }
  };

  const selectMenuWheelItem = (index, { focus = false, playSound = true } = {}) => {
    if (!menuWheelAnchors.length || !(menuWheel instanceof HTMLOListElement)) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(menuWheelAnchors.length - 1, index));
    const changed = nextIndex !== menuWheelIndex;
    menuWheelIndex = nextIndex;
    menuWheel.style.setProperty("--option-wheel-offset", `${-nextIndex * menuWheelRowHeight()}px`);

    menuWheelRows.forEach((row, rowIndex) => {
      const offset = rowIndex - nextIndex;
      const distance = Math.abs(offset);
      row.classList.toggle("is-wheel-active", rowIndex === nextIndex);
      row.style.setProperty("--option-wheel-opacity", String(Math.max(menuWheelConfig.fade, 1 - distance * menuWheelConfig.fade)));
      row.style.setProperty("--option-wheel-blur", `${Math.min(distance * menuWheelConfig.blur, 4)}px`);
      row.style.setProperty("--option-wheel-scale", String(Math.max(0.82, 1 - distance * 0.04)));
      row.style.setProperty("--option-wheel-x", `${-(distance ** 2) * menuWheelConfig.curve * 6}px`);
      row.style.setProperty("--option-wheel-tilt", `${Math.sign(offset) * Math.min(distance * menuWheelConfig.tilt, 18)}deg`);
    });

    if (changed && playSound) {
      playMenuWheelSound();
    }
    if (focus) {
      menuWheelAnchors[nextIndex].focus({ preventScroll: true });
    }
  };

  if (menuWheel instanceof HTMLOListElement && menuWheelAnchors.length) {
    menuWheel.classList.add("is-option-wheel");
    selectMenuWheelItem(menuWheelIndex, { playSound: false });
    window.addEventListener("resize", () => selectMenuWheelItem(menuWheelIndex, { playSound: false }), { passive: true });

    menuWheel.addEventListener("keydown", (event) => {
      let nextIndex = menuWheelIndex;
      if (event.key === "ArrowDown") {
        nextIndex += 1;
      } else if (event.key === "ArrowUp") {
        nextIndex -= 1;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = menuWheelAnchors.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      selectMenuWheelItem(nextIndex, { focus: true });
    });

    menuWheel.addEventListener("focusin", (event) => {
      if (pointerStartY !== null) {
        return;
      }
      const anchor = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
      const index = menuWheelAnchors.indexOf(anchor);
      if (index >= 0) {
        selectMenuWheelItem(index, { playSound: false });
      }
    });

    menuWheel.addEventListener("wheel", (event) => {
      if (!event.deltaY || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? menuWheelRowHeight() / 3
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? menuWheelRowHeight() * 5 : 1;
      wheelDelta += event.deltaY * multiplier;
      const threshold = menuWheelRowHeight() * 0.45;
      while (Math.abs(wheelDelta) >= threshold) {
        const direction = Math.sign(wheelDelta);
        selectMenuWheelItem(menuWheelIndex + direction);
        wheelDelta -= direction * threshold;
      }
    }, { passive: false });

    menuWheel.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !event.isPrimary) {
        return;
      }
      activePointerId = event.pointerId;
      pointerStartY = event.clientY;
      pointerStartIndex = menuWheelIndex;
      pointerDragged = false;
    });

    window.addEventListener("pointermove", (event) => {
      if (pointerStartY === null || activePointerId !== event.pointerId) {
        return;
      }

      const movement = pointerStartY - event.clientY;
      if (Math.abs(movement) > 6) {
        pointerDragged = true;
        menuWheel.classList.add("is-dragging");
      }
      if (!pointerDragged) {
        return;
      }

      event.preventDefault();
      const threshold = menuWheelRowHeight() * 0.42;
      const steps = Math.trunc(movement / threshold);
      selectMenuWheelItem(pointerStartIndex + steps);
    });

    const finishMenuWheelDrag = (event) => {
      if (pointerStartY === null || activePointerId !== event.pointerId) {
        return;
      }
      if (pointerDragged) {
        suppressClickUntil = performance.now() + 400;
      }
      activePointerId = null;
      pointerStartY = null;
      pointerStartIndex = menuWheelIndex;
      pointerDragged = false;
      menuWheel.classList.remove("is-dragging");
    };
    window.addEventListener("pointerup", finishMenuWheelDrag);
    window.addEventListener("pointercancel", finishMenuWheelDrag);

    menuWheel.addEventListener("click", (event) => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
        suppressClickUntil = 0;
        return;
      }
      suppressClickUntil = 0;

      const anchor = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
      const index = menuWheelAnchors.indexOf(anchor);
      if (index >= 0) {
        selectMenuWheelItem(index);
      }
    });
  }

  let menuScrollY = 0;
  const setMenuOpen = (open, restoreFocus = true) => {
    if (open) {
      menuScrollY = window.scrollY;
      document.body.style.setProperty("--menu-scroll-offset", `${-menuScrollY}px`);
    }
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    siteHeader.classList.toggle("is-menu-open", open);
    siteMenu.hidden = !open;
    document.body.classList.toggle("menu-open", open);
    if (siteBrand instanceof HTMLElement) {
      siteBrand.inert = open;
    }
    if (mainContent instanceof HTMLElement) {
      mainContent.inert = open;
    }
    if (siteFooter instanceof HTMLElement) {
      siteFooter.inert = open;
    }

    if (open) {
      window.requestAnimationFrame(() => {
        (menuWheelAnchors[menuWheelIndex] ?? siteMenu.querySelector("a[href]"))?.focus({ preventScroll: true });
      });
    } else {
      document.body.style.removeProperty("--menu-scroll-offset");
      window.scrollTo({ top: menuScrollY, behavior: "instant" });
      if (restoreFocus) {
        menuToggle.focus({ preventScroll: true });
      }
    }
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  siteMenu.addEventListener("click", (event) => {
    if (event.target === siteMenu) {
      setMenuOpen(false);
      return;
    }

    const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const target = document.querySelector(link.hash);
    if (!(target instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    setMenuOpen(false, false);
    window.history.pushState(null, "", link.hash);
    target.scrollIntoView({ behavior: prefersReducedMotion.matches ? "instant" : "smooth", block: "start" });
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
      target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
    }
    target.focus({ preventScroll: true });
  });

  document.addEventListener("keydown", (event) => {
    if (menuToggle.getAttribute("aria-expanded") !== "true") {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setMenuOpen(false);
      return;
    }
    if (event.key !== "Tab") {
      return;
    }

    const focusable = [menuToggle, ...siteMenu.querySelectorAll('a[href], button:not([disabled])')];
    if (event.shiftKey && document.activeElement === focusable[0]) {
      event.preventDefault();
      focusable.at(-1)?.focus();
    } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
      event.preventDefault();
      focusable[0].focus();
    }
  });
}

const flowingMenu = document.querySelector("[data-flowing-menu]");
if (flowingMenu instanceof HTMLOListElement) {
  const flowingItems = [...flowingMenu.querySelectorAll(".flowing-menu-item")];
  const flowingSpeed = 60;
  const flowingStretch = 0.6;
  const flowingMagnet = 0.25;
  const flowingFollowCursor = 0.4;
  let hoveredFlowingItem = null;
  let focusedFlowingItem = null;
  let previousPointerX = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const updateFlowingMenu = () => {
    const activeItem = focusedFlowingItem ?? hoveredFlowingItem;
    for (const item of flowingItems) {
      item.classList.toggle("is-flowing-active", item === activeItem);
    }
  };

  const projectDialog = document.querySelector(".project-dialog");
  const projectDialogArt = projectDialog?.querySelector(".project-dialog-art");
  const projectDialogCategory = projectDialog?.querySelector(".project-dialog-category");
  const projectDialogTitle = projectDialog?.querySelector("#project-dialog-title");
  const projectDialogDescription = projectDialog?.querySelector("#project-dialog-description");
  const flowingMenuSection = flowingMenu.closest(".flowing-menu-section");
  let pausedPreview = null;
  let detailVideo = null;
  let selectedProjectButton = null;

  if (
    projectDialog instanceof HTMLElement
    && projectDialogArt instanceof HTMLElement
    && flowingMenuSection instanceof HTMLElement
  ) {
    const returnToProjects = () => {
      window.scrollTo({
        top: window.scrollY + flowingMenuSection.getBoundingClientRect().top,
        behavior: prefersReducedMotion.matches ? "instant" : "smooth",
      });
      selectedProjectButton?.focus({ preventScroll: true });
    };

    projectDialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        returnToProjects();
      }
    });
    const updateProjectScroll = () => {
      if (projectDialog.hidden) {
        return;
      }
      const bounds = projectDialog.getBoundingClientRect();
      const menuBounds = flowingMenuSection.getBoundingClientRect();
      const detailVisible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      document.documentElement.classList.toggle(
        "project-detail-scrolling",
        bounds.top < window.innerHeight && menuBounds.bottom > 0,
      );
      if (detailVideo && pausedPreview) {
        if (detailVisible && !detailVideo.frame.hasAttribute("src")) {
          pausedPreview.frame.removeAttribute("src");
          detailVideo.frame.setAttribute("src", detailVideo.src);
        } else if (!detailVisible && detailVideo.frame.hasAttribute("src")) {
          detailVideo.frame.removeAttribute("src");
          pausedPreview.frame.setAttribute("src", pausedPreview.src);
        }
      }
    };
    window.addEventListener("scroll", updateProjectScroll, { passive: true });
    window.addEventListener("resize", updateProjectScroll, { passive: true });
  }

  const updateMarqueeDuration = () => {
    for (const item of flowingItems) {
      const track = item.querySelector(".flowing-menu-track");
      const group = track?.firstElementChild;
      if (track instanceof HTMLElement && group instanceof HTMLElement) {
        track.style.setProperty("--flowing-duration", `${group.getBoundingClientRect().width / flowingSpeed}s`);
      }
    }
  };

  for (const item of flowingItems) {
    const button = item.querySelector(".flowing-menu-trigger");
    const track = item.querySelector(".flowing-menu-track");
    const group = track?.firstElementChild;
    if (!(button instanceof HTMLButtonElement) || !(track instanceof HTMLElement) || !(group instanceof HTMLElement)) {
      continue;
    }

    const repeatedGroup = group.cloneNode(true);
    repeatedGroup.setAttribute("aria-hidden", "true");
    const repeatedVideo = repeatedGroup.querySelector("iframe");
    if (repeatedVideo) {
      const ovleArt = repeatedVideo.closest(".art-ovle");
      repeatedVideo.remove();
      if (ovleArt) {
        const orbit = document.createElement("span");
        orbit.className = "ovle-orbit";
        const wordmark = document.createElement("span");
        wordmark.className = "ovle-wordmark";
        wordmark.textContent = "Ovle";
        const subtitle = document.createElement("span");
        subtitle.className = "ovle-subtitle";
        subtitle.textContent = "FASHION BRANDING";
        ovleArt.append(orbit, wordmark, subtitle);
      }
    }
    track.append(repeatedGroup);

    button.addEventListener("pointerenter", (event) => {
      if (focusedFlowingItem !== item) {
        focusedFlowingItem = null;
      }
      hoveredFlowingItem = item;
      previousPointerX = event.clientX;
      updateFlowingMenu();
    });

    button.addEventListener("pointermove", (event) => {
      if (hoveredFlowingItem !== item) {
        return;
      }
      const bounds = button.getBoundingClientRect();
      const offsetX = event.clientX - bounds.left - bounds.width / 2;
      const offsetY = event.clientY - bounds.top - bounds.height / 2;
      const pointerDelta = previousPointerX === null ? 0 : event.clientX - previousPointerX;
      previousPointerX = event.clientX;
      item.style.setProperty("--flowing-follow-x", `${clamp(offsetX * flowingFollowCursor, -130, 130)}px`);
      item.style.setProperty("--flowing-stretch", String(1 + clamp(Math.abs(pointerDelta) / 100 * flowingStretch, 0, flowingStretch)));
      button.style.setProperty("--flowing-magnet-x", `${clamp(offsetX * flowingMagnet, -20, 20)}px`);
      button.style.setProperty("--flowing-magnet-y", `${clamp(offsetY * flowingMagnet, -12, 12)}px`);
    });

    button.addEventListener("pointerleave", () => {
      if (hoveredFlowingItem === item) {
        hoveredFlowingItem = null;
      }
      previousPointerX = null;
      item.style.removeProperty("--flowing-follow-x");
      item.style.removeProperty("--flowing-stretch");
      button.style.removeProperty("--flowing-magnet-x");
      button.style.removeProperty("--flowing-magnet-y");
      updateFlowingMenu();
    });

    button.addEventListener("focus", () => {
      focusedFlowingItem = item;
      updateFlowingMenu();
    });

    button.addEventListener("blur", (event) => {
      if (!(event.relatedTarget instanceof Node && item.contains(event.relatedTarget)) && focusedFlowingItem === item) {
        focusedFlowingItem = null;
        updateFlowingMenu();
      }
    });

    button.addEventListener("click", () => {
      const art = group.querySelector(".work-art");
      const category = button.querySelector(".flowing-menu-category");
      const title = button.querySelector(".flowing-menu-title strong");
      const description = button.querySelector(".flowing-menu-description");
      if (
        !(projectDialog instanceof HTMLElement)
        || !(projectDialogArt instanceof HTMLElement)
        || !projectDialogCategory || !(projectDialogTitle instanceof HTMLElement) || !projectDialogDescription
        || !art || !category || !title || !description
      ) {
        console.error("프로젝트 상세 화면을 열 수 없습니다.");
        return;
      }

      if (pausedPreview) {
        pausedPreview.frame.setAttribute("src", pausedPreview.src);
        pausedPreview = null;
      }
      detailVideo = null;
      const artwork = art.cloneNode(true);
      const detailFrame = artwork.querySelector("iframe");
      const previewFrame = art.querySelector("iframe");
      const previewSrc = previewFrame?.getAttribute("src");
      if (detailFrame instanceof HTMLIFrameElement && previewFrame instanceof HTMLIFrameElement && previewSrc) {
        detailFrame.setAttribute("inert", "");
        pausedPreview = { frame: previewFrame, src: previewSrc };
        detailVideo = { frame: detailFrame, src: previewSrc };
        previewFrame.removeAttribute("src");
      }
      projectDialogArt.replaceChildren(artwork);
      projectDialogCategory.textContent = category.textContent;
      projectDialogTitle.textContent = title.textContent;
      projectDialogDescription.textContent = description.textContent;
      selectedProjectButton = button;
      projectDialog.hidden = false;
      document.documentElement.classList.add("project-detail-scrolling");
      projectDialog.scrollIntoView({ behavior: "instant", block: "start" });
      projectDialogTitle.focus({ preventScroll: true });
    });
  }

  updateMarqueeDuration();
  window.addEventListener("resize", updateMarqueeDuration, { passive: true });
  if (document.fonts) {
    void document.fonts.ready.then(updateMarqueeDuration);
  }

  const flowingMenuHeader = document.querySelector(".site-header");
  if (
    flowingMenuSection instanceof HTMLElement
    && flowingMenuHeader instanceof HTMLElement
    && "IntersectionObserver" in window
  ) {
    const visibleDarkSections = new Set();
    const headerObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visibleDarkSections.add(entry.target);
        } else {
          visibleDarkSections.delete(entry.target);
        }
      }
      flowingMenuHeader.classList.toggle("is-over-dark-work", visibleDarkSections.size > 0);
    }, { rootMargin: "-80px 0px -80px 0px" });
    headerObserver.observe(flowingMenuSection);
    if (projectDialog instanceof HTMLElement) {
      headerObserver.observe(projectDialog);
    }
  }
}

const scrollStories = [...document.querySelectorAll(".work-card-story:not(.work-card-video)")].flatMap((card) => {
  const stage = card.querySelector(".work-story-stage");
  const details = card.querySelector(".work-details");
  return card instanceof HTMLElement && stage instanceof HTMLElement && details instanceof HTMLElement
    ? [{ card, stage, details, lastProgress: -1, lastDetailsHeight: -1 }]
    : [];
});

if (scrollStories.length) {
  let storyFrame = 0;
  const updateStory = () => {
    storyFrame = 0;
    const enabled = !prefersReducedMotion.matches && storyViewport.matches;
    for (const story of scrollStories) {
      story.card.classList.toggle("is-scroll-story", enabled);
      if (!enabled) {
        story.lastProgress = -1;
        story.lastDetailsHeight = -1;
        continue;
      }

      const bounds = story.card.getBoundingClientRect();
      const stageHeight = story.stage.offsetHeight;
      const animationDistance = bounds.height - stageHeight;
      const progress = animationDistance > 0 ? Math.max(0, Math.min(1, -bounds.top / animationDistance)) : 0;
      const detailsHeight = story.details.offsetHeight;
      if (progress === story.lastProgress && detailsHeight === story.lastDetailsHeight) {
        continue;
      }
      story.lastProgress = progress;
      story.lastDetailsHeight = detailsHeight;
      const artStartWidth = wideStoryViewport.matches ? 72 : 68;
      const graphicScale = (0.82 + progress * 0.58) * (wideStoryViewport.matches ? 1.12 : 1);
      story.stage.style.setProperty("--story-art-width", `${artStartWidth + progress * (100 - artStartWidth)}%`);
      story.stage.style.setProperty("--story-art-gap", `${detailsHeight * (1 - progress)}px`);
      story.stage.style.setProperty("--story-details-opacity", String(Math.max(0, Math.min(1, (0.85 - progress) / 0.4))));
      story.stage.style.setProperty("--story-word-x", `${-18 + progress * 36}px`);
      story.stage.style.setProperty("--story-word-y", `${24 - progress * 24}px`);
      story.stage.style.setProperty("--story-word-scale", String(graphicScale));
      story.stage.style.setProperty("--story-line-angle", `${-30 + progress * 45}deg`);
      story.stage.style.setProperty("--story-line-scale", String(0.8 + progress * 0.45));
      story.stage.style.setProperty("--story-number-opacity", String(0.4 + progress * 0.6));
      story.stage.style.setProperty("--story-number-y", `${36 - progress * 36}px`);
      story.stage.style.setProperty("--story-details-y", `${20 - progress * 20}px`);
    }
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

  let scrollBudget = 0;
  let budgetTime = 0;
  let budgetDirection = 0;
  let touchPosition = null;

  const limitStoryScroll = (delta) => {
    if (prefersReducedMotion.matches || !storyViewport.matches || !delta) {
      return false;
    }

    const current = window.scrollY;
    const target = current + delta;
    const direction = Math.sign(delta);
    const boundaryTolerance = 1 / window.devicePixelRatio;
    let storyBoundary = null;
    const crossesStory = scrollStories.some(({ card }) => {
      const bounds = card.getBoundingClientRect();
      const start = current + bounds.top;
      const end = start + bounds.height;
      const overlapsStory = Math.max(current, target) > start && Math.min(current, target) < end;
      if (!overlapsStory) {
        return false;
      }

      if (direction > 0) {
        if (current < start && target > start && start - current > boundaryTolerance) {
          storyBoundary ??= start;
        } else if (current < end && target > end && end - current > boundaryTolerance) {
          storyBoundary ??= end;
        }
      } else if (current > end && target < end && current - end > boundaryTolerance) {
        storyBoundary ??= end;
      } else if (current > start && target < start && current - start > boundaryTolerance) {
        storyBoundary ??= start;
      }
      return true;
    });
    if (!crossesStory) {
      budgetTime = 0;
      return false;
    }

    const now = performance.now();
    // Limit a burst without blocking continued scrolling or a change of direction.
    const capacity = window.innerHeight * 0.6;
    if (!budgetTime || direction !== budgetDirection) {
      scrollBudget = capacity;
    } else {
      scrollBudget = Math.min(capacity, scrollBudget + (now - budgetTime) * window.innerHeight * 0.0007);
    }
    budgetTime = now;
    budgetDirection = direction;

    const distance = Math.min(
      Math.abs(delta),
      scrollBudget,
      storyBoundary === null ? Infinity : Math.abs(storyBoundary - current),
    );
    scrollBudget -= distance;
    if (distance > 0) {
      window.scrollTo({ top: current + direction * distance, behavior: "instant" });
    }
    return true;
  };

  window.addEventListener("wheel", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.cancelable) {
      return;
    }
    const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1;
    if (limitStoryScroll(event.deltaY * multiplier)) {
      event.preventDefault();
    }
  }, { passive: false });

  window.addEventListener("touchstart", (event) => {
    touchPosition = event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null;
  }, { passive: true });

  window.addEventListener("touchmove", (event) => {
    if (!touchPosition || event.touches.length !== 1) {
      touchPosition = null;
      return;
    }
    const touch = event.touches[0];
    const deltaX = touchPosition.x - touch.clientX;
    const deltaY = touchPosition.y - touch.clientY;
    touchPosition = { x: touch.clientX, y: touch.clientY };
    if (event.cancelable && Math.abs(deltaY) > Math.abs(deltaX) && limitStoryScroll(deltaY)) {
      event.preventDefault();
    }
  }, { passive: false });
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
    "main > section:not(.hero):not(.services):not(.work-section), .services > .section-heading, .service-card, .work-heading",
  ).forEach((section) => {
    sectionObserver.observe(section);
  });

  const workCardObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle("section-entered", entry.isIntersecting);
    }
  }, { threshold: 0.15 });

  document.querySelectorAll(".work-card").forEach((section) => {
    workCardObserver.observe(section);
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
    if (!text.closest(".project-dialog")) {
      textObserver.observe(text);
    }
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
