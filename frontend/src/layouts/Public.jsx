import {FooterLinks} from "../components/FooterLinks";
import React, { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Search, Heart, Sun, Moon, Menu, X } from "lucide-react";
import { Brand } from "../components/Common";
import { useLibrary } from "../context/Library";
import { useData } from "../services/hooks";
const links = [
  ["/", "Home"],
  ["/restaurants", "Restaurants"],
  ["/cuisines", "Cuisines"],
  ["/categories", "Categories"],
  ["/about", "About"],
  ["/contact", "Contact"],
];
export function Public() {
  const { theme, swap, saves } = useLibrary(),
    [open, S] = useState(false);
  const { pathname, search } = useLocation(),
    r = useData("/settings");
  useEffect(() => {
    S(false);
    window.scrollTo(0, 0);
    document.title =
      (pathname === "/"
        ? "Discover Extraordinary Dining"
        : decodeURIComponent(pathname.split("/").pop()).replaceAll("-", " ")) +
      " | " +
      (r.data?.website_title || "Proxima Dining");
    if (r.data?.website_description)
      document.querySelector("meta[name=description]").content =
        r.data.website_description;
    document.querySelector('meta[property="og:title"]').content =
      document.title;
    document.querySelector("link[rel=canonical]").href =
      window.location.origin + pathname;
  }, [pathname, search, r.data]);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header>
        <div className="wrap navwrap">
          <Brand logo={r.data?.logo_url} />
          <nav className={open ? "open" : ""}>
            {links.map(([url, n]) => (
              <NavLink end={url === "/"} key={url} to={url}>
                {n}
              </NavLink>
            ))}
          </nav>
          <div className="tools">
            <Link aria-label="Search" to="/search">
              <Search />
            </Link>
            <Link aria-label="Favorites" to="/favorites">
              <Heart />
              {saves.length > 0 && <sup>{saves.length}</sup>}
            </Link>
            <i />
            <button onClick={swap} aria-label="Switch theme">
              {theme === "light" ? <Sun /> : <Moon />}
            </button>
            <button
              className="mobile"
              aria-label="Toggle navigation"
              aria-expanded={open}
              onClick={() => S(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer>
        <div className="wrap footrow">
          <div>
            <Brand logo={r.data?.logo_url} />
            <p>{r.data?.footer_text}</p>
            <FooterLinks links={r.data?.footer_links}/>
          </div>
          <div className="footlinks">
            <a href="/photo-credits.html">Photo credits</a>
            {r.data?.contact_email && (
              <a href={"mailto:" + r.data.contact_email}>Email</a>
            )}
            {[
              ["/restaurants", "Restaurants"],
              ["/about", "About"],
              ["/contact", "Contact"],
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
            ].map(([p, n]) => (
              <Link key={p} to={p}>
                {n}
              </Link>
            ))}
          </div>
        </div>
        <div className="wrap smallfoot">
          © {new Date().getFullYear()} Proxima Dining. Built by Proxima.{" "}
          <span>Development edition · Fictional restaurant collection</span>
        </div>
      </footer>
    </>
  );
}
