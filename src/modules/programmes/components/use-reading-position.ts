"use client";

import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/** The topic and subtopic being read: the last ones whose title reached the pinned area. */
export type ReadingPosition = { topic: string; subtopic: string | null };

export type JumpTarget = { topic: string; subtopic?: string };

// The comparator marks its parts with these attributes, which this hook reads in the page.
export const pinnedNamesAttribute = "data-pinned-names";
export const topicAttribute = "data-topic";
export const topicTitleAttribute = "data-topic-title";
export const subtopicAttribute = "data-subtopic";

// Sub-pixel layouts never land exactly on the line.
const tolerance = 2;

// Long enough to follow with the eye, short enough not to wait for it.
const shortestJump = 300;
const longestJump = 800;

// Past this, the visitor has seen the page and placing it again would pull it from under them.
const arrivalWindow = 3000;

const userInputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

export function topicSectionId(slug: string): string {
  return `topic-${slug}`;
}

export function subtopicSectionId(id: string): string {
  return `subtopic-${id}`;
}

/**
 * Follows the reading in the comparator under `root`, and jumps to a topic or subtopic. The
 * page opens on `openingTopic` when there is one. Also publishes the heights of the pinned
 * names (`--pinned-names`) and of each topic's title (`--pinned-topic`), which the pinned
 * titles below them sit under. `layoutKey` changes whenever the sections are rendered anew.
 */
export function useReadingPosition({
  root,
  firstTopic,
  openingTopic,
  layoutKey,
}: {
  root: RefObject<HTMLElement | null>;
  firstTopic: string;
  openingTopic: string;
  layoutKey: string;
}) {
  const [reading, setReading] = useState<ReadingPosition>({ topic: openingTopic || firstTopic, subtopic: null });
  const tracking = useRef<Tracking>({ jump: null, held: null });

  function jumpTo(target: JumpTarget) {
    const element = root.current;
    const destination = element && targetElement(element, target);
    if (!element || !destination) return;
    const state = tracking.current;
    stopJump(state);
    const section = element.querySelector<HTMLElement>(`[${topicAttribute}="${CSS.escape(target.topic)}"]`);
    const position = { topic: target.topic, subtopic: target.subtopic ?? firstSubtopic(section) };
    // Frozen on the target, so the outline does not open each topic the page scrolls past.
    setReading(position);
    function arrive() {
      state.jump = null;
      state.held = isAtPageEnd() ? position : null;
    }
    const start = window.scrollY;
    const end = () => scrollTopFor(element, destination, target);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo({ top: end(), behavior: "instant" });
      arrive();
      return;
    }
    // Scrolled frame by frame: the browser's smooth scrolling stops when anything else scrolls.
    const duration = Math.min(longestJump, Math.max(shortestJump, Math.abs(end() - start) / 4));
    const startedAt = performance.now();
    const jump = { frame: 0 };
    function step(now: number) {
      if (state.jump !== jump) return;
      const progress = Math.min(1, (now - startedAt) / duration);
      window.scrollTo({ top: start + (end() - start) * easeInOut(progress), behavior: "instant" });
      if (progress < 1) jump.frame = requestAnimationFrame(step);
      else arrive();
    }
    jump.frame = requestAnimationFrame(step);
    state.jump = jump;
  }

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const publish = () => publishPinnedHeights(element);
    publish();
    const observer = new ResizeObserver(publish);
    for (const pinned of element.querySelectorAll(`[${pinnedNamesAttribute}], [${topicTitleAttribute}]`)) {
      observer.observe(pinned);
    }
    return () => observer.disconnect();
  }, [root, layoutKey]);

  useEffect(() => {
    const state = tracking.current;
    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        follow(root.current, state, setReading);
      });
    }
    // The visitor scrolling during a jump takes over from it.
    function onInput() {
      if (stopJump(state)) follow(root.current, state, setReading);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    for (const input of userInputs) window.addEventListener(input, onInput, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      stopJump(state);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      for (const input of userInputs) window.removeEventListener(input, onInput);
    };
  }, [root]);

  // A shared link opens on its topic. Fonts and logos arriving late move the page, so it is
  // placed again until the visitor scrolls or the page settles.
  useEffect(() => {
    const element = root.current;
    if (!element || !openingTopic) return;
    const state = tracking.current;
    let settled = false;
    function place() {
      const destination = element && targetElement(element, { topic: openingTopic });
      if (settled || !element || !destination || state.jump) return;
      window.scrollTo({ top: scrollTopFor(element, destination, { topic: openingTopic }), behavior: "instant" });
      follow(element, state, setReading);
    }
    function settle() {
      settled = true;
    }
    const frame = requestAnimationFrame(place);
    const timer = setTimeout(settle, arrivalWindow);
    const observer = new ResizeObserver(place);
    observer.observe(element);
    void document.fonts?.ready.then(place);
    window.addEventListener("load", place);
    for (const input of userInputs) window.addEventListener(input, settle, { passive: true });
    return () => {
      settle();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("load", place);
      for (const input of userInputs) window.removeEventListener(input, settle);
    };
    // Only on arrival: later changes of the link follow the reading, they do not move the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { reading, jumpTo };
}

// What the hook keeps between frames: the jump under way, and a jump target the page cannot
// scroll up to near its end, kept until the visitor scrolls back.
type Tracking = { jump: { frame: number } | null; held: ReadingPosition | null };

function follow(
  root: HTMLElement | null,
  state: Tracking,
  setReading: Dispatch<SetStateAction<ReadingPosition>>,
) {
  if (!root || state.jump) return;
  if (state.held && isAtPageEnd()) return;
  state.held = null;
  const position = readPosition(root);
  if (position) setReading((previous) => (samePosition(previous, position) ? previous : position));
}

// Whether a jump was under way.
function stopJump(state: Tracking): boolean {
  if (!state.jump) return false;
  cancelAnimationFrame(state.jump.frame);
  state.jump = null;
  return true;
}

function readPosition(root: HTMLElement): ReadingPosition | null {
  const line = pinnedNamesHeight(root) + tolerance;
  const topics = [...root.querySelectorAll<HTMLElement>(`[${topicAttribute}]`)];
  const topic = topics.filter((section) => section.getBoundingClientRect().top <= line).at(-1) ?? topics[0];
  if (!topic) return null;
  const subtopicLine = line + topicTitleHeight(topic);
  const subtopics = [...topic.querySelectorAll<HTMLElement>(`[${subtopicAttribute}]`)];
  const subtopic =
    subtopics.filter((section) => section.getBoundingClientRect().top <= subtopicLine).at(-1) ?? subtopics[0];
  return { topic: topic.getAttribute(topicAttribute) ?? "", subtopic: subtopic?.getAttribute(subtopicAttribute) ?? null };
}

function targetElement(root: HTMLElement, target: JumpTarget): HTMLElement | null {
  const id = target.subtopic ? subtopicSectionId(target.subtopic) : topicSectionId(target.topic);
  return root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
}

// Just under the pinned area: under the names for a topic, under the names and the topic's
// title for a subtopic.
function scrollTopFor(root: HTMLElement, destination: HTMLElement, target: JumpTarget): number {
  const topic = destination.closest<HTMLElement>(`[${topicAttribute}]`);
  const pinned = pinnedNamesHeight(root) + (target.subtopic && topic ? topicTitleHeight(topic) : 0);
  const top = window.scrollY + destination.getBoundingClientRect().top - pinned;
  const bottom = document.documentElement.scrollHeight - window.innerHeight;
  return Math.round(Math.min(Math.max(top, 0), bottom));
}

function publishPinnedHeights(root: HTMLElement) {
  root.style.setProperty("--pinned-names", `${pinnedNamesHeight(root)}px`);
  for (const topic of root.querySelectorAll<HTMLElement>(`[${topicAttribute}]`)) {
    topic.style.setProperty("--pinned-topic", `${topicTitleHeight(topic)}px`);
  }
}

// Zero on a phone, where the names are not pinned and so not displayed in that row.
function pinnedNamesHeight(root: HTMLElement): number {
  return root.querySelector<HTMLElement>(`[${pinnedNamesAttribute}]`)?.offsetHeight ?? 0;
}

function topicTitleHeight(topic: HTMLElement): number {
  return topic.querySelector<HTMLElement>(`[${topicTitleAttribute}]`)?.offsetHeight ?? 0;
}

function firstSubtopic(topic: HTMLElement | null): string | null {
  return topic?.querySelector(`[${subtopicAttribute}]`)?.getAttribute(subtopicAttribute) ?? null;
}

function isAtPageEnd(): boolean {
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - tolerance;
}

function samePosition(a: ReadingPosition, b: ReadingPosition): boolean {
  return a.topic === b.topic && a.subtopic === b.subtopic;
}

function easeInOut(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}
