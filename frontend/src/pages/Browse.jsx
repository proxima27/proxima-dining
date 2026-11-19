import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { MapPin, ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useData, params } from "../services/hooks";
import {
  Grid,
  Card,
  Empty,
  Status,
  SectionHead,
  Pager,
  SearchBox,
  Save,
  money,
  pathOf,
} from "../components/Common";
import { useLibrary } from "../context/Library";
export function Directory({ cuisine }) {
  const [p, P] = useSearchParams(),
    cs = useData("/cuisines"),
    ds = useData("/restaurants/destinations");
  const filters = Object.fromEntries(p);
  const page = Number(p.get("page") || 1),
    [term, T] = useState(filters.search || "");
  useEffect(() => T(filters.search || ""), [filters.search]);
  function change(k, v) {
    let n = new URLSearchParams(p);
    n.delete("page");
    v ? n.set(k, v) : n.delete(k);
    P(n);
  }
  const r = useData(
    "/restaurants?" +
      params({
        ...filters,
        cuisine: cuisine?.slug || filters.cuisine,
        size: 9,
      }),
  );
  function select(k, label, opts) {
    return (
      <label>
        {label}
        <select
          value={filters[k] || ""}
          onChange={(e) => change(k, e.target.value)}
        >
          <option value="">
            {k === "sort" ? "Featured first" : "All " + label.toLowerCase()}
          </option>
          {opts.map((o) => (
            <option key={o[0]} value={o[0]}>
              {o[1]}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <section className="wrap inner">
      <SectionHead
        k={cuisine ? "CUISINE JOURNAL" : "THE DINING DIRECTORY"}
        title={cuisine ? cuisine.name + " Cuisine" : "Explore Restaurants"}
        sub={
          cuisine?.description ||
          "Find your next table by destination, cuisine or curiosity."
        }
      />
      <form
        className="searchbox"
        onSubmit={(e) => {
          e.preventDefault();
          change("search", term.trim());
        }}
      >
        <Search size={18} />
        <input
          aria-label="Search the directory"
          value={term}
          onChange={(e) => T(e.target.value)}
          placeholder="Search name, city, country or cuisine"
        />
        <button className="gold">Search</button>
      </form>
      <div className="filters">
        <SlidersHorizontal size={18} />
        {select(
          "country",
          "Countries",
          [...new Set(ds.data?.map((x) => x.country))].map((x) => [x, x]),
        )}
        {select(
          "city",
          "Cities",
          (ds.data || [])
            .filter((x) => !filters.country || x.country === filters.country)
            .map((x) => [x.city, x.city]),
        )}
        {!cuisine &&
          select(
            "cuisine",
            "Cuisines",
            (cs.data || []).map((x) => [x.slug, x.name]),
          )}
        {select(
          "price_category",
          "Prices",
          ["$", "$$", "$$$", "$$$$"].map((x) => [x, x]),
        )}
        {select("featured", "Selections", [
          ["true", "Featured only"],
          ["false", "Other restaurants"],
        ])}
        {select("sort", "Sort", [
          ["alpha", "Alphabetical"],
          ["newest", "Newest additions"],
        ])}
        {p.size > 0 && (
          <button className="plain" onClick={() => P({})}>
            Reset
          </button>
        )}
      </div>
      {r.data ? (
        <>
          <p className="count">{r.data.total} restaurants</p>
          <Grid items={r.data.items} />
          <Pager
            page={page}
            size={9}
            total={r.data.total}
            onPage={(v) => change("page", v)}
          />
        </>
      ) : (
        <Status r={r} />
      )}
    </section>
  );
}
export function Collections({ kind }) {
  const r = useData("/" + kind),
    c = kind === "cuisines";
  return (
    <section className="wrap inner">
      <SectionHead
        k="THE DISCOVERY INDEX"
        title={c ? "Explore Cuisines" : "Food Categories"}
        sub={
          c
            ? "Travel through the traditions and flavours of the global table."
            : "Browse the collection, one course at a time."
        }
      />
      {r.data ? (
        <div className="grid">
          {r.data.map((x) => (
            <Card
              key={x.id}
              x={x}
              save={false}
              to={"/" + kind + "/" + x.slug}
            />
          ))}
        </div>
      ) : (
        <Status r={r} />
      )}
    </section>
  );
}
export function Collection({ kind }) {
  const { slug } = useParams(),
    r = useData("/" + kind + "/" + slug);
  const [p, P] = useSearchParams(),
    page = +(p.get("page") || 1),
    items = useData(
      kind === "categories"
        ? "/menu-items?" + params({ category: slug, page })
        : null,
    );
  if (!r.data) return <Status r={r} />;
  return kind === "cuisines" ? (
    <Directory cuisine={r.data} />
  ) : (
    <section className="wrap inner">
      <SectionHead
        k="THE MENU INDEX"
        title={r.data.name}
        sub={r.data.description}
      />
      {items.data ? (
        <>
          <Grid items={items.data.items} />
          <Pager
            page={page}
            size={12}
            total={items.data.total}
            onPage={(v) => P({ page: v })}
          />
        </>
      ) : (
        <Status r={items} />
      )}
    </section>
  );
}
export function Detail({ food = false }) {
  const { slug } = useParams(),
    r = useData((food ? "/menu-items/" : "/restaurants/") + slug),
    menu = useData(food ? null : "/restaurants/" + slug + "/menu");
  const { visit } = useLibrary(),
    [light, L] = useState(null);
  useEffect(() => {
    if (r.data) {
      visit({
        ...r.data,
        gallery: undefined,
        similar: undefined,
        path: pathOf(r.data),
      });
      document.title = r.data.name + " | Proxima Dining";
    }
  }, [r.data]);
  if (!r.data) return <Status r={r} />;
  const x = r.data;
  return (
    <>
      <div
        className="detailhero"
        style={{ backgroundImage: `url(${x.image_url || "/images/hero.jpg"})` }}
      >
        <div className="wrap">
          <div className="kicker">
            <span />
            {food ? "DISH JOURNAL" : "RESTAURANT JOURNAL"}
          </div>
          {x.logo_url && (
            <img
              src={x.logo_url}
              className="restaurantlogo"
              alt={x.name + " logo"}
            />
          )}
          <h1>{x.name}</h1>
          <div className="metaline">
            {food ? (
              <Link to={"/restaurants/" + x.restaurant_slug}>
                {x.restaurant} ↗
              </Link>
            ) : (
              <>
                <MapPin size={15} />
                {x.city}, {x.country} · {x.cuisines.join(", ")} ·{" "}
                {x.price_category}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="wrap section">
        <div className="detailintro">
          <div>
            <div className="kicker">
              <span />
              {food ? x.category : "AT THE TABLE"}
            </div>
            <h2>{food ? "About the dish" : "The Dining Room"}</h2>
            <p>{x.description}</p>
          </div>
          <Save full x={x} />
        </div>
        {food ? (
          <div className="facts">
            {x.price != null && (
              <p>
                <b>Menu price</b> {money(x)}
              </p>
            )}
            {x.ingredients && (
              <p>
                <b>Ingredients</b> {x.ingredients}
              </p>
            )}
            {x.tags.length > 0 && (
              <p>
                <b>Dietary labels</b> {x.tags.join(", ")}
              </p>
            )}
            <p>
              <b>Allergen information</b>{" "}
              {x.allergen_information ||
                "Not supplied. Check directly with the restaurant."}
            </p>
          </div>
        ) : (
          <>
            <div className="facts">
              <p>
                <b>Location</b>
                {x.address || [x.city, x.country].join(", ")}
              </p>
              <div>
                <b>Opening hours {x.timezone && `(${x.timezone})`}</b>
                {x.hours.length
                  ? x.hours.map((h) => (
                      <p key={h.id}>
                        {
                          [
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                            "Sunday",
                          ][h.day_of_week]
                        }{" "}
                        ·{" "}
                        {h.is_closed
                          ? "Closed"
                          : h.opens_at + " – " + h.closes_at}
                      </p>
                    ))
                  : "Not supplied"}
              </div>
              {x.phone && (
                <p>
                  <b>Telephone</b>
                  {x.phone}
                </p>
              )}
              {x.contact_email && (
                <p>
                  <b>Email</b>
                  {x.contact_email}
                </p>
              )}
              {["website_url", "instagram_url", "facebook_url"].map(
                (k) =>
                  x[k] && (
                    <a key={k} href={x[k]} rel="noreferrer" target="_blank">
                      {k.split("_")[0]} ↗
                    </a>
                  ),
              )}
            </div>
            <SectionHead k="FROM THE KITCHEN" title="The Menu" />
            {menu.data ? (
              menu.data.length ? (
                [...new Set(menu.data.map((i) => i.category))].map((c) => (
                  <section key={c} className="menusection">
                    <h3>{c}</h3>
                    {menu.data
                      .filter((i) => i.category === c)
                      .map((i) => (
                        <Link
                          className="menurow"
                          to={"/food/" + i.slug}
                          key={i.id}
                        >
                          <img src={i.image_url} alt="" />
                          <div>
                            <strong>{i.name}</strong>
                            <p>{i.description}</p>
                          </div>
                          <span>{money(i)}</span>
                          <ArrowRight size={16} />
                        </Link>
                      ))}
                  </section>
                ))
              ) : (
                <Empty
                  title="Menu not yet published"
                  text="Explore more tables in the directory."
                />
              )
            ) : (
              <Status r={menu} />
            )}
          </>
        )}
        {x.gallery.length > 0 && (
          <>
            <SectionHead k="IN PICTURES" title="The Gallery" />
            <div className="gallery">
              {x.gallery.map((i) => (
                <button key={i.id} onClick={() => L(i)}>
                  <img src={i.image_url} alt={i.caption || x.name} />
                  <span>{i.caption}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {x.similar.length > 0 && (
          <>
            <SectionHead
              k="CONTINUE EXPLORING"
              title={food ? "Related Dishes" : "Similar Restaurants"}
            />
            <Grid items={x.similar} />
          </>
        )}
      </div>
      {light && (
        <div
          role="dialog"
          aria-label="Gallery photo"
          aria-modal="true"
          className="lightbox"
          onKeyDown={(e) => e.key === "Escape" && L(null)}
          onClick={() => L(null)}
        >
          <button autoFocus aria-label="Close gallery" onClick={() => L(null)}>
            <X />
          </button>
          <img src={light.image_url} alt={light.caption || x.name} />
        </div>
      )}
    </>
  );
}
export function GlobalSearch() {
  const [p] = useSearchParams(),
    q = p.get("q") || "",
    r = useData(q ? "/search?q=" + encodeURIComponent(q) : null);
  return (
    <section className="wrap inner">
      <SectionHead k="EXPLORE THE COLLECTION" title="Search Proxima Dining" />
      <SearchBox initial={q} />
      {!q ? (
        <p className="quiet">
          Search by restaurant, city, country, cuisine or dish.
        </p>
      ) : !r.data ? (
        <Status r={r} />
      ) : !Object.values(r.data).some((a) => a.length) ? (
        <Empty title={"No results for “" + q + "”"} />
      ) : (
        <>
          {["restaurants", "cuisines", "dishes", "destinations"].map(
            (k) =>
              r.data[k].length > 0 && (
                <section key={k} className="searchgroup">
                  <h2>{k}</h2>
                  {k === "destinations" ? (
                    <div className="chips">
                      {r.data[k].map((x) => (
                        <Link
                          to={"/restaurants?city=" + encodeURIComponent(x.city)}
                          key={x.city}
                        >
                          {x.city}, {x.country}
                        </Link>
                      ))}
                    </div>
                  ) : k === "cuisines" ? (
                    <div className="grid">
                      {r.data[k].map((x) => (
                        <Card
                          key={x.id}
                          x={x}
                          save={false}
                          to={"/cuisines/" + x.slug}
                        />
                      ))}
                    </div>
                  ) : (
                    <Grid items={r.data[k]} />
                  )}
                </section>
              ),
          )}
        </>
      )}
    </section>
  );
}
export function Favorites() {
  const { saves, recent } = useLibrary();
  return (
    <div className="wrap inner">
      <SectionHead
        k="YOUR PERSONAL COLLECTION"
        title="Saved Favorites"
        sub="The restaurants and dishes you’ve bookmarked on this device."
      />
      {saves.length ? (
        <Grid items={saves} />
      ) : (
        <Empty
          title="Your collection starts here"
          text="Tap the heart on a restaurant or dish to save it for later."
        />
      )}
      {recent.length > 0 && (
        <>
          <SectionHead k="YOUR JOURNAL" title="Recently Viewed" />
          <Grid items={recent} />
        </>
      )}
    </div>
  );
}
