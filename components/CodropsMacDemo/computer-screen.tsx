"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* VOYAGERSCAPE PORT NOTE: the source imports cn from "@/lib/utils" (clsx +
   tailwind-merge, part of the Codrops repo's shadcn setup). Voyagerscape has
   neither package, and this component's cn() calls never merge conflicting
   Tailwind classes, so a local truthy-string join is behaviourally identical
   here. See ./cn.ts. */
import { cn } from "./cn";

type Post = {
  title: string;
  category: string;
  date: string;
  author: string;
  excerpt: string;
};

const posts: Post[] = [
  {
    title: "Crafting a Liquid Glass Navigation with WebGL",
    category: "Tutorial",
    date: "Apr 18, 2026",
    author: "Alex Rivera",
    excerpt:
      "A step-by-step guide to building a refractive, glass-like navigation using shaders and pointer-driven distortion.",
  },
  {
    title: "Scroll-Driven Typography Transitions with CSS",
    category: "Article",
    date: "Apr 14, 2026",
    author: "Jamie Chen",
    excerpt:
      "Using the scroll-timeline APIs to choreograph letter-spacing, weight and size as the reader travels the page.",
  },
  {
    title: "Procedural Page Transitions on the Web",
    category: "Tutorial",
    date: "Apr 10, 2026",
    author: "Sam Carter",
    excerpt:
      "Combining the View Transitions API with a shader overlay for seamless, cinematic route changes.",
  },
  {
    title: "Displacement Hover Effects, Revisited",
    category: "Playground",
    date: "Apr 04, 2026",
    author: "Riley Tanaka",
    excerpt:
      "Classic image displacement distortion re-imagined with modern shaders and reduced-motion fallbacks.",
  },
  {
    title: "Building an Editorial Grid with Subgrid",
    category: "Article",
    date: "Mar 29, 2026",
    author: "Morgan Blake",
    excerpt:
      "A magazine-style layout where rows actually align — thanks to subgrid and container queries.",
  },
  {
    title: "Physics-Based Card Stacks on the Web",
    category: "Tutorial",
    date: "Mar 22, 2026",
    author: "Taylor Reed",
    excerpt:
      "Draggable, tossable, spring-loaded cards that feel satisfyingly tactile — built with a physics engine.",
  },
  {
    title: "The Return of Brutalist Web Design",
    category: "Inspiration",
    date: "Mar 15, 2026",
    author: "Jordan Ellis",
    excerpt:
      "Why designers keep coming back to raw HTML aesthetics, and ten recent sites doing it well.",
  },
  {
    title: "Animating SVG Paths on the GPU",
    category: "Tutorial",
    date: "Mar 08, 2026",
    author: "Casey Nord",
    excerpt:
      "Skip the DOM — render thousands of animated paths per frame by uploading them as textures.",
  },
  {
    title: "Color Systems for Generative Art",
    category: "Article",
    date: "Mar 01, 2026",
    author: "Robin Faure",
    excerpt:
      "Designing palettes that stay coherent across thousands of randomized outputs — OKLCH, constraints, and taste.",
  },
];

const navItems = ["Articles", "Tutorials", "Playground", "Collective", "About"];
const menuItems = ["File", "Edit", "View", "Special", "Help"];
const menuContents: Record<string, string[]> = {
  File: ["New", "Open…", "Close", "Save", "Print…", "Quit"],
  Edit: ["Undo", "Cut", "Copy", "Paste", "Clear", "Select All"],
  View: ["by Icon", "by Name", "by Date", "by Size", "by Kind"],
  Special: ["Clean Up", "Empty Trash", "Erase Disk", "Restart", "Shut Down"],
  Help: ["About Codrops", "Help Center", "Shortcuts"],
};

const formatClock = (d: Date) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${days[d.getDay()]} ${hh}:${m} ${ampm}`;
};

export const ComputerScreen = () => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [windowOpen, setWindowOpen] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [hasRendered, setHasRendered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onReady = () => setHasRendered(true);
    window.addEventListener("mac-canvas-ready", onReady);
    return () => window.removeEventListener("mac-canvas-ready", onReady);
  }, []);

  useLayoutEffect(() => {
    const element = elementRef.current;
    const originalParent = element?.parentNode;
    return () => {
      if (element && originalParent && element.parentNode !== originalParent) {
        originalParent.appendChild(element);
      }
    };
  }, []);

  return (
    <div
      ref={elementRef}
      id="computer_screen"
      className={cn("relative p-2", hasRendered ? "" : "-z-10")}
    >
      <div className="mac-menubar" onMouseLeave={() => setOpenMenu(null)}>
        <span className="mac-apple" onClick={() => setWindowOpen(true)}>
          ■
        </span>
        {menuItems.map((m) => (
          <span
            key={m}
            className={cn("mac-menu", openMenu === m && "is-open")}
            onMouseEnter={() => openMenu && setOpenMenu(m)}
            onClick={() => setOpenMenu(openMenu === m ? null : m)}
          >
            {m}
            {openMenu === m && (
              <span className="mac-dropdown">
                {menuContents[m].map((item) => (
                  <span key={item} className="mac-dropdown-item">
                    {item}
                  </span>
                ))}
              </span>
            )}
          </span>
        ))}
        <span className="mac-clock">{clock}</span>
      </div>

      {windowOpen && (
        <div className={`mac-window ${zoomed ? "is-zoomed" : ""}`}>
          <div className="mac-titlebar">
            <span className="mac-close" onClick={() => setWindowOpen(false)} />
            <span className="mac-title">Codrops.html</span>
            <span className="mac-zoom" onClick={() => setZoomed((z) => !z)} />
          </div>

          <div className="mac-content">
            <header className="codrops-masthead">
              <div className="codrops-logo">Codrops</div>
              <div className="codrops-tagline">
                Useful resources and inspiration for creative minds
              </div>
              <nav className="codrops-nav">
                {navItems.map((item, i) => (
                  <span key={item} style={{ display: "contents" }}>
                    {i > 0 && <span>·</span>}
                    <a className={item === "Articles" ? "is-active" : ""}>
                      {item}
                    </a>
                  </span>
                ))}
              </nav>
            </header>

            <article className="codrops-hero">
              <div className="codrops-hero-thumb">
                <div className="mac-dither" />
              </div>
              <div className="codrops-hero-body flex flex-col justify-between">
                <div>
                  <span className="codrops-kicker">Featured · Articles</span>
                  <h1>Exploring the HTML-in-Canvas Proposal</h1>
                  <p>
                    A quick look at the HTML-in-Canvas proposal, how it works,
                    and what it enables with a few practical demos.
                  </p>
                </div>
                <div className="codrops-meta">
                  By Vittorio Retrivi · Apr 30, 2026 · 12 min read
                </div>
              </div>
            </article>

            <section className="codrops-section">
              <div className="codrops-section-head">
                <h2>Latest Posts</h2>
                <a className="codrops-more">View all »</a>
              </div>
              <div className="codrops-list">
                {posts.map((p) => (
                  <article
                    className={`codrops-card ${selectedPost === p.title ? "is-selected" : ""}`}
                    key={p.title}
                    onClick={() =>
                      setSelectedPost(selectedPost === p.title ? null : p.title)
                    }
                  >
                    <div className="codrops-thumb" />
                    <div className="codrops-card-body">
                      <span className="codrops-kicker">{p.category}</span>
                      <h3>{p.title}</h3>
                      <p>{p.excerpt}</p>
                      <div className="codrops-meta">
                        {p.author} · {p.date}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <footer className="codrops-footer">
              <div>© {new Date().getFullYear()} Codrops</div>
              <div className="codrops-footer-links">
                <a>Twitter</a>
                <a>RSS</a>
                <a>Newsletter</a>
                <a>Contact</a>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
