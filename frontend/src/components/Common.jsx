import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Heart,
  MapPin,
  Search,
  Compass,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLibrary } from "../context/Library";
export const pathOf = (x) =>
  x.path || (x.restaurant_id ? "/food/" : "/restaurants/") + x.slug;
export function Brand({ logo }) {
  return (
    <Link className="brand" to="/" aria-label="Proxima Dining home">
      {logo ? (
        <img className="customlogo" src={logo} alt="" />
      ) : (
        <svg viewBox="0 0 38 42" width="32" height="38" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M19 2 34 11v19l-15 10L4 30V11z M19 6 30 13v14l-11 8-11-8V13z M12 29V12l9-2 6 5-1 6-10 5 M16 31V15l5-1 3 3-2 3-6 3" />
          </g>
        </svg>
      )}
      <span>
        Proxima <i>Dining</i>
      </span>
    </Link>
  );
}
export function Status({ r }) {
  return (
    <div role="status" className="notice">
      {r.error || "Loading the collection…"}
      {r.error && (
        <p>
          <button className="btn" onClick={() => location.reload()}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
export function Empty({
  title = "Nothing here just yet.",
  text = "Try another search or explore the restaurant collection.",
}) {
  return (
    <div className="empty">
      <Compass size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
      <Link className="textlink" to="/restaurants">
        Explore restaurants <ArrowRight size={15} />
      </Link>
    </div>
  );
}
export function SearchBox({ initial = "", home = false }) {
  const [v, S] = useState(initial);
  const nav = useNavigate();
  useEffect(() => S(initial), [initial]);
  return (
    <form
      className={"searchbox " + (home ? "heroSearch" : "")}
      onSubmit={(e) => {
        e.preventDefault();
        nav(
          home && !v.trim()
            ? "/restaurants"
            : "/search?q=" + encodeURIComponent(v.trim()),
        );
      }}
    >
      <Search size={19} />
      <input
        aria-label="Search restaurants, cuisines or cities"
        value={v}
        maxLength="160"
        onChange={(e) => S(e.target.value)}
        placeholder="Restaurant, cuisine, or city…"
      />
      <button className="gold">
        {home ? "Explore" : "Search"} <ArrowRight size={16} />
      </button>
    </form>
  );
}
export function Save({ x, full = false }) {
  const { saves, toggle } = useLibrary();
  const path = pathOf(x),
    on = saves.some((s) => s.path === path);
  return (
    <button
      className={full ? "btn" : "save"}
      aria-pressed={on}
      aria-label={(on ? "Unsave " : "Save ") + x.name}
      onClick={() => toggle({ ...x, path })}
    >
      <Heart size={17} fill={on ? "currentColor" : "none"} />
      {full && (on ? "Saved to favorites" : "Save to favorites")}
    </button>
  );
}
export function Card({ x, to, label, save = true }) {
  const path = to || pathOf(x);
  const tag = label || x.cuisines?.join(" · ") || x.category;
  return (
    <article className="card">
      <div className="cardpic">
        <Link to={path} aria-label={"Explore " + x.name}>
          <img
            src={x.image_url || "/images/salon.jpg"}
            loading="lazy"
            alt={x.name}
          />
        </Link>
        {tag && <span className="tag">{tag}</span>}
        {save && <Save x={x} />}
      </div>
      <div className="cardinfo">
        {(x.city || x.restaurant) && (
          <div className="metaline">
            {x.city ? (
              <>
                <MapPin size={13} />
                {x.city}, {x.country}
                <b>·</b>
                {x.price_category}
              </>
            ) : (
              <>
                <UtensilsCrossed size={13} />
                {x.restaurant}
              </>
            )}
          </div>
        )}
        <Link to={path}>
          <h3>{x.name}</h3>
        </Link>
        <p>{x.description}</p>
        <Link to={path} className="textlink">
          {x.restaurant_id
            ? "View dish"
            : x.city
              ? "View restaurant"
              : "Explore collection"}{" "}
          <ArrowRight size={14} />
        </Link>
        {x.price && <small className="price">{money(x)}</small>}
      </div>
    </article>
  );
}
export function money(x) {
  return x.price != null
    ? new Intl.NumberFormat("en", {
        style: "currency",
        currency: x.currency || "USD",
        maximumFractionDigits: 2,
      }).format(Number(x.price))
    : "";
}
export function Grid({ items, ...opts }) {
  return items?.length ? (
    <div className="grid">
      {items.map((x) => (
        <Card key={pathOf(x)} x={x} {...opts} />
      ))}
    </div>
  ) : (
    <Empty />
  );
}
export function SectionHead({ k, title, sub, link, to }) {
  return (
    <div className="sectionhead">
      <div>
        <div className="kicker">
          <span />
          {k}
        </div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {link && (
        <Link className="textlink" to={to}>
          {link} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Pager({ page, total, size, onPage }) {
  const pages = Math.ceil(total / size);
  return pages > 1 ? (
    <div className="pager">
      <button
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft />
      </button>
      Page {page} of {pages}
      <button
        aria-label="Next page"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight />
      </button>
    </div>
  ) : null;
}
